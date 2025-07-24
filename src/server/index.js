#!/usr/bin/env node

import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import axios from 'axios';
import { mkdir } from 'fs/promises';

// Cargar variables de entorno
dotenv.config();

// Importar servicios
import { GroqClient } from './services/groq-client.js';
import { AfipClient } from './services/afip-client.js';
import { NotificationService } from './services/notification-service.js';

// Importar datos mock
import { getRealisticTaxpayerInfo } from './services/mock-realistic-data.js';
import {
    getProblematicTaxpayerInfo,
    calculateProblematicCompliance,
    generateAutomaticAlerts,
    PROBLEMATIC_TEST_CUITS,
    getProblematicSummary
} from './services/compliance-problematic-case.js';

// Importar rutas
import groqChatRoutes from './routes/groq-chat.js';
import ocrRoutes from './routes/ocr-routes.js';

// Función para asegurar que existe el directorio de uploads
async function ensureUploadDirectory() {
    try {
        await mkdir('data', { recursive: true });
        await mkdir('data/uploads', { recursive: true });
        console.log('📁 Directorio de uploads verificado');
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.warn('⚠️ Error creando directorio de uploads:', error.message);
        }
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CONFIGURACIÓN CORREGIDA CON URL OFICIAL DE AFIP
const config = {
    port: process.env.PORT || 8080,
    host: process.env.HOST || '0.0.0.0',
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    },
    afipMockMode: process.env.AFIP_MOCK_MODE === 'true', // || true, // Default true para POC
    groq: {
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
        maxTokens: parseInt(process.env.GROQ_MAX_TOKENS) || 1000,
        temperature: parseFloat(process.env.GROQ_TEMPERATURE) || 0.7,
        timeout: parseInt(process.env.GROQ_TIMEOUT) || 30000
    },
    afip: {
        mockMode: process.env.AFIP_MOCK_MODE === 'true', // || true,
        timeout: 15000, // Reducido para API REST que a veces es lenta
        // URL CORREGIDA - API REST oficial de AFIP
        baseURL: 'https://soa.afip.gob.ar/sr-padron/v2',
        maxRetries: 3,
        cacheTimeout: 300000 // 5 minutos
    }
};

// Configuración de notificaciones
const notificationConfig = {
    email: {
        enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
        provider: process.env.EMAIL_PROVIDER || 'mailtrap'
    },
    slack: {
        enabled: process.env.SLACK_NOTIFICATIONS === 'true',
        webhookUrl: process.env.SLACK_WEBHOOK_URL
    },
    sms: {
        enabled: process.env.SMS_NOTIFICATIONS === 'true'
    }
};

// ==============================================
// INICIALIZAR SERVICIOS
// ==============================================

console.log('🚀 Inicializando servicios...');

// Inicializar logger simple
const logger = {
    info: (msg, data) => console.log(`ℹ️  [INFO] ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`⚠️  [WARN] ${msg}`, data || ''),
    error: (msg, data) => console.error(`❌ [ERROR] ${msg}`, data || ''),
    debug: (msg, data) => process.env.NODE_ENV === 'development' && console.log(`🐛 [DEBUG] ${msg}`, data || '')
};

// Inicializar Groq Client
let groqClient = null;
if (config.groq.apiKey) {
    try {
        groqClient = new GroqClient(config.groq, logger);
        await groqClient.initialize();
        logger.info('✅ Groq Client inicializado exitosamente');
    } catch (error) {
        logger.error('❌ Error inicializando Groq Client:', error.message);
        groqClient = null;
    }
} else {
    logger.warn('⚠️ GROQ_API_KEY no configurado - Funcionalidad de IA deshabilitada');
}

// Inicializar AFIP Client CON CONFIGURACIÓN CORREGIDA
const afipClient = new AfipClient(config.afip, logger);
try {
    await afipClient.initialize();
    logger.info('✅ AFIP Client inicializado exitosamente');
} catch (error) {
    logger.error('❌ Error inicializando AFIP Client:', error.message);
    // NO fallar el servidor si AFIP no responde - continuar en modo degraded
    logger.warn('⚠️ Servidor continuará en modo degraded');
}

// Inicializar servicio de notificaciones
const notificationService = new NotificationService(notificationConfig, logger);
notificationService.setupDefaultSubscriptions();

// ==============================================
// CREAR APLICACIÓN EXPRESS
// ==============================================

const app = express();

// Middleware básico
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    logger.debug(`${timestamp} - ${req.method} ${req.path}`);
    next();
});

// Agregar servicios a app.locals para las rutas
app.locals.groqClient = groqClient;
app.locals.afipClient = afipClient;
app.locals.notificationService = notificationService;
app.locals.logger = logger;

// ==============================================
// FUNCIONES AUXILIARES AFIP CORREGIDAS
// ==============================================

// Función para consultar AFIP Real con URL corregida
async function getAfipTaxpayerInfo(cuit) {
    try {
        const cleanCuit = cuit.replace(/[-\s]/g, '');

        // URL CORREGIDA de la API REST de AFIP
        const afipUrl = `https://soa.afip.gob.ar/sr-padron/v2/persona/${cleanCuit}`;

        logger.debug(`🔍 Consultando AFIP REST: ${afipUrl}`);

        const response = await axios.get(afipUrl, {
            timeout: 15000, // Aumentado porque a veces es lenta
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'AFIP-Monitor-MCP/1.0'
            },
            validateStatus: function (status) {
                return status < 500; // Aceptar cualquier código < 500
            }
        });

        if (response.status === 200 && response.data) {
            return normalizeAfipResponse(response.data);
        } else if (response.status === 404) {
            throw new Error(`CUIT ${cleanCuit} no encontrado en AFIP`);
        } else {
            throw new Error(`AFIP responded with status ${response.status}`);
        }

    } catch (error) {
        logger.error('❌ Error consultando AFIP REST:', error.message);

        // Información adicional para debugging
        if (error.code === 'ECONNREFUSED') {
            logger.error('💡 La API REST de AFIP solo funciona desde Argentina');
        }

        throw error;
    }
}

