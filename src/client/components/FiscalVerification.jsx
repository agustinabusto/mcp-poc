// src/client/components/FiscalVerification.jsx
import React, { useState, useCallback, useEffect } from 'react';
import {
    Search,
    CheckCircle,
    AlertTriangle,
    Clock,
    XCircle,
    RefreshCw,
    History,
    FileText,
    Calendar,
    Building,
    User,
    AlertCircle,
    TrendingUp,
    Eye,
    Download
} from 'lucide-react';

import { useSearch } from '../hooks/useSearch.js';
import { API_ENDPOINTS, MESSAGES, CUIT_VALIDATION } from '../config/constants.js';

const FiscalVerification = ({ onVerificationComplete, onViewHistory }) => {
    // Estados del componente
    const [cuit, setCuit] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [showHistory, setShowHistory] = useState(false);
    const [recentVerifications, setRecentVerifications] = useState([]);

    // Hook personalizado para búsqueda
    const {
        validateCuit,
        searchHistory,
        addToHistory,
        clearHistory
    } = useSearch();

    // Función para validar CUIT en tiempo real
    const handleCuitChange = useCallback((value) => {
        setCuit(value);
        setError(null);
        setValidationErrors({});

        if (value.trim()) {
            const validation = validateCuit(value);
            if (!validation.valid) {
                setValidationErrors({ cuit: validation.message });
            }
        }
    }, [validateCuit]);

    // Función principal de verificación
    const handleVerification = useCallback(async () => {
        if (!cuit.trim()) {
            setValidationErrors({ cuit: 'CUIT es requerido' });
            return;
        }

        const validation = validateCuit(cuit);
        if (!validation.valid) {
            setValidationErrors({ cuit: validation.message });
            return;
        }

        setIsVerifying(true);
        setError(null);
        setVerificationResult(null);

        const startTime = Date.now();

        try {
            // Llamada a la API de verificación
            const response = await fetch('/api/fiscal/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cuit: validation.cleanCuit,
                    options: {
                        includeHistory: true,
                        includeCompliance: true
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            const responseTime = Date.now() - startTime;

            // Validar que cumple con el criterio de 5 segundos
            if (responseTime > 5000) {
                console.warn(`⚠️ Verificación tardó ${responseTime}ms (> 5000ms requeridos)`);
            }

            setVerificationResult({
                ...result,
                responseTime,
                verificationDate: new Date().toISOString()
            });

            // Agregar al historial
            addToHistory({
                cuit: validation.cleanCuit,
                result,
                timestamp: new Date().toISOString(),
                responseTime
            });

            // Notificar componente padre
            if (onVerificationComplete) {
                onVerificationComplete(result);
            }

        } catch (err) {
            console.error('Error en verificación fiscal:', err);
            setError(err.message || 'Error al verificar estado fiscal');
        } finally {
            setIsVerifying(false);
        }
    }, [cuit, validateCuit, addToHistory, onVerificationComplete]);

    // Cargar verificaciones recientes al montar
    useEffect(() => {
        setRecentVerifications(searchHistory.slice(0, 5));
    }, [searchHistory]);

    // Función para usar CUIT de ejemplo
    const useSampleCuit = useCallback((sampleCuit) => {
        setCuit(sampleCuit);
        setError(null);
        setValidationErrors({});
    }, []);

    // Función para limpiar formulario
    const clearForm = useCallback(() => {
        setCuit('');
        setVerificationResult(null);
        setError(null);
        setValidationErrors({});
    }, []);

    // Formatear CUIT para mostrar
    const formatCuit = (cuitString) => {
        if (!cuitString || cuitString.length !== 11) return cuitString;
        return `${cuitString.slice(0, 2)}-${cuitString.slice(2, 10)}-${cuitString.slice(10)}`;
    };

    // Determinar color del estado
    const getStatusColor = (estado) => {
        switch (estado?.toUpperCase()) {
            case 'ACTIVO':
                return 'text-green-600 bg-green-50';
            case 'INACTIVO':
                return 'text-red-600 bg-red-50';
            case 'SUSPENDIDO':
                return 'text-yellow-600 bg-yellow-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">
                    Verificación de Estado Fiscal
                </h1>
                <p className="text-gray-600">
                    Consulte automáticamente el estado fiscal de cualquier contribuyente
                </p>
            </div>

            {/* Formulario Principal */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="space-y-4">
                    {/* Input CUIT */}
                    <div>
                        <label htmlFor="cuit" className="block text-sm font-medium text-gray-700 mb-2">
                            CUIT del Contribuyente
                        </label>
                        <div className="relative">
                            <input
                                id="cuit"
                                type="text"
                                value={cuit}
                                onChange={(e) => handleCuitChange(e.target.value)}
                                placeholder="20-12345678-9"
                                className={`
                                    w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                    ${validationErrors.cuit ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                                    disabled:bg-gray-100 disabled:cursor-not-allowed
                                `}
                                disabled={isVerifying}
                                maxLength={13} // 11 dígitos + 2 guiones
                                autoComplete="off"
                            />
                            {validationErrors.cuit && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                </div>
                            )}
                        </div>
                        {validationErrors.cuit && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.cuit}</p>
                        )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleVerification}
                            disabled={isVerifying || !!validationErrors.cuit}
                            className="
                                flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white text-lg font-medium 
                                rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                                disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors
                            "
                        >
                            {isVerifying ? (
                                <>
                                    <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    <Search className="h-5 w-5 mr-2" />
                                    Verificar Estado
                                </>
                            )}
                        </button>

                        <button
                            onClick={clearForm}
                            disabled={isVerifying}
                            className="
                                px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg
                                hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                                disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                            "
                        >
                            Limpiar
                        </button>
                    </div>

                    {/* CUITs de ejemplo */}
                    <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">CUITs de ejemplo para pruebas:</p>
                        <div className="flex flex-wrap gap-2">
                            {['30500010912', '27230938607', '20123456789'].map((sampleCuit) => (
                                <button
                                    key={sampleCuit}
                                    onClick={() => useSampleCuit(sampleCuit)}
                                    disabled={isVerifying}
                                    className="
                                        px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md
                                        hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-1
                                        disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                                    "
                                >
                                    {formatCuit(sampleCuit)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <XCircle className="h-5 w-5 text-red-500 mr-2" />
                        <div>
                            <h3 className="text-sm font-medium text-red-800">Error en la verificación</h3>
                            <p className="text-sm text-red-700 mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Resultado de Verificación */}
            {verificationResult && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                        <h2 className="text-xl font-bold text-white">
                            Resultado de Verificación
                        </h2>
                        <p className="text-blue-100 text-sm">
                            CUIT: {formatCuit(verificationResult.cuit)} •
                            Tiempo de respuesta: {verificationResult.responseTime}ms
                        </p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Información básica */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Información General
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Razón Social:</span>
                                        <span className="font-medium text-gray-900">
                                            {verificationResult.razonSocial}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Estado:</span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(verificationResult.estado)}`}>
                                            {verificationResult.estado}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Tipo:</span>
                                        <span className="font-medium text-gray-900">
                                            {verificationResult.tipo || 'No especificado'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Situación Fiscal
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">IVA:</span>
                                        <span className="font-medium text-gray-900">
                                            {verificationResult.situacionFiscal?.iva || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Ganancias:</span>
                                        <span className="font-medium text-gray-900">
                                            {verificationResult.situacionFiscal?.ganancias || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Monotributo:</span>
                                        <span className="font-medium text-gray-900">
                                            {verificationResult.situacionFiscal?.monotributo || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Domicilio */}
                        {verificationResult.domicilio && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Domicilio Fiscal
                                </h3>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-gray-900">
                                        {verificationResult.domicilio.direccion}
                                    </p>
                                    <p className="text-gray-600">
                                        {verificationResult.domicilio.localidad}, {verificationResult.domicilio.provincia}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Actividades */}
                        {verificationResult.actividades && verificationResult.actividades.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Actividades Económicas
                                </h3>
                                <div className="space-y-2">
                                    {verificationResult.actividades.map((actividad, index) => (
                                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-gray-900">
                                                    {actividad.descripcion}
                                                </span>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm text-gray-600">
                                                        Código: {actividad.codigo}
                                                    </span>
                                                    {actividad.principal && (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                            Principal
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Metadatos */}
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-center justify-between text-sm text-gray-500">
                                <div className="flex items-center space-x-4">
                                    <span>
                                        <Calendar className="h-4 w-4 inline mr-1" />
                                        Verificado: {new Date(verificationResult.verificationDate).toLocaleString('es-AR')}
                                    </span>
                                    <span>
                                        <Clock className="h-4 w-4 inline mr-1" />
                                        {verificationResult.responseTime}ms
                                    </span>
                                </div>
                                <span className="text-xs">
                                    Fuente: {verificationResult.fuente || 'AFIP'}
                                </span>
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => onViewHistory && onViewHistory(verificationResult.cuit)}
                                className="
                                    flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700
                                    rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                                    transition-colors
                                "
                            >
                                <History className="h-4 w-4 mr-2" />
                                Ver Histórico
                            </button>

                            <button
                                onClick={() => {
                                    const dataStr = JSON.stringify(verificationResult, null, 2);
                                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                                    const url = URL.createObjectURL(dataBlob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `verificacion_${verificationResult.cuit}_${new Date().getTime()}.json`;
                                    link.click();
                                    URL.revokeObjectURL(url);
                                }}
                                className="
                                    flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700
                                    rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                                    transition-colors
                                "
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Descargar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Historial Reciente */}
            {recentVerifications.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Verificaciones Recientes
                        </h3>
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                            {showHistory ? 'Ocultar' : 'Ver todas'}
                        </button>
                    </div>

                    {showHistory && (
                        <div className="space-y-2">
                            {recentVerifications.map((verification, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <span className="font-medium text-gray-900">
                                            {formatCuit(verification.cuit)}
                                        </span>
                                        <span className="text-gray-600 ml-2">
                                            {verification.result?.razonSocial}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">
                                            {new Date(verification.timestamp).toLocaleDateString('es-AR')}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {verification.responseTime}ms
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FiscalVerification;