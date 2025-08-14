import { EmailNotificationTool } from '../tools/email-notification-tool.js';
import { EmailService } from './email-service.js';
import { LoggerService } from './logger-service.js';
import { EventEmitter } from 'events';

/**
 * Servicio de notificaciones que orquesta múltiples canales
 * Expandido para el sistema de compliance monitoring
 */
export class NotificationService extends EventEmitter {
    constructor(config, database) {
        super();
        this.config = config || {};
        this.database = database;
        this.logger = LoggerService.createLogger('NotificationService');
        this.channels = new Map();
        this.subscribers = new Map();
        
        // Inicializar servicio de email
        this.emailService = new EmailService(this.config.email);
        
        // Métricas
        this.metrics = {
            totalSent: 0,
            successfulSent: 0,
            failedSent: 0,
            byChannel: {},
            bySeverity: {}
        };

        this.setupChannels();
    }

    /**
     * Configurar canales de notificación
     */
    setupChannels() {
        // Canal Email
        if (this.config.email?.enabled) {
            const emailTool = new EmailNotificationTool({
                logger: this.logger
            });

            this.channels.set('email', emailTool);
            this.logger.info('📧 Canal de email configurado');
        }

        // Canal WebSocket (ya existente)
        this.channels.set('websocket', {
            execute: async (data) => {
                // Implementación WebSocket existente
                return { success: true, channel: 'websocket' };
            }
        });

        // Canal Slack (futuro)
        if (this.config.slack?.enabled) {
            this.channels.set('slack', {
                execute: async (data) => {
                    // Implementación Slack webhook
                    return { success: true, channel: 'slack' };
                }
            });
        }

        // Canal SMS (futuro)
        if (this.config.sms?.enabled) {
            this.channels.set('sms', {
                execute: async (data) => {
                    // Implementación SMS
                    return { success: true, channel: 'sms' };
                }
            });
        }
    }

    /**
     * Suscribir a alertas por tipo
     */
    subscribe(alertType, email, channels = ['email']) {
        if (!this.subscribers.has(alertType)) {
            this.subscribers.set(alertType, []);
        }

        const subscription = {
            email,
            channels,
            createdAt: new Date().toISOString()
        };

        this.subscribers.get(alertType).push(subscription);
        this.logger.info(`📬 Suscripción creada: ${email} -> ${alertType} (${channels.join(', ')})`);

        return subscription;
    }

