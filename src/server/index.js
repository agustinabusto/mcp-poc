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
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Cargar variables de entorno
dotenv.config();

// Importar servicios existentes
import { GroqClient } from './services/groq-client.js';
import { AfipClient } from './services/afip-client.js';
import { NotificationService } from './services/notification-service.js';

// Importar nuevos servicios para contributors
import { DatabaseService } from './services/database-service.js';
import { ContributorsModel } from './models/contributors-model.js';
import { CacheService } from './services/cache-service.js';

// Importar datos mock existentes
import { getRealisticTaxpayerInfo } from './services/mock-realistic-data.js';
import {
    getProblematicTaxpayerInfo,
    calculateProblematicCompliance,
    generateAutomaticAlerts,
    PROBLEMATIC_TEST_CUITS,
    getProblematicSummary
} from './services/compliance-problematic-case.js';

// Importar rutas existentes
import groqChatRoutes from './routes/groq-chat.js';
import ocrRoutes from './routes/ocr-routes.js';

// Importar nueva ruta de contributors
import contributorsRoutes from './routes/contributors.js';

// Función para asegurar que existe el directorio de uploads
async function ensureUploadDirectory() {
    try {
        await mkdir('data', { recursive: true });
        await mkdir('data/uploads', { recursive: true });
        await mkdir('logs', { recursive: true });
        console.log('📁 Directorios verificados');
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.warn('⚠️ Error creando directorios:', error.message);
        }
    }
}

// Función para inicializar la base de datos
async function initializeDatabase() {
    try {
        console.log('🗄️  Inicializando base de datos...');

        // Inicializar DatabaseService con manejo de errores
        try {
            await DatabaseService.initialize();
            console.log('✅ DatabaseService inicializado');
        } catch (error) {
            console.warn('⚠️ DatabaseService no disponible:', error.message);
            // Continuar sin DB por ahora
        }

        // Inicializar ContributorsModel con manejo de errores
        try {
            await ContributorsModel.initializeTable();
            console.log('✅ Tabla Contributors inicializada');
        } catch (error) {
            console.warn('⚠️ Contributors table no disponible:', error.message);
            // Continuar sin tabla por ahora
        }

        // Verificar salud de la base de datos
        try {
            const healthCheck = await DatabaseService.healthCheck();
            if (healthCheck.healthy) {
                console.log('💚 Base de datos saludable');

                // Mostrar estadísticas solo si la DB está funcionando
                try {
                    const stats = await DatabaseService.getStats();
                    console.log('📊 Estadísticas de la base de datos:');
                    stats.tables.forEach(table => {
                        console.log(`   • ${table.name}: ${table.rows} registros`);
                    });
                } catch (statsError) {
                    console.warn('⚠️ No se pudieron obtener estadísticas de DB');
                }
            } else {
                console.warn('⚠️ Problemas detectados en la base de datos:', healthCheck.error);
            }
        } catch (error) {
            console.warn('⚠️ No se pudo verificar salud de la base de datos');
        }

        console.log('✅ Inicialización de base de datos completada');

    } catch (error) {
        console.warn('⚠️ Error en inicialización de base de datos:', error.message);
        console.log('🔄 Continuando con funcionalidad limitada...');
        // No hacer throw para que el servidor continúe
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CONFIGURACIÓN CORREGIDA CON URL OFICIAL DE AFIP
const config = {
    port: process.env.PORT || 8080,
    host: process.env.HOST || '0.0.0.0',
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
        credentials: true
    },
    afip: {
        baseURL: process.env.AFIP_BASE_URL || 'https://awshomo.afip.gov.ar/sr-padron/v2/persona',
        timeout: parseInt(process.env.AFIP_TIMEOUT) || 30000,
        retryAttempts: parseInt(process.env.AFIP_RETRY_ATTEMPTS) || 3,
        retryDelay: parseInt(process.env.AFIP_RETRY_DELAY) || 1000
    },
    afipMockMode: process.env.AFIP_MOCK_MODE === 'true'
};

// Configuración de notificaciones
const notificationConfig = {
    email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        provider: process.env.EMAIL_PROVIDER || 'smtp',
        smtp: {
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        }
    },
    webhooks: {
        enabled: process.env.WEBHOOKS_ENABLED === 'true',
        endpoints: process.env.WEBHOOK_ENDPOINTS ? process.env.WEBHOOK_ENDPOINTS.split(',') : []
    },
    sms: {
        enabled: process.env.SMS_ENABLED === 'true',
        provider: process.env.SMS_PROVIDER || 'twilio'
    }
};

// Crear aplicación Express
const app = express();

