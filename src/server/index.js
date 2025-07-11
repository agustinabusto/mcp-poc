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

// ==============================================
// IMPORTACIONES ADICIONALES PARA HU-001
// ==============================================

import fiscalVerificationRoutes from './routes/fiscal-verification.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

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
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',')
            : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
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

// Variable global para la base de datos
let db = null;

// ==============================================
// FUNCIÓN DE INICIALIZACIÓN DE BASE DE DATOS
// ==============================================
async function initializeDatabase() {
    try {
        console.log('📊 Inicializando base de datos SQLite...');

        // Asegurar que existe el directorio
        await mkdir('data', { recursive: true });

        const dbPath = process.env.DATABASE_URL || './data/afip_monitor.db';

        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Habilitar foreign keys y WAL mode para mejor performance
        await db.exec('PRAGMA foreign_keys = ON');
        await db.exec('PRAGMA journal_mode = WAL');
        await db.exec('PRAGMA synchronous = NORMAL');
        await db.exec('PRAGMA cache_size = 1000');
        await db.exec('PRAGMA temp_store = memory');

        console.log('✅ Base de datos inicializada correctamente');

        // Verificar si existen las tablas de verificación fiscal
        const tables = await db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='fiscal_verifications'
        `);

        if (tables.length === 0) {
            console.warn('⚠️  Tablas de verificación fiscal no encontradas');
            console.warn('   Ejecuta: npm run migrate:fiscal');
        } else {
            console.log('✅ Tablas de verificación fiscal encontradas');
        }

        return db;

    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

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
// CREAR APLICACIÓN EXPRESS PRIMERO
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

// ==============================================
// INICIALIZAR BASE DE DATOS DESPUÉS DE APP
// ==============================================

try {
    db = await initializeDatabase();
    app.locals.db = db; // Hacer disponible para las rutas
    logger.info('✅ Base de datos configurada y disponible para rutas');
} catch (error) {
    logger.error('❌ Error fatal inicializando base de datos:', error);
    process.exit(1);
}

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
            },
            // Nuevos endpoints HU-001
            fiscal: {
                verify: '/api/fiscal/verify',
                history: '/api/fiscal/history/:cuit',
                stats: '/api/fiscal/stats',
                systemStatus: '/api/fiscal-system-status'
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
        database: db ? 'connected' : 'disconnected',
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
// RUTAS DE VERIFICACIÓN FISCAL (HU-001)
// ==============================================
// Usar las rutas de verificación fiscal
app.use('/api/fiscal', fiscalVerificationRoutes);

// Endpoint específico para el estado del sistema de verificación fiscal
app.get('/api/fiscal-system-status', async (req, res) => {
    try {
        const status = {
            service: 'Fiscal Verification System',
            version: '1.0.0',
            status: 'active',
            timestamp: new Date().toISOString(),

            // Verificar conectividad con AFIP
            afipConnection: {
                status: afipClient?.connectionStatus || 'unknown',
                lastCheck: new Date().toISOString(),
                mode: config.afip.mockMode ? 'MOCK' : 'REAL'
            },

            // Verificar base de datos
            database: {
                status: db ? 'connected' : 'disconnected',
                path: process.env.DATABASE_URL || './data/afip_monitor.db'
            },

            // Features implementadas según HU-001
            features: {
                fiscalVerification: true,           // CA-001
                detailedInformation: true,          // CA-002  
                errorHandling: true,                // CA-003
                verificationHistory: !!db,         // CA-004
                responseTimeTarget: '< 5 seconds',
                complianceTracking: !!db
            },

            // Endpoints disponibles
            endpoints: {
                verify: 'POST /api/fiscal/verify',
                history: 'GET /api/fiscal/history/:cuit',
                stats: 'GET /api/fiscal/stats'
            }
        };

        // Obtener estadísticas si la DB está disponible
        if (db) {
            try {
                const stats = await db.get(`
                    SELECT 
                        COUNT(*) as total_verifications,
                        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful,
                        COUNT(CASE WHEN status = 'ERROR' THEN 1 END) as failed,
                        ROUND(AVG(CASE WHEN status = 'SUCCESS' THEN response_time END)) as avg_response_time,
                        COUNT(CASE WHEN status = 'SUCCESS' AND response_time < 5000 THEN 1 END) as ca001_compliant
                    FROM fiscal_verifications
                `);

                status.statistics = {
                    totalVerifications: stats.total_verifications || 0,
                    successfulVerifications: stats.successful || 0,
                    failedVerifications: stats.failed || 0,
                    averageResponseTime: stats.avg_response_time || 0,
                    ca001CompliantVerifications: stats.ca001_compliant || 0,
                    successRate: stats.total_verifications > 0 ?
                        ((stats.successful / stats.total_verifications) * 100).toFixed(2) : 0
                };

                // Verificar compliance con métricas de éxito de HU-001
                status.compliance = {
                    responseTimeTarget: status.statistics.averageResponseTime < 5000,
                    successRateTarget: parseFloat(status.statistics.successRate) > 98,
                    ca001Compliance: stats.total_verifications > 0 ?
                        ((stats.ca001_compliant / stats.successful) * 100).toFixed(2) : 100
                };

            } catch (dbError) {
                logger.warn('⚠️ Error obteniendo estadísticas de verificación:', dbError.message);
                status.statistics = { error: 'No se pudieron obtener estadísticas' };
            }
        }

        res.json(status);

    } catch (error) {
        logger.error('❌ Error en fiscal-system-status:', error);
        res.status(500).json({
            service: 'Fiscal Verification System',
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
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
// FUNCIONES DE LIMPIEZA Y MANTENIMIENTO
// ==============================================

// Función para limpiar histórico antiguo (opcional)
async function cleanupOldVerifications() {
    if (!db) return;

    try {
        const retentionDays = process.env.VERIFICATION_RETENTION_DAYS || 90;

        const result = await db.run(`
            DELETE FROM fiscal_verifications 
            WHERE verification_date < datetime('now', '-${retentionDays} days')
        `);

        if (result.changes > 0) {
            logger.info(`🧹 Limpieza automática: ${result.changes} verificaciones antiguas eliminadas`);
        }

    } catch (error) {
        logger.error('❌ Error en limpieza automática:', error);
    }
}

// Programar limpieza automática cada 24 horas
if (process.env.NODE_ENV === 'production') {
    setInterval(cleanupOldVerifications, 24 * 60 * 60 * 1000); // 24 horas
}

// ==============================================
// ENDPOINTS DE DEBUGGING Y DESARROLLO
// ==============================================

// Solo en desarrollo: endpoints para debugging
if (process.env.NODE_ENV === 'development') {

    // Endpoint para resetear datos de prueba
    app.post('/api/dev/reset-fiscal-data', async (req, res) => {
        if (!db) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        try {
            await db.run('DELETE FROM fiscal_verifications');

            // Insertar datos de prueba
            const testData = [
                {
                    cuit: '30500010912',
                    status: 'SUCCESS',
                    fiscal_data: JSON.stringify({
                        razonSocial: 'MERCADOLIBRE S.R.L.',
                        estado: 'ACTIVO',
                        situacionFiscal: { iva: 'RESPONSABLE_INSCRIPTO' }
                    }),
                    response_time: 1250,
                    source: 'MOCK',
                    verification_id: 'dev_reset_001'
                },
                {
                    cuit: '27230938607',
                    status: 'SUCCESS',
                    fiscal_data: JSON.stringify({
                        razonSocial: 'RODRIGUEZ MARIA LAURA',
                        estado: 'ACTIVO',
                        situacionFiscal: { iva: 'MONOTRIBUTO' }
                    }),
                    response_time: 1890,
                    source: 'MOCK',
                    verification_id: 'dev_reset_002'
                }
            ];

            for (const data of testData) {
                await db.run(`
                    INSERT INTO fiscal_verifications 
                    (cuit, status, fiscal_data, response_time, source, verification_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [data.cuit, data.status, data.fiscal_data, data.response_time, data.source, data.verification_id]);
            }

            logger.info('🔄 Datos de verificación fiscal reseteados con datos de prueba');

            res.json({
                success: true,
                message: 'Datos de verificación fiscal reseteados',
                testDataInserted: testData.length
            });

        } catch (error) {
            logger.error('❌ Error reseteando datos:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Endpoint para simular carga de trabajo
    app.post('/api/dev/simulate-load', async (req, res) => {
        const { count = 10, delayMs = 100 } = req.body;

        try {
            logger.info(`🏃 Simulando ${count} verificaciones con delay de ${delayMs}ms`);

            const results = [];
            for (let i = 0; i < count; i++) {
                const randomCuit = `20${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}${Math.floor(Math.random() * 10)}`;
                const randomResponseTime = Math.floor(Math.random() * 4000) + 1000; // 1-5 segundos

                if (db) {
                    await db.run(`
                        INSERT INTO fiscal_verifications 
                        (cuit, status, response_time, source, verification_id)
                        VALUES (?, ?, ?, ?, ?)
                    `, [randomCuit, 'SUCCESS', randomResponseTime, 'SIMULATED', `sim_${Date.now()}_${i}`]);
                }

                results.push({ cuit: randomCuit, responseTime: randomResponseTime });

                if (delayMs > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }

            res.json({
                success: true,
                message: `${count} verificaciones simuladas completadas`,
                results: results
            });

        } catch (error) {
            logger.error('❌ Error simulando carga:', error);
            res.status(500).json({ error: error.message });
        }
    });
}

// ==============================================
// CONFIGURAR WEBSOCKET
// ==============================================

// Crear servidor HTTP
const server = createServer(app);

// Configurar WebSocket
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    logger.info('Cliente WebSocket conectado');

    // Enviar mensaje de bienvenida
    ws.send(JSON.stringify({
        type: 'welcome',
        message: `Conectado a AFIP Monitor MCP (${config.afipMockMode ? 'MOCK' : 'REAL'})`,
        groqEnabled: !!groqClient,
        emailNotifications: notificationConfig.email.enabled,
        fiscalVerificationEnabled: true,
        timestamp: new Date().toISOString()
    }));

    // Simular alertas periódicas
    const alertInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                type: 'alert',
                data: {
                    id: Date.now(),
                    message: `Verificación automática completada (${config.afipMockMode ? 'MOCK' : 'REAL'})`,
                    level: 'info',
                    timestamp: new Date().toISOString()
                }
            }));
        }
    }, 30000); // Cada 30 segundos

    ws.on('close', () => {
        clearInterval(alertInterval);
        logger.info('Cliente WebSocket desconectado');
    });
});

