#!/usr/bin/env node

/**
 * Script para iniciar el servicio de monitoreo de compliance
 * Este script debe ejecutarse como un proceso separado o como parte del servidor principal
 */

import { ComplianceMonitor } from '../services/compliance-monitor.js';
import { RiskScoringEngine } from '../services/risk-scoring-engine.js';
import { AlertManager } from '../services/alert-manager.js';
import { EscalationEngine } from '../services/escalation-engine.js';
import { EmailService } from '../services/email-service.js';
import { NotificationService } from '../services/notification-service.js';
import { AfipClient } from '../services/afip-client.js';
import { DatabaseService } from '../services/database-service.js';
import { LoggerService } from '../services/logger-service.js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const logger = LoggerService.createLogger('ComplianceMonitorScript');

class ComplianceMonitorService {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
    }

    async initialize() {
        try {
            logger.info('Inicializando servicio de monitoreo de compliance...');

            // Inicializar base de datos
            await DatabaseService.initialize();
            logger.info('Base de datos inicializada');

            // Configurar servicios
            const notificationConfig = {
                email: {
                    enabled: process.env.EMAIL_ENABLED === 'true',
                    provider: process.env.EMAIL_PROVIDER || 'smtp',
                    smtp: {
                        host: process.env.SMTP_HOST,
                        port: parseInt(process.env.SMTP_PORT) || 587,
                        secure: process.env.SMTP_SECURE === 'true',
                        auth: {
                            user: process.env.SMTP_USER,
                            pass: process.env.SMTP_PASS
                        }
                    }
                }
            };

            const afipConfig = {
                baseURL: process.env.AFIP_BASE_URL || 'https://ws.afip.gov.ar',
                timeout: parseInt(process.env.AFIP_TIMEOUT) || 30000,
                retryAttempts: parseInt(process.env.AFIP_RETRY_ATTEMPTS) || 3,
                retryDelay: parseInt(process.env.AFIP_RETRY_DELAY) || 1000,
                mockMode: process.env.AFIP_MOCK_MODE === 'true'
            };

            // Inicializar servicios
            this.notificationService = new NotificationService(notificationConfig);
            this.emailService = new EmailService(notificationConfig.email);
            this.afipClient = new AfipClient(afipConfig);
            this.riskScoringEngine = new RiskScoringEngine();
            this.alertManager = new AlertManager();
            this.escalationEngine = new EscalationEngine(this.notificationService, this.emailService);
            this.complianceMonitor = new ComplianceMonitor(
                this.afipClient, 
                this.riskScoringEngine, 
                this.alertManager
            );

            logger.info('Servicios de compliance inicializados correctamente');
            return true;

        } catch (error) {
            logger.error('Error inicializando servicios:', error);
            return false;
        }
    }

    async start() {
        if (this.isRunning) {
            logger.warn('El servicio ya está ejecutándose');
            return;
        }

        const initialized = await this.initialize();
        if (!initialized) {
            logger.error('No se pudo inicializar el servicio');
            process.exit(1);
        }

        this.isRunning = true;
        logger.info('Iniciando servicio de monitoreo de compliance...');

        // Ejecutar check inicial
        await this.runComplianceChecks();

        // Programar checks periódicos cada 15 minutos
        this.intervalId = setInterval(async () => {
            await this.runComplianceChecks();
        }, 15 * 60 * 1000);

        logger.info('Servicio de monitoreo iniciado - checks cada 15 minutos');
    }

    async stop() {
        if (!this.isRunning) {
            return;
        }

        logger.info('Deteniendo servicio de monitoreo...');
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        logger.info('Servicio de monitoreo detenido');
    }

    async runComplianceChecks() {
        try {
            logger.info('Ejecutando checks de compliance programados...');

            // Obtener contribuyentes activos para monitoreo
            const activeContributors = await this.getActiveContributors();
            
            if (activeContributors.length === 0) {
                logger.info('No hay contribuyentes activos para monitorear');
                return;
            }

            logger.info(`Monitoreando ${activeContributors.length} contribuyentes`);

            // Ejecutar checks para cada contribuyente
            const results = await Promise.allSettled(
                activeContributors.map(async (contributor) => {
                    try {
                        return await this.complianceMonitor.performComplianceCheck(
                            contributor.cuit,
                            'scheduled'
                        );
                    } catch (error) {
                        logger.error(`Error en check de compliance para ${contributor.cuit}:`, error);
                        throw error;
                    }
                })
            );

            // Analizar resultados
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            logger.info(`Checks completados: ${successful} exitosos, ${failed} fallidos`);

            // Ejecutar escalaciones pendientes
            await this.processEscalations();

        } catch (error) {
            logger.error('Error en ejecución de checks programados:', error);
        }
    }

    async getActiveContributors() {
        try {
            const query = `
                SELECT DISTINCT c.cuit, c.business_name, cmc.polling_interval
                FROM contributors c
                LEFT JOIN compliance_monitoring_config cmc ON c.cuit = cmc.cuit
                WHERE c.deleted_at IS NULL 
                AND c.active = 1
                AND (cmc.enabled IS NULL OR cmc.enabled = 1)
                ORDER BY c.business_name
            `;

            const contributors = await DatabaseService.db.all(query);
            return contributors || [];

        } catch (error) {
            logger.error('Error obteniendo contribuyentes activos:', error);
            return [];
        }
    }

    async processEscalations() {
        try {
            logger.debug('Procesando escalaciones pendientes...');

            // Obtener alertas que requieren escalación
            const query = `
                SELECT * FROM compliance_alerts 
                WHERE acknowledged = 0 
                AND resolved = 0 
                AND escalation_level < 3
                AND datetime(created_at, '+' || 
                    CASE escalation_level 
                        WHEN 0 THEN 60 
                        WHEN 1 THEN 120 
                        WHEN 2 THEN 240 
                    END || ' minutes') <= datetime('now')
            `;

            const alertsToEscalate = await DatabaseService.db.all(query);
            
            if (alertsToEscalate.length > 0) {
                logger.info(`Procesando ${alertsToEscalate.length} escalaciones`);
                
                for (const alert of alertsToEscalate) {
                    await this.escalationEngine.scheduleEscalation(alert.id, alert);
                }
            }

        } catch (error) {
            logger.error('Error procesando escalaciones:', error);
        }
    }
}

// Manejo de señales para cierre limpio
const monitorService = new ComplianceMonitorService();

process.on('SIGINT', async () => {
    logger.info('Recibida señal SIGINT, cerrando servicio...');
    await monitorService.stop();
    await DatabaseService.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Recibida señal SIGTERM, cerrando servicio...');
    await monitorService.stop();
    await DatabaseService.close();
    process.exit(0);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Iniciar el servicio
(async () => {
    try {
        await monitorService.start();
    } catch (error) {
        logger.error('Error fatal iniciando servicio:', error);
        process.exit(1);
    }
})();