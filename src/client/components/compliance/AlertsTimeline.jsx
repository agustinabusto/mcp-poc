import React, { useState, useMemo } from 'react';

export const AlertsTimeline = ({ alerts }) => {
    const [filter, setFilter] = useState('all');
    const [showResolved, setShowResolved] = useState(false);

    // Filtrar y ordenar alertas
    const filteredAlerts = useMemo(() => {
        if (!alerts || alerts.length === 0) return [];

        let filtered = alerts.filter(alert => {
            // Filtro por estado resuelto/no resuelto
            if (!showResolved && alert.resolved) return false;
            
            // Filtro por severidad
            if (filter !== 'all' && alert.severity !== filter) return false;
            
            return true;
        });

        // Ordenar por fecha de creación (más recientes primero)
        return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [alerts, filter, showResolved]);

    // Obtener icono según tipo de alerta
    const getAlertIcon = (alertType, severity) => {
        const iconClasses = `w-5 h-5 ${
            severity === 'critical' ? 'text-red-600' :
            severity === 'high' ? 'text-orange-600' :
            severity === 'medium' ? 'text-yellow-600' :
            'text-blue-600'
        }`;

        switch (alertType) {
            case 'missing_vat_declarations':
                return (
                    <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                );
            case 'fiscal_inactive':
                return (
                    <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                );
            case 'deadline_approaching':
                return (
                    <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                );
            case 'high_risk_detected':
                return (
                    <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                );
            default:
                return (
                    <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                );
        }
    };

    // Obtener nombre legible del tipo de alerta
    const getAlertTypeName = (alertType) => {
        const types = {
            'missing_vat_declarations': 'Declaraciones IVA Faltantes',
            'missing_income_tax_declarations': 'Declaraciones Ganancias Faltantes',
            'late_tax_returns': 'Declaraciones Fuera de Término',
            'fiscal_inactive': 'Contribuyente Inactivo',
            'vat_not_registered': 'No Registrado en IVA',
            'compliance_degradation': 'Degradación de Compliance',
            'high_risk_detected': 'Alto Riesgo Detectado',
            'deadline_approaching': 'Vencimiento Próximo'
        };
        return types[alertType] || alertType.replace(/_/g, ' ').toUpperCase();
    };

    // Obtener color de severidad
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'text-red-600 bg-red-50 border-red-200';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Timeline de Alertas
                </h3>
                <div className="flex space-x-2">
                    {/* Filtro por severidad */}
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">Todas</option>
                        <option value="critical">Críticas</option>
                        <option value="high">Altas</option>
                        <option value="medium">Medias</option>
                        <option value="low">Bajas</option>
                    </select>
                    
                    {/* Toggle para mostrar resueltas */}
                    <button
                        onClick={() => setShowResolved(!showResolved)}
                        className={`px-2 py-1 text-xs rounded-md ${
                            showResolved 
                            ? 'bg-gray-200 text-gray-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                        {showResolved ? 'Ocultar resueltas' : 'Mostrar resueltas'}
                    </button>
                </div>
            </div>

            {/* Lista de alertas */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredAlerts.length === 0 ? (
                    <div className="text-center py-8">
                        <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400">
                            No hay alertas que mostrar
                        </p>
                    </div>
                ) : (
                    filteredAlerts.map((alert, index) => (
                        <div
                            key={alert.id}
                            className={`relative pl-6 pb-3 ${
                                index < filteredAlerts.length - 1 ? 'border-l-2 border-gray-200 dark:border-gray-700' : ''
                            }`}
                        >
                            {/* Línea de tiempo - punto */}
                            <div className={`absolute left-0 top-0 w-3 h-3 rounded-full transform -translate-x-1/2 ${
                                alert.severity === 'critical' ? 'bg-red-500' :
                                alert.severity === 'high' ? 'bg-orange-500' :
                                alert.severity === 'medium' ? 'bg-yellow-500' :
                                'bg-blue-500'
                            } ${alert.resolved ? 'opacity-50' : ''}`}></div>

                            {/* Contenido de la alerta */}
                            <div className={`ml-4 p-3 rounded-lg border-l-4 ${getSeverityColor(alert.severity)} ${
                                alert.resolved ? 'opacity-70' : ''
                            }`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-2">
                                        {getAlertIcon(alert.alert_type, alert.severity)}
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                {getAlertTypeName(alert.alert_type)}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                CUIT: {alert.cuit}
                                                {alert.business_name && ` - ${alert.business_name}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {getRelativeTime(alert.created_at)}
                                        </div>
                                        {alert.escalation_level > 0 && (
                                            <div className="text-xs text-red-600 font-medium">
                                                Escalación Nivel {alert.escalation_level}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                                    {alert.message}
                                </p>

                                {/* Fecha prevista si existe */}
                                {alert.predicted_date && (
                                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">Fecha prevista:</span> {' '}
                                        {new Date(alert.predicted_date).toLocaleDateString()}
                                    </div>
                                )}

                                {/* Estado de la alerta */}
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="flex space-x-2">
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

                                    {/* Acciones rápidas */}
                                    {!alert.resolved && (
                                        <div className="flex space-x-1">
                                            {!alert.acknowledged && (
                                                <button
                                                    onClick={() => {
                                                        // Manejar reconocimiento de alerta
                                                        console.log('Acknowledge alert:', alert.id);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                                >
                                                    Reconocer
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    // Manejar resolución de alerta
                                                    console.log('Resolve alert:', alert.id);
                                                }}
                                                className="text-green-600 hover:text-green-800 text-xs"
                                            >
                                                Resolver
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Información adicional si la alerta fue resuelta */}
                                {alert.resolved && alert.resolved_by && (
                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Resuelta por {alert.resolved_by} el {' '}
                                        {new Date(alert.resolved_at).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Resumen de alertas */}
            {alerts && alerts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {alerts.filter(a => !a.resolved).length}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Alertas Activas
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {alerts.filter(a => a.severity === 'critical' && !a.resolved).length}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Críticas Pendientes
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};