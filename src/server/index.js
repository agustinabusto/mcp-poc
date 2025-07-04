#!/usr/bin/env node

import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import axios from 'axios';

// Cargar variables de entorno
dotenv.config();

// Importar datos mock realistas
import { getRealisticTaxpayerInfo } from './services/mock-realistic-data.js';
import {
    getProblematicTaxpayerInfo,
    calculateProblematicCompliance,
    generateAutomaticAlerts,
    PROBLEMATIC_TEST_CUITS,
    getProblematicSummary
} from './services/compliance-problematic-case.js';

// Importar servicio de notificaciones
import { NotificationService } from './services/notification-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración básica
const config = {
    port: process.env.PORT || 8080,
    host: process.env.HOST || '0.0.0.0',
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    },
    afipMockMode: process.env.AFIP_MOCK_MODE === 'true'
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
// CREAR APLICACIÓN EXPRESS
// ==============================================

const app = express();

// Middleware básico
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ==============================================
// CONFIGURAR SERVICIOS
// ==============================================

// Crear servicio de notificaciones
const notificationService = new NotificationService(notificationConfig, console);

// Configurar suscripciones por defecto
notificationService.setupDefaultSubscriptions();

// ==============================================
// FUNCIONES AUXILIARES AFIP
// ==============================================

// Función para consultar AFIP Real
async function getAfipTaxpayerInfo(cuit) {
    try {
        const cleanCuit = cuit.replace(/[-\s]/g, '');
        const afipUrl = `https://soa.afip.gob.ar/sr-padron/v2/persona/${cleanCuit}`;

        console.log(`🔍 Consultando AFIP Real: ${afipUrl}`);

        const response = await axios.get(afipUrl, {
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'AFIP-Monitor-MCP/1.0'
            }
        });

        if (response.data) {
            return normalizeAfipResponse(response.data);
        } else {
            throw new Error('No se encontraron datos en AFIP');
        }
    } catch (error) {
        console.error('❌ Error consultando AFIP:', error.message);
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
            monotributo: data.categoriasMonotributo?.length > 0 ? 'INSCRIPTO' : 'NO_INSCRIPTO'
        },
        domicilio: {
            direccion: data.domicilioFiscal?.direccion || 'Sin datos',
            localidad: data.domicilioFiscal?.localidad || 'Sin datos',
            provincia: data.domicilioFiscal?.provincia || 'Sin datos'
        },
        actividades: data.actividades?.map(act => ({
            codigo: act.idActividad,
            descripcion: act.descripcionActividad,
            principal: act.nomenclador === 883
        })) || [],
        fechaUltimaActualizacion: new Date().toISOString(),
        fuente: 'AFIP_REAL'
    };
}

// Determinar estado IVA
function determineIVAStatus(data) {
    if (data.categoriasMonotributo?.length > 0) {
        return 'MONOTRIBUTO';
    }

    const ivaImpuesto = data.impuestos?.find(i => i.idImpuesto === 30);
    if (ivaImpuesto) {
        return 'RESPONSABLE_INSCRIPTO';
    }

    return 'NO_INSCRIPTO';
}

// Datos Mock para fallback (ahora usa datos realistas)
function getMockTaxpayerInfo(cuit) {
    // Primero buscar en casos problemáticos
    const problematicData = getProblematicTaxpayerInfo(cuit);
    if (problematicData) {
        return problematicData;
    }

    // Si no es problemático, usar datos normales
    return getRealisticTaxpayerInfo(cuit);
}

