// src/client/hooks/useAlerts.js
import { useState, useEffect, useCallback } from 'react';

export const useAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Función para agregar una nueva alerta
    const addAlert = useCallback((alert) => {
        const newAlert = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            read: false,
            ...alert
        };

        setAlerts(prev => [newAlert, ...prev]);

        // Auto-remove después de 30 segundos si es tipo 'info'
        if (alert.type === 'info') {
            setTimeout(() => {
                removeAlert(newAlert.id);
            }, 30000);
        }
    }, []);

    // Función para remover una alerta
    const removeAlert = useCallback((id) => {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, []);

    // Función para marcar como leída
    const markAsRead = useCallback((id) => {
        setAlerts(prev => prev.map(alert =>
            alert.id === id ? { ...alert, read: true } : alert
        ));
    }, []);

    // Función para limpiar todas las alertas
    const clearAll = useCallback(() => {
        setAlerts([]);
    }, []);

    // Función para obtener alertas desde el servidor MCP
    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/mcp/alerts');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setAlerts(data.alerts || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching alerts:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Función para crear alertas específicas de AFIP
    const createAfipAlert = useCallback((type, data) => {
        const alertConfigs = {
            'tax_deadline': {
                type: 'warning',
                title: 'Vencimiento de Impuesto',
                message: `Vencimiento ${data.taxType} el ${data.dueDate}`,
                category: 'deadline',
                priority: 'high'
            },
            'compliance_issue': {
                type: 'error',
                title: 'Problema de Cumplimiento',
                message: `${data.description}`,
                category: 'compliance',
                priority: 'critical'
            },
            'declaration_ready': {
                type: 'success',
                title: 'Declaración Lista',
                message: `Declaración ${data.period} lista para presentar`,
                category: 'declaration',
                priority: 'medium'
            },
            'system_update': {
                type: 'info',
                title: 'Actualización del Sistema',
                message: `${data.message}`,
                category: 'system',
                priority: 'low'
            }
        };

        const config = alertConfigs[type];
        if (config) {
            addAlert({
                ...config,
                metadata: data
            });
        }
    }, [addAlert]);

    // Obtener estadísticas de alertas
    const getAlertStats = useCallback(() => {
        const stats = {
            total: alerts.length,
            unread: alerts.filter(a => !a.read).length,
            byType: {},
            byPriority: {},
            byCa

                : {}
        };

        alerts.forEach(alert => {
            // Por tipo
            stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;

            // Por prioridad
            stats.byPriority[alert.priority] = (stats.byPriority[alert.priority] || 0) + 1;

            // Por categoría
            stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;
        });

        return stats;
    }, [alerts]);

    // Filtrar alertas
    const filterAlerts = useCallback((filters) => {
        return alerts.filter(alert => {
            if (filters.type && alert.type !== filters.type) return false;
            if (filters.priority && alert.priority !== filters.priority) return false;
            if (filters.category && alert.category !== filters.category) return false;
            if (filters.unreadOnly && alert.read) return false;
            return true;
        });
    }, [alerts]);

    return {
        alerts,
        loading,
        error,
        addAlert,
        removeAlert,
        markAsRead,
        clearAll,
        fetchAlerts,
        createAfipAlert,
        getAlertStats,
        filterAlerts
    };
};