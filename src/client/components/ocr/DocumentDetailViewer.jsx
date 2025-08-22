// ===== 4. NUEVO COMPONENTE: DocumentDetailViewer =====
import React from 'react';
import { ChevronLeft, FileText } from 'lucide-react';
import AfipValidationPanel from './AfipValidationPanel';

const DocumentDetailViewer = ({ document, onBack }) => {
    // Adaptar estructura de datos si viene del historial
    const adaptedDocument = document ? {
        id: document.id || document.processId,
        processId: document.processId,
        fileName: document.fileName,
        processedAt: document.processedAt,
        documentType: document.documentType,
        confidence: document.confidence,
        status: document.status || 'completed',
        fileSize: document.fileSize || 0,
        fileType: document.documentType === 'invoice' ? 'PDF' : 'PDF',
        extractedData: document.extractedData,
        rawText: document.raw_text || document.rawText,
        previewUrl: null // TODO: Implementar preview de archivos
    } : null;

    if (!adaptedDocument) {
        return (
            <div className="p-6 text-center">
                <p className="text-gray-500">No se pudo cargar el documento</p>
                <button 
                    onClick={onBack}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Volver
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={onBack}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Volver
                </button>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{adaptedDocument.fileName}</h2>
                    <p className="text-gray-500">
                        Procesado el {new Date(adaptedDocument.processedAt).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vista previa del archivo */}
                <div className="bg-white p-6 rounded-lg border">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Archivo Original</h3>
                    {adaptedDocument.previewUrl ? (
                        <img
                            src={adaptedDocument.previewUrl}
                            alt="Vista previa"
                            className="w-full h-auto rounded border shadow-sm"
                        />
                    ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">Vista previa no disponible</p>
                            <p className="text-sm text-gray-400">
                                Archivo {adaptedDocument.fileType} • {(adaptedDocument.fileSize / 1024).toFixed(1)} KB
                            </p>
                        </div>
                    )}
                </div>

                {/* Datos extraídos */}
                <div className="space-y-6">
                    {/* Resumen */}
                    <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Procesamiento</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tipo de documento:</span>
                                <span className="font-medium">{getTypeLabel(adaptedDocument.documentType)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Confianza OCR:</span>
                                <span className={`font-medium ${getConfidenceColor(adaptedDocument.confidence)}`}>
                                    {adaptedDocument.confidence}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Estado:</span>
                                <span className="font-medium text-green-600">✓ {getStatusLabel(adaptedDocument.status)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Datos específicos por tipo */}
                    <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Datos Extraídos</h3>

                        {adaptedDocument.documentType === 'invoice' && (
                            <InvoiceDataDisplay data={adaptedDocument.extractedData?.extractedData || adaptedDocument.extractedData} />
                        )}

                        {adaptedDocument.documentType === 'bank_statement' && (
                            <BankStatementDataDisplay data={adaptedDocument.extractedData} />
                        )}

                        {adaptedDocument.documentType === 'receipt' && (
                            <ReceiptDataDisplay data={adaptedDocument.extractedData} />
                        )}

                        {/* Texto crudo extraído */}
                        {adaptedDocument.rawText && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                                    Mostrar texto extraído completo
                                </summary>
                                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-40">
                                    {adaptedDocument.rawText}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            </div>

            {/* AFIP Validation Panel - User Story 4.2 */}
            {(adaptedDocument.documentType === 'invoice' || adaptedDocument.extractedData?.cuit || adaptedDocument.extractedData?.cae) && (
                <AfipValidationPanel 
                    documentId={adaptedDocument.id || adaptedDocument.processId}
                    onValidationUpdate={(validationResults) => {
                        console.log('Validation results updated:', validationResults);
                        // Here you could update the document state with validation results
                        // if needed for further UI updates
                    }}
                    className="lg:col-span-2"
                />
            )}
        </div>
    );
};

// Funciones auxiliares
const getTypeLabel = (type) => {
    const labels = {
        'invoice': 'Factura',
        'bank_statement': 'Extracto Bancario',
        'receipt': 'Recibo',
        'other': 'Otro documento'
    };
    return labels[type] || 'Documento';
};

const getStatusLabel = (status) => {
    const labels = {
        'completed': 'Completado',
        'processing': 'Procesando',
        'failed': 'Error',
        'pending': 'Pendiente'
    };
    return labels[status] || status;
};

const getConfidenceColor = (confidence) => {
    if (confidence >= 95) return 'text-green-600';
    if (confidence >= 85) return 'text-yellow-600';
    if (confidence >= 70) return 'text-orange-600';
    return 'text-red-600';
};

// Componentes para mostrar datos específicos por tipo
const InvoiceDataDisplay = ({ data }) => {
    if (!data) return <p className="text-gray-500">No hay datos de factura extraídos</p>;
    
    return (
        <div className="space-y-3">
            {data.numero && (
                <div className="flex justify-between">
                    <span className="text-gray-600">Número:</span>
                    <span className="font-medium">{data.numero}</span>
                </div>
            )}
            {data.fecha && (
                <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium">{data.fecha}</span>
                </div>
            )}
            {data.cuit && (
                <div className="flex justify-between">
                    <span className="text-gray-600">CUIT:</span>
                    <span className="font-medium">{data.cuit}</span>
                </div>
            )}
            {data.razonSocial && (
                <div className="flex justify-between">
                    <span className="text-gray-600">Razón Social:</span>
                    <span className="font-medium">{data.razonSocial}</span>
                </div>
            )}
            {data.total && (
                <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">${data.total.toLocaleString()}</span>
                </div>
            )}
        </div>
    );
};

const BankStatementDataDisplay = ({ data }) => {
    if (!data) return <p className="text-gray-500">No hay datos de extracto bancario extraídos</p>;
    
    return (
        <div className="space-y-3">
            {data.banco && (
                <div className="flex justify-between">
                    <span className="text-gray-600">Banco:</span>
                    <span className="font-medium">{data.banco}</span>
                </div>
            )}
            {data.cuenta && (
                <div className="flex justify-between">
                    <span className="text-gray-600">Cuenta:</span>
                    <span className="font-medium">{data.cuenta}</span>
                </div>
            )}
            {data.periodo && (
                <div className="flex justify-between">
                    <span className="text-gray-600">Período:</span>
                    <span className="font-medium">{data.periodo}</span>
                </div>
            )}
            {data.movimientos && (
                <div className="flex justify-between">
                    <span className="text-gray-600">Movimientos:</span>
                    <span className="font-medium">{data.movimientos}</span>
                </div>
            )}
        </div>
    );
};

const ReceiptDataDisplay = ({ data }) => {
    if (!data) return <p className="text-gray-500">No hay datos de recibo extraídos</p>;
    
    return (
        <div className="space-y-3">
            {data.concepto && (
                <div className="flex justify-between">
                    <span className="text-gray-600">Concepto:</span>
                    <span className="font-medium">{data.concepto}</span>
                </div>
            )}
            {data.fecha && (
                <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium">{data.fecha}</span>
                </div>
            )}
            {data.monto && (
                <div className="flex justify-between">
                    <span className="text-gray-600">Monto:</span>
                    <span className="font-medium">${data.monto.toLocaleString()}</span>
                </div>
            )}
        </div>
    );
};

export default DocumentDetailViewer;