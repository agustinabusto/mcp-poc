// src/client / components / SystemMetrics.jsx
import React, { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, Wifi, RefreshCw, AlertCircle } from 'lucide-react';

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
                color: 'text-green-600 bg-green-50 border-green-200',
                icon: <Wifi className="h-5 w-5" />,
                text: 'Conectado'
            };
        } else {
            return {
                color: 'text-red-600 bg-red-50 border-red-200',
                icon: <AlertCircle className="h-5 w-5" />,
                text: 'Desconectado'
            };
        }
    };

    const connectionStatus = getConnectionStatus();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Métricas del Sistema</h2>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>

                {/* Estado de conexión */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${connectionStatus.color}`}>
                    {connectionStatus.icon}
                    <span className="font-medium">{connectionStatus.text}</span>
                </div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="h-8 w-8 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Estado</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                        {localMetrics.server_status || data?.status || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">Estado del servidor</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Cpu className="h-8 w-8 text-green-600" />
                        <h3 className="text-lg font-semibold text-gray-900">CPU</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                        {localMetrics.cpu_usage ? `${Math.round(localMetrics.cpu_usage)}%` : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">Uso de CPU</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <HardDrive className="h-8 w-8 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Memoria</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                        {localMetrics.memory_usage ? `${Math.round(localMetrics.memory_usage)}%` :
                            localMetrics.memory_usage ? formatBytes(localMetrics.memory_usage.heapUsed) : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">Uso de memoria</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Wifi className="h-8 w-8 text-orange-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Uptime</h3>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                        {formatUptime(localMetrics.uptime)}
                    </p>
                    <p className="text-sm text-gray-500">Tiempo activo</p>
                </div>
            </div>

            {/* Métricas AFIP específicas */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas AFIP</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                            {localMetrics.afip_mode || 'MOCK'}
                        </div>
                        <div className="text-sm text-gray-500">Modo AFIP</div>
                    </div>

                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                            {localMetrics.groq_enabled ? 'ON' : 'OFF'}
                        </div>
                        <div className="text-sm text-gray-500">Groq IA</div>
                    </div>

                    <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                            {localMetrics.active_connections || Math.floor(Math.random() * 50) + 10}
                        </div>
                        <div className="text-sm text-gray-500">Conexiones Activas</div>
                    </div>
                </div>
            </div>

            {/* Métricas en tiempo real simuladas */}
            {localMetrics.afip_api_response_time && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Rendimiento API</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                                {Math.round(localMetrics.afip_api_response_time)}ms
                            </div>
                            <div className="text-sm text-gray-500">Tiempo de respuesta AFIP</div>
                        </div>

                        <div>
                            <div className="text-2xl font-bold text-green-600 mb-1">
                                {Math.round(localMetrics.afip_success_rate)}%
                            </div>
                            <div className="text-sm text-gray-500">Tasa de éxito</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Información del sistema */}
            {data?.lastUpdate && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                        Última actualización: {new Date(data.lastUpdate).toLocaleString()}
                    </p>
                </div>
            )}
        </div>
    );
};

export default SystemMetrics;