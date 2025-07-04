// src/client / components / AlertsView.jsx
import React from 'react';

export const AlertsView = ({
    alerts,
    alertStats,
    isLoading,
    onRefresh,
    onAlertAction,
    filters,
    onFiltersChange,
    settings
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando alertas...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Alertas ({alerts?.length || 0})
                </h2>
                <button
                    onClick={onRefresh}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Actualizar
                </button>
            </div>

            {alerts && alerts.length > 0 ? (
                <div className="space-y-4">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                        {alert.message}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        CUIT: {alert.cuit} • {new Date(alert.timestamp).toLocaleString()}
                                    </p>
                                    {alert.actions && (
                                        <div className="mt-3">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Acciones recomendadas:
                                            </p>
                                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                {alert.actions.map((action, idx) => (
                                                    <li key={idx} className="flex items-center">
                                                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                                        {action}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end space-y-2">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                        alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {alert.severity}
                                    </span>
                                    {!alert.resolved && (
                                        <button
                                            onClick={() => onAlertAction(alert.id, 'acknowledge')}
                                            className="text-blue-600 hover:text-blue-700 text-sm"
                                        >
                                            Confirmar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No hay alertas para mostrar</p>
                </div>
            )}
        </div>
    );
};