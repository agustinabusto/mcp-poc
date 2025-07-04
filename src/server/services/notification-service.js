import { EmailNotificationTool } from '../tools/email-notification-tool.js';

/**
 * Servicio de notificaciones que orquesta múltiples canales
 */
export class NotificationService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.channels = new Map();
        this.subscribers = new Map();

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
}