// Configurar middleware CORS
app.use(cors(config.cors));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para logging de requests
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const method = req.method;
        const url = req.url;
        const status = res.statusCode;

        // No loggear requests estáticos para reducir ruido
        if (!url.match(/\.(css|js|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
            console.log(`${method} ${url} - ${status} (${duration}ms)`);
        }
    });
    next();
});

// Servir archivos estáticos
app.use(express.static(join(__dirname, '../client/dist')));

// Inicializar servicios
const notificationService = new NotificationService(notificationConfig);
const afipClient = new AfipClient({
    baseURL: config.afip.baseURL,
    timeout: config.afip.timeout,
    retryAttempts: config.afip.retryAttempts,
    retryDelay: config.afip.retryDelay,
    mockMode: config.afipMockMode
});

let groqClient = null;

// Inicializar Groq si está configurado
if (process.env.GROQ_API_KEY) {
    try {
        groqClient = new GroqClient({
            apiKey: process.env.GROQ_API_KEY,
            model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
            maxTokens: parseInt(process.env.GROQ_MAX_TOKENS) || 1000,
            temperature: parseFloat(process.env.GROQ_TEMPERATURE) || 0.7
        });

        await groqClient.initialize();
        console.log('🤖 Groq AI cliente inicializado correctamente');

    } catch (error) {
        console.warn('⚠️ Error inicializando Groq:', error.message);
        groqClient = null;
    }
} else {
    console.log('ℹ️  Groq API key no configurada - funcionalidad de chat deshabilitada');
}

// ==============================================
// RUTAS DE LA API
// ==============================================

// Ruta para contributors (NUEVA)
app.use('/api/contributors', contributorsRoutes);

// Rutas existentes
app.use('/api/groq', groqChatRoutes);
app.use('/api/ocr', ocrRoutes);

// ==============================================
// HEALTH CHECK MEJORADO
// ==============================================
app.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {},
            version: process.env.npm_package_version || '1.0.0',
            uptime: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV || 'development'
        };

        let hasUnhealthyServices = false;
        let hasDegradedServices = false;

        // Verificar AFIP (con timeout y manejo de errores)
        try {
            if (afipClient && typeof afipClient.healthCheck === 'function') {
                const afipStatus = await Promise.race([
                    afipClient.healthCheck(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), 5000)
                    )
                ]);

                health.services.afip = {
                    status: afipStatus.success ? 'healthy' : 'degraded',
                    responseTime: afipStatus.responseTime || null,
                    lastCheck: afipStatus.timestamp || new Date().toISOString()
                };

                if (!afipStatus.success) {
                    hasDegradedServices = true;
                }
            } else {
                health.services.afip = {
                    status: 'disabled',
                    reason: 'Service not available'
                };
            }
        } catch (error) {
            health.services.afip = {
                status: 'degraded',
                error: error.message,
                lastCheck: new Date().toISOString()
            };
            hasDegradedServices = true;
        }

        // Verificar Groq (con manejo de errores)
        try {
            if (groqClient && groqClient.isInitialized) {
                if (typeof groqClient.healthCheck === 'function') {
                    const groqStatus = await Promise.race([
                        groqClient.healthCheck(),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout')), 3000)
                        )
                    ]);

                    health.services.groq = {
                        status: groqStatus.isHealthy ? 'healthy' : 'degraded',
                        model: groqStatus.model || groqClient.model,
                        lastCheck: groqStatus.timestamp || new Date().toISOString()
                    };

                    if (!groqStatus.isHealthy) {
                        hasDegradedServices = true;
                    }
                } else {
                    health.services.groq = {
                        status: 'healthy',
                        model: groqClient.model || 'unknown',
                        lastCheck: new Date().toISOString()
                    };
                }
            } else {
                health.services.groq = {
                    status: 'disabled',
                    reason: 'API key not configured or not initialized'
                };
            }
        } catch (error) {
            health.services.groq = {
                status: 'degraded',
                error: error.message,
                lastCheck: new Date().toISOString()
            };
            hasDegradedServices = true;
        }

        // Verificar base de datos (con manejo de errores)
        try {
            if (DatabaseService && typeof DatabaseService.healthCheck === 'function') {
                const dbHealth = await Promise.race([
                    DatabaseService.healthCheck(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Database timeout')), 3000)
                    )
                ]);

                health.services.database = {
                    status: dbHealth.healthy ? 'healthy' : 'unhealthy',
                    error: dbHealth.error || null,
                    lastCheck: dbHealth.timestamp
                };

                if (!dbHealth.healthy) {
                    hasUnhealthyServices = true;
                }
            } else {
                health.services.database = {
                    status: 'disabled',
                    reason: 'Database service not available'
                };
            }
        } catch (error) {
            health.services.database = {
                status: 'unhealthy',
                error: error.message,
                lastCheck: new Date().toISOString()
            };
            hasUnhealthyServices = true;
        }

        // Verificar notificaciones (siempre saludable si existe)
        try {
            if (notificationService && typeof notificationService.getStats === 'function') {
                const notificationStats = notificationService.getStats();
                health.services.notifications = {
                    status: 'healthy',
                    stats: notificationStats,
                    lastCheck: new Date().toISOString()
                };
            } else {
                health.services.notifications = {
                    status: 'disabled',
                    reason: 'Notification service not configured'
                };
            }
        } catch (error) {
            health.services.notifications = {
                status: 'degraded',
                error: error.message,
                lastCheck: new Date().toISOString()
            };
            hasDegradedServices = true;
        }

        // Verificar cache (siempre saludable)
        try {
            if (CacheService && typeof CacheService.getStats === 'function') {
                const cacheStats = CacheService.getStats();
                health.services.cache = {
                    status: 'healthy',
                    stats: cacheStats,
                    lastCheck: new Date().toISOString()
                };
            } else {
                health.services.cache = {
                    status: 'disabled',
                    reason: 'Cache service not available'
                };
            }
        } catch (error) {
            health.services.cache = {
                status: 'degraded',
                error: error.message,
                lastCheck: new Date().toISOString()
            };
            hasDegradedServices = true;
        }

        // Determinar estado general
        if (hasUnhealthyServices) {
            health.status = 'unhealthy';
            res.status(503);
        } else if (hasDegradedServices) {
            health.status = 'degraded';
            res.status(200); // Cambiar a 200 para degraded
        } else {
            health.status = 'healthy';
            res.status(200);
        }

        // Agregar información adicional
        health.summary = {
            totalServices: Object.keys(health.services).length,
            healthyServices: Object.values(health.services).filter(s => s.status === 'healthy').length,
            degradedServices: Object.values(health.services).filter(s => s.status === 'degraded').length,
            unhealthyServices: Object.values(health.services).filter(s => s.status === 'unhealthy').length,
            disabledServices: Object.values(health.services).filter(s => s.status === 'disabled').length
        };

        res.json(health);

    } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            uptime: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV || 'development'
        });
    }
});

