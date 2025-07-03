#!/usr/bin/env node
import { AfipMonitorServer } from './afip-monitor-server.js';
import { ConfigLoader } from './utils/config-loader.js';
import { EnvValidator } from './utils/env-validator.js';
import { DatabaseManager } from './utils/database-manager.js';
import { GracefulShutdown } from './utils/graceful-shutdown.js';
import winston from 'winston';
import dotenv from 'dotenv';

// Configurar variables de entorno
dotenv.config();

// Configurar logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'afip-monitor-mcp' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ],
});

async function startServer() {
    try {
        logger.info('🚀 Iniciando AFIP Monitor MCP Server...');

        // Validar variables de entorno
        const envValidation = EnvValidator.validate();
        if (!envValidation.valid) {
            logger.error('❌ Error en variables de entorno:', envValidation.errors);
            process.exit(1);
        }

        // Cargar configuración
        const config = await ConfigLoader.load();
        logger.info('✅ Configuración cargada');

        // Inicializar base de datos
        const dbManager = new DatabaseManager(config.database);
        await dbManager.initialize();
        logger.info('✅ Base de datos inicializada');

        // Crear servidor MCP
        const server = new AfipMonitorServer({
            ...config,
            logger,
            database: dbManager
        });

        // Configurar graceful shutdown
        const gracefulShutdown = new GracefulShutdown([
            () => server.stop(),
            () => dbManager.close()
        ]);

        // Manejar señales del sistema
        process.on('SIGTERM', gracefulShutdown.shutdown);
        process.on('SIGINT', gracefulShutdown.shutdown);
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            gracefulShutdown.shutdown();
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown.shutdown();
        });

        // Iniciar servidor
        await server.start();

        logger.info(`✅ AFIP Monitor MCP Server iniciado en puerto ${config.server.port}`);
        logger.info(`📊 Dashboard disponible en: http://localhost:${config.server.port}/dashboard`);
        logger.info(`🔍 Health check: http://localhost:${config.server.port}/health`);
        logger.info(`📚 API docs: http://localhost:${config.server.port}/docs`);

        // Log de estado inicial
        const initialStatus = await server.getStatus();
        logger.info('Estado inicial del servidor:', initialStatus);

    } catch (error) {
        logger.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Iniciar servidor si es el módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer();
}