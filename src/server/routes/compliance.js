import express from 'express';
import { LoggerService } from '../services/logger-service.js';

const router = express.Router();
const logger = LoggerService.createLogger('ComplianceRoutes');

/**
 * Configura las rutas de compliance con las dependencias necesarias
 */
export function setupComplianceRoutes(complianceMonitor, riskScoringEngine, alertManager, database) {
    console.log('🔧 setupComplianceRoutes called with:', {
        complianceMonitor: !!complianceMonitor,
        riskScoringEngine: !!riskScoringEngine,
        alertManager: !!alertManager,
        database: !!database
    });
    
    // ============ RUTAS DE MONITOREO ============
    
    // Ruta de prueba simple
    router.get('/test', (req, res) => {
        res.json({ success: true, message: 'Compliance routes working!' });
    });

    // Ruta de debug para verificar base de datos
    router.get('/debug', async (req, res) => {
        try {
            const allTables = await database.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
            const complianceTables = allTables.filter(t => t.name.includes('compliance'));
            
            res.json({
                success: true,
                database_info: {
                    all_tables: allTables.map(t => t.name),
                    compliance_tables: complianceTables.map(t => t.name),
                    total_tables: allTables.length,
                    database_instance: !!database
                }
            });
        } catch (error) {
            res.json({
                success: false,
                error: error.message,
                database_instance: !!database
            });
        }
    });

    /**
     * GET /api/compliance/status
     * Obtiene estado general del sistema de compliance
     */
    router.get('/status', async (req, res) => {
        try {
            const metrics = complianceMonitor.getMetrics();
            const alertStats = await alertManager.getAlertStats();
            
            const systemStatus = {
                monitoring: {
                    isRunning: metrics.isRunning,
                    pollingJobs: metrics.pollingJobs,
                    cacheSize: metrics.cacheSize,
                    circuitBreakerStatus: metrics.circuitBreakerStatus
                },
                alerts: alertStats,
                performance: {
                    totalChecks: metrics.totalChecks,
                    successfulChecks: metrics.successfulChecks,
                    failedChecks: metrics.failedChecks,
                    averageResponseTime: metrics.averageResponseTime,
                    successRate: metrics.totalChecks > 0 ? 
                        (metrics.successfulChecks / metrics.totalChecks * 100).toFixed(2) : 0
                }
            };

            res.json({
                success: true,
                data: systemStatus
            });

        } catch (error) {
            logger.error('Error obteniendo estado del sistema:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    });

    /**
     * GET /api/compliance/dashboard
     * Obtiene datos para el dashboard de compliance
     */
    router.get('/dashboard', async (req, res) => {
        try {
            const { limit = 50 } = req.query;

            // Obtener resumen de compliance en tiempo real
            const complianceData = await database.all(`
                SELECT * FROM v_compliance_dashboard 
                ORDER BY risk_score DESC, last_check ASC 
                LIMIT ?
            `, [parseInt(limit)]);

            // Obtener métricas agregadas
            const metrics = await database.get(`
                SELECT * FROM compliance_metrics 
                WHERE date = date('now')
            `);

            // Obtener alertas activas críticas
            const criticalAlerts = await alertManager.getActiveAlerts({
                severity: 'critical',
                limit: 10
            });

            // Obtener tendencias
            const trends = await database.all(`
                SELECT * FROM v_compliance_trends 
                ORDER BY date DESC 
                LIMIT 30
            `);

            res.json({
                success: true,
                data: {
                    complianceData,
                    metrics,
                    criticalAlerts,
                    trends
                }
            });

        } catch (error) {
            logger.error('Error obteniendo datos del dashboard:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    });

    /**
     * GET /api/compliance/cuit/:cuit
     * Obtiene información detallada de compliance para un CUIT
     */
    router.get('/cuit/:cuit', async (req, res) => {
        try {
            const { cuit } = req.params;

            // Validar formato CUIT
            if (!/^\d{2}-\d{8}-\d{1}$/.test(cuit)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de CUIT inválido'
                });
            }

            // Obtener datos de monitoreo
            const monitoringData = await database.get(`
                SELECT * FROM compliance_monitoring 
                WHERE cuit = ?
            `, [cuit]);

            if (!monitoringData) {
                return res.status(404).json({
                    success: false,
                    error: 'CUIT no encontrado en monitoreo'
                });
            }

            // Obtener alertas activas
            const activeAlerts = await alertManager.getActiveAlerts({ cuit });

            // Obtener historial de risk scores
            const riskHistory = await riskScoringEngine.getRiskScoreHistory(cuit, 30);

            // Obtener últimos resultados de compliance
            const recentResults = await database.all(`
                SELECT * FROM compliance_results 
                WHERE cuit = ? 
                ORDER BY check_date DESC 
                LIMIT 5
            `, [cuit]);

            // Obtener configuración
            const config = await database.get(`
                SELECT * FROM compliance_monitoring_config 
                WHERE cuit = ?
            `, [cuit]);

            res.json({
                success: true,
                data: {
                    monitoring: monitoringData,
                    alerts: activeAlerts,
                    riskHistory,
                    recentResults: recentResults.map(r => ({
                        ...r,
                        data: JSON.parse(r.data)
                    })),
                    config
                }
            });

        } catch (error) {
            logger.error(`Error obteniendo datos de compliance para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    });

    /**
     * POST /api/compliance/check/:cuit
     * Ejecuta verificación manual de compliance
     */
    router.post('/check/:cuit', async (req, res) => {
        try {
            const { cuit } = req.params;

            // Validar formato CUIT
            if (!/^\d{2}-\d{8}-\d{1}$/.test(cuit)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de CUIT inválido'
                });
            }

            logger.info(`Verificación manual solicitada para ${cuit}`);

            // Ejecutar verificación
            const result = await complianceMonitor.checkComplianceManual(cuit);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error(`Error en verificación manual para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error ejecutando verificación de compliance'
            });
        }
    });

    /**
     * POST /api/compliance/monitor/:cuit
     * Configura monitoreo para un CUIT
     */
    router.post('/monitor/:cuit', async (req, res) => {
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

            await complianceMonitor.addCuitMonitoring(cuit, config);

            logger.info(`Monitoreo configurado para ${cuit}`, config);

            res.json({
                success: true,
                message: 'Monitoreo configurado exitosamente'
            });

        } catch (error) {
            logger.error(`Error configurando monitoreo para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error configurando monitoreo'
            });
        }
    });

    /**
     * DELETE /api/compliance/monitor/:cuit
     * Deshabilita monitoreo para un CUIT
     */
    router.delete('/monitor/:cuit', async (req, res) => {
        try {
            const { cuit } = req.params;

            // Validar formato CUIT
            if (!/^\d{2}-\d{8}-\d{1}$/.test(cuit)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de CUIT inválido'
                });
            }

            await complianceMonitor.removeCuitMonitoring(cuit);

            logger.info(`Monitoreo deshabilitado para ${cuit}`);

            res.json({
                success: true,
                message: 'Monitoreo deshabilitado exitosamente'
            });

        } catch (error) {
            logger.error(`Error deshabilitando monitoreo para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error deshabilitando monitoreo'
            });
        }
    });

    // ============ RUTAS DE ALERTAS ============

    /**
     * GET /api/compliance/alerts
     * Obtiene alertas activas con filtros
     */
    router.get('/alerts', async (req, res) => {
        try {
            const { cuit, severity, alert_type, limit = 50, offset = 0 } = req.query;

            const filters = {};
            if (cuit) filters.cuit = cuit;
            if (severity) filters.severity = severity;
            if (alert_type) filters.alert_type = alert_type;
            if (limit) filters.limit = parseInt(limit);

            const alerts = await alertManager.getActiveAlerts(filters);

            // Obtener total para paginación
            let totalQuery = `
                SELECT COUNT(*) as total 
                FROM compliance_alerts 
                WHERE acknowledged = 0 AND resolved = 0
            `;
            const params = [];

            if (cuit) {
                totalQuery += ' AND cuit = ?';
                params.push(cuit);
            }
            if (severity) {
                totalQuery += ' AND severity = ?';
                params.push(severity);
            }
            if (alert_type) {
                totalQuery += ' AND alert_type = ?';
                params.push(alert_type);
            }

            const totalResult = await database.get(totalQuery, params);

            res.json({
                success: true,
                data: {
                    alerts,
                    pagination: {
                        total: totalResult.total,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        hasMore: parseInt(offset) + alerts.length < totalResult.total
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo alertas:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    });

    /**
     * POST /api/compliance/alerts/:alertId/acknowledge
     * Marca una alerta como reconocida
     */
    router.post('/alerts/:alertId/acknowledge', async (req, res) => {
        try {
            const { alertId } = req.params;
            const { acknowledgedBy } = req.body;

            if (!acknowledgedBy) {
                return res.status(400).json({
                    success: false,
                    error: 'Campo acknowledgedBy requerido'
                });
            }

            const result = await alertManager.acknowledgeAlert(
                parseInt(alertId), 
                acknowledgedBy
            );

            logger.info(`Alerta ${alertId} reconocida por ${acknowledgedBy}`);

            res.json({
                success: true,
                data: result
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
     * POST /api/compliance/alerts/:alertId/resolve
     * Marca una alerta como resuelta
     */
    router.post('/alerts/:alertId/resolve', async (req, res) => {
        try {
            const { alertId } = req.params;
            const { resolvedBy, resolution } = req.body;

            if (!resolvedBy) {
                return res.status(400).json({
                    success: false,
                    error: 'Campo resolvedBy requerido'
                });
            }

            const result = await alertManager.resolveAlert(
                parseInt(alertId), 
                resolvedBy,
                resolution
            );

            logger.info(`Alerta ${alertId} resuelta por ${resolvedBy}`);

            res.json({
                success: true,
                data: result
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
     * GET /api/compliance/alerts/stats
     * Obtiene estadísticas de alertas
     */
    router.get('/alerts/stats', async (req, res) => {
        try {
            const { days = 7 } = req.query;

            const stats = await alertManager.getAlertStats(parseInt(days));

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Error obteniendo estadísticas de alertas:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    });

    // ============ RUTAS DE CONFIGURACIÓN ============

    /**
     * GET /api/compliance/config/:cuit
     * Obtiene configuración de monitoreo para un CUIT
     */
    router.get('/config/:cuit', async (req, res) => {
        try {
            const { cuit } = req.params;

            const config = await database.get(`
                SELECT * FROM compliance_monitoring_config 
                WHERE cuit = ?
            `, [cuit]);

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
            logger.error(`Error obteniendo configuración para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    });

    /**
     * PUT /api/compliance/config/:cuit
     * Actualiza configuración de monitoreo
     */
    router.put('/config/:cuit', async (req, res) => {
        try {
            const { cuit } = req.params;
            const config = req.body;

            await database.run(`
                UPDATE compliance_monitoring_config 
                SET enabled = ?,
                    auto_polling = ?,
                    custom_interval = ?,
                    email_notifications = ?,
                    websocket_notifications = ?,
                    escalation_enabled = ?,
                    notification_email = ?,
                    threshold_high_risk = ?,
                    threshold_critical_risk = ?,
                    ml_predictions_enabled = ?,
                    prediction_horizon_days = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE cuit = ?
            `, [
                config.enabled,
                config.auto_polling,
                config.custom_interval,
                config.email_notifications,
                config.websocket_notifications,
                config.escalation_enabled,
                config.notification_email,
                config.threshold_high_risk,
                config.threshold_critical_risk,
                config.ml_predictions_enabled,
                config.prediction_horizon_days,
                cuit
            ]);

            logger.info(`Configuración actualizada para ${cuit}`, config);

            res.json({
                success: true,
                message: 'Configuración actualizada exitosamente'
            });

        } catch (error) {
            logger.error(`Error actualizando configuración para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error actualizando configuración'
            });
        }
    });

    // ============ RUTAS DE MÉTRICAS Y REPORTES ============

    /**
     * GET /api/compliance/metrics
     * Obtiene métricas del sistema
     */
    router.get('/metrics', async (req, res) => {
        try {
            const { days = 7 } = req.query;

            // Métricas de compliance
            const complianceMetrics = await database.all(`
                SELECT * FROM compliance_metrics 
                WHERE date >= date('now', '-${parseInt(days)} days')
                ORDER BY date DESC
            `);

            // Métricas de performance del polling
            const pollingMetrics = await database.all(`
                SELECT * FROM v_polling_performance
                ORDER BY date DESC 
                LIMIT ${parseInt(days)}
            `);

            // Métricas de sistema
            const systemMetrics = {
                monitoring: complianceMonitor.getMetrics(),
                riskScoring: riskScoringEngine.getMetrics(),
                alertManager: alertManager.getMetrics()
            };

            res.json({
                success: true,
                data: {
                    compliance: complianceMetrics,
                    polling: pollingMetrics,
                    system: systemMetrics
                }
            });

        } catch (error) {
            logger.error('Error obteniendo métricas:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    });

    /**
     * GET /api/compliance/reports/daily
     * Genera reporte diario de compliance
     */
    router.get('/reports/daily', async (req, res) => {
        try {
            const { date = new Date().toISOString().split('T')[0] } = req.query;

            // Métricas del día
            const dailyMetrics = await database.get(`
                SELECT * FROM compliance_metrics 
                WHERE date = ?
            `, [date]);

            // Top alertas del día
            const topAlerts = await database.all(`
                SELECT ca.*, c.business_name 
                FROM compliance_alerts ca
                LEFT JOIN contributors c ON ca.cuit = c.cuit
                WHERE date(ca.created_at) = ?
                AND ca.severity IN ('critical', 'high')
                ORDER BY ca.severity DESC, ca.created_at DESC
                LIMIT 10
            `, [date]);

            // Contribuyentes con cambios de estado
            const statusChanges = await database.all(`
                SELECT cm.cuit, cm.status, cm.risk_score, c.business_name,
                       LAG(cm.risk_score) OVER (PARTITION BY cm.cuit ORDER BY cm.updated_at) as previous_risk_score
                FROM compliance_monitoring cm
                LEFT JOIN contributors c ON cm.cuit = c.cuit
                WHERE date(cm.updated_at) = ?
                ORDER BY ABS(cm.risk_score - COALESCE(previous_risk_score, 0)) DESC
                LIMIT 10
            `, [date]);

            const report = {
                date,
                metrics: dailyMetrics,
                topAlerts,
                statusChanges,
                generatedAt: new Date().toISOString()
            };

            res.json({
                success: true,
                data: report
            });

        } catch (error) {
            logger.error('Error generando reporte diario:', error);
            res.status(500).json({
                success: false,
                error: 'Error generando reporte'
            });
        }
    });

    // ============ RUTAS DE ADMINISTRACIÓN ============

    /**
     * POST /api/compliance/admin/recalculate-risk-scores
     * Recalcula todos los risk scores
     */
    router.post('/admin/recalculate-risk-scores', async (req, res) => {
        try {
            logger.info('Iniciando recálculo masivo de risk scores');

            const result = await riskScoringEngine.recalculateAllRiskScores();

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error en recálculo masivo:', error);
            res.status(500).json({
                success: false,
                error: 'Error ejecutando recálculo'
            });
        }
    });

    /**
     * POST /api/compliance/admin/cleanup-alerts
     * Limpia alertas antiguas
     */
    router.post('/admin/cleanup-alerts', async (req, res) => {
        try {
            const cleaned = await alertManager.cleanupOldAlerts();

            res.json({
                success: true,
                data: { cleaned }
            });

        } catch (error) {
            logger.error('Error limpiando alertas:', error);
            res.status(500).json({
                success: false,
                error: 'Error limpiando alertas'
            });
        }
    });

    console.log('✅ Compliance routes configured successfully');
    return router;
}

export default router;