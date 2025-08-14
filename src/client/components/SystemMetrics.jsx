// src/client / components / SystemMetrics.jsx
import React, { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, Wifi, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react';

// Mock alerts para métricas del sistema
const mockSystemAlerts = [
    {
        message: "CPU utilizando más del 80% de capacidad - Optimización requerida",
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutos atrás
        severity: "high",
        component: "CPU"
    },
    {
        message: "Memoria RAM cerca del límite - 95% utilizada",
        timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 minutos atrás
        severity: "critical",
        component: "Memory"
    },
    {
        message: "Latencia de API AFIP elevada - 500ms promedio",
        timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 minutos atrás
        severity: "medium",
        component: "API"
    },
    {
        message: "Conexiones concurrentes exceden límite recomendado",
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hora atrás
        severity: "medium",
        component: "Network"
    },
    {
        message: "Reinicio automático del servidor en 2 horas por mantenimiento",
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 horas atrás
        severity: "medium",
        component: "System"
    },
    {
        message: "Disco de logs alcanzó 90% de capacidad",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutos atrás
        severity: "high",
        component: "Storage"
    }
];

const SystemMetrics = ({ data, isConnected, onRefresh, loading }) => {
    const [localMetrics, setLocalMetrics] = useState({});

    useEffect(() => {
        if (data && data.metrics) {
            setLocalMetrics(data.metrics);
        }
    }, [data]);

    const formatUptime = (seconds) => {
        if (!seconds) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const formatBytes = (bytes) => {
        if (!bytes) return 'N/A';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    };

    const getConnectionStatus = () => {
        if (isConnected) {
            return {
                color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
                icon: <Wifi className="h-5 w-5" />,
                text: 'Conectado'
            };
        } else {
            return {
                color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
                icon: <AlertCircle className="h-5 w-5" />,
                text: 'Desconectado'
            };
        }
    };

    const connectionStatus = getConnectionStatus();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Métricas del Sistema</h2>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>

                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${connectionStatus.color}`}>
                    {connectionStatus.icon}
                    <span className="font-medium">{connectionStatus.text}</span>
                </div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado del Sistema</h3>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {localMetrics.server_status || data?.status || 'Activo'}
                    </p>
                    <div className="flex items-center mt-2">
                        <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-1" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Estado del servidor</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Uso de CPU</h3>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {localMetrics.cpu_usage ? `${Math.round(localMetrics.cpu_usage)}%` : '45%'}
                    </p>
                    <div className="flex items-center mt-2">
                        <Cpu className="h-4 w-4 text-green-600 dark:text-green-400 mr-1" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Procesamiento actual</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Memoria RAM</h3>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {localMetrics.memory_usage ? `${Math.round(localMetrics.memory_usage)}%` : '68%'}
                    </p>
                    <div className="flex items-center mt-2">
                        <HardDrive className="h-4 w-4 text-purple-600 dark:text-purple-400 mr-1" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Memoria utilizada</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tiempo Activo</h3>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {formatUptime(localMetrics.uptime) !== 'N/A' ? formatUptime(localMetrics.uptime) : '24h 15m'}
                    </p>
                    <div className="flex items-center mt-2">
                        <Wifi className="h-4 w-4 text-orange-600 dark:text-orange-400 mr-1" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Uptime del sistema</span>
                    </div>
                </div>
            </div>

            {/* Métricas AFIP específicas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Métricas AFIP</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                            {localMetrics.afip_mode || 'MOCK'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Modo AFIP</div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                            {localMetrics.groq_enabled ? 'ON' : 'OFF'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Groq IA</div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                            {localMetrics.active_connections || Math.floor(Math.random() * 50) + 10}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Conexiones Activas</div>
                    </div>
                </div>
            </div>

            {/* Métricas en tiempo real simuladas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rendimiento API</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tiempo de Respuesta AFIP</h4>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                            {localMetrics.afip_api_response_time ? `${Math.round(localMetrics.afip_api_response_time)}ms` : '245ms'}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Latencia promedio</div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tasa de Éxito</h4>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                            {localMetrics.afip_success_rate ? `${Math.round(localMetrics.afip_success_rate)}%` : '98.5%'}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Respuestas exitosas</div>
                    </div>
                </div>
            </div>

            {/* Alertas del Sistema */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Alertas del Sistema</h3>
                    <button
                        onClick={onRefresh}
                        className="text-purple-600 hover:text-purple-700 text-sm"
                    >
                        Actualizar
                    </button>
                </div>

                <div className="space-y-3">
                    {mockSystemAlerts.map((alert, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                    {alert.severity === 'critical' ? (
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                    ) : alert.severity === 'high' ? (
                                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {alert.message}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(alert.timestamp).toLocaleString()}
                                        </p>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                            {alert.component}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded flex-shrink-0 ${
                                alert.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                alert.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                                {alert.severity}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Información del sistema */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Última actualización: {data?.lastUpdate ? new Date(data.lastUpdate).toLocaleString() : new Date().toLocaleString()}
                </p>
            </div>
        </div>
    );
};

export default SystemMetrics;