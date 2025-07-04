// src/client/components/AlertsPanel.jsx
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Bell, BellOff, Trash2, RefreshCw } from 'lucide-react';

const AlertsPanel = ({ alerts, onRefresh, onClear, loading }) => {
    const [filter, setFilter] = useState('all');

    const getAlertIcon = (type) => {
        switch (type) {
            case 'error':
                return <XCircle className="h-5 w-5 text-red-600" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            default:
                return <Bell className="h-5 w-5 text-blue-600" />;
        }
    };

    const getAlertColor = (type) => {
        switch (type) {
            case 'error':
                return 'border-l-red-500 bg-red-50';
            case 'warning':
                return 'border-l-yellow-500 bg-yellow-50';
            case 'success':
                return 'border-l-green-500 bg-green-50';
            default:
                return 'border-l-blue-500 bg-blue-50';
        }
    };

    const getPriorityBadge = (priority) => {
        const colors = {
            critical: 'bg-red-100 text-red-800',
            high: 'bg-orange-100 text-orange-800',
            medium: 'bg-yellow-100 text-yellow-800',
            low: 'bg-green-100 text-green-800'
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority] || colors.low}`}>
                {priority || 'low'}
            </span>
        );
    };

    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'all') return true;
        return alert.type === filter;
    });

    const alertCounts = {
        all: alerts.length,
        error: alerts.filter(a => a.type === 'error').length,
        warning: alerts.filter(a => a.type === 'warning').length,
        success: alerts.filter(a => a.type === 'success').length,
        info: alerts.filter(a => a.type === 'info').length
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Panel de Alertas</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Actualizando...' : 'Actualizar'}
                        </button>
                        <button
                            onClick={onClear}
                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                            Limpiar Todo
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: 'all', label: 'Todas', count: alertCounts.all },
                        { key: 'error', label: 'Errores', count: alertCounts.error },
                        { key: 'warning', label: 'Advertencias', count: alertCounts.warning },
                        { key: 'success', label: 'Éxito', count: alertCounts.success },
                        { key: 'info', label: 'Info', count: alertCounts.info }
                    ].map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === key
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {label} ({count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista de alertas */}
            <div className="space-y-4">
                {filteredAlerts.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay alertas</h3>
                        <p className="text-gray-500">
                            {filter === 'all'
                                ? 'No tienes alertas activas en este momento.'
                                : `No hay alertas del tipo "${filter}".`
                            }
                        </p>
                    </div>
                ) : (
                    filteredAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`bg-white rounded-lg shadow-sm border-l-4 ${getAlertColor(alert.type)} p-6`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                    {getAlertIcon(alert.type)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {alert.title}
                                            </h3>
                                            {getPriorityBadge(alert.priority)}
                                        </div>
                                        <p className="text-gray-700 mb-3">{alert.message}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>Categoría: {alert.category || 'general'}</span>
                                            <span>•</span>
                                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!alert.read && (
                                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                                    )}
                                </div>
                            </div>

                            {/* Acciones de la alerta */}
                            {alert.metadata?.actions && alert.metadata.actions.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Acciones recomendadas:</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                                        {alert.metadata.actions.map((action, index) => (
                                            <li key={index}>{action}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Estadísticas */}
            {alerts.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Estadísticas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Total:</span>
                            <p className="font-medium">{alerts.length}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">No leídas:</span>
                            <p className="font-medium">{alerts.filter(a => !a.read).length}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Críticas:</span>
                            <p className="font-medium">{alerts.filter(a => a.priority === 'critical').length}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Última:</span>
                            <p className="font-medium">
                                {alerts.length > 0
                                    ? new Date(Math.max(...alerts.map(a => new Date(a.timestamp)))).toLocaleTimeString()
                                    : 'N/A'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlertsPanel;