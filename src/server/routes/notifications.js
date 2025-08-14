import express from 'express';
import { LoggerService } from '../services/logger-service.js';

const router = express.Router();
const logger = LoggerService.createLogger('NotificationRoutes');

/**
 * Configura las rutas de notificaciones con las dependencias necesarias
 */
export function setupNotificationRoutes(notificationService, database) {

    // ============ CONFIGURACIÓN DE NOTIFICACIONES ============

    /**
     * GET /api/notifications/config/:cuit
     * Obtiene configuración de notificaciones para un CUIT
     */
    router.get('/config/:cuit', async (req, res) => {
        try {
            const { cuit } = req.params;

            // Validar formato CUIT
            if (!/^\d{2}-\d{8}-\d{1}$/.test(cuit)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de CUIT inválido'
                });
            }

            const config = await notificationService.getNotificationConfig(cuit);

            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: 'Configuración no encontrada'
                });
            }

            res.json({
                success: true,
                data: config
            });

        } catch (error) {
            logger.error(`Error obteniendo configuración de notificaciones para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    });

    /**
     * PUT /api/notifications/config/:cuit
     * Actualiza configuración de notificaciones
     */
    router.put('/config/:cuit', async (req, res) => {
        try {
            const { cuit } = req.params;
            const config = req.body;

            // Validar formato CUIT
            if (!/^\d{2}-\d{8}-\d{1}$/.test(cuit)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de CUIT inválido'
                });
            }

            // Validar configuración básica
            if (config.email_enabled && !config.primary_email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email principal requerido si las notificaciones por email están habilitadas'
                });
            }

            const success = await notificationService.configureNotifications(cuit, config);

            if (success) {
                logger.info(`Configuración de notificaciones actualizada para ${cuit}`);
                res.json({
                    success: true,
                    message: 'Configuración actualizada exitosamente'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Error actualizando configuración'
                });
            }

        } catch (error) {
            logger.error(`Error actualizando configuración de notificaciones para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    });

    /**
     * POST /api/notifications/test/:cuit
     * Testa configuración de notificaciones
     */
    router.post('/test/:cuit', async (req, res) => {
        try {
            const { cuit } = req.params;

            // Validar formato CUIT
            if (!/^\d{2}-\d{8}-\d{1}$/.test(cuit)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de CUIT inválido'
                });
            }

            const result = await notificationService.testNotificationSetup(cuit);

            res.json({
                success: result.success,
                data: result
            });

        } catch (error) {
            logger.error(`Error testando configuración de notificaciones para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    });

    // ============ CENTRO DE ALERTAS ============

    /**
     * GET /api/notifications/alerts/center
     * Obtiene datos para el centro de alertas
     */
    router.get('/alerts/center', async (req, res) => {
        try {
            const { cuit, status = 'active', limit = 50 } = req.query;

            // Construcción de query base
            let query = `
                SELECT ca.*, c.business_name,
                       CASE 
                           WHEN ca.acknowledged = 1 THEN 'acknowledged'
                           WHEN ca.resolved = 1 THEN 'resolved'
                           ELSE 'active'
                       END as display_status
                FROM compliance_alerts ca
                LEFT JOIN contributors c ON ca.cuit = c.cuit
                WHERE 1=1
            `;
            const params = [];

            // Filtros
            if (cuit) {
                query += ' AND ca.cuit = ?';
                params.push(cuit);
            }

            if (status === 'active') {
                query += ' AND ca.acknowledged = 0 AND ca.resolved = 0';
            } else if (status === 'acknowledged') {
                query += ' AND ca.acknowledged = 1 AND ca.resolved = 0';
            } else if (status === 'resolved') {
                query += ' AND ca.resolved = 1';
            }

            query += ' ORDER BY ca.severity DESC, ca.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const alerts = await database.all(query, params);

            // Obtener estadísticas
            const stats = await database.get(`
                SELECT 
                    COUNT(*) as total_alerts,
                    COUNT(CASE WHEN acknowledged = 0 AND resolved = 0 THEN 1 END) as active_alerts,
                    COUNT(CASE WHEN acknowledged = 1 AND resolved = 0 THEN 1 END) as acknowledged_alerts,
                    COUNT(CASE WHEN resolved = 1 THEN 1 END) as resolved_alerts,
                    COUNT(CASE WHEN severity = 'critical' AND acknowledged = 0 AND resolved = 0 THEN 1 END) as critical_active,
                    COUNT(CASE WHEN severity = 'high' AND acknowledged = 0 AND resolved = 0 THEN 1 END) as high_active
                FROM compliance_alerts
                WHERE created_at >= datetime('now', '-7 days')
            `);

            res.json({
                success: true,
                data: {
                    alerts: alerts.map(alert => ({
                        ...alert,
                        details: alert.details ? JSON.parse(alert.details) : {}
                    })),
                    stats
                }
            });

        } catch (error) {
            logger.error('Error obteniendo datos del centro de alertas:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    });

    /**
     * POST /api/notifications/alerts/:alertId/acknowledge
     * Reconoce una alerta
     */
    router.post('/alerts/:alertId/acknowledge', async (req, res) => {
        try {
            const { alertId } = req.params;
            const { acknowledgedBy, notes } = req.body;

            if (!acknowledgedBy) {
                return res.status(400).json({
                    success: false,
                    error: 'Campo acknowledgedBy requerido'
                });
            }

            // Actualizar alerta
            await database.run(`
                UPDATE compliance_alerts 
                SET acknowledged = 1,
                    acknowledged_at = CURRENT_TIMESTAMP,
                    acknowledged_by = ?,
                    details = json_patch(COALESCE(details, '{}'), ?)
                WHERE id = ?
            `, [
                acknowledgedBy,
                JSON.stringify({ acknowledgment_notes: notes || 'Reconocida desde centro de alertas' }),
                parseInt(alertId)
            ]);

            logger.info(`Alerta ${alertId} reconocida por ${acknowledgedBy}`);

            res.json({
                success: true,
                message: 'Alerta reconocida exitosamente'
            });

        } catch (error) {
            logger.error(`Error reconociendo alerta ${req.params.alertId}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error reconociendo alerta'
            });
        }
    });

    /**
     * POST /api/notifications/alerts/:alertId/resolve
     * Resuelve una alerta
     */
    router.post('/alerts/:alertId/resolve', async (req, res) => {
        try {
            const { alertId } = req.params;
            const { resolvedBy, resolution, notes } = req.body;

            if (!resolvedBy) {
                return res.status(400).json({
                    success: false,
                    error: 'Campo resolvedBy requerido'
                });
            }

            // Actualizar alerta
            await database.run(`
                UPDATE compliance_alerts 
                SET resolved = 1,
                    resolved_at = CURRENT_TIMESTAMP,
                    resolved_by = ?,
                    details = json_patch(COALESCE(details, '{}'), ?)
                WHERE id = ?
            `, [
                resolvedBy,
                JSON.stringify({ 
                    resolution: resolution || 'Resuelta desde centro de alertas',
                    resolution_notes: notes
                }),
                parseInt(alertId)
            ]);

            logger.info(`Alerta ${alertId} resuelta por ${resolvedBy}`);

            res.json({
                success: true,
                message: 'Alerta resuelta exitosamente'
            });

        } catch (error) {
            logger.error(`Error resolviendo alerta ${req.params.alertId}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error resolviendo alerta'
            });
        }
    });

    /**
     * POST /api/notifications/alerts/bulk-action
     * Ejecuta acciones en lote sobre alertas
     */
    router.post('/alerts/bulk-action', async (req, res) => {
        try {
            const { alertIds, action, performedBy, notes } = req.body;

            if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Lista de IDs de alertas requerida'
                });
            }

            if (!['acknowledge', 'resolve'].includes(action)) {
                return res.status(400).json({
                    success: false,
                    error: 'Acción debe ser "acknowledge" o "resolve"'
                });
            }

            if (!performedBy) {
                return res.status(400).json({
                    success: false,
                    error: 'Campo performedBy requerido'
                });
            }

            const placeholders = alertIds.map(() => '?').join(',');
            let updated = 0;

            if (action === 'acknowledge') {
                const result = await database.run(`
                    UPDATE compliance_alerts 
                    SET acknowledged = 1,
                        acknowledged_at = CURRENT_TIMESTAMP,
                        acknowledged_by = ?,
                        details = json_patch(COALESCE(details, '{}'), ?)
                    WHERE id IN (${placeholders})
                    AND acknowledged = 0
                `, [
                    performedBy,
                    JSON.stringify({ bulk_acknowledgment_notes: notes || 'Reconocida en lote' }),
                    ...alertIds
                ]);
                updated = result.changes;
            } else if (action === 'resolve') {
                const result = await database.run(`
                    UPDATE compliance_alerts 
                    SET resolved = 1,
                        resolved_at = CURRENT_TIMESTAMP,
                        resolved_by = ?,
                        details = json_patch(COALESCE(details, '{}'), ?)
                    WHERE id IN (${placeholders})
                    AND resolved = 0
                `, [
                    performedBy,
                    JSON.stringify({ 
                        bulk_resolution: 'Resuelta en lote',
                        bulk_resolution_notes: notes 
                    }),
                    ...alertIds
                ]);
                updated = result.changes;
            }

            logger.info(`Acción en lote "${action}" ejecutada por ${performedBy} en ${updated} alertas`);

            res.json({
                success: true,
                message: `${updated} alertas ${action === 'acknowledge' ? 'reconocidas' : 'resueltas'} exitosamente`,
                data: { updated }
            });

        } catch (error) {
            logger.error('Error ejecutando acción en lote:', error);
            res.status(500).json({
                success: false,
                error: 'Error ejecutando acción en lote'
            });
        }
    });

    // ============ MÉTRICAS Y ESTADÍSTICAS ============

    /**
     * GET /api/notifications/metrics
     * Obtiene métricas del sistema de notificaciones
     */
    router.get('/metrics', async (req, res) => {
        try {
            const { days = 7 } = req.query;

            // Métricas del servicio de notificaciones
            const serviceMetrics = notificationService.getMetrics();

            // Métricas de alertas por día
            const alertMetrics = await database.all(`
                SELECT 
                    date(created_at) as date,
                    COUNT(*) as total_alerts,
                    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
                    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_alerts,
                    COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_alerts,
                    COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_alerts,
                    COUNT(CASE WHEN acknowledged = 1 THEN 1 END) as acknowledged_alerts,
                    COUNT(CASE WHEN resolved = 1 THEN 1 END) as resolved_alerts,
                    AVG(
                        CASE WHEN resolved = 1 THEN 
                            (julianday(resolved_at) - julianday(created_at)) * 24 * 60 
                        END
                    ) as avg_resolution_time_minutes
                FROM compliance_alerts 
                WHERE created_at >= datetime('now', '-${parseInt(days)} days')
                GROUP BY date(created_at)
                ORDER BY date DESC
            `);

            // Métricas de configuración
            const configMetrics = await database.get(`
                SELECT 
                    COUNT(*) as total_configs,
                    COUNT(CASE WHEN email_enabled = 1 THEN 1 END) as email_enabled_count,
                    COUNT(CASE WHEN websocket_enabled = 1 THEN 1 END) as websocket_enabled_count,
                    COUNT(CASE WHEN sms_enabled = 1 THEN 1 END) as sms_enabled_count,
                    COUNT(CASE WHEN escalation_enabled = 1 THEN 1 END) as escalation_enabled_count
                FROM notification_settings
            `);

            res.json({
                success: true,
                data: {
                    service: serviceMetrics,
                    alerts: alertMetrics,
                    config: configMetrics
                }
            });

        } catch (error) {
            logger.error('Error obteniendo métricas de notificaciones:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    });

    /**
     * GET /api/notifications/settings/summary
     * Obtiene resumen de configuraciones de notificaciones
     */
    router.get('/settings/summary', async (req, res) => {
        try {
            const summary = await database.all(`
                SELECT 
                    ns.cuit,
                    c.business_name,
                    ns.email_enabled,
                    ns.websocket_enabled,
                    ns.sms_enabled,
                    ns.critical_alerts,
                    ns.high_alerts,
                    ns.escalation_enabled,
                    ns.primary_email
                FROM notification_settings ns
                LEFT JOIN contributors c ON ns.cuit = c.cuit
                WHERE c.deleted_at IS NULL
                ORDER BY c.business_name
            `);

            res.json({
                success: true,
                data: summary
            });

        } catch (error) {
            logger.error('Error obteniendo resumen de configuraciones:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    });

    // ============ ADMINISTRACIÓN ============

    /**
     * POST /api/notifications/admin/send-test-email
     * Envía email de prueba (admin)
     */
    router.post('/admin/send-test-email', async (req, res) => {
        try {
            const { to } = req.body;

            if (!to) {
                return res.status(400).json({
                    success: false,
                    error: 'Campo "to" requerido'
                });
            }

            // Verificar que el servicio de email esté configurado
            const metrics = notificationService.getMetrics();
            if (!metrics.emailServiceReady) {
                return res.status(503).json({
                    success: false,
                    error: 'Servicio de email no configurado'
                });
            }

            await notificationService.sendTestEmail(to);

            logger.info(`Email de prueba enviado a ${to}`);

            res.json({
                success: true,
                message: 'Email de prueba enviado exitosamente'
            });

        } catch (error) {
            logger.error('Error enviando email de prueba:', error);
            res.status(500).json({
                success: false,
                error: 'Error enviando email de prueba'
            });
        }
    });

    /**
     * POST /api/notifications/admin/reset-metrics
     * Resetea métricas del servicio (admin)
     */
    router.post('/admin/reset-metrics', async (req, res) => {
        try {
            notificationService.resetMetrics();

            logger.info('Métricas de notificaciones reseteadas');

            res.json({
                success: true,
                message: 'Métricas reseteadas exitosamente'
            });

        } catch (error) {
            logger.error('Error reseteando métricas:', error);
            res.status(500).json({
                success: false,
                error: 'Error reseteando métricas'
            });
        }
    });

    return router;
}

export default router;