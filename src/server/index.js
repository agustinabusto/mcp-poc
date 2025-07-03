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
    afipMockMode: process.env.AFIP_MOCK_MODE === 'true' // ✅ Ahora lee correctamente
};

// Crear aplicación Express
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

// ===== FUNCIONES AUXILIARES AFIP =====

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

// Importar datos mock realistas
import { getRealisticTaxpayerInfo } from './services/mock-realistic-data.js';
import {
    getProblematicTaxpayerInfo,
    calculateProblematicCompliance,
    generateAutomaticAlerts,
    PROBLEMATIC_TEST_CUITS,
    getProblematicSummary
} from './services/compliance-problematic-case.js';

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

// ===== RUTAS =====

// Rutas básicas
app.get('/', (req, res) => {
    res.json({
        message: 'AFIP Monitor MCP Server',
        version: '1.0.0',
        status: 'running',
        afipMode: config.afipMockMode ? 'MOCK' : 'REAL', // ✅ Indicador de modo
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            api: '/api/status',
            taxpayer: '/api/afip/taxpayer/:cuit',
            alerts: '/api/alerts',
            compliance: '/api/compliance/check'
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
        afipMode: config.afipMockMode ? 'MOCK' : 'REAL', // ✅ Indicador de modo
        version: '1.0.0'
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        server: 'AFIP Monitor MCP',
        status: 'running',
        afipMode: config.afipMockMode ? 'MOCK' : 'REAL', // ✅ Indicador de modo
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// ✅ ENDPOINT PRINCIPAL - Ahora usa AFIP Real o Mock según configuración
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
        },
        {
            id: 5,
            type: 'tax_status',
            severity: 'medium',
            message: config.afipMockMode
                ? 'Actualización requerida en datos fiscales (MOCK)'
                : 'Actualización requerida en datos fiscales (REAL)',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            resolved: false
        }
    ];

    res.json(mockAlerts);
});

// Endpoint para compliance
app.post('/api/compliance/check', async (req, res) => {
    const { cuit, period } = req.body;

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
        const complianceResult = {
            cuit,
            period,
            score: calculateComplianceScore(taxpayerData),
            status: taxpayerData.estado === 'ACTIVO' ? 'GOOD' : 'WARNING',
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
                    passed: taxpayerData.actividades.length > 0,
                    score: taxpayerData.actividades.length > 0 ? 85 : 30,
                    message: `Actividades registradas: ${taxpayerData.actividades.length}`
                }
            ],
            recommendations: generateRecommendations(taxpayerData),
            timestamp: new Date().toISOString()
        };

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

// Ruta para documentación básica
app.get('/docs', (req, res) => {
    res.json({
        title: 'AFIP Monitor MCP API Documentation',
        version: '1.0.0',
        description: 'API para monitoreo automático de AFIP con alertas proactivas',
        afipMode: config.afipMockMode ? 'MOCK' : 'REAL',
        endpoints: {
            'GET /': 'Información general del servidor',
            'GET /health': 'Health check del servidor',
            'GET /api/status': 'Estado detallado del servidor',
            'GET /api/afip/taxpayer/:cuit': 'Consulta datos de contribuyente',
            'GET /api/alerts': 'Lista de alertas activas',
            'POST /api/compliance/check': 'Verificación de compliance fiscal'
        },
        websocket: {
            url: 'ws://localhost:8080',
            events: ['welcome', 'alert', 'echo']
        },
        examples: {
            taxpayer: {
                url: '/api/afip/taxpayer/20123456789',
                method: 'GET'
            },
            compliance: {
                url: '/api/compliance/check',
                method: 'POST',
                body: {
                    cuit: '20123456789',
                    period: { year: 2024, month: 12 }
                }
            }
        },
        author: 'Snarx.io',
        repository: 'https://github.com/snarx-io/afip-monitor-mcp'
    });
});

// Ruta para probar conectividad
app.get('/ping', (req, res) => {
    res.json({
        message: 'pong',
        timestamp: new Date().toISOString(),
        server: 'AFIP Monitor MCP',
        afipMode: config.afipMockMode ? 'MOCK' : 'REAL'
    });
});

// ✅ NUEVA RUTA - Test de conectividad AFIP
app.get('/api/afip/test', async (req, res) => {
    try {
        console.log('🧪 Probando conectividad con AFIP...');

        // Probar con CUIT conocido
        const testCuit = '20123456789';
        const afipUrl = `https://soa.afip.gob.ar/sr-padron/v2/persona/${testCuit}`;

        const response = await axios.get(afipUrl, {
            timeout: 5000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'AFIP-Monitor-MCP/1.0'
            }
        });

        res.json({
            status: 'success',
            message: 'Conectividad con AFIP exitosa',
            testCuit: testCuit,
            afipResponse: response.status === 200,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.json({
            status: 'error',
            message: 'Error conectando con AFIP',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ✅ NUEVA RUTA - CUITs de prueba disponibles
app.get('/api/afip/test-cuits', (req, res) => {
    const { AVAILABLE_TEST_CUITS, getMockStats } = require('./services/mock-realistic-data.js');

    res.json({
        message: 'CUITs disponibles para testing',
        cuits: AVAILABLE_TEST_CUITS,
        stats: getMockStats(),
        examples: [
            {
                cuit: '30500010912',
                description: 'AFIP - Organismo público'
            },
            {
                cuit: '27230938607',
                description: 'Persona física - Monotributo'
            },
            {
                cuit: '20123456789',
                description: 'Responsable Inscripto'
            },
            {
                cuit: '30123456789',
                description: 'Empresa con múltiples actividades'
            }
        ],
        timestamp: new Date().toISOString()
    });
});

// ✅ NUEVA RUTA - CUITs problemáticos para testing
app.get('/api/afip/problematic-cuits', (req, res) => {
    const summary = getProblematicSummary();

    res.json({
        message: 'CUITs problemáticos para testing de compliance',
        ...summary,
        timestamp: new Date().toISOString()
    });
});

// ✅ NUEVA RUTA - Generar alertas automáticas
app.get('/api/alerts/generate/:cuit', async (req, res) => {
    try {
        const { cuit } = req.params;
        console.log(`🚨 Generando alertas para CUIT: ${cuit}`);

        const taxpayerData = getMockTaxpayerInfo(cuit);

        if (taxpayerData.fuente === 'MOCK_PROBLEMATIC') {
            const alerts = generateAutomaticAlerts(taxpayerData);

            res.json({
                cuit,
                razonSocial: taxpayerData.razonSocial,
                alertasGeneradas: alerts.length,
                alerts,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                cuit,
                razonSocial: taxpayerData.razonSocial,
                alertasGeneradas: 0,
                message: 'Contribuyente sin problemas detectados',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        res.status(500).json({
            error: 'Error generando alertas',
            message: error.message
        });
    }
});

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

    // Mensaje informativo
    if (config.afipMockMode) {
        console.log('💡 Para usar AFIP Real, cambiar AFIP_MOCK_MODE=false en .env');
    } else {
        console.log('🌐 Modo AFIP Real activado - Consultando servicios reales');
    }
});

export { app, server };