import express from 'express';
import { LoggerService } from '../services/logger-service.js';

const router = express.Router();
const logger = LoggerService.createLogger('ComplianceHistoryRoutes');

/**
 * Configura las rutas de historial de compliance
 */
export function setupComplianceHistoryRoutes(database) {
    console.log('🔧 setupComplianceHistoryRoutes called with:', {
        database: !!database
    });

    /**
     * GET /api/compliance/history/:cuit
     * Obtiene historial completo de compliance para un CUIT con paginación
     */
    router.get('/history/:cuit', async (req, res) => {
        try {
            const { cuit } = req.params;
            const { 
                page = 1, 
                pageSize = 50, 
                eventType, 
                dateFrom, 
                dateTo,
                severity 
            } = req.query;

            // Validar formato CUIT
            if (!/^\d{2}-\d{8}-\d{1}$/.test(cuit)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de CUIT inválido'
                });
            }

            const offset = (parseInt(page) - 1) * parseInt(pageSize);
            const limit = parseInt(pageSize);

            // Construir query de eventos históricos con filtros
            let whereClause = 'WHERE cuit = ?';
            let params = [cuit];
            
            if (dateFrom) {
                whereClause += ' AND timestamp >= ?';
                params.push(dateFrom);
            }
            
            if (dateTo) {
                whereClause += ' AND timestamp <= ?';
                params.push(dateTo);
            }
            
            if (eventType) {
                whereClause += ' AND type = ?';
                params.push(eventType);
            }
            
            if (severity) {
                whereClause += ' AND severity = ?';
                params.push(severity);
            }

            // Query unificado de eventos históricos
            const eventsQuery = `
                SELECT * FROM (
                    SELECT 
                        'alert' as type,
                        id as event_id,
                        created_at as timestamp,
                        severity,
                        message as title,
                        alert_type as subtype,
                        predicted_date,
                        confidence_level,
                        details,
                        resolved,
                        acknowledged
                    FROM compliance_alerts 
                    ${whereClause.replace('timestamp', 'created_at')}
                    
                    UNION ALL
                    
                    SELECT 
                        'status_change' as type,
                        id as event_id,
                        updated_at as timestamp,
                        CASE 
                            WHEN status = 'excellent' THEN 'low'
                            WHEN status = 'good' THEN 'low'
                            WHEN status = 'fair' THEN 'medium'
                            WHEN status = 'poor' THEN 'high'
                            WHEN status = 'error' THEN 'critical'
                            ELSE 'medium'
                        END as severity,
                        'Status de compliance actualizado a: ' || status as title,
                        status as subtype,
                        NULL as predicted_date,
                        NULL as confidence_level,
                        json_object('previous_status', LAG(status) OVER (ORDER BY updated_at), 'new_status', status, 'risk_score', risk_score) as details,
                        0 as resolved,
                        0 as acknowledged
                    FROM compliance_monitoring 
                    ${whereClause.replace('timestamp', 'updated_at')}
                    
                    UNION ALL
                    
                    SELECT 
                        'risk_score_change' as type,
                        id as event_id,
                        updated_at as timestamp,
                        CASE 
                            WHEN risk_score >= 8.5 THEN 'critical'
                            WHEN risk_score >= 7.0 THEN 'high'
                            WHEN risk_score >= 4.0 THEN 'medium'
                            ELSE 'low'
                        END as severity,
                        'Risk score actualizado: ' || ROUND(risk_score, 2) as title,
                        'risk_update' as subtype,
                        NULL as predicted_date,
                        NULL as confidence_level,
                        json_object('risk_score', risk_score, 'status', status) as details,
                        0 as resolved,
                        0 as acknowledged
                    FROM compliance_monitoring 
                    ${whereClause.replace('timestamp', 'updated_at')}
                    AND risk_score > 0
                    
                    UNION ALL
                    
                    SELECT 
                        'compliance_check' as type,
                        id as event_id,
                        check_date as timestamp,
                        CASE 
                            WHEN overall_status = 'excellent' THEN 'low'
                            WHEN overall_status = 'good' THEN 'low'
                            WHEN overall_status = 'fair' THEN 'medium'
                            WHEN overall_status = 'poor' THEN 'high'
                            WHEN overall_status = 'error' THEN 'critical'
                            ELSE 'medium'
                        END as severity,
                        'Verificación de compliance ejecutada' as title,
                        overall_status as subtype,
                        NULL as predicted_date,
                        NULL as confidence_level,
                        data as details,
                        0 as resolved,
                        0 as acknowledged
                    FROM compliance_results 
                    ${whereClause.replace('timestamp', 'check_date')}
                ) 
                ORDER BY timestamp DESC 
                LIMIT ? OFFSET ?
            `;

            // Ejecutar query con todos los parámetros
            const allParams = [...params, ...params, ...params, ...params, limit, offset];
            const events = await database.all(eventsQuery, allParams);

            // Obtener total de eventos para paginación
            const countQuery = `
                SELECT COUNT(*) as total FROM (
                    SELECT created_at as timestamp FROM compliance_alerts ${whereClause.replace('timestamp', 'created_at')}
                    UNION ALL
                    SELECT updated_at as timestamp FROM compliance_monitoring ${whereClause.replace('timestamp', 'updated_at')}
                    UNION ALL
                    SELECT updated_at as timestamp FROM compliance_monitoring ${whereClause.replace('timestamp', 'updated_at')} AND risk_score > 0
                    UNION ALL
                    SELECT check_date as timestamp FROM compliance_results ${whereClause.replace('timestamp', 'check_date')}
                )
            `;
            
            const totalResult = await database.get(countQuery, [...params, ...params, ...params, ...params]);

            // Obtener resumen del contribuyente
            const summary = await database.get(`
                SELECT 
                    cm.risk_score as currentRiskScore,
                    cm.status as currentStatus,
                    (SELECT AVG(risk_score) FROM compliance_monitoring WHERE cuit = ? AND updated_at >= datetime('now', '-30 days')) as avgRiskScore,
                    (SELECT COUNT(*) FROM compliance_alerts WHERE cuit = ? AND created_at >= datetime('now', '-30 days')) as totalAlerts,
                    (SELECT COUNT(*) FROM compliance_results WHERE cuit = ? AND overall_status IN ('excellent', 'good')) * 100.0 / 
                    NULLIF((SELECT COUNT(*) FROM compliance_results WHERE cuit = ?), 0) as complianceRate
                FROM compliance_monitoring cm
                WHERE cm.cuit = ?
            `, [cuit, cuit, cuit, cuit, cuit]);

            // Procesar detalles JSON
            const processedEvents = events.map(event => ({
                ...event,
                details: event.details ? JSON.parse(event.details) : {},
                metadata: {
                    eventType: event.type,
                    severity: event.severity,
                    resolved: Boolean(event.resolved),
                    acknowledged: Boolean(event.acknowledged)
                }
            }));

            res.json({
                success: true,
                data: {
                    cuit,
                    totalEvents: totalResult.total,
                    page: parseInt(page),
                    pageSize: parseInt(pageSize),
                    events: processedEvents,
                    summary: {
                        currentRiskScore: summary?.currentRiskScore || 0,
                        currentStatus: summary?.currentStatus || 'unknown',
                        avgRiskScore: summary?.avgRiskScore || 0,
                        totalAlerts: summary?.totalAlerts || 0,
                        complianceRate: summary?.complianceRate || 0
                    }
                }
            });

        } catch (error) {
            logger.error(`Error obteniendo historial para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    });

    /**
     * GET /api/compliance/history/:cuit/trends
     * Obtiene análisis de tendencias para un CUIT
     */
    router.get('/history/:cuit/trends', async (req, res) => {
        try {
            const { cuit } = req.params;
            const { timeRange = '30d' } = req.query;

            // Validar formato CUIT
            if (!/^\d{2}-\d{8}-\d{1}$/.test(cuit)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de CUIT inválido'
                });
            }

            // Convertir timeRange a días
            const daysMap = {
                '7d': 7,
                '30d': 30,
                '90d': 90,
                '180d': 180,
                '1y': 365
            };
            const days = daysMap[timeRange] || 30;

            // Evolución de risk score
            const riskScoreEvolution = await database.all(`
                SELECT 
                    DATE(updated_at) as date,
                    AVG(risk_score) as avgScore,
                    MIN(risk_score) as minScore,
                    MAX(risk_score) as maxScore,
                    COUNT(*) as updateCount
                FROM compliance_monitoring 
                WHERE cuit = ? 
                AND updated_at >= datetime('now', '-${days} days')
                GROUP BY DATE(updated_at)
                ORDER BY date
            `, [cuit]);

            // Tendencia de compliance status
            const complianceStatusTrend = await database.all(`
                SELECT 
                    DATE(check_date) as date,
                    overall_status as status,
                    score,
                    COUNT(*) as checkCount
                FROM compliance_results 
                WHERE cuit = ? 
                AND check_date >= datetime('now', '-${days} days')
                ORDER BY check_date
            `, [cuit]);

            // Frecuencia de alertas por tipo
            const alertFrequency = await database.all(`
                SELECT 
                    alert_type,
                    severity,
                    COUNT(*) as count,
                    MIN(created_at) as firstAlert,
                    MAX(created_at) as lastAlert
                FROM compliance_alerts 
                WHERE cuit = ? 
                AND created_at >= datetime('now', '-${days} days')
                GROUP BY alert_type, severity
                ORDER BY count DESC
            `, [cuit]);

            // Análisis de patrones estacionales (por día de la semana)
            const seasonalPatterns = await database.all(`
                SELECT 
                    CASE strftime('%w', created_at)
                        WHEN '0' THEN 'Domingo'
                        WHEN '1' THEN 'Lunes' 
                        WHEN '2' THEN 'Martes'
                        WHEN '3' THEN 'Miércoles'
                        WHEN '4' THEN 'Jueves'
                        WHEN '5' THEN 'Viernes'
                        WHEN '6' THEN 'Sábado'
                    END as dayOfWeek,
                    COUNT(*) as alertCount,
                    AVG(CASE WHEN severity = 'critical' THEN 4 
                             WHEN severity = 'high' THEN 3
                             WHEN severity = 'medium' THEN 2
                             ELSE 1 END) as avgSeverityScore
                FROM compliance_alerts 
                WHERE cuit = ? 
                AND created_at >= datetime('now', '-${days} days')
                GROUP BY strftime('%w', created_at)
                ORDER BY strftime('%w', created_at)
            `, [cuit]);

            res.json({
                success: true,
                data: {
                    cuit,
                    timeRange,
                    trends: {
                        riskScoreEvolution,
                        complianceStatusTrend,
                        alertFrequency,
                        seasonalPatterns
                    }
                }
            });

        } catch (error) {
            logger.error(`Error obteniendo tendencias para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    });

    /**
     * GET /api/compliance/history/:cuit/patterns
     * Obtiene análisis de patrones para un CUIT
     */
    router.get('/history/:cuit/patterns', async (req, res) => {
        try {
            const { cuit } = req.params;

            // Validar formato CUIT
            if (!/^\d{2}-\d{8}-\d{1}$/.test(cuit)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de CUIT inválido'
                });
            }

            // Problemas recurrentes
            const recurringIssues = await database.all(`
                SELECT 
                    alert_type,
                    COUNT(*) as occurrences,
                    MIN(created_at) as firstOccurrence,
                    MAX(created_at) as lastOccurrence,
                    AVG(julianday(resolved_at) - julianday(created_at)) as avgResolutionTime,
                    COUNT(CASE WHEN resolved = 1 THEN 1 END) as resolvedCount,
                    ROUND(COUNT(CASE WHEN resolved = 1 THEN 1 END) * 100.0 / COUNT(*), 2) as resolutionRate
                FROM compliance_alerts 
                WHERE cuit = ? 
                GROUP BY alert_type
                HAVING COUNT(*) > 1
                ORDER BY occurrences DESC
            `, [cuit]);

            // Análisis de mejora/deterioro
            const performanceTrend = await database.get(`
                SELECT 
                    (SELECT risk_score FROM compliance_monitoring WHERE cuit = ? ORDER BY updated_at DESC LIMIT 1) as currentRiskScore,
                    (SELECT risk_score FROM compliance_monitoring WHERE cuit = ? ORDER BY updated_at ASC LIMIT 1) as initialRiskScore,
                    (SELECT AVG(risk_score) FROM compliance_monitoring WHERE cuit = ? AND updated_at >= datetime('now', '-30 days')) as recent30DayAvg,
                    (SELECT AVG(risk_score) FROM compliance_monitoring WHERE cuit = ? AND updated_at >= datetime('now', '-90 days') AND updated_at < datetime('now', '-30 days')) as previous60DayAvg,
                    (SELECT COUNT(*) FROM compliance_alerts WHERE cuit = ? AND created_at >= datetime('now', '-30 days')) as recentAlerts,
                    (SELECT COUNT(*) FROM compliance_alerts WHERE cuit = ? AND created_at >= datetime('now', '-90 days') AND created_at < datetime('now', '-30 days')) as previousAlerts
            `, [cuit, cuit, cuit, cuit, cuit, cuit]);

            // Predicciones basadas en patrones históricos
            const predictiveInsights = await database.all(`
                SELECT 
                    alert_type,
                    AVG(julianday(created_at) - julianday(LAG(created_at) OVER (PARTITION BY alert_type ORDER BY created_at))) as avgDaysBetweenOccurrences,
                    MAX(created_at) as lastOccurrence,
                    CASE 
                        WHEN AVG(julianday(created_at) - julianday(LAG(created_at) OVER (PARTITION BY alert_type ORDER BY created_at))) IS NOT NULL 
                        THEN datetime(MAX(created_at), '+' || ROUND(AVG(julianday(created_at) - julianday(LAG(created_at) OVER (PARTITION BY alert_type ORDER BY created_at)))) || ' days')
                    END as predictedNextOccurrence,
                    COUNT(*) as historicalOccurrences
                FROM compliance_alerts 
                WHERE cuit = ? 
                AND created_at >= datetime('now', '-180 days')
                GROUP BY alert_type
                HAVING COUNT(*) >= 2
                ORDER BY predictedNextOccurrence ASC
            `, [cuit]);

            // Calcular tendencia de mejora/deterioro
            const trendAnalysis = {
                riskScoreTrend: performanceTrend.currentRiskScore - performanceTrend.initialRiskScore,
                recent30DayTrend: performanceTrend.recent30DayAvg - performanceTrend.previous60DayAvg,
                alertTrend: performanceTrend.recentAlerts - performanceTrend.previousAlerts,
                overallTrend: 'stable'
            };

            if (trendAnalysis.recent30DayTrend > 0.5 || trendAnalysis.alertTrend > 2) {
                trendAnalysis.overallTrend = 'deteriorating';
            } else if (trendAnalysis.recent30DayTrend < -0.5 || trendAnalysis.alertTrend < -2) {
                trendAnalysis.overallTrend = 'improving';
            }

            res.json({
                success: true,
                data: {
                    cuit,
                    patterns: {
                        recurringIssues,
                        performanceTrend,
                        trendAnalysis,
                        predictiveInsights: predictiveInsights.map(insight => ({
                            ...insight,
                            daysUntilNext: insight.predictedNextOccurrence ? 
                                Math.ceil((new Date(insight.predictedNextOccurrence) - new Date()) / (1000 * 60 * 60 * 24)) : null
                        }))
                    }
                }
            });

        } catch (error) {
            logger.error(`Error obteniendo patrones para ${req.params.cuit}:`, error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    });

    console.log('✅ Compliance history routes configured successfully');
    return router;
}

export default router;