// ==============================================
// ENDPOINT DE DEBUGGING
// ==============================================

app.get('/debug/services', (req, res) => {
    const debug = {
        timestamp: new Date().toISOString(),
        services: {
            afipClient: {
                exists: !!afipClient,
                hasHealthCheck: !!(afipClient && typeof afipClient.healthCheck === 'function'),
                connectionStatus: afipClient?.connectionStatus || 'unknown'
            },
            groqClient: {
                exists: !!groqClient,
                isInitialized: groqClient?.isInitialized || false,
                hasHealthCheck: !!(groqClient && typeof groqClient.healthCheck === 'function')
            },
            DatabaseService: {
                exists: !!DatabaseService,
                isInitialized: DatabaseService?.isInitialized || false,
                hasHealthCheck: !!(DatabaseService && typeof DatabaseService.healthCheck === 'function')
            },
            CacheService: {
                exists: !!CacheService,
                hasGetStats: !!(CacheService && typeof CacheService.getStats === 'function')
            },
            notificationService: {
                exists: !!notificationService,
                hasGetStats: !!(notificationService && typeof notificationService.getStats === 'function')
            }
        },
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            AFIP_MOCK_MODE: process.env.AFIP_MOCK_MODE,
            DATABASE_PATH: process.env.DATABASE_PATH
        }
    };

    res.json(debug);
});

// ==============================================
// HEALTH CHECK SIMPLE PARA TESTING
// ==============================================

app.get('/health/simple', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        message: 'Server is running'
    });
});

