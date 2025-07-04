import { BaseTool } from './base-tool.js';
import nodemailer from 'nodemailer';

/**
 * Herramienta MCP para envío de notificaciones por email
 */
export class EmailNotificationTool extends BaseTool {
    constructor(services) {
        super(
            'send_email_notification',
            'Envía notificaciones por email para alertas de compliance',
            {
                type: 'object',
                properties: {
                    to: {
                        type: 'string',
                        description: 'Email destinatario'
                    },
                    subject: {
                        type: 'string',
                        description: 'Asunto del email'
                    },
                    alertType: {
                        type: 'string',
                        enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
                        description: 'Tipo de alerta'
                    },
                    taxpayerData: {
                        type: 'object',
                        description: 'Datos del contribuyente'
                    },
                    alerts: {
                        type: 'array',
                        description: 'Lista de alertas'
                    },
                    complianceScore: {
                        type: 'number',
                        description: 'Score de compliance'
                    }
                },
                required: ['to', 'subject', 'alertType', 'taxpayerData']
            },
            services
        );

        this.setupEmailTransporter();
    }

    /**
     * Configurar transporter de email
     */
    setupEmailTransporter() {
        const emailConfig = {
            // Configuración para Gmail (desarrollo)
            gmail: {
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASSWORD
                }
            },

            // Configuración para SendGrid (producción)
            sendgrid: {
                host: 'smtp.sendgrid.net',
                port: 587,
                secure: false,
                auth: {
                    user: 'apikey',
                    pass: process.env.SENDGRID_API_KEY
                }
            },

            // Configuración para Mailtrap (testing)
            mailtrap: {
                host: 'smtp.mailtrap.io',
                port: 2525,
                auth: {
                    user: process.env.MAILTRAP_USER,
                    pass: process.env.MAILTRAP_PASS
                }
            },

            // Configuración SMTP personalizada
            custom: {
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            }
        };

        // Determinar configuración a usar
        const provider = process.env.EMAIL_PROVIDER || 'mailtrap';
        const config = emailConfig[provider];

        if (!config) {
            throw new Error(`Configuración de email no encontrada para: ${provider}`);
        }

        this.transporter = nodemailer.createTransport(config);
        this.logger.info(`Email transporter configurado para: ${provider}`);
    }

    /**
     * Implementar executeLogic requerido por BaseTool
     */
    async executeLogic(args) {
        const { to, subject, alertType, taxpayerData, alerts = [], complianceScore } = args;

        this.logger.info(`📧 Enviando notificación email a: ${to}`);

        // Generar contenido del email
        const emailContent = this.generateEmailContent({
            alertType,
            taxpayerData,
            alerts,
            complianceScore
        });

        // Configurar email
        const mailOptions = {
            from: {
                name: 'AFIP Monitor MCP',
                address: process.env.SMTP_FROM || process.env.SMTP_USER
            },
            to: to,
            subject: `🚨 ${subject}`,
            html: emailContent.html,
            text: emailContent.text
        };

        // Enviar email
        const info = await this.transporter.sendMail(mailOptions);

        this.logger.info(`✅ Email enviado exitosamente: ${info.messageId}`);

        return {
            messageId: info.messageId,
            recipient: to,
            subject: subject,
            alertType: alertType,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Validación personalizada para emails
     */
    async customValidation(args) {
        const { to, alertType } = args;

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            throw {
                code: 'INVALID_EMAIL',
                message: 'Formato de email inválido',
                details: { provided: to }
            };
        }

        // Validar tipo de alerta
        const validAlertTypes = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        if (!validAlertTypes.includes(alertType)) {
            throw {
                code: 'INVALID_ALERT_TYPE',
                message: 'Tipo de alerta inválido',
                details: { provided: alertType, valid: validAlertTypes }
            };
        }

        return true;
    }

    /**
     * Generar contenido del email
     */
    generateEmailContent({ alertType, taxpayerData, alerts, complianceScore }) {
        const severityConfig = {
            CRITICAL: {
                color: '#dc3545',
                emoji: '🚨',
                priority: 'CRÍTICA'
            },
            HIGH: {
                color: '#fd7e14',
                emoji: '⚠️',
                priority: 'ALTA'
            },
            MEDIUM: {
                color: '#ffc107',
                emoji: '⚡',
                priority: 'MEDIA'
            },
            LOW: {
                color: '#17a2b8',
                emoji: 'ℹ️',
                priority: 'BAJA'
            }
        };

        const config = severityConfig[alertType] || severityConfig.MEDIUM;

        // Generar HTML
        const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alerta AFIP Monitor</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background: linear-gradient(135deg, #0066cc, #004499);
                color: white;
                padding: 30px 20px;
                border-radius: 10px 10px 0 0;
                text-align: center;
            }
            .alert-badge {
                background: ${config.color};
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                display: inline-block;
                margin: 10px 0;
            }
            .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .taxpayer-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .compliance-score {
                text-align: center;
                margin: 20px 0;
            }
            .score-circle {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                margin: 0 auto 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
                color: white;
                background: ${complianceScore >= 80 ? '#28a745' : complianceScore >= 60 ? '#ffc107' : '#dc3545'};
            }
            .alerts-list {
                margin: 20px 0;
            }
            .alert-item {
                padding: 15px;
                margin: 10px 0;
                border-left: 4px solid ${config.color};
                background: #f8f9fa;
                border-radius: 0 8px 8px 0;
            }
            .actions {
                background: #e9ecef;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 12px;
            }
            .button {
                background: #0066cc;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                display: inline-block;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${config.emoji} AFIP Monitor MCP</h1>
            <div class="alert-badge">
                ALERTA ${config.priority}
            </div>
        </div>
        
        <div class="content">
            <h2>Alerta de Compliance Fiscal</h2>
            <p>Se ha detectado una situación que requiere atención inmediata:</p>
            
            <div class="taxpayer-info">
                <h3>📋 Información del Contribuyente</h3>
                <p><strong>CUIT:</strong> ${taxpayerData.cuit}</p>
                <p><strong>Razón Social:</strong> ${taxpayerData.razonSocial}</p>
                <p><strong>Estado:</strong> ${taxpayerData.estado}</p>
                <p><strong>Tipo:</strong> ${taxpayerData.tipo || 'N/A'}</p>
            </div>
            
            ${complianceScore ? `
            <div class="compliance-score">
                <h3>📊 Score de Compliance</h3>
                <div class="score-circle">
                    ${complianceScore}%
                </div>
                <p><strong>Estado:</strong> ${complianceScore >= 80 ? 'BUENO' : complianceScore >= 60 ? 'REGULAR' : 'CRÍTICO'}</p>
            </div>
            ` : ''}
            
            ${alerts.length > 0 ? `
            <div class="alerts-list">
                <h3>🚨 Alertas Detectadas</h3>
                ${alerts.map(alert => `
                    <div class="alert-item">
                        <strong>${alert.title || alert.message}</strong>
                        ${alert.message && alert.title ? `<br><small>${alert.message}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <div class="actions">
                <h3>⚡ Acciones Recomendadas</h3>
                <ul>
                    ${alerts.map(alert =>
            alert.actions ? alert.actions.map(action => `<li>${action}</li>`).join('') : ''
        ).join('')}
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000" class="button">
                    Ver Dashboard Completo
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>Este email fue generado automáticamente por AFIP Monitor MCP</p>
            <p>Desarrollado por <strong>Snarx.io</strong> - Especialistas en MCP</p>
            <p><small>Fecha: ${new Date().toLocaleDateString('es-AR')} - ${new Date().toLocaleTimeString('es-AR')}</small></p>
        </div>
    </body>
    </html>
    `;

        // Generar texto plano
        const text = `
AFIP Monitor MCP - Alerta ${config.priority}

Contribuyente: ${taxpayerData.razonSocial} (${taxpayerData.cuit})
Estado: ${taxpayerData.estado}
${complianceScore ? `Score de Compliance: ${complianceScore}%` : ''}

Alertas detectadas:
${alerts.map(alert => `- ${alert.title || alert.message}`).join('\n')}

Acciones recomendadas:
${alerts.map(alert =>
            alert.actions ? alert.actions.map(action => `- ${action}`).join('\n') : ''
        ).join('\n')}

Ver dashboard completo: http://localhost:3000

---
Este email fue generado automáticamente por AFIP Monitor MCP
Desarrollado por Snarx.io - ${new Date().toLocaleDateString('es-AR')}
    `;

        return { html, text };
    }

    /**
     * Enviar email de prueba
     */
    async sendTestEmail(to) {
        return await this.execute({
            to,
            subject: 'Prueba de Configuración - AFIP Monitor MCP',
            alertType: 'LOW',
            taxpayerData: {
                cuit: '20123456789',
                razonSocial: 'Contribuyente de Prueba',
                estado: 'ACTIVO',
                tipo: 'FISICA'
            },
            alerts: [
                {
                    title: 'Email de Prueba',
                    message: 'Este es un email de prueba para verificar la configuración',
                    actions: ['Verificar configuración', 'Confirmar recepción']
                }
            ],
            complianceScore: 95
        });
    }

    /**
     * Verificar configuración de email
     */
    async verifyEmailConfiguration() {
        try {
            await this.transporter.verify();
            this.logger.info('✅ Configuración de email verificada');
            return true;
        } catch (error) {
            this.logger.error('❌ Error en configuración de email:', error);
            return false;
        }
    }
}