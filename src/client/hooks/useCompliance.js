// src/client/hooks/useCompliance.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import complianceService from '../services/complianceService.js';
import { useSmartCache } from './useSmartCache.js';
import { useCacheInvalidation } from './useCacheInvalidation.js';

export const useCompliance = () => {
    const [complianceData, setComplianceData] = useState({
        status: 'unknown',
        score: 0,
        checks: [],
        recommendations: [],
        lastUpdate: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Integrar sistema de invalidación de caché
    const { 
        invalidateCompliance, 
        onCacheInvalidated,
        refreshAfterInvalidation 
    } = useCacheInvalidation();

    // Usar useSmartCache para datos del dashboard
    const {
        data: dashboardData,
        loading: dashboardLoading,
        error: dashboardError,
        refetch: refreshDashboard
    } = useSmartCache(
        'compliance_dashboard',
        () => complianceService.getDashboardData(),
        { 
            ttl: 120000, // 2 minutos para datos críticos
            staleWhileRevalidate: true,
            cacheLevel: 'memory'
        }
    );

    // Usar useSmartCache para estado del sistema
    const {
        data: systemStatus,
        loading: systemLoading,
        error: systemError,
        refetch: refreshSystemStatus
    } = useSmartCache(
        'compliance_system_status',
        () => complianceService.getSystemStatus(),
        { 
            ttl: 180000, // 3 minutos
            staleWhileRevalidate: true,
            cacheLevel: 'memory'
        }
    );

    // Función para verificar cumplimiento con caché inteligente
    const { 
        refetch: checkComplianceCache 
    } = useSmartCache(
        'compliance_check',
        async (cuit) => {
            const response = await fetch('/api/mcp/compliance/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cuit })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        },
        { 
            ttl: 300000, // 5 minutos
            staleWhileRevalidate: false, // Siempre queremos datos frescos para checks
            cacheLevel: 'memory'
        }
    );

    const checkCompliance = useCallback(async (cuit) => {
        setLoading(true);
        setError(null);

        try {
            const data = await checkComplianceCache(cuit);
            setComplianceData({
                status: data.status,
                score: data.score,
                checks: data.checks || [],
                recommendations: data.recommendations || [],
                lastUpdate: new Date().toISOString()
            });

            return data;
        } catch (err) {
            setError(err.message);
            console.error('Error checking compliance:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [checkComplianceCache]);

    // Función para obtener obligaciones pendientes con caché
    const { 
        refetch: getPendingObligationsCache 
    } = useSmartCache(
        'pending_obligations',
        async (cuit) => {
            const response = await fetch(`/api/mcp/compliance/obligations/${cuit}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.obligations || [];
        },
        { 
            ttl: 600000, // 10 minutos - obligaciones no cambian tan frecuentemente
            staleWhileRevalidate: true,
            cacheLevel: 'memory'
        }
    );

    const getPendingObligations = useCallback(async (cuit) => {
        try {
            return await getPendingObligationsCache(cuit);
        } catch (err) {
            console.error('Error getting pending obligations:', err);
            return [];
        }
    }, [getPendingObligationsCache]);

    // Función para obtener historial de cumplimiento con caché
    const { 
        refetch: getComplianceHistoryCache 
    } = useSmartCache(
        'compliance_history',
        async (cuit, period) => {
            const response = await fetch(`/api/mcp/compliance/history/${cuit}?period=${period}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.history || [];
        },
        { 
            ttl: 1800000, // 30 minutos - historial es relativamente estático
            staleWhileRevalidate: true,
            cacheLevel: 'session' // Usar session storage para historial
        }
    );

    const getComplianceHistory = useCallback(async (cuit, period) => {
        try {
            return await getComplianceHistoryCache(cuit, period);
        } catch (err) {
            console.error('Error getting compliance history:', err);
            return [];
        }
    }, [getComplianceHistoryCache]);

    // Funciones memoizadas para cálculos complejos
    const memoizedCalculations = useMemo(() => ({
        calculateComplianceScore: (checks) => {
            if (!checks || checks.length === 0) return 0;

            const totalChecks = checks.length;
            const passedChecks = checks.filter(check => check.status === 'passed').length;
            const score = Math.round((passedChecks / totalChecks) * 100);

            return score;
        },
        
        getComplianceStatus: (score) => {
            if (score >= 90) return 'excellent';
            if (score >= 75) return 'good';
            if (score >= 60) return 'warning';
            return 'critical';
        },
        
        generateRecommendations: (checks) => {
            if (!checks) return [];
            
            const recommendations = [];

            checks.forEach(check => {
                if (check.status === 'failed') {
                    recommendations.push({
                        id: `rec_${check.id}`,
                        type: 'error',
                        title: `Resolver: ${check.name}`,
                        description: check.description || 'Se requiere atención inmediata',
                        priority: check.critical ? 'high' : 'medium',
                        action: check.suggestedAction || 'Revisar documentación AFIP'
                    });
                } else if (check.status === 'warning') {
                    recommendations.push({
                        id: `rec_${check.id}`,
                        type: 'warning',
                        title: `Mejorar: ${check.name}`,
                        description: check.description || 'Puede mejorarse',
                        priority: 'low',
                        action: check.suggestedAction || 'Considerar optimización'
                    });
                }
            });

            return recommendations;
        }
    }), []);

    // Extraer funciones individuales para compatibilidad hacia atrás
    const calculateComplianceScore = memoizedCalculations.calculateComplianceScore;
    const getComplianceStatus = memoizedCalculations.getComplianceStatus;
    const generateRecommendations = memoizedCalculations.generateRecommendations;

    // Efecto para actualizar datos derivados cuando cambian los checks
    useEffect(() => {
        if (complianceData.checks.length > 0) {
            const score = calculateComplianceScore(complianceData.checks);
            const status = getComplianceStatus(score);
            const recommendations = generateRecommendations(complianceData.checks);

            setComplianceData(prev => ({
                ...prev,
                score,
                status,
                recommendations
            }));
        }
    }, [complianceData.checks, calculateComplianceScore, getComplianceStatus, generateRecommendations]);

    // Suscribirse a eventos de invalidación de caché
    useEffect(() => {
        const unsubscribe = onCacheInvalidated('compliance_', (message) => {
            console.log('useCompliance: Cache invalidation detected', message);
            
            // Refrescar dashboard si se invalida cualquier dato de compliance
            if (message.pattern.includes('compliance_dashboard')) {
                refreshDashboard().catch(console.error);
            }
            
            // Refrescar estado del sistema
            if (message.pattern.includes('compliance_system') || message.type === 'daily_sync') {
                refreshSystemStatus().catch(console.error);
            }
        });

        return unsubscribe;
    }, [onCacheInvalidated, refreshDashboard, refreshSystemStatus]);

    // ============ NUEVAS FUNCIONES PARA EL SISTEMA MEJORADO ============

    // Función para cargar datos del dashboard (optimizada con cache)
    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [dashboard, status] = await Promise.all([
                refreshDashboard(),
                refreshSystemStatus()
            ]);
            
            return { dashboard, status };
        } catch (err) {
            setError(err.message);
            console.error('Error loading dashboard data:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [refreshDashboard, refreshSystemStatus]);

    // Función para obtener detalle de compliance con caché inteligente
    const { 
        refetch: getComplianceDetailCache 
    } = useSmartCache(
        'compliance_detail',
        (cuit) => complianceService.getComplianceDetail(cuit),
        { 
            ttl: 300000, // 5 minutos
            staleWhileRevalidate: true,
            cacheLevel: 'memory'
        }
    );

    const getComplianceDetail = useCallback(async (cuit) => {
        setLoading(true);
        setError(null);

        try {
            const detail = await getComplianceDetailCache(cuit);
            return detail;
        } catch (err) {
            setError(err.message);
            console.error(`Error getting compliance detail for ${cuit}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getComplianceDetailCache]);

    // Función para ejecutar check manual con invalidación de caché
    const { 
        invalidateAndRefetch: invalidateComplianceCache,
        clearCache: clearComplianceCache
    } = useSmartCache(
        'manual_compliance_check',
        (cuit) => complianceService.runComplianceCheck(cuit),
        { 
            ttl: 60000, // 1 minuto - checks manuales deben ser frescos
            staleWhileRevalidate: false,
            cacheLevel: 'memory'
        }
    );

    const runManualCheck = useCallback(async (cuit) => {
        setLoading(true);
        setError(null);

        try {
            // Usar sistema centralizado de invalidación
            await invalidateCompliance(cuit);
            
            // Invalidar caches locales específicos
            clearComplianceCache(`_${cuit}`);
            
            // Ejecutar el check manual
            const result = await invalidateComplianceCache(cuit);
            
            return result;
        } catch (err) {
            setError(err.message);
            console.error(`Error running manual check for ${cuit}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [invalidateComplianceCache, clearComplianceCache, invalidateCompliance]);

    // Caché para alertas activas
    const { 
        refetch: getActiveAlertsCache 
    } = useSmartCache(
        'active_alerts',
        (filters = {}) => complianceService.getActiveAlerts(filters),
        { 
            ttl: 120000, // 2 minutos - alertas necesitan actualizarse frecuentemente
            staleWhileRevalidate: true,
            cacheLevel: 'memory'
        }
    );

    // Caché para estadísticas de alertas
    const { 
        refetch: getAlertStatsCache 
    } = useSmartCache(
        'alert_stats',
        (days = 7) => complianceService.getAlertStats(days),
        { 
            ttl: 300000, // 5 minutos - estadísticas cambian menos frecuentemente
            staleWhileRevalidate: true,
            cacheLevel: 'memory'
        }
    );

    // Función para gestionar alertas (optimizada)
    const alertManager = useMemo(() => ({
        getActive: async (filters = {}) => {
            try {
                return await getActiveAlertsCache(filters);
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },

        acknowledge: async (alertId, acknowledgedBy) => {
            try {
                const result = await complianceService.acknowledgeAlert(alertId, acknowledgedBy);
                
                // Usar sistema centralizado de invalidación
                await refreshAfterInvalidation('active_alerts', async () => {
                    getActiveAlertsCache.clearCache && getActiveAlertsCache.clearCache();
                });
                
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },

        resolve: async (alertId, resolvedBy, resolution = null) => {
            try {
                const result = await complianceService.resolveAlert(alertId, resolvedBy, resolution);
                
                // Usar sistema centralizado de invalidación
                await refreshAfterInvalidation('active_alerts', async () => {
                    getActiveAlertsCache.clearCache && getActiveAlertsCache.clearCache();
                });
                
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },

        getStats: async (days = 7) => {
            try {
                return await getAlertStatsCache(days);
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }
    }), [getActiveAlertsCache, getAlertStatsCache]);

    // Caché para configuración de compliance
    const { 
        refetch: getComplianceConfigCache,
        clearCache: clearConfigCache
    } = useSmartCache(
        'compliance_config',
        (cuit) => complianceService.getComplianceConfig(cuit),
        { 
            ttl: 1800000, // 30 minutos - configuraciones cambian pocas veces
            staleWhileRevalidate: true,
            cacheLevel: 'session'
        }
    );

    // Función para configuración (optimizada)
    const configManager = useMemo(() => ({
        get: async (cuit) => {
            try {
                return await getComplianceConfigCache(cuit);
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },

        update: async (cuit, config) => {
            try {
                const result = await complianceService.updateComplianceConfig(cuit, config);
                // Invalidar cache de configuración para este CUIT
                clearConfigCache(`_${cuit}`);
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },

        enableMonitoring: async (cuit, config = {}) => {
            try {
                const result = await complianceService.configureMonitoring(cuit, config);
                // Invalidar cache relacionado
                clearConfigCache(`_${cuit}`);
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        },

        disableMonitoring: async (cuit) => {
            try {
                const result = await complianceService.disableMonitoring(cuit);
                // Invalidar cache relacionado
                clearConfigCache(`_${cuit}`);
                return result;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }
    }), [getComplianceConfigCache, clearConfigCache]);

    // Caché para métricas del sistema
    const { 
        refetch: getSystemMetricsCache 
    } = useSmartCache(
        'system_metrics',
        (days = 7) => complianceService.getSystemMetrics(days),
        { 
            ttl: 600000, // 10 minutos - métricas se actualizan periódicamente
            staleWhileRevalidate: true,
            cacheLevel: 'memory'
        }
    );

    // Caché para reportes diarios
    const { 
        refetch: getDailyReportCache 
    } = useSmartCache(
        'daily_report',
        (date = null) => complianceService.getDailyReport(date),
        { 
            ttl: 3600000, // 1 hora - reportes diarios son relativamente estáticos
            staleWhileRevalidate: true,
            cacheLevel: 'session'
        }
    );

    // Función para métricas y reportes (optimizada)
    const getMetrics = useCallback(async (days = 7) => {
        try {
            return await getSystemMetricsCache(days);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [getSystemMetricsCache]);

    const getDailyReport = useCallback(async (date = null) => {
        try {
            return await getDailyReportCache(date);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [getDailyReportCache]);

    // Funciones administrativas
    const adminActions = {
        recalculateRiskScores: useCallback(async () => {
            setLoading(true);
            try {
                return await complianceService.recalculateRiskScores();
            } catch (err) {
                setError(err.message);
                throw err;
            } finally {
                setLoading(false);
            }
        }, []),

        cleanupAlerts: useCallback(async () => {
            setLoading(true);
            try {
                return await complianceService.cleanupOldAlerts();
            } catch (err) {
                setError(err.message);
                throw err;
            } finally {
                setLoading(false);
            }
        }, [])
    };

    // Utilidades
    const utils = {
        validateCuit: complianceService.validateCuit,
        formatCuit: complianceService.formatCuit,
        getRiskLevel: complianceService.getRiskLevel,
        getComplianceStatusInfo: complianceService.getComplianceStatusInfo,
        getAlertTypeInfo: complianceService.getAlertTypeInfo
    };

    // Suscripción a WebSocket para alertas en tiempo real
    const subscribeToAlerts = useCallback((callback) => {
        return complianceService.subscribeToAlerts(callback);
    }, []);

    // Estado combinado optimizado
    const combinedLoading = loading || dashboardLoading || systemLoading;
    const combinedError = error || dashboardError || systemError;

    return {
        // Estado
        complianceData,
        dashboardData,
        systemStatus,
        loading: combinedLoading,
        error: combinedError,
        
        // Funciones básicas (compatibilidad hacia atrás)
        checkCompliance,
        getPendingObligations,
        getComplianceHistory,
        calculateComplianceScore,
        getComplianceStatus,
        generateRecommendations,
        
        // Nuevas funciones del sistema mejorado
        loadDashboardData,
        getComplianceDetail,
        runManualCheck,
        alertManager,
        configManager,
        getMetrics,
        getDailyReport,
        adminActions,
        utils,
        subscribeToAlerts,
        
        // Funciones de refresh individuales para control granular
        refreshDashboard,
        refreshSystemStatus,
        
        // Funciones de invalidación de caché
        clearAllCaches: useCallback(() => {
            clearComplianceCache();
            clearConfigCache();
            // Añadir más limpiezas según necesidades
        }, [clearComplianceCache, clearConfigCache])
    };
};