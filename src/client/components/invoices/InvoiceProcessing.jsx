// ==============================================
// 2. src/client/components/invoices/InvoiceProcessing.jsx - DESHARDCODEADO
import React, { useState } from 'react';
import { 
    Scan, 
    Clock, 
    CheckCircle, 
    AlertCircle, 
    RefreshCw, 
    FileText,
    Activity,
    Eye,
    Download,
    Plus,
    Upload
} from 'lucide-react';
import useOCRProcessing from '../../hooks/useOCRProcessing';
import DocumentDetailViewer from '../ocr/DocumentDetailViewer';

const InvoiceProcessing = ({ config = {} }) => {
    const [selectedDocumentId, setSelectedDocumentId] = useState(null);
    const [showDocumentDetail, setShowDocumentDetail] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Hook personalizado para datos reales
    const {
        processingQueue,
        recentDocuments,
        loading,
        error,
        refreshDocuments,
        refreshDocument,
        fetchDocumentWithValidations,
        isProcessing
    } = useOCRProcessing('default-client', true);

    // Manejar selección de documento para vista detallada
    const handleDocumentClick = async (document) => {
        setSelectedDocumentId(document.id);
        setShowDocumentDetail(true);
    };

    // Manejar actualización manual
    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshDocuments();
        } catch (err) {
            console.error('Error refreshing documents:', err);
        } finally {
            setRefreshing(false);
        }
    };

    // Manejar volver a la lista
    const handleBackToList = () => {
        setShowDocumentDetail(false);
        setSelectedDocumentId(null);
    };

    // Si hay documento seleccionado, mostrar vista detallada
    if (showDocumentDetail && selectedDocumentId) {
        const document = [...processingQueue, ...recentDocuments]
            .find(doc => doc.id === selectedDocumentId);
            
        if (document) {
            return (
                <DocumentDetailViewer
                    document={document}
                    onBack={handleBackToList}
                />
            );
        }
    }

    // Calcular estadísticas reales
    const stats = {
        processing: processingQueue.length,
        completed: recentDocuments.length,
        failed: 0, // TODO: agregar manejo de documentos fallidos
        accuracy: recentDocuments.length > 0 
            ? Math.round(recentDocuments.reduce((acc, doc) => acc + doc.confidence, 0) / recentDocuments.length)
            : 0
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'processing': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
            case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'failed': return <AlertCircle className="h-5 w-5 text-red-500" />;
            default: return <Clock className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'processing': return 'bg-blue-500';
            case 'completed': return 'bg-green-500';
            case 'failed': return 'bg-red-500';
            default: return 'bg-gray-300';
        }
    };

    const getDocumentTypeLabel = (type) => {
        const types = {
            'invoice': 'Factura',
            'bank_statement': 'Extracto bancario',
            'receipt': 'Recibo',
            'other': 'Otro'
        };
        return types[type] || type;
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;

        if (diff < 60000) return 'Hace menos de 1 min';
        if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
        return `Hace ${Math.floor(diff / 86400000)} días`;
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Procesamiento OCR</h2>
                        <p className="text-gray-600">Estado del procesamiento de facturas con OCR</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
                    </button>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 mr-4">
                            <Activity className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">En Procesamiento</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.processing}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 mr-4">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Completados</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-red-100 mr-4">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Fallidos</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-purple-100 mr-4">
                            <Scan className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Precisión</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.accuracy}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cola de procesamiento */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Cola de Procesamiento</h3>
                </div>
                <div className="p-6">
                    {processingQueue.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No hay documentos en procesamiento</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {processingQueue.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                    onClick={() => handleDocumentClick(item)}
                                >
                                    {getStatusIcon(item.status)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {item.fileName || `documento-${item.id}.pdf`}
                                            </p>
                                            <span className="text-xs text-gray-500">
                                                {formatTimeAgo(item.processedAt || item.uploadedAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {getDocumentTypeLabel(item.documentType)}
                                        </p>
                                        {item.status === 'processing' && (
                                            <div className="mt-2">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${item.progress || 50}%` }}
                                                    ></div>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{item.progress || 50}% completado</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Documentos completados */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Documentos Completados</h3>
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">
                            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-spin" />
                            <p>Cargando documentos...</p>
                        </div>
                    ) : recentDocuments.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">
                                No hay documentos procesados
                            </h4>
                            <p className="text-gray-500 mb-6">
                                Los documentos procesados aparecerán aquí
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentDocuments.map((document) => (
                                <div 
                                    key={document.id} 
                                    className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => handleDocumentClick(document)}
                                >
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {document.fileName || `documento-${document.id}.pdf`}
                                            </p>
                                            <span className="text-xs text-gray-500">
                                                {formatTimeAgo(document.processedAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {getDocumentTypeLabel(document.documentType)} • {document.confidence}% confianza
                                        </p>
                                        <div className="mt-2 text-xs text-gray-600">
                                            {document.documentType === 'invoice' && document.extractedData?.extractedData && (
                                                <p>Factura {document.extractedData.extractedData.numero} • ${document.extractedData.extractedData.total}</p>
                                            )}
                                            {document.documentType === 'bank_statement' && (
                                                <p>{document.extractedData.transactions} transacciones • {document.extractedData.period}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            className="p-2 text-gray-400 hover:text-blue-600"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDocumentClick(document);
                                            }}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-green-600">
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoiceProcessing;