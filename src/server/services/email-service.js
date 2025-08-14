import nodemailer from 'nodemailer';
import { LoggerService } from './logger-service.js';

export class EmailService {
    constructor(config = {}) {
        this.logger = LoggerService.createLogger('EmailService');
        this.config = {
            host: config.host || process.env.SMTP_HOST || 'localhost',
            port: config.port || process.env.SMTP_PORT || 587,
            secure: config.secure || process.env.SMTP_SECURE === 'true',
            auth: {
                user: config.user || process.env.SMTP_USER,
                pass: config.pass || process.env.SMTP_PASS
            },
            from: config.from || process.env.SMTP_FROM || 'noreply@afip-monitor.com'
        };
        
        this.transporter = null;
        this.isConfigured = false;
        
        this.init();
    }

    /**
     * Inicializa el servicio de email
     */
    async init() {
        try {
            if (!this.config.auth.user || !this.config.auth.pass) {
                this.logger.warn('Credenciales SMTP no configuradas, servicio de email deshabilitado');
                return;
            }

            this.transporter = nodemailer.createTransporter({
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
                auth: this.config.auth,
                tls: {
                    rejectUnauthorized: false // Para desarrollo
                }
            });

            // Verificar conexión
            await this.transporter.verify();
            this.isConfigured = true;
            this.logger.info('Servicio de email configurado exitosamente');

        } catch (error) {
            this.logger.error('Error configurando servicio de email:', error);
            this.isConfigured = false;
        }
    }

    /**
     * Verifica si el servicio está configurado
     */
    isReady() {
        return this.isConfigured && this.transporter;
    }

