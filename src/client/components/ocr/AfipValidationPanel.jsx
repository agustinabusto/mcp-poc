/**
 * AfipValidationPanel - User Story 4.2
 * Panel for displaying real-time AFIP validation results
 */

import React, { useState, useEffect } from 'react';
import { 
    CheckCircle, 
    XCircle, 
    AlertTriangle, 
    Clock, 
    RefreshCw,
    Shield,
    AlertCircle,
    Calendar,
    User,
    FileText,
    TrendingUp
} from 'lucide-react';

const AfipValidationPanel = ({ documentId, onValidationUpdate, className = '' }) => {
    const [validationResults, setValidationResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [lastUpdate, setLastUpdate] = useState(null);

    useEffect(() => {
        if (documentId) {
            fetchValidationResults();
            setupWebSocketListener();
        }
        
        return () => {
            cleanupWebSocketListener();
        };
    }, [documentId]);

    const fetchValidationResults = async (showLoader = true) => {
        if (showLoader) setLoading(true);
        
        try {
            const response = await fetch(`/api/afip/validate/${documentId}`);
            const data = await response.json();
            
            if (data.success) {
                setValidationResults(data.validationResults);
                setLastUpdate(new Date());
                
                if (onValidationUpdate) {
                    onValidationUpdate(data.validationResults);
                }
            } else if (response.status === 404) {
                // No validations yet - this is normal for new documents
                setValidationResults(null);
            } else {
                throw new Error(data.error || 'Error obteniendo validaciones');
            }
        } catch (error) {
            console.error('Error fetching validation results:', error);
            setValidationResults({
                error: error.message,
                overall: 'error'
            });
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    const setupWebSocketListener = () => {
        if (typeof window !== 'undefined' && window.WebSocket) {
            try {
                const wsUrl = `ws://${window.location.hostname}:${window.location.port}`;
                const ws = new WebSocket(wsUrl);
                
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'afip_validation_update' && data.documentId === documentId) {
                            setValidationResults(data.validationResults);
                            setLastUpdate(new Date());
                            
                            if (onValidationUpdate) {
                                onValidationUpdate(data.validationResults);
                            }
                        }
                    } catch (error) {
                        console.warn('Error parsing WebSocket message:', error);
                    }
                };
                
                window.afipValidationWS = ws;
            } catch (error) {
                console.warn('WebSocket not available:', error);
            }
        }
    };

    const cleanupWebSocketListener = () => {
        if (window.afipValidationWS) {
            window.afipValidationWS.close();
            window.afipValidationWS = null;
        }
    };

    const handleRetryValidation = async () => {
        setRetrying(true);
        setRetryCount(prev => prev + 1);
        
        try {
            const response = await fetch(`/api/afip/validate/${documentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    priority: 2,
                    options: { retry: true }
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setValidationResults(data.validationResults);
                setLastUpdate(new Date());
            } else {
                throw new Error(data.error || 'Error ejecutando validaciones');
            }
        } catch (error) {
            console.error('Retry validation error:', error);
        } finally {
            setRetrying(false);
        }
    };

    const getStatusIcon = (validation) => {
        if (!validation) return <Clock className="h-4 w-4 text-gray-400" />;
        
        if (validation.valid) {
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        }
        
        if (validation.severity === 'warning') {
            return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        }
        
        return <XCircle className="h-4 w-4 text-red-500" />;
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'error':
            case 'critical':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'info':
                return 'bg-blue-50 border-blue-200 text-blue-800';
            default:
                return 'bg-gray-50 border-gray-200 text-gray-800';
        }
    };

    const getOverallStatusColor = (overall) => {
        switch (overall) {
            case 'valid':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'valid_with_warnings':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'invalid':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'pending':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getOverallStatusLabel = (overall) => {
        switch (overall) {
            case 'valid':
                return 'Válido';
            case 'valid_with_warnings':
                return 'Válido con Advertencias';
            case 'invalid':
                return 'Inválido';
            case 'pending':
                return 'Pendiente';
            case 'error':
                return 'Error';
            default:
                return 'Desconocido';
        }
    };

    const formatResponseTime = (timeMs) => {
        if (!timeMs) return '-';
        if (timeMs < 1000) return `${timeMs}ms`;
        return `${(timeMs / 1000).toFixed(1)}s`;
    };

    if (loading) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
                <div className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <Shield className="h-5 w-5 text-blue-500" />
                        <h3 className="text-lg font-semibold text-gray-900">Validaciones AFIP</h3>
                    </div>
                    <div className="flex items-center justify-center py-8">
                        <div className="flex items-center space-x-3">
                            <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                            <span className="text-gray-600">Validando con AFIP...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!validationResults) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <Shield className="h-5 w-5 text-blue-500" />
                            <h3 className="text-lg font-semibold text-gray-900">Validaciones AFIP</h3>
                        </div>
                        <button
                            onClick={handleRetryValidation}
                            disabled={retrying}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {retrying ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                    Validando...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    Ejecutar Validaciones
                                </>
                            )}
                        </button>
                    </div>
                    <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">
                            No hay validaciones AFIP disponibles para este documento
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            Haz clic en "Ejecutar Validaciones" para comenzar
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (validationResults.error) {
        return (
            <div className={`bg-white rounded-lg border border-red-200 ${className}`}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <Shield className="h-5 w-5 text-red-500" />
                            <h3 className="text-lg font-semibold text-gray-900">Validaciones AFIP</h3>
                        </div>
                        <button
                            onClick={handleRetryValidation}
                            disabled={retrying}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {retrying ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                    Reintentando...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    Reintentar
                                </>
                            )}
                        </button>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <span className="text-red-800 font-medium">Error en validaciones</span>
                        </div>
                        <p className="text-red-700 mt-2">{validationResults.error}</p>
                        {retryCount > 0 && (
                            <p className="text-red-600 text-sm mt-1">
                                Intentos: {retryCount}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <Shield className="h-5 w-5 text-blue-500" />
                        <h3 className="text-lg font-semibold text-gray-900">Validaciones AFIP</h3>
                    </div>
                    <div className="flex items-center space-x-3">
                        {lastUpdate && (
                            <span className="text-sm text-gray-500">
                                Actualizado: {lastUpdate.toLocaleTimeString()}
                            </span>
                        )}
                        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getOverallStatusColor(validationResults.overall)}`}>
                            {getOverallStatusLabel(validationResults.overall)}
                        </div>
                    </div>
                </div>

                {/* Validation Items */}
                <div className="space-y-4">
                    {/* CUIT Validation */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                            {getStatusIcon(validationResults.cuitValidation)}
                            <div>
                                <span className="font-medium text-gray-900">Validación CUIT</span>
                                {validationResults.cuitValidation?.responseTime && (
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({formatResponseTime(validationResults.cuitValidation.responseTime)})
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            {validationResults.cuitValidation?.taxpayerName && (
                                <div className="text-sm text-gray-700 font-medium">
                                    {validationResults.cuitValidation.taxpayerName}
                                </div>
                            )}
                            {validationResults.cuitValidation?.taxpayerType && (
                                <div className="text-xs text-gray-500">
                                    {validationResults.cuitValidation.taxpayerType}
                                </div>
                            )}
                            {validationResults.cuitValidation?.fromCache && (
                                <div className="text-xs text-blue-600">
                                    <TrendingUp className="h-3 w-3 inline mr-1" />
                                    Cache
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CAE Validation */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                            {getStatusIcon(validationResults.caeValidation)}
                            <div>
                                <span className="font-medium text-gray-900">Validación CAE</span>
                                {validationResults.caeValidation?.responseTime && (
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({formatResponseTime(validationResults.caeValidation.responseTime)})
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            {validationResults.caeValidation?.expirationDate && (
                                <div className="flex items-center text-sm text-gray-700">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Vence: {new Date(validationResults.caeValidation.expirationDate).toLocaleDateString()}
                                </div>
                            )}
                            {validationResults.caeValidation?.isExpired && (
                                <div className="text-xs text-red-600 font-medium">
                                    CAE VENCIDO
                                </div>
                            )}
                            {validationResults.caeValidation?.estimatedValidation && (
                                <div className="text-xs text-yellow-600">
                                    Validación estimada
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Duplicate Check */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                            {getStatusIcon(validationResults.duplicateCheck)}
                            <div>
                                <span className="font-medium text-gray-900">Verificación Duplicados</span>
                                {validationResults.duplicateCheck?.responseTime && (
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({formatResponseTime(validationResults.duplicateCheck.responseTime)})
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            {validationResults.duplicateCheck?.isDuplicate ? (
                                <div className="text-sm text-yellow-700 font-medium">
                                    {validationResults.duplicateCheck.duplicateCount} duplicado(s) detectado(s)
                                </div>
                            ) : (
                                <div className="text-sm text-green-700">
                                    Sin duplicados
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tax Consistency */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                            {getStatusIcon(validationResults.taxConsistency)}
                            <div>
                                <span className="font-medium text-gray-900">Consistencia Tributaria</span>
                            </div>
                        </div>
                        <div className="text-right">
                            {validationResults.taxConsistency?.totalIssues > 0 ? (
                                <div className="text-sm text-yellow-700 font-medium">
                                    {validationResults.taxConsistency.totalIssues} problema(s)
                                </div>
                            ) : (
                                <div className="text-sm text-green-700">
                                    Consistente
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Errors and Warnings */}
                {validationResults.errors && validationResults.errors.length > 0 && (
                    <div className="mt-6 space-y-2">
                        <h4 className="text-sm font-medium text-gray-900">Alertas y Errores</h4>
                        {validationResults.errors.map((error, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-md border ${getSeverityColor(error.severity)}`}
                            >
                                <div className="flex items-start space-x-2">
                                    {error.severity === 'error' ? (
                                        <XCircle className="h-4 w-4 mt-0.5" />
                                    ) : (
                                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                                    )}
                                    <div>
                                        <span className="text-sm font-medium">
                                            {error.type?.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <p className="text-sm mt-1">{error.message}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Processing Info */}
                {validationResults.processingTimeMs && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>Tiempo de procesamiento:</span>
                            <span>{formatResponseTime(validationResults.processingTimeMs)}</span>
                        </div>
                        {validationResults.validationId && (
                            <div className="flex items-center justify-between text-sm text-gray-500 mt-1">
                                <span>ID de validación:</span>
                                <span className="font-mono text-xs">{validationResults.validationId}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Retry Button for Failed Validations */}
                {(validationResults.hasConnectivityIssues || validationResults.overall === 'error') && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={handleRetryValidation}
                            disabled={retrying}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {retrying ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Reintentando Validaciones...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Reintentar Validaciones
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AfipValidationPanel;