// Normalizar respuesta de AFIP
function normalizeAfipResponse(data) {
    return {
        cuit: data.idPersona,
        razonSocial: data.tipoPersona === 'FISICA'
            ? `${data.apellido || ''} ${data.nombre || ''}`.trim()
            : data.razonSocial || 'Sin datos',
        estado: data.estadoClave,
        situacionFiscal: {
            iva: determineIVAStatus(data),
            ganancias: data.impuestos?.find(i => i.idImpuesto === 20) ? 'INSCRIPTO' : 'NO_INSCRIPTO',
            monotributo: data.categoriasMonotributo?.length > 0 ?
                data.categoriasMonotributo[0].descripcionCategoria : 'NO_INSCRIPTO'
        },
        domicilio: {
            direccion: data.domicilio?.[0]?.direccion || 'Sin datos',
            localidad: data.domicilio?.[0]?.localidad || 'Sin datos',
            provincia: data.domicilio?.[0]?.provincia || 'Sin datos'
        },
        actividades: data.actividades?.map(act => ({
            codigo: act.idActividad,
            descripcion: act.descripcionActividad,
            principal: act.orden === 1
        })) || [],
        fechaUltimaActualizacion: new Date().toISOString(),
        fuente: 'AFIP_REST'
    };
}

// Determinar estado de IVA
function determineIVAStatus(data) {
    if (data.categoriasMonotributo?.length > 0) {
        return 'MONOTRIBUTO';
    }
    if (data.impuestos?.find(i => i.idImpuesto === 30)) {
        return 'RESPONSABLE_INSCRIPTO';
    }
    return 'NO_INSCRIPTO';
}

// Función auxiliar para datos mock usando datos realistas
function getMockTaxpayerInfo(cuit) {
    // Verificar si es un CUIT problemático
    if (PROBLEMATIC_TEST_CUITS.includes(cuit)) {
        return getProblematicTaxpayerInfo(cuit);
    }

    // Usar datos realistas para CUITs normales
    return getRealisticTaxpayerInfo(cuit);
}

// Generar recomendaciones de compliance
function generateComplianceRecommendations(taxpayerData) {
    const recommendations = [];

    // Para casos problemáticos, usar las acciones generadas
    if (taxpayerData.fuente === 'MOCK_PROBLEMATIC') {
        const result = calculateProblematicCompliance(taxpayerData);
        return result.alerts.map(alert => alert.actions).flat();
    }

    // Recomendaciones normales
    if (taxpayerData.estado !== 'ACTIVO') {
        recommendations.push('Regularizar estado fiscal');
    }

    if (taxpayerData.situacionFiscal.iva === 'NO_INSCRIPTO') {
        recommendations.push('Evaluar inscripción en IVA');
    }

    if (!taxpayerData.actividades || taxpayerData.actividades.length === 0) {
        recommendations.push('Registrar actividades económicas');
    }

    if (taxpayerData.domicilio.direccion === 'Sin datos') {
        recommendations.push('Actualizar domicilio fiscal');
    }

    if (recommendations.length === 0) {
        recommendations.push('Mantener actualizada la información en AFIP');
    }

    return recommendations;
}

// ==============================================
// RUTAS BÁSICAS
// ==============================================

app.get('/', (req, res) => {
    res.json({
        message: 'AFIP Monitor MCP Server',
        version: '1.0.0',
        status: 'running',
        afipMode: config.afipMockMode ? 'MOCK' : 'REAL',
        groqEnabled: !!groqClient,
        emailNotifications: notificationConfig.email.enabled,
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            api: '/api/status',
            taxpayer: '/api/afip/taxpayer/:cuit',
            alerts: '/api/alerts',
            compliance: '/api/compliance/check',
            groq: groqClient ? '/api/groq/*' : null,
            notifications: '/api/notifications/*',
            // Nuevos endpoints OCR
            ocr: {
                upload: '/api/ocr/upload',
                extractInvoice: '/api/ocr/extract-invoice',
                extractBankStatement: '/api/ocr/extract-bank-statement',
                history: '/api/ocr/history/:clientId',
                stats: '/api/ocr/stats/:clientId',
                status: '/api/ocr/status/:processId',
                info: '/api/ocr-status'
            }
        },
        docs: 'https://github.com/snarx-io/afip-monitor-mcp',
        author: 'Snarx.io'
    });
});

app.get('/health', (req, res) => {
    const groqStatus = groqClient ? {
        healthy: groqClient.isInitialized,
        model: groqClient.model,
        enabled: true,
        metrics: groqClient.getMetrics()
    } : {
        healthy: false,
        enabled: false,
        reason: 'GROQ_API_KEY not configured'
    };

    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        afipMode: config.afipMockMode ? 'MOCK' : 'REAL',
        emailNotifications: notificationConfig.email.enabled,
        version: '1.0.0',
        services: {
            groq: groqStatus,
            afip: {
                healthy: afipClient.connectionStatus !== 'error',
                status: afipClient.connectionStatus,
                mockMode: config.afipMockMode,
                baseURL: config.afip.baseURL,
                lastHealthCheck: afipClient.lastHealthCheck
            },
            notifications: {
                healthy: true,
                emailEnabled: notificationConfig.email.enabled
            }
        }
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        server: 'AFIP Monitor MCP',
        status: 'running',
        afipMode: config.afipMockMode ? 'MOCK' : 'REAL',
        groqEnabled: !!groqClient,
        emailNotifications: notificationConfig.email.enabled,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        afipClient: {
            connectionStatus: afipClient.connectionStatus,
            metrics: afipClient.getMetrics(),
            config: {
                baseURL: config.afip.baseURL,
                timeout: config.afip.timeout,
                mockMode: config.afip.mockMode
            }
        }
    });
});

// ==============================================
// ENDPOINT DE ALERTAS - AGREGADO
// ==============================================

// Endpoint para obtener alertas (compatible con useMonitoring.js)
app.get('/api/alerts', async (req, res) => {
    try {
        logger.info('📢 Obteniendo alertas del sistema...');

        // Generar alertas mock realistas para desarrollo
        const mockAlerts = [
            {
                id: `alert_${Date.now()}_1`,
                type: 'compliance',
                severity: 'medium',
                title: 'Declaración de IVA Pendiente',
                message: 'La declaración de IVA del periodo actual está próxima a vencer',
                timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
                status: 'active',
                source: 'afip_monitor',
                taxpayer: {
                    cuit: '20-12345678-9',
                    name: 'Empresa Demo SA'
                },
                metadata: {
                    period: '2025-07',
                    dueDate: '2025-08-15',
                    daysRemaining: 5
                }
            },
            {
                id: `alert_${Date.now()}_2`,
                type: 'system',
                severity: 'info',
                title: 'Conexión AFIP Estable',
                message: 'Conexión con servicios AFIP funcionando correctamente',
                timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
                status: 'resolved',
                source: 'system_monitor',
                metadata: {
                    responseTime: '245ms',
                    serviceStatus: 'online'
                }
            },
            {
                id: `alert_${Date.now()}_3`,
                type: 'notification',
                severity: 'low',
                title: 'Actualización de Normativa',
                message: 'Nueva resolución general AFIP disponible para revisión',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                status: 'active',
                source: 'afip_updates',
                metadata: {
                    resolution: 'RG 5234/2025',
                    category: 'facturacion_electronica'
                }
            }
        ];

        // Si hay un sistema de alertas real, usar ese en lugar del mock
        let alerts = mockAlerts;

        // Filtros opcionales
        const { type, severity, status, limit = 50 } = req.query;

        if (type) {
            alerts = alerts.filter(alert => alert.type === type);
        }

        if (severity) {
            alerts = alerts.filter(alert => alert.severity === severity);
        }

        if (status) {
            alerts = alerts.filter(alert => alert.status === status);
        }

        // Limitar resultados
        alerts = alerts.slice(0, parseInt(limit));

        // Ordenar por timestamp (más recientes primero)
        alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const response = {
            success: true,
            data: alerts,
            total: alerts.length,
            timestamp: new Date().toISOString(),
            filters: { type, severity, status, limit }
        };

        logger.info(`✅ Alertas obtenidas: ${alerts.length} alertas`);
        res.json(response);

    } catch (error) {
        logger.error('❌ Error obteniendo alertas:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo alertas del sistema',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint adicional para crear alertas manualmente (opcional)
app.post('/api/alerts', async (req, res) => {
    try {
        const { type, severity, title, message, metadata } = req.body;

        // Validación básica
        if (!title || !message) {
            return res.status(400).json({
                success: false,
                error: 'Los campos title y message son requeridos'
            });
        }

        const newAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type || 'custom',
            severity: severity || 'info',
            title,
            message,
            timestamp: new Date().toISOString(),
            status: 'active',
            source: 'manual',
            metadata: metadata || {}
        };

        // En una implementación real, guardarías esto en la base de datos
        logger.info(`📢 Nueva alerta creada: ${newAlert.title}`);

        // Notificar via WebSocket a clientes conectados
        if (wss) {
            wss.clients.forEach(client => {
                if (client.readyState === client.OPEN) {
                    client.send(JSON.stringify({
                        type: 'new_alert',
                        data: newAlert,
                        timestamp: new Date().toISOString()
                    }));
                }
            });
        }

        res.status(201).json({
            success: true,
            data: newAlert,
            message: 'Alerta creada exitosamente',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ Error creando alerta:', error);
        res.status(500).json({
            success: false,
            error: 'Error creando alerta',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para marcar alertas como leídas/resueltas
app.patch('/api/alerts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Status debe ser: active, resolved, o dismissed'
            });
        }

        // En una implementación real, actualizarías la base de datos
        const updatedAlert = {
            id,
            status,
            updatedAt: new Date().toISOString()
        };

        logger.info(`🔄 Alerta ${id} actualizada a status: ${status}`);

        res.json({
            success: true,
            data: updatedAlert,
            message: 'Alerta actualizada exitosamente',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ Error actualizando alerta:', error);
        res.status(500).json({
            success: false,
            error: 'Error actualizando alerta',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==============================================
// RUTAS DE GROQ (si está habilitado)
// ==============================================

if (groqClient) {
    app.use('/api/groq', groqChatRoutes);
}

// ==============================================
// RUTAS OCR
// ==============================================

// Usar las rutas OCR
app.use('/api/ocr', ocrRoutes);

// Endpoint de estado OCR para debugging
app.get('/api/ocr-status', (req, res) => {
    res.json({
        service: 'OCR Service',
        status: 'active',
        version: '1.0.0',
        features: {
            documentUpload: true,
            invoiceExtraction: true,
            bankStatementExtraction: true,
            historyTracking: true,
            statistics: true,
            realTimeProcessing: false // Simulado por ahora
        },
        endpoints: {
            upload: 'POST /api/ocr/upload',
            extractInvoice: 'POST /api/ocr/extract-invoice',
            extractBankStatement: 'POST /api/ocr/extract-bank-statement',
            history: 'GET /api/ocr/history/:clientId',
            stats: 'GET /api/ocr/stats/:clientId',
            status: 'GET /api/ocr/status/:processId'
        },
        limits: {
            maxFileSize: '10MB',
            supportedFormats: ['PDF', 'JPG', 'PNG', 'JPEG'],
            maxConcurrentProcessing: 5
        },
        timestamp: new Date().toISOString()
    });
});


// ==============================================
// ENDPOINTS DE NOTIFICACIONES
// ==============================================

// Endpoint para suscribirse a alertas
app.post('/api/notifications/subscribe', (req, res) => {
    const { alertType, contact, channels } = req.body;

    try {
        const subscription = notificationService.subscribe(alertType, contact, channels);

        res.json({
            success: true,
            message: 'Suscripción creada exitosamente',
            subscription,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error creando suscripción:', error);
        res.status(500).json({
            success: false,
            error: 'Error creando suscripción',
            message: error.message
        });
    }
});

// Endpoint para enviar email de prueba
app.post('/api/notifications/test-email', async (req, res) => {
    const { to } = req.body;

    if (!to) {
        return res.status(400).json({
            success: false,
            error: 'Email destino es requerido'
        });
    }

    try {
        const result = await notificationService.sendTestEmail(to);

        res.json({
            success: true,
            message: 'Email de prueba enviado',
            result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error enviando email de prueba:', error);
        res.status(500).json({
            success: false,
            error: 'Error enviando email de prueba',
            message: error.message
        });
    }
});

// Endpoint para obtener estadísticas de notificaciones
app.get('/api/notifications/stats', (req, res) => {
    const stats = notificationService.getStats();

    res.json({
        success: true,
        message: 'Estadísticas de notificaciones',
        stats,
        timestamp: new Date().toISOString()
    });
});

// ==============================================
// ENDPOINTS PRINCIPALES DE AFIP
// ==============================================

// ENDPOINT PRINCIPAL - Consulta de contribuyente
app.get('/api/afip/taxpayer/:cuit', async (req, res) => {
    const { cuit } = req.params;

    logger.info(`📊 Consultando contribuyente: ${cuit} (Modo: ${config.afipMockMode ? 'MOCK' : 'REAL'})`);

    try {
        let taxpayerData;

        if (config.afipMockMode) {
            // Modo MOCK
            logger.debug('🎭 Usando datos simulados');
            taxpayerData = getMockTaxpayerInfo(cuit);
        } else {
            // Modo REAL
            logger.debug('🌐 Consultando AFIP Real');
            try {
                taxpayerData = await getAfipTaxpayerInfo(cuit);
                logger.debug('✅ Datos obtenidos de AFIP Real');
            } catch (afipError) {
                logger.warn('⚠️ Error en AFIP Real, usando fallback Mock:', afipError.message);
                taxpayerData = getMockTaxpayerInfo(cuit);
                taxpayerData.fuente = 'MOCK_FALLBACK';
            }
        }

        res.json({
            success: true,
            data: taxpayerData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ Error general:', error);
        res.status(500).json({
            success: false,
            error: 'Error consultando contribuyente',
            message: error.message,
            cuit: cuit,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para compliance check con notificaciones
app.post('/api/compliance/check', async (req, res) => {
    const { cuit, period, sendNotification = false } = req.body;

    // Validación básica
    if (!cuit || !period) {
        return res.status(400).json({
            success: false,
            error: 'CUIT y período son requeridos',
            timestamp: new Date().toISOString()
        });
    }

    logger.info(`🔍 Verificando compliance: ${cuit} (Modo: ${config.afipMockMode ? 'MOCK' : 'REAL'})`);

    try {
        // Obtener datos del contribuyente
        let taxpayerData;

        if (config.afipMockMode) {
            taxpayerData = getMockTaxpayerInfo(cuit);
        } else {
            try {
                taxpayerData = await getAfipTaxpayerInfo(cuit);
            } catch (afipError) {
                logger.warn('Error AFIP, usando Mock:', afipError.message);
                taxpayerData = getMockTaxpayerInfo(cuit);
                taxpayerData.fuente = 'MOCK_FALLBACK';
            }
        }

        // Generar recomendaciones
        const recommendations = generateComplianceRecommendations(taxpayerData);

        // Calcular score de compliance
        let complianceScore = 100;
        if (taxpayerData.estado !== 'ACTIVO') complianceScore -= 30;
        if (taxpayerData.situacionFiscal.iva === 'NO_INSCRIPTO') complianceScore -= 20;
        if (!taxpayerData.actividades?.length) complianceScore -= 15;

        const complianceResult = {
            cuit,
            period,
            taxpayer: taxpayerData,
            complianceScore,
            recommendations,
            alertLevel: complianceScore < 50 ? 'CRITICAL' :
                complianceScore < 70 ? 'HIGH' :
                    complianceScore < 90 ? 'MEDIUM' : 'LOW',
            timestamp: new Date().toISOString()
        };

        // Enviar notificación si se solicita
        if (sendNotification && complianceScore < 70) {
            try {
                await notificationService.processAlert(taxpayerData, complianceResult);
                complianceResult.notificationSent = true;
            } catch (notificationError) {
                logger.error('Error enviando notificación:', notificationError);
                complianceResult.notificationError = notificationError.message;
            }
        }

        res.json({
            success: true,
            data: complianceResult,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error en compliance check:', error);
        res.status(500).json({
            success: false,
            error: 'Error verificando compliance',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para testing - caso problemático
app.post('/api/demo/problematic-case', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            error: 'Email es requerido para la demostración'
        });
    }

    try {
        logger.info(`🎭 Ejecutando demostración caso problemático para: ${email}`);

        // Usar un CUIT problemático
        const problematicCuit = '20111222333';
        const taxpayerData = getMockTaxpayerInfo(problematicCuit);

        // Suscribir email temporal
        notificationService.subscribe('CRITICAL', email, ['email']);

        // Ejecutar compliance check con notificación
        const complianceResult = await notificationService.processAlert(
            taxpayerData,
            calculateProblematicCompliance(taxpayerData)
        );

        res.json({
            success: true,
            message: 'Demostración ejecutada exitosamente',
            data: {
                cuit: problematicCuit,
                taxpayer: taxpayerData.razonSocial,
                complianceScore: complianceResult.alertType,
                emailSent: complianceResult.successful > 0,
                notificationResults: complianceResult.results
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error en demostración:', error);
        res.status(500).json({
            success: false,
            error: 'Error en demostración',
            message: error.message
        });
    }
});



// ==============================================
// MANEJO DE ERRORES
// ==============================================

// Manejo de errores
app.use((err, req, res, next) => {
    logger.error('Error no manejado:', err);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Ruta 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Recurso no encontrado',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// ==============================================
// CONFIGURAR WEBSOCKET
// ==============================================

// ==============================================
// CONFIGURAR WEBSOCKET - VERSIÓN CORREGIDA
// ==============================================

// Crear servidor HTTP
const server = createServer(app);

// Configurar WebSocket con manejo de errores mejorado
const wss = new WebSocketServer({
    server,
    // Configuraciones adicionales para estabilidad
    perMessageDeflate: false,
    maxPayload: 16 * 1024 * 1024, // 16MB
});

// Almacenar clientes conectados
const connectedClients = new Set();

wss.on('connection', (ws, req) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info(`📡 Cliente WebSocket conectado: ${clientId}`);
    console.log(`🔌 Nueva conexión WebSocket desde: ${req.socket.remoteAddress}`);

    // Agregar cliente al set
    connectedClients.add(ws);

    // Configurar propiedades del cliente
    ws.clientId = clientId;
    ws.isAlive = true;
    ws.lastPing = Date.now();

    // Enviar mensaje de bienvenida inmediatamente
    try {
        const welcomeMessage = {
            type: 'welcome',
            clientId: clientId,
            message: `Conectado a AFIP Monitor MCP (${config.afipMockMode ? 'MOCK' : 'REAL'})`,
            groqEnabled: !!groqClient,
            emailNotifications: notificationConfig.email.enabled,
            timestamp: new Date().toISOString(),
            serverInfo: {
                version: '1.0.0',
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development'
            }
        };

        ws.send(JSON.stringify(welcomeMessage));
        logger.info(`👋 Mensaje de bienvenida enviado a ${clientId}`);

    } catch (error) {
        logger.error(`❌ Error enviando mensaje de bienvenida a ${clientId}:`, error);
    }

    // Configurar ping/pong para mantener conexión viva
    ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastPing = Date.now();
    });

    // Manejar mensajes del cliente
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            logger.debug(`📨 Mensaje recibido de ${clientId}:`, message.type);

            // Responder a diferentes tipos de mensajes
            switch (message.type) {
                case 'ping':
                    ws.send(JSON.stringify({
                        type: 'pong',
                        timestamp: new Date().toISOString()
                    }));
                    break;

                case 'subscribe':
                    ws.subscriptions = message.channels || ['alerts', 'metrics'];
                    ws.send(JSON.stringify({
                        type: 'subscription_confirmed',
                        channels: ws.subscriptions,
                        timestamp: new Date().toISOString()
                    }));
                    break;

                case 'get_status':
                    ws.send(JSON.stringify({
                        type: 'status_update',
                        data: {
                            server_status: 'running',
                            afip_mode: config.afipMockMode ? 'MOCK' : 'REAL',
                            groq_enabled: !!groqClient,
                            connected_clients: connectedClients.size,
                            uptime: process.uptime(),
                            timestamp: new Date().toISOString()
                        }
                    }));
                    break;

                default:
                    logger.debug(`❓ Tipo de mensaje desconocido: ${message.type}`);
            }

        } catch (error) {
            logger.error(`❌ Error procesando mensaje de ${clientId}:`, error);

            ws.send(JSON.stringify({
                type: 'error',
                message: 'Error procesando mensaje',
                timestamp: new Date().toISOString()
            }));
        }
    });

    // Manejar cierre de conexión
    ws.on('close', (code, reason) => {
        logger.info(`🔌 Cliente WebSocket desconectado: ${clientId} (código: ${code}, razón: ${reason?.toString()})`);
        connectedClients.delete(ws);
    });

    // Manejar errores de conexión
    ws.on('error', (error) => {
        logger.error(`❌ Error WebSocket en ${clientId}:`, error.message);
        connectedClients.delete(ws);
    });

    // Simular alertas periódicas mejoradas
    const alertInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN && connectedClients.has(ws)) {
            try {
                const alertTypes = ['info', 'warning', 'success'];
                const alertMessages = [
                    'Verificación automática completada',
                    'Sistema funcionando correctamente',
                    'Conexión AFIP estable',
                    'Métricas actualizadas',
                    'Estado del servidor: OK'
                ];

                const randomAlert = {
                    type: 'alert',
                    data: {
                        id: `ws_alert_${Date.now()}`,
                        type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
                        severity: 'low',
                        title: 'Notificación del Sistema',
                        message: `${alertMessages[Math.floor(Math.random() * alertMessages.length)]} (${config.afipMockMode ? 'MOCK' : 'REAL'})`,
                        timestamp: new Date().toISOString(),
                        source: 'websocket_heartbeat'
                    }
                };

                ws.send(JSON.stringify(randomAlert));
                logger.debug(`📢 Alerta automática enviada a ${clientId}`);

            } catch (error) {
                logger.error(`❌ Error enviando alerta automática a ${clientId}:`, error);
                clearInterval(alertInterval);
            }
        } else {
            clearInterval(alertInterval);
        }
    }, 45000); // Cada 45 segundos

    // Limpiar al cerrar
    ws.on('close', () => {
        clearInterval(alertInterval);
        connectedClients.delete(ws);
        logger.info(`🧹 Limpieza completada para ${clientId}`);
    });
});

// Función para broadcast a todos los clientes conectados
const broadcastToClients = (message) => {
    const messageString = JSON.stringify(message);
    let sentCount = 0;
    let errorCount = 0;

    connectedClients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
            try {
                ws.send(messageString);
                sentCount++;
            } catch (error) {
                logger.error(`❌ Error enviando broadcast a ${ws.clientId}:`, error);
                errorCount++;
                connectedClients.delete(ws);
            }
        } else {
            connectedClients.delete(ws);
        }
    });

    logger.debug(`📡 Broadcast enviado: ${sentCount} exitosos, ${errorCount} errores`);
    return { sent: sentCount, errors: errorCount };
};

// Heartbeat para mantener conexiones vivas
const heartbeat = setInterval(() => {
    connectedClients.forEach((ws) => {
        if (ws.isAlive === false) {
            logger.warn(`💔 Cliente inactivo detectado: ${ws.clientId}`);
            ws.terminate();
            connectedClients.delete(ws);
            return;
        }

        ws.isAlive = false;
        try {
            ws.ping();
        } catch (error) {
            logger.error(`❌ Error enviando ping a ${ws.clientId}:`, error);
            connectedClients.delete(ws);
        }
    });

    logger.debug(`💓 Heartbeat: ${connectedClients.size} clientes activos`);
}, 30000); // Cada 30 segundos

// Cleanup al cerrar servidor
process.on('SIGTERM', () => {
    logger.info('🛑 Cerrando servidor WebSocket...');
    clearInterval(heartbeat);

    connectedClients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                type: 'server_shutdown',
                message: 'Servidor cerrándose',
                timestamp: new Date().toISOString()
            }));
            ws.close();
        }
    });

    wss.close(() => {
        logger.info('✅ Servidor WebSocket cerrado correctamente');
    });
});

// Función helper para enviar métricas via WebSocket
const sendMetricsUpdate = () => {
    const metrics = {
        type: 'metrics_update',
        data: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            connected_clients: connectedClients.size,
            afip_mode: config.afipMockMode ? 'MOCK' : 'REAL',
            groq_enabled: !!groqClient,
            timestamp: new Date().toISOString()
        }
    };

    broadcastToClients(metrics);
};

// Enviar métricas cada 60 segundos
setInterval(sendMetricsUpdate, 60000);

// Exportar función de broadcast para usar en otras partes del servidor
global.broadcastToClients = broadcastToClients;

// ==============================================
// INICIAR SERVIDOR
// ==============================================
await ensureUploadDirectory();

server.listen(config.port, config.host, () => {
    console.log('');
    console.log('🎉 ================================');
    console.log('🚀 AFIP Monitor MCP Server STARTED');
    console.log('🎉 ================================');
    console.log('');
    console.log(`🌐 Servidor: http://${config.host}:${config.port}`);
    console.log(`🏠 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 AFIP Mode: ${config.afipMockMode ? '🎭 MOCK' : '🌐 REAL'}`);
    console.log(`📧 Email: ${notificationConfig.email.enabled ? '✅ HABILITADO' : '❌ DESHABILITADO'}`);

    // Estado de Groq AI
    if (groqClient && groqClient.isInitialized) {
        console.log(`🤖 Groq AI: ✅ CONECTADO (${groqClient.model})`);
        console.log(`⚡ Velocidad: ~280 tokens/segundo - Costo: $0.59-0.79/M tokens`);
        console.log(`🎨 Chat UI: http://${config.host}:${config.port}/#/groq_chat`);
    } else if (process.env.GROQ_API_KEY) {
        console.log(`🤖 Groq AI: ⚠️ CONFIGURADO PERO NO CONECTADO`);
        console.log(`💡 Verifica tu GROQ_API_KEY en .env`);
    } else {
        console.log(`🤖 Groq AI: ❌ NO CONFIGURADO`);
        console.log(`💡 Para habilitar IA: agrega GROQ_API_KEY a .env`);
        console.log(`🔗 Obtener gratis en: https://console.groq.com/`);
    }

    // Estado de AFIP
    console.log(`🏛️ AFIP Client: ${afipClient.connectionStatus === 'connected' ? '✅ CONECTADO' :
        afipClient.connectionStatus === 'degraded' ? '⚠️ DEGRADED' :
            '❌ ERROR'}`);
    console.log(`🔗 AFIP URL: ${config.afip.baseURL}`);

    // Mensaje informativo
    if (config.afipMockMode) {
        console.log('💡 Para usar AFIP Real, cambiar AFIP_MOCK_MODE=false en .env');
    } else {
        console.log('🌐 Modo AFIP Real activado - Consultando servicios reales');
        console.log('💡 Nota: API REST solo funciona desde Argentina');
    }

    if (notificationConfig.email.enabled) {
        console.log(`📬 Proveedor de email: ${notificationConfig.email.provider}`);
    }

    // Resumen de endpoints disponibles
    console.log('\n📋 Endpoints disponibles:');
    console.log(`   • Dashboard: http://${config.host}:${config.port}/`);
    console.log(`   • Health Check: http://${config.host}:${config.port}/health`);
    console.log(`   • AFIP Info: http://${config.host}:${config.port}/api/afip/taxpayer/[cuit]`);
    console.log(`   • Compliance: http://${config.host}:${config.port}/api/compliance/check`);

    // Nuevos endpoints OCR
    console.log(`   📄 OCR Upload: http://${config.host}:${config.port}/api/ocr/upload`);
    console.log(`   🧾 Extract Invoice: http://${config.host}:${config.port}/api/ocr/extract-invoice`);
    console.log(`   🏦 Extract Bank: http://${config.host}:${config.port}/api/ocr/extract-bank-statement`);
    console.log(`   📊 OCR Stats: http://${config.host}:${config.port}/api/ocr/stats/[clientId]`);
    console.log(`   📋 OCR History: http://${config.host}:${config.port}/api/ocr/history/[clientId]`);

    if (groqClient && groqClient.isInitialized) {
        console.log(`   • Chat IA: http://${config.host}:${config.port}/api/groq/chat`);
        console.log(`   • Estado IA: http://${config.host}:${config.port}/api/groq/status`);
    }

    // Mostrar CUITs de prueba disponibles
    console.log('🧪 CUITs de prueba disponibles:');
    console.log('   • Casos normales: 30500010912, 27230938607, 20123456789');
    console.log('   • Casos problemáticos:', PROBLEMATIC_TEST_CUITS.join(', '));
    console.log('');
});

export { app, server };