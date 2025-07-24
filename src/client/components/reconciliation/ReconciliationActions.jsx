// ===============================================
// ReconciliationActions.jsx
// Componente para las acciones de cada conciliación (Ver y Descargar)
// Ubicación: src/client/components/reconciliation/ReconciliationActions.jsx
// ===============================================

import React, { useState } from 'react';
import { Eye, Download, AlertCircle } from 'lucide-react';
import { downloadReconciliationExcel } from '../../services/excel-export-service';

const ReconciliationActions = ({
    reconciliationId,
    onView,
    disabled = false,
    showLabels = false,
    size = 'sm'
}) => {
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState(null);

    // Configuración de tamaños
    const sizeConfig = {
        xs: {
            button: 'p-1',
            icon: 'h-3 w-3',
            text: 'text-xs'
        },
        sm: {
            button: 'p-2',
            icon: 'h-4 w-4',
            text: 'text-sm'
        },
        md: {
            button: 'p-3',
            icon: 'h-5 w-5',
            text: 'text-base'
        }
    };

    const config = sizeConfig[size] || sizeConfig.sm;

    // Manejar click en botón Ver
    const handleView = () => {
        if (disabled) return;

        try {
            console.log(`👁️ Visualizando conciliación: ${reconciliationId}`);
            onView?.(reconciliationId);
        } catch (error) {
            console.error('Error al abrir vista:', error);
        }
    };

    // Manejar click en botón Descargar
    const handleDownload = async () => {
        if (disabled || downloading) return;

        setDownloading(true);
        setDownloadError(null);

        try {
            console.log(`⬇️ Iniciando descarga: ${reconciliationId}`);

            // Llamar al servicio de exportación
            await downloadReconciliationExcel(reconciliationId);

            console.log(`✅ Descarga completada: ${reconciliationId}`);

            // Opcional: Mostrar notificación de éxito
            if (typeof window !== 'undefined' && window.showSuccessToast) {
                window.showSuccessToast('Archivo descargado exitosamente');
            }

        } catch (error) {
            console.error('Error en descarga:', error);
            setDownloadError(error.message || 'Error al descargar el archivo');

            // Opcional: Mostrar notificación de error
            if (typeof window !== 'undefined' && window.showErrorToast) {
                window.showErrorToast('Error al descargar el archivo');
            }
        } finally {
            setDownloading(false);
        }
    };

    // Limpiar error después de un tiempo
    React.useEffect(() => {
        if (downloadError) {
            const timer = setTimeout(() => {
                setDownloadError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [downloadError]);

    return (
        <div className="flex items-center gap-1">
            {/* Botón Ver */}
            <div className="relative group">
                <button
                    onClick={handleView}
                    disabled={disabled}
                    className={`
                        ${config.button}
                        text-blue-600 hover:bg-blue-100 rounded-full 
                        transition-colors duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                        ${disabled ? 'cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                    `}
                    title="Ver detalles de la conciliación"
                    aria-label={`Ver detalles de conciliación ${reconciliationId}`}
                >
                    <Eye className={config.icon} />
                </button>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    Ver detalles
                </div>
            </div>

            {/* Botón Descargar */}
            <div className="relative group">
                <button
                    onClick={handleDownload}
                    disabled={disabled || downloading}
                    className={`
                        ${config.button}
                        text-green-600 hover:bg-green-100 rounded-full 
                        transition-colors duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1
                        ${disabled || downloading ? 'cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                    `}
                    title="Descargar reporte en Excel"
                    aria-label={`Descargar Excel de conciliación ${reconciliationId}`}
                >
                    {downloading ? (
                        <div className={`${config.icon} border-2 border-green-600 border-t-transparent rounded-full animate-spin`}></div>
                    ) : (
                        <Download className={config.icon} />
                    )}
                </button>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    {downloading ? 'Descargando...' : 'Descargar Excel'}
                </div>
            </div>

            {/* Labels opcionales */}
            {showLabels && (
                <div className={`flex gap-2 ml-2 ${config.text}`}>
                    <span
                        className="text-blue-600 cursor-pointer hover:underline"
                        onClick={handleView}
                    >
                        Ver
                    </span>
                    <span className="text-gray-300">|</span>
                    <span
                        className={`cursor-pointer hover:underline ${downloading ? 'text-gray-400' : 'text-green-600'
                            }`}
                        onClick={handleDownload}
                    >
                        {downloading ? 'Descargando...' : 'Descargar'}
                    </span>
                </div>
            )}

            {/* Error de descarga */}
            {downloadError && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs max-w-xs z-20">
                    <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{downloadError}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===============================================
// VARIANTE COMPACTA PARA TABLAS DENSAS
// ===============================================

export const CompactReconciliationActions = ({ reconciliationId, onView }) => {
    return (
        <ReconciliationActions
            reconciliationId={reconciliationId}
            onView={onView}
            size="xs"
            showLabels={false}
        />
    );
};

// ===============================================
// VARIANTE CON LABELS PARA INTERFACES AMPLIAS
// ===============================================

export const LabeledReconciliationActions = ({ reconciliationId, onView }) => {
    return (
        <ReconciliationActions
            reconciliationId={reconciliationId}
            onView={onView}
            size="md"
            showLabels={true}
        />
    );
};

// ===============================================
// VARIANTE PARA LOADING STATES
// ===============================================

export const LoadingReconciliationActions = () => {
    return (
        <div className="flex items-center gap-1">
            <div className="p-2 bg-gray-100 rounded-full animate-pulse">
                <div className="h-4 w-4 bg-gray-300 rounded"></div>
            </div>
            <div className="p-2 bg-gray-100 rounded-full animate-pulse">
                <div className="h-4 w-4 bg-gray-300 rounded"></div>
            </div>
        </div>
    );
};

// ===============================================
// HOOK PERSONALIZADO PARA MANEJAR ACCIONES
// ===============================================

export const useReconciliationActions = (reconciliationId) => {
    const [isViewing, setIsViewing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState(null);

    const handleView = () => {
        setIsViewing(true);
        setError(null);
    };

    const handleCloseView = () => {
        setIsViewing(false);
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        setError(null);

        try {
            await downloadReconciliationExcel(reconciliationId);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsDownloading(false);
        }
    };

    return {
        isViewing,
        isDownloading,
        error,
        handleView,
        handleCloseView,
        handleDownload,
        clearError: () => setError(null)
    };
};

// ===============================================
// PROPIEDADES DOCUMENTADAS
// ===============================================

ReconciliationActions.propTypes = {
    reconciliationId: 'string.isRequired',
    onView: 'function',
    disabled: 'bool',
    showLabels: 'bool',
    size: 'oneOf(["xs", "sm", "md"])'
};

ReconciliationActions.defaultProps = {
    disabled: false,
    showLabels: false,
    size: 'sm'
};

export default ReconciliationActions;