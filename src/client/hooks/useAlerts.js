// src/client/hooks/useAlerts.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSmartCache } from './useSmartCache.js';

export const useAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const timeoutRefs = useRef(new Map()); // Para manejar timeouts de auto-remove

    // Cache inteligente para alertas del servidor
    const {
        data: serverAlerts,
        loading: serverLoading,
        error: serverError,
        refetch: fetchServerAlerts,
        clearCache: clearServerAlertsCache
    } = useSmartCache(
        'server_alerts',
        async () => {
            const response = await fetch('/api/mcp/alerts');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.alerts || [];
        },
        {
            ttl: 60000, // 1 minuto - alertas necesitan actualizarse frecuentemente
            staleWhileRevalidate: true,
            cacheLevel: 'memory'
        }
    );

    // Función optimizada para agregar una nueva alerta
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
            const timeoutId = setTimeout(() => {
                removeAlert(newAlert.id);
                timeoutRefs.current.delete(newAlert.id);
            }, 30000);
            
            // Guardar referencia del timeout para poder cancelarlo
            timeoutRefs.current.set(newAlert.id, timeoutId);
        }
    }, []);

    // Función optimizada para remover una alerta
    const removeAlert = useCallback((id) => {
        // Cancelar timeout si existe
        if (timeoutRefs.current.has(id)) {
            clearTimeout(timeoutRefs.current.get(id));
            timeoutRefs.current.delete(id);
        }
        
        setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, []);

    // Función para marcar como leída
    const markAsRead = useCallback((id) => {
        setAlerts(prev => prev.map(alert =>
            alert.id === id ? { ...alert, read: true } : alert
        ));
    }, []);

    // Función optimizada para limpiar todas las alertas
    const clearAll = useCallback(() => {
        // Cancelar todos los timeouts activos
        timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
        timeoutRefs.current.clear();
        
        setAlerts([]);
    }, []);

    // Función optimizada para obtener alertas desde el servidor MCP
    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const fetchedAlerts = await fetchServerAlerts();
            setAlerts(fetchedAlerts || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching alerts:', err);
        } finally {
            setLoading(false);
        }
    }, [fetchServerAlerts]);

    // Configuraciones de alertas AFIP memoizadas
    const alertConfigs = useMemo(() => ({
        'tax_deadline': {
            type: 'warning',
            title: 'Vencimiento de Impuesto',
            category: 'deadline',
            priority: 'high',
            template: (data) => `Vencimiento ${data.taxType} el ${data.dueDate}`
        },
        'compliance_issue': {
            type: 'error',
            title: 'Problema de Cumplimiento',
            category: 'compliance',
            priority: 'critical',
            template: (data) => `${data.description}`
        },
        'declaration_ready': {
            type: 'success',
            title: 'Declaración Lista',
            category: 'declaration',
            priority: 'medium',
            template: (data) => `Declaración ${data.period} lista para presentar`
        },
        'system_update': {
            type: 'info',
            title: 'Actualización del Sistema',
            category: 'system',
            priority: 'low',
            template: (data) => `${data.message}`
        },
        // Nuevos tipos de alertas
        'deadline_approaching': {
            type: 'warning',
            title: 'Vencimiento Próximo',
            category: 'deadline',
            priority: 'medium',
            template: (data) => `${data.description} vence en ${data.daysLeft} días`
        },
        'connection_lost': {
            type: 'error',
            title: 'Conexión Perdida',
            category: 'system',
            priority: 'high',
            template: (data) => `Conexión con ${data.service} perdida`
        }
    }), []);

    // Función optimizada para crear alertas específicas de AFIP
    const createAfipAlert = useCallback((type, data) => {
        const config = alertConfigs[type];
        if (config) {
            addAlert({
                type: config.type,
                title: config.title,
                message: config.template(data),
                category: config.category,
                priority: config.priority,
                metadata: data
            });
        }
    }, [alertConfigs, addAlert]);

    // Estadísticas de alertas memoizadas para optimizar rendimiento
    const alertStats = useMemo(() => {
        const stats = {
            total: alerts.length,
            unread: alerts.filter(a => !a.read).length,
            byType: {},
            byPriority: {},
            byCategory: {},
            recentAlerts: alerts.filter(a => {
                const alertTime = new Date(a.timestamp);
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                return alertTime > oneHourAgo;
            }).length
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

    // Función para obtener estadísticas (ahora simplemente retorna el valor memoizado)
    const getAlertStats = useCallback(() => alertStats, [alertStats]);

    // Función optimizada para filtrar alertas con filtros complejos
    const filterAlerts = useCallback((filters = {}) => {
        return alerts.filter(alert => {
            // Filtros básicos
            if (filters.type && alert.type !== filters.type) return false;
            if (filters.priority && alert.priority !== filters.priority) return false;
            if (filters.category && alert.category !== filters.category) return false;
            if (filters.unreadOnly && alert.read) return false;
            
            // Filtros avanzados
            if (filters.dateRange) {
                const alertDate = new Date(alert.timestamp);
                if (filters.dateRange.start && alertDate < new Date(filters.dateRange.start)) return false;
                if (filters.dateRange.end && alertDate > new Date(filters.dateRange.end)) return false;
            }
            
            if (filters.searchText) {
                const searchLower = filters.searchText.toLowerCase();
                const matchesTitle = alert.title?.toLowerCase().includes(searchLower);
                const matchesMessage = alert.message?.toLowerCase().includes(searchLower);
                if (!matchesTitle && !matchesMessage) return false;
            }
            
            return true;
        });
    }, [alerts]);

    // Funciones de utilidad memoizadas
    const utilityFunctions = useMemo(() => ({
        // Obtener alertas por prioridad
        getAlertsByPriority: (priority) => alerts.filter(alert => alert.priority === priority),
        
        // Obtener alertas críticas sin leer
        getCriticalUnreadAlerts: () => alerts.filter(alert => 
            alert.priority === 'critical' && !alert.read
        ),
        
        // Marcar todas como leídas
        markAllAsRead: () => {
            setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
        },
        
        // Obtener alertas recientes (última hora)
        getRecentAlerts: () => {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            return alerts.filter(alert => new Date(alert.timestamp) > oneHourAgo);
        },
        
        // Obtener total de alertas por tipo
        getCountByType: (type) => alerts.filter(alert => alert.type === type).length
    }), [alerts]);

    // Estado combinado para loading
    const combinedLoading = loading || serverLoading;
    const combinedError = error || serverError;
    
    // Efecto para sincronizar alertas del servidor con las locales
    useEffect(() => {
        if (serverAlerts && serverAlerts.length > 0) {
            // Solo actualizar si hay cambios reales
            const serverAlertIds = serverAlerts.map(a => a.id);
            const currentServerAlertIds = alerts
                .filter(a => a.source === 'server')
                .map(a => a.id);
            
            const hasChanges = serverAlertIds.length !== currentServerAlertIds.length ||
                               serverAlertIds.some(id => !currentServerAlertIds.includes(id));
            
            if (hasChanges) {
                setAlerts(prev => {
                    // Mantener alertas locales, actualizar las del servidor
                    const localAlerts = prev.filter(a => a.source !== 'server');
                    const markedServerAlerts = serverAlerts.map(a => ({ ...a, source: 'server' }));
                    return [...markedServerAlerts, ...localAlerts];
                });
            }
        }
    }, [serverAlerts, alerts]);
    
    // Cleanup de timeouts al desmontar
    useEffect(() => {
        return () => {
            timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
            timeoutRefs.current.clear();
        };
    }, []);

    return {
        // Estado principal
        alerts,
        loading: combinedLoading,
        error: combinedError,
        
        // Funciones básicas
        addAlert,
        removeAlert,
        markAsRead,
        clearAll,
        fetchAlerts,
        createAfipAlert,
        
        // Funciones de análisis
        getAlertStats,
        filterAlerts,
        alertStats, // Acceso directo a estadísticas
        
        // Funciones de utilidad
        ...utilityFunctions,
        
        // Control de caché
        refreshServerAlerts: fetchServerAlerts,
        clearServerCache: clearServerAlertsCache,
        
        // Configuraciones disponibles
        availableAlertTypes: Object.keys(alertConfigs),
        
        // Estado del servidor
        serverStatus: {
            loading: serverLoading,
            error: serverError,
            hasServerAlerts: !!(serverAlerts && serverAlerts.length > 0)
        }
    };
};