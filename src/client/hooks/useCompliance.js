// src/client/hooks/useCompliance.js
import { useState, useEffect, useCallback } from 'react';
import complianceService from '../services/complianceService.js';

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
    const [dashboardData, setDashboardData] = useState(null);
    const [systemStatus, setSystemStatus] = useState(null);

    // Función para verificar cumplimiento
    const checkCompliance = useCallback(async (cuit) => {
        setLoading(true);
        setError(null);

        try {
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
    }, []);

    // Función para obtener obligaciones pendientes
    const getPendingObligations = useCallback(async (cuit) => {
        try {
            const response = await fetch(`/api/mcp/compliance/obligations/${cuit}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.obligations || [];
        } catch (err) {
            console.error('Error getting pending obligations:', err);
            return [];
        }
    }, []);

    // Función para obtener historial de cumplimiento
    const getComplianceHistory = useCallback(async (cuit, period) => {
        try {
            const response = await fetch(`/api/mcp/compliance/history/${cuit}?period=${period}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.history || [];
        } catch (err) {
            console.error('Error getting compliance history:', err);
            return [];
        }
    }, []);

    // Función para calcular score de cumplimiento
    const calculateComplianceScore = useCallback((checks) => {
        if (!checks || checks.length === 0) return 0;

        const totalChecks = checks.length;
        const passedChecks = checks.filter(check => check.status === 'passed').length;
        const score = Math.round((passedChecks / totalChecks) * 100);

        return score;
    }, []);

    // Función para obtener el estado de cumplimiento basado en el score
    const getComplianceStatus = useCallback((score) => {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'warning';
        return 'critical';
    }, []);

    // Función para generar recomendaciones
    const generateRecommendations = useCallback((checks) => {
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
    }, []);

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

    // ============ NUEVAS FUNCIONES PARA EL SISTEMA MEJORADO ============

    // Función para cargar datos del dashboard
    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [dashboard, status] = await Promise.all([
                complianceService.getDashboardData(),
                complianceService.getSystemStatus()
            ]);

            setDashboardData(dashboard);
            setSystemStatus(status);
            
            return { dashboard, status };
        } catch (err) {
            setError(err.message);
            console.error('Error loading dashboard data:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Función para obtener detalle de compliance para un CUIT
    const getComplianceDetail = useCallback(async (cuit) => {
        setLoading(true);
        setError(null);

        try {
            const detail = await complianceService.getComplianceDetail(cuit);
            return detail;
        } catch (err) {
            setError(err.message);
            console.error(`Error getting compliance detail for ${cuit}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Función para ejecutar check manual
    const runManualCheck = useCallback(async (cuit) => {
        setLoading(true);
        setError(null);

        try {
            const result = await complianceService.runComplianceCheck(cuit);
            return result;
        } catch (err) {
            setError(err.message);
            console.error(`Error running manual check for ${cuit}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Función para gestionar alertas
    const alertManager = {
        getActive: useCallback(async (filters = {}) => {
            try {
                return await complianceService.getActiveAlerts(filters);
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        acknowledge: useCallback(async (alertId, acknowledgedBy) => {
            try {
                return await complianceService.acknowledgeAlert(alertId, acknowledgedBy);
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        resolve: useCallback(async (alertId, resolvedBy, resolution = null) => {
            try {
                return await complianceService.resolveAlert(alertId, resolvedBy, resolution);
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        getStats: useCallback(async (days = 7) => {
            try {
                return await complianceService.getAlertStats(days);
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, [])
    };

    // Función para configuración
    const configManager = {
        get: useCallback(async (cuit) => {
            try {
                return await complianceService.getComplianceConfig(cuit);
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        update: useCallback(async (cuit, config) => {
            try {
                return await complianceService.updateComplianceConfig(cuit, config);
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        enableMonitoring: useCallback(async (cuit, config = {}) => {
            try {
                return await complianceService.configureMonitoring(cuit, config);
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        disableMonitoring: useCallback(async (cuit) => {
            try {
                return await complianceService.disableMonitoring(cuit);
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, [])
    };

    // Función para métricas y reportes
    const getMetrics = useCallback(async (days = 7) => {
        try {
            return await complianceService.getSystemMetrics(days);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const getDailyReport = useCallback(async (date = null) => {
        try {
            return await complianceService.getDailyReport(date);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

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

    return {
        // Estado
        complianceData,
        dashboardData,
        systemStatus,
        loading,
        error,
        
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
        subscribeToAlerts
    };
};