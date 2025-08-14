import React, { useState, useEffect, useCallback } from 'react';
import { ComplianceScore } from './ComplianceScore.jsx';
import { RiskIndicators } from './RiskIndicators.jsx';
import { AlertsTimeline } from './AlertsTimeline.jsx';
import { LoadingSpinner } from '../common/LoadingSpinner.jsx';
import { api } from '../../config/api.js';

export const ComplianceDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [systemStatus, setSystemStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshInterval, setRefreshInterval] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Configuración de filtros
    const [filters, setFilters] = useState({
        riskLevel: 'all',
        complianceStatus: 'all',
        timeRange: '7d'
    });

    // Auto-refresh configuración
    const [autoRefresh, setAutoRefresh] = useState(true);
    const REFRESH_INTERVAL = 30000; // 30 segundos

    /**
     * Carga datos del dashboard de compliance
     */
    const loadDashboardData = useCallback(async () => {
        try {
            setError(null);
            
            const [dashboardData, statusData] = await Promise.all([
                api.get('/api/compliance/dashboard'),
                api.get('/api/compliance/status')
            ]);

            if (dashboardData.success && statusData.success) {
                setDashboardData(dashboardData.data);
                setSystemStatus(statusData.data);
                setLastRefresh(new Date());
            } else {
                throw new Error('Error en la respuesta del servidor');
            }

        } catch (error) {
            console.error('Error cargando dashboard:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Configura auto-refresh
     */
    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(loadDashboardData, REFRESH_INTERVAL);
            setRefreshInterval(interval);
            
            return () => {
                clearInterval(interval);
                setRefreshInterval(null);
            };
        } else if (refreshInterval) {
            clearInterval(refreshInterval);
            setRefreshInterval(null);
        }
    }, [autoRefresh, loadDashboardData]);

    /**
     * Carga inicial
     */
    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    /**
     * Maneja cambios en filtros
     */
    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    /**
     * Refresca manualmente
     */
    const handleManualRefresh = () => {
        setLoading(true);
        loadDashboardData();
    };

    /**
     * Filtra datos según filtros activos
     */
    const getFilteredData = (data) => {
        if (!data || !data.complianceData) return [];

        return data.complianceData.filter(item => {
            // Filtro por nivel de riesgo
            if (filters.riskLevel !== 'all') {
                const riskLevel = getRiskLevel(item.risk_score);
                if (riskLevel !== filters.riskLevel) return false;
            }

            // Filtro por estado de compliance
            if (filters.complianceStatus !== 'all') {
                if (item.status !== filters.complianceStatus) return false;
            }

            return true;
        });
    };

    /**
     * Determina nivel de riesgo basado en score
     */
    const getRiskLevel = (score) => {
        if (score >= 0.85) return 'critical';
        if (score >= 0.70) return 'high';
        if (score >= 0.40) return 'medium';
        return 'low';
    };

    /**
     * Obtiene estadísticas resumidas
     */
    const getSummaryStats = (filteredData) => {
        const total = filteredData.length;
        const byStatus = filteredData.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, {});

        const avgRiskScore = total > 0 ? 
            filteredData.reduce((sum, item) => sum + item.risk_score, 0) / total : 0;

        const activeAlerts = filteredData.reduce((sum, item) => sum + (item.active_alerts || 0), 0);

        return {
            total,
            byStatus,
            avgRiskScore,
            activeAlerts
        };
    };

    if (loading && !dashboardData) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                            Error cargando dashboard
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                            <p>{error}</p>
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={handleManualRefresh}
                                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const filteredData = getFilteredData(dashboardData);
    const summaryStats = getSummaryStats(filteredData);

    return (
        <div className="space-y-6">
            {/* Header con controles */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Dashboard de Compliance
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Última actualización: {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    {/* Filtros */}
                    <div className="flex space-x-2">
                        <select
                            value={filters.riskLevel}
                            onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="all">Todos los riesgos</option>
                            <option value="critical">Crítico</option>
                            <option value="high">Alto</option>
                            <option value="medium">Medio</option>
                            <option value="low">Bajo</option>
                        </select>

                        <select
                            value={filters.complianceStatus}
                            onChange={(e) => handleFilterChange('complianceStatus', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="excellent">Excelente</option>
                            <option value="good">Bueno</option>
                            <option value="fair">Regular</option>
                            <option value="poor">Deficiente</option>
                        </select>
                    </div>

                    {/* Controles */}
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                autoRefresh 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                        >
                            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                        </button>

                        <button
                            onClick={handleManualRefresh}
                            disabled={loading}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Actualizando...' : 'Actualizar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Estado del Sistema */}
            {systemStatus && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Estado del Sistema
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className={`text-2xl font-bold ${
                                systemStatus.monitoring?.isRunning ? 'text-green-600' : 'text-red-600'
                            }`}>
                                {systemStatus.monitoring?.isRunning ? 'ACTIVO' : 'INACTIVO'}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Sistema de Monitoreo
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {systemStatus.monitoring?.pollingJobs || 0}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Jobs Activos
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {systemStatus.performance?.successRate || 0}%
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Tasa de Éxito
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                {systemStatus.alerts?.active_alerts || 0}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Alertas Activas
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Estadísticas Resumidas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {summaryStats.total}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Total Monitoreados
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {(summaryStats.byStatus.excellent || 0) + (summaryStats.byStatus.good || 0)}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Compliance OK
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {summaryStats.activeAlerts}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Alertas Activas
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {summaryStats.avgRiskScore.toFixed(2)}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Risk Score Promedio
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Componentes principales */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Score de Compliance */}
                <div className="xl:col-span-1">
                    <ComplianceScore 
                        data={filteredData}
                        metrics={dashboardData?.metrics}
                    />
                </div>

                {/* Indicadores de Riesgo */}
                <div className="xl:col-span-1">
                    <RiskIndicators 
                        data={filteredData}
                        summaryStats={summaryStats}
                    />
                </div>

                {/* Timeline de Alertas */}
                <div className="xl:col-span-1">
                    <AlertsTimeline 
                        alerts={dashboardData?.criticalAlerts || []}
                    />
                </div>
            </div>

            {/* Tabla detallada */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Detalle de Compliance por Contribuyente
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    CUIT / Razón Social
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Risk Score
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Alertas
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Último Check
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredData.map((item) => (
                                <tr key={item.cuit} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {item.cuit}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {item.business_name || 'Sin nombre'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            item.status === 'excellent' ? 'bg-green-100 text-green-800' :
                                            item.status === 'good' ? 'bg-blue-100 text-blue-800' :
                                            item.status === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {item.status === 'excellent' ? 'Excelente' :
                                             item.status === 'good' ? 'Bueno' :
                                             item.status === 'fair' ? 'Regular' :
                                             'Deficiente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                <div 
                                                    className={`h-2 rounded-full ${
                                                        item.risk_score >= 0.85 ? 'bg-red-600' :
                                                        item.risk_score >= 0.70 ? 'bg-yellow-600' :
                                                        item.risk_score >= 0.40 ? 'bg-blue-600' :
                                                        'bg-green-600'
                                                    }`}
                                                    style={{ width: `${item.risk_score * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {(item.risk_score * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex space-x-1">
                                            {item.critical_alerts > 0 && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    {item.critical_alerts} críticas
                                                </span>
                                            )}
                                            {item.high_alerts > 0 && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                    {item.high_alerts} altas
                                                </span>
                                            )}
                                            {item.active_alerts === 0 && (
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    Sin alertas
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {item.last_check ? new Date(item.last_check).toLocaleString() : 'Nunca'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => window.location.href = `/compliance/cuit/${item.cuit}`}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            Ver detalles
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};