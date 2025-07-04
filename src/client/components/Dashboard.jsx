// src/client/components/Dashboard.jsx
import React from 'react';

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
            {/* Tarjetas de resumen */}
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

                {alerts && alerts.length > 0 ? (
                    <div className="space-y-3">
                        {alerts.map((alert, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {alert.message}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(alert.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded ${alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                        alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                            'bg-yellow-100 text-yellow-800'
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