// Función para calcular score de compliance
function calculateComplianceScore(taxpayerData) {
    // Si es un caso problemático, usar cálculo especializado
    if (taxpayerData.fuente === 'MOCK_PROBLEMATIC') {
        const result = calculateProblematicCompliance(taxpayerData);
        return result.score;
    }

    // Cálculo normal para casos regulares
    let score = 0;

    // Estado activo +30 puntos
    if (taxpayerData.estado === 'ACTIVO') score += 30;

    // IVA registrado +25 puntos
    if (taxpayerData.situacionFiscal.iva !== 'NO_INSCRIPTO') score += 25;

    // Actividades registradas +20 puntos
    if (taxpayerData.actividades && taxpayerData.actividades.length > 0) score += 20;

    // Domicilio completo +15 puntos
    if (taxpayerData.domicilio.direccion !== 'Sin datos') score += 15;

    // Bonus por datos reales +10 puntos
    if (taxpayerData.fuente === 'AFIP_REAL') score += 10;

    return Math.min(score, 100);
}

// Función para generar recomendaciones
function generateRecommendations(taxpayerData) {
    const recommendations = [];

    // Si es un caso problemático, usar recomendaciones especializadas
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
        emailNotifications: notificationConfig.email.enabled,
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            api: '/api/status',
            taxpayer: '/api/afip/taxpayer/:cuit',
            alerts: '/api/alerts',
            compliance: '/api/compliance/check',
            notifications: '/api/notifications/*'
        },
        docs: 'https://github.com/snarx-io/afip-monitor-mcp',
        author: 'Snarx.io'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        afipMode: config.afipMockMode ? 'MOCK' : 'REAL',
        emailNotifications: notificationConfig.email.enabled,
        version: '1.0.0'
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        server: 'AFIP Monitor MCP',
        status: 'running',
        afipMode: config.afipMockMode ? 'MOCK' : 'REAL',
        emailNotifications: notificationConfig.email.enabled,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// ==============================================
// ENDPOINTS DE NOTIFICACIONES
// ==============================================

// Endpoint para configurar suscripciones
app.post('/api/notifications/subscribe', (req, res) => {
    try {
        const { alertType, email, channels } = req.body;

        if (!alertType || !email) {
            return res.status(400).json({
                error: 'alertType y email son requeridos'
            });
        }

        const subscription = notificationService.subscribe(
            alertType,
            email,
            channels || ['email']
        );

        res.json({
            success: true,
            message: 'Suscripción creada exitosamente',
            subscription,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            error: 'Error creando suscripción',
            message: error.message
        });
    }
});

// Endpoint para enviar email de prueba
app.post('/api/notifications/test-email', async (req, res) => {
    try {
        const { to } = req.body;

        if (!to) {
            return res.status(400).json({
                error: 'Email destinatario es requerido'
            });
        }

        const result = await notificationService.sendTestEmail(to);

        res.json({
            success: true,
            message: 'Email de prueba enviado',
            result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            error: 'Error enviando email de prueba',
            message: error.message
        });
    }
});

// Endpoint para obtener estadísticas de notificaciones
app.get('/api/notifications/stats', (req, res) => {
    const stats = notificationService.getStats();

    res.json({
        message: 'Estadísticas de notificaciones',
        stats,
        timestamp: new Date().toISOString()
    });
});

// ==============================================
// ENDPOINTS PRINCIPALES DE AFIP
// ==============================================

