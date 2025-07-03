#!/usr/bin/env node

import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

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
    }
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

// Rutas básicas
app.get('/', (req, res) => {
    res.json({
        message: 'AFIP Monitor MCP Server',
        version: '1.0.0',
        status: 'running',
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
        version: '1.0.0'
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        server: 'AFIP Monitor MCP',
        status: 'running',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Simulación de API AFIP
app.get('/api/afip/taxpayer/:cuit', async (req, res) => {
    const { cuit } = req.params;

    // Simular datos de contribuyente
    const mockData = {
        cuit,
        razonSocial: `Contribuyente ${cuit}`,
        estado: 'ACTIVO',
        situacionFiscal: {
            iva: 'RESPONSABLE_INSCRIPTO',
            ganancias: 'INSCRIPTO',
            monotributo: 'NO_INSCRIPTO'
        },
        domicilio: {
            direccion: 'Av. Corrientes 1234',
            localidad: 'CABA',
            provincia: 'BUENOS AIRES'
        },
        actividades: [
            {
                codigo: 620100,
                descripcion: 'Programación informática',
                principal: true
            }
        ],
        fechaUltimaActualizacion: new Date().toISOString()
    };

    res.json(mockData);
});

// Endpoint para alertas
app.get('/api/alerts', (req, res) => {
    const mockAlerts = [
        {
            id: 1,
            type: 'compliance',
            severity: 'high',
            message: 'Próximo vencimiento de declaración jurada',
            timestamp: new Date().toISOString(),
            resolved: false
        },
        {
            id: 2,
            type: 'tax_status',
            severity: 'medium',
            message: 'Actualización requerida en datos fiscales',
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

    // Simular verificación de compliance
    const complianceResult = {
        cuit,
        period,
        score: 85,
        status: 'GOOD',
        checks: [
            {
                name: 'fiscal_status',
                passed: true,
                score: 100,
                message: 'Estado fiscal activo'
            },
            {
                name: 'iva_compliance',
                passed: true,
                score: 90,
                message: 'Declaraciones IVA al día'
            },
            {
                name: 'earnings_compliance',
                passed: false,
                score: 60,
                message: 'Declaración de ganancias pendiente'
            }
        ],
        recommendations: [
            'Presentar declaración jurada de ganancias',
            'Actualizar domicilio fiscal'
        ],
        timestamp: new Date().toISOString()
    };

    res.json(complianceResult);
});

// Ruta para documentación básica
app.get('/docs', (req, res) => {
    res.json({
        title: 'AFIP Monitor MCP API Documentation',
        version: '1.0.0',
        description: 'API para monitoreo automático de AFIP con alertas proactivas',
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
        server: 'AFIP Monitor MCP'
    });
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
        message: 'Conectado a AFIP Monitor MCP',
        timestamp: new Date().toISOString()
    }));

    // Simular alertas periódicas
    const alertInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                type: 'alert',
                data: {
                    id: Date.now(),
                    message: 'Verificación automática completada',
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
});

export { app, server };