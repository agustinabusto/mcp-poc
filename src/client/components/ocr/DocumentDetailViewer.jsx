// ===== 4. NUEVO COMPONENTE: DocumentDetailViewer =====
const DocumentDetailViewer = ({ document, onBack }) => {
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
                    <h2 className="text-2xl font-bold text-gray-900">{document.fileName}</h2>
                    <p className="text-gray-500">
                        Procesado el {new Date(document.processedAt).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vista previa del archivo */}
                <div className="bg-white p-6 rounded-lg border">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Archivo Original</h3>
                    {document.previewUrl ? (
                        <img
                            src={document.previewUrl}
                            alt="Vista previa"
                            className="w-full h-auto rounded border shadow-sm"
                        />
                    ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">Vista previa no disponible</p>
                            <p className="text-sm text-gray-400">
                                Archivo {document.fileType} • {(document.fileSize / 1024).toFixed(1)} KB
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
                                <span className="font-medium">{getTypeLabel(document.documentType)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Confianza OCR:</span>
                                <span className={`font-medium ${getConfidenceColor(document.confidence)}`}>
                                    {document.confidence}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Estado:</span>
                                <span className="font-medium text-green-600">✓ Completado</span>
                            </div>
                        </div>
                    </div>

                    {/* Datos específicos por tipo */}
                    <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Datos Extraídos</h3>

                        {document.documentType === 'invoice' && (
                            <InvoiceDataDisplay data={document.extractedData} />
                        )}

                        {document.documentType === 'bank_statement' && (
                            <BankStatementDataDisplay data={document.extractedData} />
                        )}

                        {document.documentType === 'receipt' && (
                            <ReceiptDataDisplay data={document.extractedData} />
                        )}

                        {/* Texto crudo extraído */}
                        {document.rawText && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                                    Mostrar texto extraído completo
                                </summary>
                                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-40">
                                    {document.rawText}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};