    /**
     * Envía email de alerta de compliance
     */
    async sendComplianceAlert(alertData, recipientConfig) {
        if (!this.isReady()) {
            this.logger.warn('Servicio de email no configurado, no se puede enviar alerta');
            return false;
        }

        try {
            const emailTemplate = this.generateComplianceAlertTemplate(alertData);
            
            const mailOptions = {
                from: this.config.from,
                to: recipientConfig.primary_email || recipientConfig.notification_email,
                subject: `🚨 Alerta de Compliance - ${this.getSeverityDisplay(alertData.severity)}`,
                html: emailTemplate,
                text: this.generatePlainTextAlert(alertData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            
            this.logger.info(`Email de alerta enviado exitosamente`, {
                messageId: result.messageId,
                cuit: alertData.cuit,
                severity: alertData.severity,
                recipient: mailOptions.to
            });

            return true;

        } catch (error) {
            this.logger.error('Error enviando email de alerta:', error);
            return false;
        }
    }

    /**
     * Envía email de escalación
     */
    async sendEscalationEmail(alertData, escalationEmail, escalationLevel) {
        if (!this.isReady()) {
            this.logger.warn('Servicio de email no configurado, no se puede enviar escalación');
            return false;
        }

        try {
            const emailTemplate = this.generateEscalationTemplate(alertData, escalationLevel);
            
            const mailOptions = {
                from: this.config.from,
                to: escalationEmail,
                subject: `⚠️ ESCALACIÓN NIVEL ${escalationLevel} - Alerta de Compliance`,
                html: emailTemplate,
                text: this.generatePlainTextEscalation(alertData, escalationLevel),
                priority: 'high'
            };

            const result = await this.transporter.sendMail(mailOptions);
            
            this.logger.info(`Email de escalación enviado`, {
                messageId: result.messageId,
                cuit: alertData.cuit,
                escalationLevel,
                recipient: escalationEmail
            });

            return true;

        } catch (error) {
            this.logger.error('Error enviando email de escalación:', error);
            return false;
        }
    }

    /**
     * Envía reporte diario de compliance
     */
    async sendDailyComplianceReport(reportData, recipients) {
        if (!this.isReady()) {
            this.logger.warn('Servicio de email no configurado, no se puede enviar reporte');
            return false;
        }

        try {
            const emailTemplate = this.generateDailyReportTemplate(reportData);
            
            const mailOptions = {
                from: this.config.from,
                to: recipients,
                subject: `📊 Reporte Diario de Compliance - ${new Date().toLocaleDateString()}`,
                html: emailTemplate,
                text: this.generatePlainTextReport(reportData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            
            this.logger.info(`Reporte diario enviado`, {
                messageId: result.messageId,
                recipients: recipients.length
            });

            return true;

        } catch (error) {
            this.logger.error('Error enviando reporte diario:', error);
            return false;
        }
    }

    /**
     * Genera template HTML para alerta de compliance
     */
    generateComplianceAlertTemplate(alertData) {
        const severityColor = this.getSeverityColor(alertData.severity);
        const severityIcon = this.getSeverityIcon(alertData.severity);
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Alerta de Compliance</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background-color: ${severityColor}; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; }
                .alert-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
                .severity-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; background-color: ${severityColor}; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${severityIcon} Alerta de Compliance</h1>
                    <p>Sistema de Monitoreo AFIP</p>
                </div>
                
                <div class="content">
                    <h2>Nueva alerta detectada</h2>
                    
                    <div class="alert-info">
                        <p><strong>CUIT:</strong> ${alertData.cuit}</p>
                        <p><strong>Tipo:</strong> ${this.getAlertTypeDisplay(alertData.alert_type)}</p>
                        <p><strong>Severidad:</strong> <span class="severity-badge">${this.getSeverityDisplay(alertData.severity)}</span></p>
                        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-AR')}</p>
                    </div>
                    
                    <h3>Descripción</h3>
                    <p>${alertData.message}</p>
                    
                    ${alertData.action_required ? `
                    <h3>Acción Requerida</h3>
                    <p><strong>${alertData.action_required}</strong></p>
                    ` : ''}
                    
                    ${alertData.predicted_date ? `
                    <h3>Fecha Prevista</h3>
                    <p>Se estima que el problema ocurrirá el: <strong>${new Date(alertData.predicted_date).toLocaleDateString('es-AR')}</strong></p>
                    ` : ''}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3030'}/compliance" class="button">
                            Ver Dashboard de Compliance
                        </a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Este es un email automático del Sistema de Monitoreo AFIP</p>
                    <p>No responder a este email</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Genera template HTML para escalación
     */
    generateEscalationTemplate(alertData, escalationLevel) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Escalación de Alerta</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; }
                .escalation-notice { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ ESCALACIÓN NIVEL ${escalationLevel}</h1>
                    <p>Alerta de Compliance No Atendida</p>
                </div>
                
                <div class="content">
                    <div class="escalation-notice">
                        <h3>🚨 Atención Requerida Inmediata</h3>
                        <p>Esta alerta ha sido escalada debido a falta de atención en el tiempo requerido.</p>
                    </div>
                    
                    <h2>Detalles de la Alerta</h2>
                    <p><strong>CUIT:</strong> ${alertData.cuit}</p>
                    <p><strong>Tipo:</strong> ${this.getAlertTypeDisplay(alertData.alert_type)}</p>
                    <p><strong>Severidad:</strong> ${this.getSeverityDisplay(alertData.severity)}</p>
                    <p><strong>Descripción:</strong> ${alertData.message}</p>
                    
                    <h3>Nivel de Escalación: ${escalationLevel}/3</h3>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3030'}/compliance" class="button">
                            Atender Alerta Inmediatamente
                        </a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Sistema de Monitoreo AFIP - Escalación Automática</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Genera template HTML para reporte diario
     */
    generateDailyReportTemplate(reportData) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reporte Diario de Compliance</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 700px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; }
                .metrics { display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0; }
                .metric { flex: 1; min-width: 150px; background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
                .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
                .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                .status-excellent { color: #28a745; }
                .status-good { color: #17a2b8; }
                .status-fair { color: #ffc107; }
                .status-poor { color: #dc3545; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Reporte Diario de Compliance</h1>
                    <p>${new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                
                <div class="content">
                    <h2>Resumen General</h2>
                    
                    <div class="metrics">
                        <div class="metric">
                            <div class="metric-value">${reportData.totalMonitored || 0}</div>
                            <div>Total Monitoreados</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${reportData.activeAlerts || 0}</div>
                            <div>Alertas Activas</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${reportData.averageRiskScore?.toFixed(2) || '0.00'}</div>
                            <div>Score Promedio</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${reportData.complianceRate?.toFixed(1) || '0.0'}%</div>
                            <div>Tasa de Compliance</div>
                        </div>
                    </div>
                    
                    <h3>Estado de Compliance</h3>
                    <ul>
                        <li><span class="status-excellent">Excelente:</span> ${reportData.excellentCount || 0} contribuyentes</li>
                        <li><span class="status-good">Bueno:</span> ${reportData.goodCount || 0} contribuyentes</li>
                        <li><span class="status-fair">Regular:</span> ${reportData.fairCount || 0} contribuyentes</li>
                        <li><span class="status-poor">Deficiente:</span> ${reportData.poorCount || 0} contribuyentes</li>
                    </ul>
                    
                    ${reportData.topAlerts && reportData.topAlerts.length > 0 ? `
                    <h3>Alertas Más Críticas</h3>
                    <ul>
                        ${reportData.topAlerts.map(alert => `
                            <li><strong>${alert.cuit}:</strong> ${alert.message} (${this.getSeverityDisplay(alert.severity)})</li>
                        `).join('')}
                    </ul>
                    ` : ''}
                    
                    <h3>Actividad del Sistema</h3>
                    <ul>
                        <li>Verificaciones realizadas: ${reportData.totalChecks || 0}</li>
                        <li>Verificaciones exitosas: ${reportData.successfulChecks || 0}</li>
                        <li>Tiempo promedio de respuesta: ${reportData.avgResponseTime || 0}ms</li>
                    </ul>
                </div>
                
                <div class="footer">
                    <p>Sistema de Monitoreo AFIP - Reporte Automático</p>
                    <p>Generado el ${new Date().toLocaleString('es-AR')}</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Genera versión de texto plano para alerta
     */
    generatePlainTextAlert(alertData) {
        return `
        ALERTA DE COMPLIANCE - ${this.getSeverityDisplay(alertData.severity)}
        
        CUIT: ${alertData.cuit}
        Tipo: ${this.getAlertTypeDisplay(alertData.alert_type)}
        Severidad: ${this.getSeverityDisplay(alertData.severity)}
        Fecha: ${new Date().toLocaleString('es-AR')}
        
        DESCRIPCIÓN:
        ${alertData.message}
        
        ${alertData.action_required ? `ACCIÓN REQUERIDA:\n${alertData.action_required}\n` : ''}
        
        ${alertData.predicted_date ? `FECHA PREVISTA:\n${new Date(alertData.predicted_date).toLocaleDateString('es-AR')}\n` : ''}
        
        Ver dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3030'}/compliance
        
        --
        Sistema de Monitoreo AFIP
        `;
    }

    /**
     * Genera versión de texto plano para escalación
     */
    generatePlainTextEscalation(alertData, escalationLevel) {
        return `
        ESCALACIÓN NIVEL ${escalationLevel} - ATENCIÓN REQUERIDA
        
        Esta alerta ha sido escalada debido a falta de atención.
        
        DETALLES:
        CUIT: ${alertData.cuit}
        Tipo: ${this.getAlertTypeDisplay(alertData.alert_type)}
        Severidad: ${this.getSeverityDisplay(alertData.severity)}
        Descripción: ${alertData.message}
        
        Nivel de escalación: ${escalationLevel}/3
        
        Atender inmediatamente: ${process.env.FRONTEND_URL || 'http://localhost:3030'}/compliance
        
        --
        Sistema de Monitoreo AFIP - Escalación Automática
        `;
    }

    /**
     * Genera versión de texto plano para reporte
     */
    generatePlainTextReport(reportData) {
        return `
        REPORTE DIARIO DE COMPLIANCE
        ${new Date().toLocaleDateString('es-AR')}
        
        RESUMEN GENERAL:
        - Total monitoreados: ${reportData.totalMonitored || 0}
        - Alertas activas: ${reportData.activeAlerts || 0}
        - Score promedio: ${reportData.averageRiskScore?.toFixed(2) || '0.00'}
        - Tasa de compliance: ${reportData.complianceRate?.toFixed(1) || '0.0'}%
        
        ESTADO DE COMPLIANCE:
        - Excelente: ${reportData.excellentCount || 0}
        - Bueno: ${reportData.goodCount || 0}
        - Regular: ${reportData.fairCount || 0}
        - Deficiente: ${reportData.poorCount || 0}
        
        ACTIVIDAD DEL SISTEMA:
        - Verificaciones: ${reportData.totalChecks || 0}
        - Exitosas: ${reportData.successfulChecks || 0}
        - Tiempo promedio: ${reportData.avgResponseTime || 0}ms
        
        --
        Sistema de Monitoreo AFIP
        `;
    }

    /**
     * Obtiene color según severidad
     */
    getSeverityColor(severity) {
        const colors = {
            'critical': '#dc3545',
            'high': '#fd7e14',
            'medium': '#ffc107',
            'low': '#28a745'
        };
        return colors[severity] || '#6c757d';
    }

    /**
     * Obtiene icono según severidad
     */
    getSeverityIcon(severity) {
        const icons = {
            'critical': '🚨',
            'high': '⚠️',
            'medium': '⚡',
            'low': 'ℹ️'
        };
        return icons[severity] || '📢';
    }

    /**
     * Obtiene display de severidad
     */
    getSeverityDisplay(severity) {
        const displays = {
            'critical': 'CRÍTICA',
            'high': 'ALTA',
            'medium': 'MEDIA',
            'low': 'BAJA'
        };
        return displays[severity] || 'DESCONOCIDA';
    }

    /**
     * Obtiene display de tipo de alerta
     */
    getAlertTypeDisplay(alertType) {
        const displays = {
            'missing_vat_declarations': 'Declaraciones de IVA Faltantes',
            'missing_income_tax_declarations': 'Declaraciones de Ganancias Faltantes',
            'late_tax_returns': 'Declaraciones Fuera de Término',
            'fiscal_inactive': 'Contribuyente Inactivo',
            'vat_not_registered': 'No Registrado en IVA',
            'compliance_degradation': 'Degradación de Compliance',
            'high_risk_detected': 'Alto Riesgo Detectado',
            'deadline_approaching': 'Vencimiento Próximo'
        };
        return displays[alertType] || alertType.replace(/_/g, ' ').toUpperCase();
    }

    /**
     * Testea la configuración de email
     */
    async testConnection() {
        if (!this.isReady()) {
            throw new Error('Servicio de email no configurado');
        }

        try {
            await this.transporter.verify();
            return { success: true, message: 'Conexión SMTP exitosa' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Envía email de prueba
     */
    async sendTestEmail(to) {
        if (!this.isReady()) {
            throw new Error('Servicio de email no configurado');
        }

        try {
            const mailOptions = {
                from: this.config.from,
                to: to,
                subject: 'Test - Sistema de Monitoreo AFIP',
                html: `
                <h2>Email de Prueba</h2>
                <p>Este es un email de prueba del Sistema de Monitoreo AFIP.</p>
                <p>Fecha: ${new Date().toLocaleString('es-AR')}</p>
                <p>Si recibes este email, la configuración es correcta.</p>
                `,
                text: `Email de prueba del Sistema de Monitoreo AFIP.\nFecha: ${new Date().toLocaleString('es-AR')}`
            };

            const result = await this.transporter.sendMail(mailOptions);
            
            this.logger.info('Email de prueba enviado exitosamente', {
                messageId: result.messageId,
                recipient: to
            });

            return { success: true, messageId: result.messageId };

        } catch (error) {
            this.logger.error('Error enviando email de prueba:', error);
            throw error;
        }
    }
}