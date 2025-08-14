import React, { useState, useEffect, useMemo } from 'react';
import { useCompliance } from '../../hooks/useCompliance.js';

export const AlertCenter = () => {
    const { alertManager, loading, error } = useCompliance();
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState(null);
    const [filters, setFilters] = useState({
        status: 'active',
        severity: 'all',
        cuit: ''
    });
    const [selectedAlerts, setSelectedAlerts] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [refreshInterval, setRefreshInterval] = useState(null);

    // Cargar alertas y estadísticas
    const loadAlertsData = async () => {
        try {
            const [alertsData, statsData] = await Promise.all([
                fetch('/api/notifications/alerts/center?' + new URLSearchParams({
                    status: filters.status,
                    ...(filters.cuit && { cuit: filters.cuit }),
                    limit: 100
                })).then(res => res.json()),
                alertManager.getStats(7)
            ]);

            if (alertsData.success) {
                setAlerts(alertsData.data.alerts || []);
                setStats(alertsData.data.stats || null);
            }
        } catch (err) {
            console.error('Error cargando datos del centro de alertas:', err);
        }
    };

    // Efecto para cargar datos iniciales
    useEffect(() => {
        loadAlertsData();
    }, [filters]);

    // Auto-refresh cada 30 segundos para alertas activas
    useEffect(() => {
        if (filters.status === 'active') {
            const interval = setInterval(loadAlertsData, 30000);
            setRefreshInterval(interval);
            return () => clearInterval(interval);
        } else if (refreshInterval) {
            clearInterval(refreshInterval);
            setRefreshInterval(null);
        }
    }, [filters.status]);

    // Filtrar alertas
    const filteredAlerts = useMemo(() => {
        let filtered = alerts;

        if (filters.severity !== 'all') {
            filtered = filtered.filter(alert => alert.severity === filters.severity);
        }

        return filtered.sort((a, b) => {
            // Ordenar por severidad y fecha
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            if (severityDiff !== 0) return severityDiff;
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }, [alerts, filters]);

    // Manejar selección de alertas
    const toggleAlertSelection = (alertId) => {
        const newSelection = new Set(selectedAlerts);
        if (newSelection.has(alertId)) {
            newSelection.delete(alertId);
        } else {
            newSelection.add(alertId);
        }
        setSelectedAlerts(newSelection);
    };

    const selectAllVisible = () => {
        const visibleIds = filteredAlerts.map(alert => alert.id);
        setSelectedAlerts(new Set(visibleIds));
    };

    const clearSelection = () => {
        setSelectedAlerts(new Set());
    };

    // Manejar acciones individuales
    const handleAcknowledge = async (alertId) => {
        try {
            await fetch(`/api/notifications/alerts/${alertId}/acknowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acknowledgedBy: 'user', // TODO: Obtener del contexto de usuario
                    notes: 'Reconocida desde centro de alertas'
                })
            });
            await loadAlertsData();
        } catch (err) {
            console.error('Error reconociendo alerta:', err);
        }
    };

    const handleResolve = async (alertId, resolution = null) => {
        try {
            await fetch(`/api/notifications/alerts/${alertId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resolvedBy: 'user', // TODO: Obtener del contexto de usuario
                    resolution: resolution || 'Resuelta desde centro de alertas'
                })
            });
            await loadAlertsData();
        } catch (err) {
            console.error('Error resolviendo alerta:', err);
        }
    };

    // Manejar acciones en lote
    const handleBulkAction = async () => {
        if (selectedAlerts.size === 0 || !bulkAction) return;

        try {
            await fetch('/api/notifications/alerts/bulk-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alertIds: Array.from(selectedAlerts),
                    action: bulkAction,
                    performedBy: 'user', // TODO: Obtener del contexto de usuario
                    notes: `Acción en lote: ${bulkAction}`
                })
            });
            
            setSelectedAlerts(new Set());
            setBulkAction('');
            await loadAlertsData();
        } catch (err) {
            console.error('Error ejecutando acción en lote:', err);
        }
    };

    // Obtener icono de severidad
    const getSeverityIcon = (severity) => {
        const iconClasses = `w-5 h-5 ${
            severity === 'critical' ? 'text-red-600' :
            severity === 'high' ? 'text-orange-600' :
            severity === 'medium' ? 'text-yellow-600' :
            'text-blue-600'
        }`;

        return (
            <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
        );
    };

    // Formatear tiempo relativo
    const getRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'Ahora mismo';
        if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        return date.toLocaleDateString();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Centro de Alertas
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Gestión centralizada de alertas de compliance
                </p>
            </div>

            {/* Estadísticas */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Total Alertas
                                </p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {stats.total_alerts || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Activas
                                </p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {stats.active_alerts || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Críticas
                                </p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {stats.critical_active || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Resueltas
                                </p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {stats.resolved_alerts || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filtros y acciones */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        {/* Filtros */}
                        <div className="flex flex-wrap items-center space-x-4">
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="active">Activas</option>
                                <option value="acknowledged">Reconocidas</option>
                                <option value="resolved">Resueltas</option>
                                <option value="all">Todas</option>
                            </select>

                            <select
                                value={filters.severity}
                                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="all">Todas las severidades</option>
                                <option value="critical">Críticas</option>
                                <option value="high">Altas</option>
                                <option value="medium">Medias</option>
                                <option value="low">Bajas</option>
                            </select>

                            <input
                                type="text"
                                placeholder="Filtrar por CUIT..."
                                value={filters.cuit}
                                onChange={(e) => setFilters(prev => ({ ...prev, cuit: e.target.value }))}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={loadAlertsData}
                                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            >
                                Actualizar
                            </button>
                        </div>
                    </div>

                    {/* Acciones en lote */}
                    {selectedAlerts.size > 0 && (
                        <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                            <div className="flex items-center space-x-3">
                                <span className="text-sm text-blue-700 dark:text-blue-300">
                                    {selectedAlerts.size} alerta(s) seleccionada(s)
                                </span>
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                    className="px-2 py-1 text-sm border border-blue-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Seleccionar acción</option>
                                    <option value="acknowledge">Reconocer</option>
                                    <option value="resolve">Resolver</option>
                                </select>
                                <button
                                    onClick={handleBulkAction}
                                    disabled={!bulkAction}
                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Ejecutar
                                </button>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={selectAllVisible}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    Seleccionar todas
                                </button>
                                <button
                                    onClick={clearSelection}
                                    className="text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Lista de alertas */}
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando alertas...</p>
                        </div>
                    ) : filteredAlerts.length === 0 ? (
                        <div className="p-8 text-center">
                            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400">
                                No hay alertas que mostrar
                            </p>
                        </div>
                    ) : (
                        filteredAlerts.map((alert) => (
                            <div key={alert.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div className="flex items-start space-x-4">
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={selectedAlerts.has(alert.id)}
                                        onChange={() => toggleAlertSelection(alert.id)}
                                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />

                                    {/* Icono de severidad */}
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getSeverityIcon(alert.severity)}
                                    </div>

                                    {/* Contenido principal */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                                    {alert.message}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    CUIT: {alert.cuit}
                                                    {alert.business_name && ` - ${alert.business_name}`}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {getRelativeTime(alert.created_at)}
                                                </p>
                                                {alert.escalation_level > 0 && (
                                                    <p className="text-sm text-red-600 font-medium">
                                                        Escalación Nivel {alert.escalation_level}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Badges de estado */}
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                                alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                                alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {alert.severity === 'critical' ? 'Crítica' :
                                                 alert.severity === 'high' ? 'Alta' :
                                                 alert.severity === 'medium' ? 'Media' :
                                                 'Baja'}
                                            </span>

                                            {alert.acknowledged && (
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    Reconocida
                                                </span>
                                            )}

                                            {alert.resolved && (
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                    Resuelta
                                                </span>
                                            )}
                                        </div>

                                        {/* Acciones */}
                                        {!alert.resolved && (
                                            <div className="mt-4 flex space-x-3">
                                                {!alert.acknowledged && (
                                                    <button
                                                        onClick={() => handleAcknowledge(alert.id)}
                                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                    >
                                                        Reconocer
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleResolve(alert.id)}
                                                    className="text-sm text-green-600 hover:text-green-800 font-medium"
                                                >
                                                    Resolver
                                                </button>
                                            </div>
                                        )}

                                        {/* Información adicional si está resuelta */}
                                        {alert.resolved && alert.resolved_by && (
                                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                Resuelta por {alert.resolved_by} el {new Date(alert.resolved_at).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};