// ==============================================
// MANEJO GRACEFUL DE CIERRE
// ==============================================

async function gracefulShutdown(signal) {
    logger.info(`📡 Señal ${signal} recibida. Iniciando cierre graceful...`);

    try {
        // Cerrar base de datos si está abierta
        if (db) {
            await db.close();
            logger.info('✅ Base de datos cerrada correctamente');
        }

        // Cerrar servidor HTTP
        if (server) {
            server.close(() => {
                logger.info('✅ Servidor HTTP cerrado');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }

    } catch (error) {
        logger.error('❌ Error durante cierre graceful:', error);
        process.exit(1);
    }
}

// Escuchar señales de cierre
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
    console.log(`🗄️ Database: ${db ? '✅ CONECTADA' : '❌ DESCONECTADA'}`);

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

    // Endpoints OCR
    console.log(`   📄 OCR Upload: http://${config.host}:${config.port}/api/ocr/upload`);
    console.log(`   🧾 Extract Invoice: http://${config.host}:${config.port}/api/ocr/extract-invoice`);
    console.log(`   🏦 Extract Bank: http://${config.host}:${config.port}/api/ocr/extract-bank-statement`);
    console.log(`   📊 OCR Stats: http://${config.host}:${config.port}/api/ocr/stats/[clientId]`);
    console.log(`   📋 OCR History: http://${config.host}:${config.port}/api/ocr/history/[clientId]`);

    // Nuevos endpoints HU-001
    console.log(`   🎯 Fiscal Verify: http://${config.host}:${config.port}/api/fiscal/verify`);
    console.log(`   📊 Fiscal History: http://${config.host}:${config.port}/api/fiscal/history/[cuit]`);
    console.log(`   📈 Fiscal Stats: http://${config.host}:${config.port}/api/fiscal/stats`);
    console.log(`   🔍 Fiscal Status: http://${config.host}:${config.port}/api/fiscal-system-status`);

    if (groqClient && groqClient.isInitialized) {
        console.log(`   • Chat IA: http://${config.host}:${config.port}/api/groq/chat`);
        console.log(`   • Estado IA: http://${config.host}:${config.port}/api/groq/status`);
    }

    // Sistema de Verificación Fiscal (HU-001)
    logger.info('🎯 Sistema de Verificación Fiscal (HU-001) inicializado');
    logger.info('📋 Criterios de Aceptación configurados:');
    logger.info('   ✅ CA-001: Verificación automática < 5 segundos');
    logger.info('   ✅ CA-002: Información detallada de contribuyentes');
    logger.info('   ✅ CA-003: Manejo de errores con mensajes claros');
    logger.info(`   ${db ? '✅' : '❌'} CA-004: Histórico de verificaciones`);
    logger.info('');
    logger.info('📊 Métricas de Éxito objetivo:');
    logger.info('   • Tiempo de respuesta: < 5 segundos (95% de casos)');
    logger.info('   • Tasa de éxito: > 98%');
    logger.info('   • Errores críticos: 0 en producción');
    logger.info('   • Satisfacción del usuario: > 4.5/5');

    // Mostrar CUITs de prueba disponibles
    console.log('\n🧪 CUITs de prueba disponibles:');
    console.log('   • Casos normales: 30500010912, 27230938607, 20123456789');
    console.log('   • Casos problemáticos:', PROBLEMATIC_TEST_CUITS.join(', '));
    console.log('');
    console.log('🚀 Para probar HU-001:');
    console.log(`   curl -X POST http://${config.host}:${config.port}/api/fiscal/verify \\`);
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"cuit":"30500010912"}\'');
    console.log('');
});

export { db, app, server };