    /**
     * Enviar notificación a través de múltiples canales
     */
    async sendNotification(notificationData) {
        const {
            alertType,
            taxpayerData,
            alerts,
            complianceScore,
            channels = ['email', 'websocket']
        } = notificationData;

        const results = [];

        // Obtener suscriptores
        const subscribers = this.getSubscribers(alertType);

        for (const subscriber of subscribers) {
            for (const channelName of channels) {
                const channel = this.channels.get(channelName);

                if (!channel) {
                    this.logger.warn(`⚠️ Canal no disponible: ${channelName}`);
                    continue;
                }

                try {
                    let result;

                    switch (channelName) {
                        case 'email':
                            result = await this.sendEmailNotification(
                                subscriber.email,
                                { alertType, taxpayerData, alerts, complianceScore }
                            );
                            break;

                        case 'websocket':
                            result = await this.sendWebSocketNotification(
                                { alertType, taxpayerData, alerts, complianceScore }
                            );
                            break;

                        case 'slack':
                            result = await this.sendSlackNotification(
                                { alertType, taxpayerData, alerts, complianceScore }
                            );
                            break;

                        default:
                            this.logger.warn(`⚠️ Canal no implementado: ${channelName}`);
                            continue;
                    }

                    results.push({
                        channel: channelName,
                        recipient: subscriber.email,
                        success: result.success,
                        messageId: result.messageId,
                        timestamp: new Date().toISOString()
                    });

                } catch (error) {
                    this.logger.error(`❌ Error enviando por ${channelName}:`, error);
                    results.push({
                        channel: channelName,
                        recipient: subscriber.email,
                        success: false,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        return results;
    }

    /**
     * Enviar notificación por email usando MCP tool
     */
    async sendEmailNotification(email, data) {
        const emailTool = this.channels.get('email');

        if (!emailTool) {
            throw new Error('Canal de email no configurado');
        }

        const subject = this.generateSubject(data);

        // Usar el método execute de BaseTool
        const result = await emailTool.execute({
            to: email,
            subject,
            alertType: data.alertType,
            taxpayerData: data.taxpayerData,
            alerts: data.alerts,
            complianceScore: data.complianceScore
        });

        return result;
    }

    /**
     * Enviar notificación por WebSocket
     */
    async sendWebSocketNotification(data) {
        // Implementar envío WebSocket
        const wsData = {
            type: 'compliance_alert',
            alertType: data.alertType,
            taxpayerData: data.taxpayerData,
            alerts: data.alerts,
            complianceScore: data.complianceScore,
            timestamp: new Date().toISOString()
        };

        // Aquí se integraría con el WebSocket server existente
        return { success: true, channel: 'websocket', data: wsData };
    }

    /**
     * Enviar notificación por Slack
     */
    async sendSlackNotification(data) {
        // Implementación futura de Slack
        return { success: true, channel: 'slack' };
    }

    /**
     * Generar asunto del email
     */
    generateSubject(data) {
        const { alertType, taxpayerData } = data;

        const subjects = {
            CRITICAL: `🚨 ALERTA CRÍTICA - ${taxpayerData.razonSocial}`,
            HIGH: `⚠️ ALERTA ALTA - ${taxpayerData.razonSocial}`,
            MEDIUM: `⚡ ALERTA MEDIA - ${taxpayerData.razonSocial}`,
            LOW: `ℹ️ INFORMACIÓN - ${taxpayerData.razonSocial}`
        };

        return subjects[alertType] || `Alerta AFIP - ${taxpayerData.razonSocial}`;
    }

    /**
     * Obtener suscriptores por tipo de alerta
     */
    getSubscribers(alertType) {
        // Suscriptores específicos del tipo
        const typeSubscribers = this.subscribers.get(alertType) || [];

        // Suscriptores a todas las alertas
        const allSubscribers = this.subscribers.get('ALL') || [];

        return [...typeSubscribers, ...allSubscribers];
    }

    /**
     * Procesar alerta automáticamente
     */
    async processAlert(taxpayerData, complianceResult) {
        const { score, status, alerts } = complianceResult;

        // Determinar tipo de alerta
        let alertType = 'LOW';
        if (score < 50) alertType = 'CRITICAL';
        else if (score < 70) alertType = 'HIGH';
        else if (score < 85) alertType = 'MEDIUM';

        // Enviar notificación
        const results = await this.sendNotification({
            alertType,
            taxpayerData,
            alerts,
            complianceScore: score,
            channels: ['email', 'websocket']
        });

        this.logger.info(`📨 Alerta procesada: ${alertType} - ${taxpayerData.cuit}`);

        return {
            alertType,
            notificationsSent: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    /**
     * Configurar suscripciones por defecto
     */
    setupDefaultSubscriptions() {
        // Suscripciones por defecto del sistema
        const defaultSubscriptions = [
            {
                alertType: 'CRITICAL',
                email: process.env.ADMIN_EMAIL || 'admin@snarx.io',
                channels: ['email', 'websocket']
            },
            {
                alertType: 'HIGH',
                email: process.env.ADMIN_EMAIL || 'admin@snarx.io',
                channels: ['email', 'websocket']
            },
            {
                alertType: 'ALL',
                email: process.env.NOTIFICATIONS_EMAIL || 'notifications@snarx.io',
                channels: ['email']
            }
        ];

        defaultSubscriptions.forEach(sub => {
            this.subscribe(sub.alertType, sub.email, sub.channels);
        });

        this.logger.info('📋 Suscripciones por defecto configuradas');
    }

    /**
     * Obtener estadísticas de notificaciones
     */
    getStats() {
        const stats = {
            channels: Array.from(this.channels.keys()),
            subscribers: {},
            totalSubscribers: 0,
            channelStats: {}
        };

        this.subscribers.forEach((subs, alertType) => {
            stats.subscribers[alertType] = subs.length;
            stats.totalSubscribers += subs.length;
        });

        // Obtener métricas de cada canal
        this.channels.forEach((channel, name) => {
            if (channel.getMetrics) {
                stats.channelStats[name] = channel.getMetrics();
            }
        });

        return stats;
    }

    /**
     * Enviar email de prueba
     */
    async sendTestEmail(to) {
        const emailTool = this.channels.get('email');

        if (!emailTool) {
            throw new Error('Canal de email no configurado');
        }

        return await emailTool.sendTestEmail(to);
    }

    // ============ MÉTODOS ESPECÍFICOS PARA COMPLIANCE ============

    /**
     * Envía alerta de compliance por email
     */
    async sendEmailAlert(alertData, recipientConfig) {
        try {
            this.updateMetrics('email', alertData.severity);
            
            const success = await this.emailService.sendComplianceAlert(alertData, recipientConfig);
            
            if (success) {
                this.metrics.successfulSent++;
                this.emit('notificationSent', {
                    channel: 'email',
                    alertId: alertData.id,
                    cuit: alertData.cuit,
                    severity: alertData.severity,
                    recipient: recipientConfig.primary_email || recipientConfig.notification_email
                });
            } else {
                this.metrics.failedSent++;
            }

            return success;

        } catch (error) {
            this.logger.error('Error enviando email de alerta:', error);
            this.metrics.failedSent++;
            return false;
        }
    }

    /**
     * Envía email de escalación
     */
    async sendEscalationEmail(alertData, escalationEmail, escalationLevel) {
        try {
            this.updateMetrics('email', 'escalation');
            
            const success = await this.emailService.sendEscalationEmail(
                alertData, 
                escalationEmail, 
                escalationLevel
            );
            
            if (success) {
                this.metrics.successfulSent++;
                this.emit('escalationSent', {
                    channel: 'email',
                    alertId: alertData.id,
                    cuit: alertData.cuit,
                    escalationLevel,
                    recipient: escalationEmail
                });
            } else {
                this.metrics.failedSent++;
            }

            return success;

        } catch (error) {
            this.logger.error('Error enviando email de escalación:', error);
            this.metrics.failedSent++;
            return false;
        }
    }

    /**
     * Envía notificación SMS (placeholder para implementación futura)
     */
    async sendSMSAlert(alertData, recipientConfig) {
        try {
            // Implementación futura de SMS
            this.logger.info(`SMS alert would be sent to ${recipientConfig.phone_numbers} for ${alertData.cuit}`);
            
            this.updateMetrics('sms', alertData.severity);
            this.metrics.successfulSent++;
            
            return true;

        } catch (error) {
            this.logger.error('Error enviando SMS:', error);
            this.metrics.failedSent++;
            return false;
        }
    }

    /**
     * Envía notificación WebSocket en tiempo real
     */
    async sendWebSocketAlert(alertData) {
        try {
            this.updateMetrics('websocket', alertData.severity);
            
            // Emitir evento que será capturado por el servidor WebSocket
            this.emit('websocketAlert', {
                type: 'compliance_alert',
                alert: alertData,
                timestamp: new Date().toISOString()
            });

            this.metrics.successfulSent++;
            return true;

        } catch (error) {
            this.logger.error('Error enviando notificación WebSocket:', error);
            this.metrics.failedSent++;
            return false;
        }
    }

    /**
     * Envía reporte diario de compliance
     */
    async sendDailyReport(reportData) {
        try {
            // Obtener lista de destinatarios para reportes
            const recipients = await this.getDailyReportRecipients();
            
            if (recipients.length === 0) {
                this.logger.warn('No hay destinatarios configurados para reportes diarios');
                return false;
            }

            const success = await this.emailService.sendDailyComplianceReport(
                reportData, 
                recipients
            );

            if (success) {
                this.updateMetrics('email', 'daily_report');
                this.metrics.successfulSent++;
                
                this.emit('dailyReportSent', {
                    recipients: recipients.length,
                    date: reportData.date
                });
            } else {
                this.metrics.failedSent++;
            }

            return success;

        } catch (error) {
            this.logger.error('Error enviando reporte diario:', error);
            this.metrics.failedSent++;
            return false;
        }
    }

    /**
     * Obtiene destinatarios para reportes diarios
     */
    async getDailyReportRecipients() {
        try {
            const recipients = await this.database.all(`
                SELECT DISTINCT primary_email 
                FROM notification_settings 
                WHERE primary_email IS NOT NULL
                AND email_enabled = 1
            `);

            return recipients.map(r => r.primary_email);

        } catch (error) {
            this.logger.error('Error obteniendo destinatarios de reportes:', error);
            return [];
        }
    }

    /**
     * Configura notificaciones para un CUIT específico
     */
    async configureNotifications(cuit, config) {
        try {
            await this.database.run(`
                INSERT OR REPLACE INTO notification_settings (
                    cuit, email_enabled, websocket_enabled, sms_enabled,
                    critical_alerts, high_alerts, medium_alerts, low_alerts,
                    notification_hours_start, notification_hours_end,
                    weekend_notifications, escalation_minutes, max_escalation_level,
                    primary_email, escalation_emails, phone_numbers
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                cuit,
                config.email_enabled || 1,
                config.websocket_enabled || 1,
                config.sms_enabled || 0,
                config.critical_alerts || 1,
                config.high_alerts || 1,
                config.medium_alerts || 0,
                config.low_alerts || 0,
                config.notification_hours_start || '08:00',
                config.notification_hours_end || '18:00',
                config.weekend_notifications || 0,
                config.escalation_minutes || 60,
                config.max_escalation_level || 3,
                config.primary_email,
                JSON.stringify(config.escalation_emails || []),
                JSON.stringify(config.phone_numbers || [])
            ]);

            this.logger.info(`Configuración de notificaciones actualizada para ${cuit}`);
            
            this.emit('notificationConfigUpdated', { cuit, config });
            
            return true;

        } catch (error) {
            this.logger.error(`Error configurando notificaciones para ${cuit}:`, error);
            return false;
        }
    }

    /**
     * Obtiene configuración de notificaciones para un CUIT
     */
    async getNotificationConfig(cuit) {
        try {
            const config = await this.database.get(`
                SELECT * FROM notification_settings 
                WHERE cuit = ?
            `, [cuit]);

            if (config && config.escalation_emails) {
                config.escalation_emails = JSON.parse(config.escalation_emails);
            }
            if (config && config.phone_numbers) {
                config.phone_numbers = JSON.parse(config.phone_numbers);
            }

            return config;

        } catch (error) {
            this.logger.error(`Error obteniendo configuración de notificaciones para ${cuit}:`, error);
            return null;
        }
    }

    /**
     * Verifica si está en horario de notificaciones
     */
    isWithinNotificationHours(config) {
        if (!config) return true;

        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();

        // Verificar días de la semana
        if (!config.weekend_notifications && (currentDay === 0 || currentDay === 6)) {
            return false;
        }

        // Verificar horario
        const startHour = parseInt(config.notification_hours_start.split(':')[0]);
        const endHour = parseInt(config.notification_hours_end.split(':')[0]);

        return currentHour >= startHour && currentHour < endHour;
    }

    /**
     * Procesa notificación de alerta de compliance
     */
    async processComplianceAlert(alertData) {
        try {
            // Obtener configuración de notificaciones para el CUIT
            const config = await this.getNotificationConfig(alertData.cuit);
            
            if (!config) {
                this.logger.debug(`No hay configuración de notificaciones para ${alertData.cuit}`);
                return false;
            }

            // Verificar si está en horario para notificaciones críticas/altas
            const isWithinHours = this.isWithinNotificationHours(config);
            const isCriticalOrHigh = ['critical', 'high'].includes(alertData.severity);

            // Las alertas críticas y altas siempre se envían, las otras solo en horario
            if (!isCriticalOrHigh && !isWithinHours) {
                this.logger.debug(`Fuera de horario de notificaciones para ${alertData.cuit}`);
                return false;
            }

            // Determinar qué notificaciones enviar
            const shouldSend = this.shouldSendBySeverity(alertData.severity, config);
            
            const results = [];

            // Enviar email si está habilitado
            if (shouldSend && config.email_enabled && config.primary_email) {
                const emailResult = await this.sendEmailAlert(alertData, config);
                results.push({ channel: 'email', success: emailResult });
            }

            // Enviar WebSocket si está habilitado
            if (shouldSend && config.websocket_enabled) {
                const wsResult = await this.sendWebSocketAlert(alertData);
                results.push({ channel: 'websocket', success: wsResult });
            }

            // Enviar SMS para alertas críticas si está habilitado
            if (alertData.severity === 'critical' && config.sms_enabled && config.phone_numbers?.length > 0) {
                const smsResult = await this.sendSMSAlert(alertData, config);
                results.push({ channel: 'sms', success: smsResult });
            }

            return results;

        } catch (error) {
            this.logger.error('Error procesando alerta de compliance:', error);
            return false;
        }
    }

    /**
     * Determina si debe enviar notificación basado en severidad
     */
    shouldSendBySeverity(severity, config) {
        switch (severity) {
            case 'critical':
                return config.critical_alerts;
            case 'high':
                return config.high_alerts;
            case 'medium':
                return config.medium_alerts;
            case 'low':
                return config.low_alerts;
            default:
                return false;
        }
    }

    /**
     * Actualiza métricas de notificaciones
     */
    updateMetrics(channel, severity) {
        this.metrics.totalSent++;
        
        if (!this.metrics.byChannel[channel]) {
            this.metrics.byChannel[channel] = 0;
        }
        this.metrics.byChannel[channel]++;
        
        if (!this.metrics.bySeverity[severity]) {
            this.metrics.bySeverity[severity] = 0;
        }
        this.metrics.bySeverity[severity]++;
    }

    /**
     * Obtiene métricas del servicio
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalSent > 0 ? 
                (this.metrics.successfulSent / this.metrics.totalSent * 100).toFixed(2) : 0,
            emailServiceReady: this.emailService?.isReady() || false
        };
    }

    /**
     * Resetea métricas
     */
    resetMetrics() {
        this.metrics = {
            totalSent: 0,
            successfulSent: 0,
            failedSent: 0,
            byChannel: {},
            bySeverity: {}
        };
    }

    /**
     * Testa la configuración de notificaciones
     */
    async testNotificationSetup(cuit) {
        try {
            const config = await this.getNotificationConfig(cuit);
            
            if (!config) {
                return {
                    success: false,
                    message: 'No hay configuración de notificaciones'
                };
            }

            const results = {};

            // Testar email
            if (config.email_enabled && config.primary_email) {
                try {
                    const emailResult = await this.emailService.sendTestEmail(config.primary_email);
                    results.email = emailResult;
                } catch (error) {
                    results.email = { success: false, error: error.message };
                }
            }

            // Testar WebSocket
            if (config.websocket_enabled) {
                results.websocket = { success: true, message: 'WebSocket disponible' };
            }

            return {
                success: true,
                results,
                config
            };

        } catch (error) {
            this.logger.error('Error testando configuración de notificaciones:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}