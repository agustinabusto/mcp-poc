// src/client/hooks/useCompliance.js
import { useState, useEffect, useCallback } from 'react';

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

    return {
        complianceData,
        loading,
        error,
        checkCompliance,
        getPendingObligations,
        getComplianceHistory,
        calculateComplianceScore,
        getComplianceStatus,
        generateRecommendations
    };
};