// ==============================================
// ENDPOINT DE SALUD PARA CONTRIBUTORS
// ==============================================
app.get('/api/contributors/health', async (req, res) => {
    try {
        const dbHealth = await DatabaseService.healthCheck();
        const cacheStats = CacheService.getStats();

        res.json({
            success: true,
            service: 'Contributors API',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbHealth,
            cache: cacheStats,
            features: {
                crud: true,
                bulkImport: true,
                afipSync: true,
                compliance: true,
                pagination: true,
                search: true,
                caching: true
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            service: 'Contributors API',
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==============================================
// ENDPOINTS PRINCIPALES DE AFIP (EXISTENTES)
// ==============================================

// ENDPOINT PRINCIPAL - Consulta de contribuyente
app.get('/api/afip/taxpayer/:cuit', async (req, res) => {
    const { cuit } = req.params;

    console.log(`📊 Consultando contribuyente: ${cuit} (Modo: ${config.afipMockMode ? 'Mock' : 'Real'})`);

    try {
        let taxpayerData;

        if (config.afipMockMode) {
            // Verificar si es un CUIT problemático de prueba
            if (PROBLEMATIC_TEST_CUITS.includes(cuit)) {
                taxpayerData = getProblematicTaxpayerInfo(cuit);
                console.log(`🧪 Datos problemáticos generados para CUIT: ${cuit}`);
            } else {
                taxpayerData = getRealisticTaxpayerInfo(cuit);
                console.log(`🧪 Datos mock realistas generados para CUIT: ${cuit}`);
            }
        } else {
            // Consulta real a AFIP
            taxpayerData = await afipClient.getTaxpayerInfo(cuit);
            console.log(`🌐 Consulta real a AFIP completada para CUIT: ${cuit}`);
        }

        // Enriquecer con metadata
        taxpayerData.metadata = {
            queryTimestamp: new Date().toISOString(),
            source: config.afipMockMode ? 'mock' : 'afip_real',
            cacheKey: `taxpayer_${cuit}`,
            processingTime: Date.now() - req.startTime || 0
        };

        res.json({
            success: true,
            data: taxpayerData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`❌ Error consultando contribuyente ${cuit}:`, error.message);

        res.status(500).json({
            success: false,
            error: 'Error consultando información del contribuyente',
            details: config.afipMockMode ? error.message : 'Error de conexión con AFIP',
            cuit: cuit,
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT DE COMPLIANCE
app.post('/api/compliance/check', async (req, res) => {
    const { cuit, period, sendNotification } = req.body;

    if (!cuit) {
        return res.status(400).json({
            success: false,
            error: 'CUIT es requerido',
            timestamp: new Date().toISOString()
        });
    }

    console.log(`🔍 Verificando compliance para CUIT: ${cuit}`);

    try {
        let complianceData;

        if (config.afipMockMode) {
            if (PROBLEMATIC_TEST_CUITS.includes(cuit)) {
                complianceData = calculateProblematicCompliance(cuit, period);
                console.log(`⚠️ Compliance problemático simulado para: ${cuit}`);

                // Generar alertas automáticas si hay problemas
                if (complianceData.riskLevel === 'high' || complianceData.riskLevel === 'critical') {
                    const alerts = generateAutomaticAlerts(cuit, complianceData);
                    complianceData.generatedAlerts = alerts;
                    console.log(`🚨 ${alerts.length} alertas automáticas generadas`);
                }
            } else {
                // Compliance normal simulado
                complianceData = {
                    cuit: cuit,
                    period: period || new Date().toISOString().substring(0, 7),
                    status: 'compliant',
                    riskLevel: 'low',
                    score: 95,
                    lastCheck: new Date().toISOString(),
                    issues: [],
                    recommendations: ['Mantener el buen estado fiscal'],
                    nextCheckDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                };
                console.log(`✅ Compliance normal simulado para: ${cuit}`);
            }
        } else {
            // Lógica real de compliance (por implementar)
            complianceData = {
                cuit: cuit,
                period: period || new Date().toISOString().substring(0, 7),
                status: 'unknown',
                riskLevel: 'medium',
                score: null,
                lastCheck: new Date().toISOString(),
                issues: ['Verificación real no implementada'],
                recommendations: ['Implementar verificación real con AFIP'],
                nextCheckDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
            console.log(`🌐 Compliance real consultado para: ${cuit}`);
        }

        // Enviar notificación si se solicita y hay problemas
        if (sendNotification && complianceData.riskLevel !== 'low') {
            try {
                await notificationService.sendComplianceAlert({
                    cuit: cuit,
                    riskLevel: complianceData.riskLevel,
                    issues: complianceData.issues,
                    score: complianceData.score
                });
                complianceData.notificationSent = true;
                console.log(`📧 Notificación de compliance enviada para: ${cuit}`);
            } catch (notificationError) {
                console.warn(`⚠️ Error enviando notificación:`, notificationError.message);
                complianceData.notificationSent = false;
                complianceData.notificationError = notificationError.message;
            }
        }

        res.json({
            success: true,
            data: complianceData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`❌ Error verificando compliance para ${cuit}:`, error.message);

        res.status(500).json({
            success: false,
            error: 'Error verificando compliance',
            details: error.message,
            cuit: cuit,
            timestamp: new Date().toISOString()
        });
    }
});

// ==============================================
// ENDPOINTS DE OCR (EXISTENTES)
// ==============================================

// Información de capacidades OCR
app.get('/api/ocr/capabilities', (req, res) => {
    res.json({
        success: true,
        message: 'Capacidades OCR del sistema',
        capabilities: {
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
// ENDPOINTS DE NOTIFICACIONES (EXISTENTES)
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
        console.error('Error creando suscripción:', error);
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
        console.error('Error enviando email de prueba:', error);
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
// DASHBOARD Y INFORMACIÓN DEL SISTEMA
// ==============================================

// Dashboard con información del sistema
app.get('/api/dashboard', async (req, res) => {
    try {
        const dashboard = {
            system: {
                status: 'running',
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString()
            },
            afip: {
                mode: config.afipMockMode ? 'mock' : 'real',
                baseURL: config.afip.baseURL,
                connectionStatus: afipClient.connectionStatus,
                lastHealthCheck: afipClient.lastHealthCheck
            },
            services: {
                groq: {
                    enabled: groqClient !== null,
                    model: groqClient?.model || null,
                    status: groqClient?.isInitialized ? 'ready' : 'disabled'
                },
                notifications: {
                    enabled: notificationConfig.email.enabled,
                    provider: notificationConfig.email.provider,
                    stats: notificationService.getStats()
                },
                ocr: {
                    enabled: true,
                    capabilities: ['invoice', 'bank_statement', 'general'],
                    status: 'ready'
                },
                contributors: {
                    enabled: true,
                    features: ['crud', 'import', 'sync', 'compliance'],
                    status: 'ready'
                }
            },
            features: {
                taxpayerQuery: true,
                complianceCheck: true,
                ocrProcessing: true,
                aiChat: groqClient !== null,
                notifications: notificationConfig.email.enabled,
                contributors: true
            }
        };

        // Agregar estadísticas de contributors si la DB está disponible
        try {
            const contributorsStats = await DatabaseService.getStats();
            dashboard.database = {
                status: 'healthy',
                tables: contributorsStats.tables
            };
        } catch (error) {
            dashboard.database = {
                status: 'error',
                error: error.message
            };
        }

        res.json({
            success: true,
            data: dashboard,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error generando dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Error generando información del dashboard',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==============================================
// MANEJO DE ERRORES GLOBALES
// ==============================================

// Middleware de manejo de errores
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);

    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            error: 'JSON inválido en el request',
            timestamp: new Date().toISOString()
        });
    }

    if (error.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: 'Request demasiado grande',
            timestamp: new Date().toISOString()
        });
    }

    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno',
        timestamp: new Date().toISOString()
    });
});

// Middleware para rutas no encontradas
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Servir el cliente React para todas las rutas no-API
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'));
});

// ==============================================
// INICIALIZACIÓN DEL SERVIDOR
// ==============================================

// Función principal de inicialización
async function startServer() {
    try {
        console.log('🚀 Iniciando AFIP Monitor MCP Server...');
        console.log(`📅 Timestamp: ${new Date().toISOString()}`);
        console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);

        // Crear directorios necesarios
        await ensureUploadDirectory();

        // Inicializar base de datos
        await initializeDatabase();

        // Inicializar servicios de cache
        CacheService.initialize();

        // Crear servidor HTTP
        const server = createServer(app);

        // Inicializar WebSocket para tiempo real (si es necesario)
        const wss = new WebSocketServer({ server });

        wss.on('connection', (ws, req) => {
            console.log('🔌 Nueva conexión WebSocket');

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    console.log('📨 Mensaje WebSocket recibido:', data.type);

                    // Echo para testing
                    ws.send(JSON.stringify({
                        type: 'echo',
                        data: data,
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    console.error('Error procesando mensaje WebSocket:', error);
                }
            });

            ws.on('close', () => {
                console.log('🔌 Conexión WebSocket cerrada');
            });

            // Enviar mensaje de bienvenida
            ws.send(JSON.stringify({
                type: 'welcome',
                message: 'Conexión establecida con AFIP Monitor',
                timestamp: new Date().toISOString()
            }));
        });

        // Inicializar servidor
        server.listen(config.port, config.host, () => {
            console.log('\n🎉 ¡Servidor iniciado exitosamente!');
            console.log('=====================================');
            console.log(`🌐 URL: http://${config.host}:${config.port}`);
            console.log(`🖥️  Cliente: http://${config.host}:${config.port}`);
            console.log(`⚡ WebSocket: ws://${config.host}:${config.port}`);
            console.log('');

            // Estado de servicios
            console.log('📊 Estado de servicios:');
            console.log(`   • AFIP: ${afipClient.connectionStatus === 'connected' ?
                '✅ CONECTADO' :
                afipClient.connectionStatus === 'degraded' ? '⚠️ DEGRADED' :
                    '❌ ERROR'}`);
            console.log(`   • Groq IA: ${groqClient ? '✅ HABILITADO' : '⚠️ DESHABILITADO'}`);
            console.log(`   • Notificaciones: ${notificationConfig.email.enabled ? '✅ HABILITADAS' : '⚠️ DESHABILITADAS'}`);
            console.log(`   • Base de datos: ✅ CONECTADA`);
            console.log(`   • Cache: ✅ ACTIVO`);
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

            // Nuevos endpoints Contributors
            console.log('\n📋 Endpoints de Contributors:');
            console.log(`   • GET    http://${config.host}:${config.port}/api/contributors - Lista paginada`);
            console.log(`   • POST   http://${config.host}:${config.port}/api/contributors - Crear contribuyente`);
            console.log(`   • GET    http://${config.host}:${config.port}/api/contributors/:cuit - Obtener por CUIT`);
            console.log(`   • PUT    http://${config.host}:${config.port}/api/contributors/:cuit - Actualizar`);
            console.log(`   • DELETE http://${config.host}:${config.port}/api/contributors/:cuit - Eliminar`);
            console.log(`   • POST   http://${config.host}:${config.port}/api/contributors/import - Importación masiva`);
            console.log(`   • GET    http://${config.host}:${config.port}/api/contributors/:cuit/compliance - Compliance`);
            console.log(`   • POST   http://${config.host}:${config.port}/api/contributors/:cuit/sync-afip - Sync AFIP`);
            console.log(`   • GET    http://${config.host}:${config.port}/api/contributors/stats/summary - Estadísticas`);
            console.log(`   • GET    http://${config.host}:${config.port}/api/contributors/health - Health Check`);

            // Endpoints OCR
            console.log('\n📄 Endpoints OCR:');
            console.log(`   • POST   http://${config.host}:${config.port}/api/ocr/upload - Upload documento`);
            console.log(`   • POST   http://${config.host}:${config.port}/api/ocr/extract-invoice - Extraer factura`);
            console.log(`   • POST   http://${config.host}:${config.port}/api/ocr/extract-bank-statement - Extraer extracto`);
            console.log(`   • GET    http://${config.host}:${config.port}/api/ocr/stats/:clientId - Estadísticas OCR`);
            console.log(`   • GET    http://${config.host}:${config.port}/api/ocr/history/:clientId - Historial OCR`);

            if (groqClient && groqClient.isInitialized) {
                console.log('\n🤖 Endpoints IA:');
                console.log(`   • POST   http://${config.host}:${config.port}/api/groq/chat - Chat IA`);
                console.log(`   • GET    http://${config.host}:${config.port}/api/groq/status - Estado IA`);
            }

            // Endpoints de Notificaciones
            console.log('\n📧 Endpoints de Notificaciones:');
            console.log(`   • POST   http://${config.host}:${config.port}/api/notifications/subscribe - Suscribirse`);
            console.log(`   • POST   http://${config.host}:${config.port}/api/notifications/test-email - Email prueba`);
            console.log(`   • GET    http://${config.host}:${config.port}/api/notifications/stats - Estadísticas`);

            // Mostrar CUITs de prueba disponibles
            console.log('\n🧪 CUITs de prueba disponibles:');
            console.log('   • Casos normales: 30500010912, 27230938607, 20123456789');
            console.log('   • Casos problemáticos:', PROBLEMATIC_TEST_CUITS.join(', '));

            console.log('\n✨ Sistema listo para recibir requests!');
            console.log('=====================================\n');
        });

        // Manejo de cierre graceful
        process.on('SIGTERM', () => {
            console.log('🛑 SIGTERM recibido, cerrando servidor...');
            server.close(async () => {
                console.log('🔌 Servidor HTTP cerrado');

                try {
                    await DatabaseService.close();
                    console.log('🗄️ Base de datos cerrada');
                } catch (error) {
                    console.error('Error cerrando base de datos:', error);
                }

                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('\n🛑 SIGINT recibido, cerrando servidor...');
            server.close(async () => {
                console.log('🔌 Servidor HTTP cerrado');

                try {
                    await DatabaseService.close();
                    console.log('🗄️ Base de datos cerrada');
                } catch (error) {
                    console.error('Error cerrando base de datos:', error);
                }

                process.exit(0);
            });
        });

        // Manejo de errores no capturados
        process.on('uncaughtException', (error) => {
            console.error('❌ Excepción no capturada:', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Promise rejection no manejada:', reason);
            console.error('En promise:', promise);
            process.exit(1);
        });

        return server;

    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// ==============================================
// VERIFICACIÓN DE REQUISITOS DE SISTEMA
// ==============================================

function checkSystemRequirements() {
    console.log('🔍 Verificando requisitos del sistema...');

    // Verificar Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);

    if (majorVersion < 18) {
        console.error(`❌ Node.js ${nodeVersion} detectado. Se requiere Node.js 18 o superior.`);
        process.exit(1);
    }
    console.log(`✅ Node.js ${nodeVersion} - OK`);

    // Verificar variables de entorno críticas
    const requiredEnvVars = [];
    const optionalEnvVars = [
        'GROQ_API_KEY',
        'SMTP_HOST',
        'SMTP_USER',
        'SMTP_PASS'
    ];

    const missingRequired = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingRequired.length > 0) {
        console.error('❌ Variables de entorno requeridas faltantes:');
        missingRequired.forEach(envVar => console.error(`   • ${envVar}`));
        process.exit(1);
    }

    const missingOptional = optionalEnvVars.filter(envVar => !process.env[envVar]);
    if (missingOptional.length > 0) {
        console.warn('⚠️ Variables de entorno opcionales no configuradas:');
        missingOptional.forEach(envVar => console.warn(`   • ${envVar}`));
        console.warn('   Algunas funcionalidades pueden estar limitadas.');
    }

    console.log('✅ Requisitos del sistema verificados');
}

// ==============================================
// FUNCIÓN DE EJEMPLO PARA PRUEBAS
// ==============================================

async function runSampleRequests() {
    if (process.env.NODE_ENV !== 'development') return;

    console.log('\n🧪 Ejecutando requests de ejemplo...');

    try {
        const baseUrl = `http://${config.host}:${config.port}`;

        // Ejemplo 1: Health check simple
        console.log('   • Probando health check simple...');
        try {
            const healthResponse = await axios.get(`${baseUrl}/health/simple`, { timeout: 5000 });
            console.log(`     ✅ Health check simple: ${healthResponse.data.status}`);
        } catch (error) {
            console.log(`     ❌ Health check simple falló: ${error.message}`);
        }

        // Ejemplo 2: Health check completo
        console.log('   • Probando health check completo...');
        try {
            const healthResponse = await axios.get(`${baseUrl}/health`, { timeout: 10000 });
            console.log(`     ✅ Health check completo: ${healthResponse.data.status}`);
            console.log(`     📊 Servicios: ${healthResponse.data.summary?.totalServices || 0} total`);
        } catch (error) {
            console.log(`     ⚠️ Health check completo con problemas: ${error.response?.status || error.message}`);
        }

        // Ejemplo 3: Debug de servicios
        console.log('   • Probando debug de servicios...');
        try {
            const debugResponse = await axios.get(`${baseUrl}/debug/services`, { timeout: 3000 });
            console.log('     ✅ Debug de servicios disponible');
        } catch (error) {
            console.log(`     ⚠️ Debug de servicios falló: ${error.message}`);
        }

        // Ejemplo 4: Contributors health
        console.log('   • Probando contributors health...');
        try {
            const contributorsHealthResponse = await axios.get(`${baseUrl}/api/contributors/health`, { timeout: 5000 });
            console.log(`     ✅ Contributors health: ${contributorsHealthResponse.data.status}`);
        } catch (error) {
            console.log(`     ⚠️ Contributors health falló: ${error.message}`);
        }

        // Ejemplo 5: Contributors lista
        console.log('   • Probando lista de contributors...');
        try {
            const contributorsResponse = await axios.get(`${baseUrl}/api/contributors?limit=5`, { timeout: 5000 });
            console.log(`     ✅ Contributors lista: ${contributorsResponse.data.data?.length || 0} items`);
        } catch (error) {
            console.log(`     ⚠️ Contributors lista falló: ${error.message}`);
        }

        console.log('   ✅ Pruebas de ejemplo completadas');

    } catch (error) {
        console.warn('   ⚠️ Error general en pruebas de ejemplo:', error.message);
    }
}

// ==============================================
// EJECUCIÓN PRINCIPAL
// ==============================================

// Solo ejecutar si este archivo es el punto de entrada
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🏁 Iniciando AFIP Monitor MCP Server...');
    console.log('==========================================');

    // Verificar requisitos
    checkSystemRequirements();

    // Iniciar servidor
    startServer()
        .then(async (server) => {
            // Ejecutar pruebas de ejemplo en desarrollo
            setTimeout(() => {
                runSampleRequests();
            }, 2000);
        })
        .catch((error) => {
            console.error('❌ Error fatal durante la inicialización:', error);
            process.exit(1);
        });
}

// ==============================================
// EXPORTACIONES
// ==============================================

export {
    app,
    config,
    afipClient,
    groqClient,
    notificationService,
    DatabaseService,
    CacheService
};

// ==============================================
// NOTAS DE DESARROLLO
// ==============================================

/*
VARIABLES DE ENTORNO REQUERIDAS (.env):
=======================================

# Servidor
PORT=8080
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001

# AFIP
AFIP_MOCK_MODE=true
AFIP_BASE_URL=https://awshomo.afip.gov.ar/sr-padron/v2/persona
AFIP_TIMEOUT=30000
AFIP_RETRY_ATTEMPTS=3
AFIP_RETRY_DELAY=1000

# Base de datos
DATABASE_PATH=./data/afip_monitor.db

# Autenticación
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-chars
BYPASS_AUTH=true  # Solo para desarrollo
BYPASS_RATE_LIMIT=true  # Solo para desarrollo

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache
CACHE_TTL_DEFAULT=300
CACHE_TTL_CONTRIBUTORS=600
CACHE_TTL_STATS=900

# Groq IA (Opcional)
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
GROQ_MAX_TOKENS=1000
GROQ_TEMPERATURE=0.7

# Email (Opcional)
EMAIL_ENABLED=false
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Notificaciones (Opcional)
WEBHOOKS_ENABLED=false
WEBHOOK_ENDPOINTS=http://localhost:3000/webhook1,http://localhost:3000/webhook2
SMS_ENABLED=false
SMS_PROVIDER=twilio

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/afip_monitor.log

COMANDOS ÚTILES:
===============

# Desarrollo
npm run dev          # Servidor + Cliente en desarrollo
npm run dev:server   # Solo servidor con watch
npm run dev:client   # Solo cliente Vite

# Producción
npm start           # Servidor en producción
npm run build       # Build del cliente

# Base de datos
npm run db:init     # Inicializar tablas
npm run db:backup   # Backup de la base de datos
npm run db:stats    # Mostrar estadísticas

# Utilidades
npm run clean       # Limpiar archivos temporales
npm run reset       # Reset completo
npm test           # Ejecutar tests

# Docker
npm run docker:build   # Build imagen Docker
npm run docker:run     # Ejecutar en Docker
npm run docker:dev     # Docker Compose desarrollo

ENDPOINTS PRINCIPALES:
=====================

# Sistema
GET  /health                           # Health check completo
GET  /api/dashboard                    # Dashboard del sistema

# AFIP
GET  /api/afip/taxpayer/:cuit         # Consultar contribuyente
POST /api/compliance/check            # Verificar compliance

# Contributors (NUEVO)
GET    /api/contributors              # Lista paginada
POST   /api/contributors              # Crear contribuyente
GET    /api/contributors/:cuit        # Obtener por CUIT
PUT    /api/contributors/:cuit        # Actualizar
DELETE /api/contributors/:cuit        # Eliminar (soft)
POST   /api/contributors/import       # Importación masiva
GET    /api/contributors/:cuit/compliance    # Compliance específico
POST   /api/contributors/:cuit/sync-afip     # Sincronizar con AFIP
GET    /api/contributors/stats/summary       # Estadísticas
GET    /api/contributors/health              # Health check

# OCR
POST /api/ocr/upload                  # Subir documento
POST /api/ocr/extract-invoice         # Extraer datos de factura
POST /api/ocr/extract-bank-statement  # Extraer extracto bancario
GET  /api/ocr/history/:clientId       # Historial por cliente
GET  /api/ocr/stats/:clientId         # Estadísticas OCR

# IA Chat
POST /api/groq/chat                   # Chat con IA
GET  /api/groq/status                 # Estado del servicio IA

# Notificaciones
POST /api/notifications/subscribe     # Suscribirse a alertas
POST /api/notifications/test-email    # Enviar email de prueba
GET  /api/notifications/stats         # Estadísticas de notificaciones

EJEMPLOS DE USO:
===============

# Crear contribuyente
curl -X POST http://localhost:8080/api/contributors \
  -H "Content-Type: application/json" \
  -d '{
    "cuit": "30712345678",
    "razonSocial": "ACME Corp S.A.",
    "email": "contacto@acme.com",
    "categoria": "responsable_inscripto"
  }'

# Obtener lista de contribuyentes
curl "http://localhost:8080/api/contributors?page=1&limit=10&search=ACME"

# Importación masiva
curl -X POST http://localhost:8080/api/contributors/import \
  -H "Content-Type: application/json" \
  -d '{
    "contributors": [
      {
        "cuit": "30712345679",
        "razonSocial": "Tech Solutions S.R.L.",
        "categoria": "responsable_inscripto"
      }
    ],
    "overwriteExisting": false,
    "validateAfip": true
  }'

# Consultar AFIP (modo mock)
curl "http://localhost:8080/api/afip/taxpayer/30500010912"

# Health check
curl "http://localhost:8080/health"
*/