// src/client/components/ocr/OCRProcessingPanel.jsx
import React, { useState, useEffect } from 'react';
import {
    Activity,
    FileText,
    Clock,
    CheckCircle,
    AlertCircle,
    Eye,
    Download,
    RefreshCw,
    Upload,
    Plus
} from 'lucide-react';

const OCRProcessingPanel = ({
    onOpenUploadModal,
    processedDocuments = [],
    selectedDocument,
    onSelectDocument,
    onBackToList
}) => {
    const [processingQueue, setProcessingQueue] = useState([]);
    const [recentExtractions, setRecentExtractions] = useState([]);

    // Mock data existente
    const mockProcessingQueue = [
        {
            id: 1,
            fileName: 'factura-001.pdf',
            documentType: 'invoice',
            status: 'processing',
            progress: 75,
            uploadedAt: new Date(Date.now() - 30000).toISOString()
        },
        {
            id: 2,
            fileName: 'extracto-enero.pdf',
            documentType: 'bank_statement',
            status: 'queued',
            progress: 0,
            uploadedAt: new Date(Date.now() - 120000).toISOString()
        }
    ];

    const mockRecentExtractions = [
        {
            id: 1,
            fileName: 'factura-abc-123.pdf',
            documentType: 'invoice',
            confidence: 95.8,
            extractedData: {
                invoiceNumber: 'A-001-00012345',
                amount: 1250.50,
                date: '2024-01-15'
            },
            processedAt: new Date(Date.now() - 600000).toISOString()
        },
        {
            id: 2,
            fileName: 'extracto-diciembre.pdf',
            documentType: 'bank_statement',
            confidence: 92.3,
            extractedData: {
                transactions: 45,
                period: '2023-12'
            },
            processedAt: new Date(Date.now() - 1200000).toISOString()
        }
    ];

    useEffect(() => {
        setProcessingQueue(mockProcessingQueue);
        setRecentExtractions(mockRecentExtractions);
    }, []);

    // Si hay documento seleccionado, mostrar vista detallada
    if (selectedDocument) {
        return (
            <DocumentDetailViewer
                document={selectedDocument}
                onBack={onBackToList}
            />
        );
    }

    // Funciones existentes
    const getStatusIcon = (status) => {
        switch (status) {
            case 'processing':
                return <Activity className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'failed':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-500" />;
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Procesamiento OCR</h2>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onOpenUploadModal}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Subir Documento</span>
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Actualizar</span>
                    </button>
                </div>
            </div>

            {/* Cola de procesamiento */}
            <div className="bg-white rounded-lg shadow-sm border">
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
                                <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                    {getStatusIcon(item.status)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {item.fileName}
                                            </p>
                                            <span className="text-xs text-gray-500">
                                                {formatTimeAgo(item.uploadedAt)}
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
                                                        style={{ width: `${item.progress}%` }}
                                                    ></div>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{item.progress}% completado</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Extracciones recientes */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Extracciones Recientes</h3>
                </div>
                <div className="p-6">
                    {recentExtractions.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">
                                No hay extracciones recientes
                            </h4>
                            <p className="text-gray-500 mb-6">
                                Sube tu primer documento para comenzar con el procesamiento OCR
                            </p>
                            <button
                                onClick={onOpenUploadModal}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                            >
                                <Upload className="w-5 h-5" />
                                <span>Subir Documento</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentExtractions.map((extraction) => (
                                <div key={extraction.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {extraction.fileName}
                                            </p>
                                            <span className="text-xs text-gray-500">
                                                {formatTimeAgo(extraction.processedAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {getDocumentTypeLabel(extraction.documentType)} • {extraction.confidence}% confianza
                                        </p>
                                        <div className="mt-2 text-xs text-gray-600">
                                            {extraction.documentType === 'invoice' && (
                                                <p>Factura {extraction.extractedData.invoiceNumber} • ${extraction.extractedData.amount}</p>
                                            )}
                                            {extraction.documentType === 'bank_statement' && (
                                                <p>{extraction.extractedData.transactions} transacciones • {extraction.extractedData.period}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            className="p-2 text-gray-400 hover:text-blue-600"
                                            onClick={() => onSelectDocument && onSelectDocument(extraction)}
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

// Componente para vista detallada de documento (placeholder)
const DocumentDetailViewer = ({ document, onBack }) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                    <span>← Volver</span>
                </button>
                <h2 className="text-2xl font-bold text-gray-900">Detalle del Documento</h2>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">{document.fileName}</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500">Tipo</p>
                        <p className="font-medium">{document.documentType}</p>
                    </div>
                    <div>CUIT Search Error in Web App
                        <p className="text-sm text-gray-500">Confianza</p>
                        <p className="font-medium">{document.confidence}%</p>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-sm text-gray-500">Datos extraídos</p>
                    <pre className="bg-gray-50 p-4 rounded-lg mt-2 text-sm overflow-auto">
                        {JSON.stringify(document.extractedData, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default OCRProcessingPanel;