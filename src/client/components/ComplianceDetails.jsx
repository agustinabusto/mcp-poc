// src/client/components/ComplianceDetails.jsx
import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, TrendingUp } from 'lucide-react';

const ComplianceDetails = ({ data, loading }) => {
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos de compliance</h3>
                <p className="text-gray-500">Realiza una verificación de compliance para ver los resultados aquí.</p>
            </div>
        );
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'GOOD':
                return <CheckCircle className="h-6 w-6 text-green-600" />;
            case 'WARNING':
                return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
            case 'CRITICAL':
                return <XCircle className="h-6 w-6 text-red-600" />;
            default:
                return <Clock className="h-6 w-6 text-gray-600" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'GOOD':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'WARNING':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'CRITICAL':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6">
            {/* Header con score */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Compliance Details</h2>
                        <p className="text-gray-600">CUIT: {data.cuit}</p>
                    </div>
                    <div className="text-center">
                        <div className={`text-4xl font-bold ${getScoreColor(data.score)}`}>
                            {data.score}
                        </div>
                        <div className="text-sm text-gray-500">Score</div>
                    </div>
                </div>

                {/* Status badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusColor(data.status)}`}>
                    {getStatusIcon(data.status)}
                    <span className="font-medium">{data.status}</span>
                </div>
            </div>

            {/* Checks detallados */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Verificaciones Realizadas</h3>
                <div className="space-y-4">
                    {data.checks?.map((check, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                {check.passed ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                )}
                                <div>
                                    <p className="font-medium text-gray-900">{check.name}</p>
                                    <p className="text-sm text-gray-600">{check.message}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-lg font-bold ${getScoreColor(check.score)}`}>
                                    {check.score}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recomendaciones */}
            {data.recommendations && data.recommendations.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recomendaciones</h3>
                    <div className="space-y-3">
                        {data.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                                <p className="text-blue-800">{rec}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Alertas */}
            {data.alerts && data.alerts.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas Generadas</h3>
                    <div className="space-y-3">
                        {data.alerts.map((alert, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-800">{alert.message || alert.title}</p>
                                    {alert.actions && (
                                        <div className="mt-2 space-y-1">
                                            {alert.actions.map((action, actionIndex) => (
                                                <p key={actionIndex} className="text-sm text-red-700">• {action}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Metadata */}
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Período:</span>
                        <p className="font-medium">{data.period}</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Fuente:</span>
                        <p className="font-medium">{data.dataSource}</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Fecha:</span>
                        <p className="font-medium">{new Date(data.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Notificación:</span>
                        <p className="font-medium">{data.notificationSent ? 'Enviada' : 'No enviada'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplianceDetails;