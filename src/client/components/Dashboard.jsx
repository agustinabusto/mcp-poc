// src/client/components/Dashboard.jsx
import React from 'react';

// Mock data para visualizar alertas cuando no hay datos reales
const mockAlerts = [
    {
        message: "Conexión con AFIP interrumpida - Verificar conectividad",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutos atrás
        severity: "critical"
    },
    {
        message: "Certificado digital expira en 7 días - Renovación requerida",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 horas atrás
        severity: "high"
    },
    {
        message: "Tiempo de respuesta del servicio excede 5 segundos",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutos atrás
        severity: "medium"
    },
    {
        message: "Nueva actualización de API disponible - AFIP v3.2",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 horas atrás
        severity: "medium"
    },
    {
        message: "Fallo temporal en validación de CUIT - Reintentar",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutos atrás
        severity: "high"
    },
    {
        message: "Cache de consultas lleno - Limpieza automática ejecutada",
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 horas atrás
        severity: "medium"
    },
    {
        message: "Límite de consultas diarias alcanzado al 85%",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 horas atrás
        severity: "medium"
    },
    {
        message: "Error en sincronización de base de datos",
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutos atrás
        severity: "critical"
    }
];

export const Dashboard = ({
    data,
    alerts,
    complianceData,
    systemHealth,
    isLoading,
    onRefresh,
    onAlertAction,
    onComplianceCheck,
    settings
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando dashboard...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tarjetas de resumen - COMENTADO */}
            {/*
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Alertas Activas</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.alerts?.active || 0}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Score Compliance</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.compliance?.score || 0}%</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado Sistema</h3>
                    <p className="text-2xl font-bold text-green-600">{data.system?.status || 'Unknown'}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Groq IA</h3>
                    <p className="text-2xl font-bold text-purple-600">
                        {data.groq?.enabled ? 'Activo' : 'Inactivo'}
                    </p>
                </div>
            </div>
            */

            {/* Alertas recientes */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Alertas Recientes</h3>
                    <button
                        onClick={onRefresh}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                        Actualizar
                    </button>
                </div>

                {(alerts && alerts.length > 0) || (!alerts || alerts.length === 0) ? (
                    <div className="space-y-3">
                        {(alerts && alerts.length > 0 ? alerts : mockAlerts).map((alert, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {alert.message}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(alert.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded ${alert.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                        alert.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                        alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    }`}>
                                    {alert.severity}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No hay alertas recientes
                    </p>
                )}
            </div>
        </div>
    );
};