// ENDPOINT PRINCIPAL - Ahora usa AFIP Real o Mock según configuración
app.get('/api/afip/taxpayer/:cuit', async (req, res) => {
    const { cuit } = req.params;

    console.log(`📊 Consultando contribuyente: ${cuit} (Modo: ${config.afipMockMode ? 'MOCK' : 'REAL'})`);

    try {
        let taxpayerData;

        if (config.afipMockMode) {
            // Modo MOCK
            console.log('🎭 Usando datos simulados');
            taxpayerData = getMockTaxpayerInfo(cuit);
        } else {
            // Modo REAL
            console.log('🌐 Consultando AFIP Real');
            try {
                taxpayerData = await getAfipTaxpayerInfo(cuit);
                console.log('✅ Datos obtenidos de AFIP Real');
            } catch (afipError) {
                console.warn('⚠️ Error en AFIP Real, usando fallback Mock:', afipError.message);
                taxpayerData = getMockTaxpayerInfo(cuit);
                taxpayerData.fuente = 'MOCK_FALLBACK';
            }
        }

        res.json(taxpayerData);

    } catch (error) {
        console.error('❌ Error general:', error);
        res.status(500).json({
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
            error: 'CUIT y período son requeridos',
            timestamp: new Date().toISOString()
        });
    }

    console.log(`🔍 Verificando compliance: ${cuit} (Modo: ${config.afipMockMode ? 'MOCK' : 'REAL'})`);

    try {
        // Obtener datos del contribuyente para el análisis
        let taxpayerData;
        if (config.afipMockMode) {
            taxpayerData = getMockTaxpayerInfo(cuit);
        } else {
            try {
                taxpayerData = await getAfipTaxpayerInfo(cuit);
            } catch (error) {
                taxpayerData = getMockTaxpayerInfo(cuit);
            }
        }

        // Calcular compliance basado en datos reales
        const complianceScore = calculateComplianceScore(taxpayerData);
        const recommendations = generateRecommendations(taxpayerData);

        // Generar alertas si es problemático
        let alerts = [];
        let complianceDetails = {};

        if (taxpayerData.fuente === 'MOCK_PROBLEMATIC') {
            const problematicResult = calculateProblematicCompliance(taxpayerData);
            complianceDetails = problematicResult;
            alerts = taxpayerData.alertasGeneradas || [];
        }

        const complianceResult = {
            cuit,
            period,
            score: complianceScore,
            status: complianceScore >= 80 ? 'GOOD' : complianceScore >= 60 ? 'WARNING' : 'CRITICAL',
            dataSource: taxpayerData.fuente,
            checks: [
                {
                    name: 'fiscal_status',
                    passed: taxpayerData.estado === 'ACTIVO',
                    score: taxpayerData.estado === 'ACTIVO' ? 100 : 0,
                    message: `Estado fiscal: ${taxpayerData.estado}`
                },
                {
                    name: 'iva_compliance',
                    passed: taxpayerData.situacionFiscal.iva !== 'NO_INSCRIPTO',
                    score: taxpayerData.situacionFiscal.iva !== 'NO_INSCRIPTO' ? 90 : 60,
                    message: `IVA: ${taxpayerData.situacionFiscal.iva}`
                },
                {
                    name: 'activities_registered',
                    passed: taxpayerData.actividades && taxpayerData.actividades.length > 0,
                    score: taxpayerData.actividades && taxpayerData.actividades.length > 0 ? 85 : 30,
                    message: `Actividades registradas: ${taxpayerData.actividades?.length || 0}`
                }
            ],
            recommendations,
            alerts,
            complianceDetails,
            timestamp: new Date().toISOString()
        };

        // 📧 ENVIAR NOTIFICACIÓN SI SE SOLICITA O SI ES CRÍTICO
        if (sendNotification || complianceScore < 50) {
            try {
                const notificationResult = await notificationService.processAlert(
                    taxpayerData,
                    {
                        score: complianceScore,
                        status: complianceResult.status,
                        alerts: alerts
                    }
                );

                complianceResult.notificationSent = true;
                complianceResult.notificationDetails = notificationResult;

                console.log(`📧 Notificación enviada automáticamente para ${cuit}`);

            } catch (notificationError) {
                console.error('❌ Error enviando notificación:', notificationError);
                complianceResult.notificationSent = false;
                complianceResult.notificationError = notificationError.message;
            }
        }

        res.json(complianceResult);

    } catch (error) {
        console.error('❌ Error en compliance check:', error);
        res.status(500).json({
            error: 'Error verificando compliance',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==============================================
// ENDPOINTS ADICIONALES
// ==============================================

// Endpoint para alertas (ahora incluye casos problemáticos)
app.get('/api/alerts', (req, res) => {
    const mockAlerts = [
        {
            id: 1,
            type: 'compliance',
            severity: 'critical',
            message: 'EMPRESA PROBLEMATICA S.A. (20111222333) - Sin actividades registradas',
            timestamp: new Date().toISOString(),
            resolved: false,
            cuit: '20111222333',
            actions: ['Registrar actividades F.420', 'Contactar contador']
        },
        {
            id: 2,
            type: 'financial',
            severity: 'high',
            message: 'GOMEZ CARLOS ALBERTO (27999888777) - Recategorización monotributo vencida',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            resolved: false,
            cuit: '27999888777',
            actions: ['Recategorizar monotributo', 'Verificar ingresos']
        },
        {
            id: 3,
            type: 'compliance',
            severity: 'critical',
            message: 'SERVICIOS DISCONTINUADOS S.R.L. (30555666777) - Contribuyente INACTIVO',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            resolved: false,
            cuit: '30555666777',
            actions: ['Regularizar situación fiscal', 'Contactar AFIP']
        },
        {
            id: 4,
            type: 'labor',
            severity: 'critical',
            message: 'CONSTRUCTORA IRREGULAR S.A. (30777888999) - Empleados en negro detectados',
            timestamp: new Date(Date.now() - 10800000).toISOString(),
            resolved: false,
            cuit: '30777888999',
            actions: ['Blanquear empleados', 'Regularizar situación laboral']
        }
    ];

    res.json(mockAlerts);
});

// Endpoint para casos problemáticos
app.get('/api/afip/problematic-cuits', (req, res) => {
    const summary = getProblematicSummary();

    res.json({
        message: 'CUITs problemáticos para testing de compliance',
        ...summary,
        timestamp: new Date().toISOString()
    });
});

// Endpoint para demostración completa
app.post('/api/demo/problematic-case', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email es requerido para la demostración'
            });
        }

        // Usar caso problemático
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
            cuit: problematicCuit,
            taxpayer: taxpayerData.razonSocial,
            complianceScore: complianceResult.alertType,
            emailSent: complianceResult.successful > 0,
            notificationResults: complianceResult.results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
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
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Ruta 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Recurso no encontrado',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// ==============================================
// CONFIGURAR WEBSOCKET
// ==============================================

// Crear servidor HTTP
const server = createServer(app);

// Configurar WebSocket
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado');

    // Enviar mensaje de bienvenida
    ws.send(JSON.stringify({
        type: 'welcome',
        message: `Conectado a AFIP Monitor MCP (${config.afipMockMode ? 'MOCK' : 'REAL'})`,
        emailNotifications: notificationConfig.email.enabled,
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
                    timestamp: new Date().toISOString()
                }
            }));
        }
    }, 30000); // Cada 30 segundos

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Mensaje recibido:', data);

            // Echo del mensaje
            ws.send(JSON.stringify({
                type: 'echo',
                data: data,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    });

    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado');
        clearInterval(alertInterval);
    });
});

// ==============================================
// INICIAR SERVIDOR
// ==============================================

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Recibido SIGTERM, cerrando servidor...');
    server.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Recibido SIGINT, cerrando servidor...');
    server.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
    });
});

// Iniciar servidor
server.listen(config.port, config.host, () => {
    console.log(`🚀 AFIP Monitor MCP Server iniciado`);
    console.log(`📊 Servidor: http://${config.host}:${config.port}`);
    console.log(`🔍 Health: http://${config.host}:${config.port}/health`);
    console.log(`📡 WebSocket: ws://${config.host}:${config.port}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🎯 Modo AFIP: ${config.afipMockMode ? '🎭 MOCK' : '🌐 REAL'}`);
    console.log(`📧 Email: ${notificationConfig.email.enabled ? '✅ HABILITADO' : '❌ DESHABILITADO'}`);

    // Mensaje informativo
    if (config.afipMockMode) {
        console.log('💡 Para usar AFIP Real, cambiar AFIP_MOCK_MODE=false en .env');
    } else {
        console.log('🌐 Modo AFIP Real activado - Consultando servicios reales');
    }

    if (notificationConfig.email.enabled) {
        console.log(`📬 Proveedor de email: ${notificationConfig.email.provider}`);
    }
});

export { app, server };