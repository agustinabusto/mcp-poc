const DocumentCard = ({ document, onClick }) => {
    const getTypeIcon = (type) => {
        switch (type) {
            case 'invoice': return <FileText className="w-5 h-5 text-blue-500" />;
            case 'bank_statement': return <Database className="w-5 h-5 text-green-500" />;
            case 'receipt': return <File className="w-5 h-5 text-purple-500" />;
            default: return <File className="w-5 h-5 text-gray-500" />;
        }
    };

    const getTypeLabel = (type) => {
        const labels = {
            'invoice': 'Factura',
            'bank_statement': 'Extracto bancario',
            'receipt': 'Recibo',
            'other': 'Otro documento'
        };
        return labels[type] || type;
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 90) return 'text-green-600 bg-green-100';
        if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    return (
        <div
            className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            onClick={onClick}
        >
            <div className="flex items-start space-x-4">
                {/* Vista previa */}
                <div className="flex-shrink-0">
                    {document.previewUrl ? (
                        <img
                            src={document.previewUrl}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded border"
                        />
                    ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                            {getTypeIcon(document.documentType)}
                        </div>
                    )}
                </div>

                {/* Información del documento */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                            {document.fileName}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(document.confidence)}`}>
                            {document.confidence}%
                        </span>
                    </div>

                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>{getTypeLabel(document.documentType)}</span>
                        <span>•</span>
                        <span>{(document.fileSize / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{new Date(document.processedAt).toLocaleDateString()}</span>
                    </div>

                    {/* Datos extraídos (preview) */}
                    <div className="mt-2">
                        {document.documentType === 'invoice' && document.extractedData?.total && (
                            <div className="text-sm text-gray-600">
                                💰 Total: ${document.extractedData.total}
                                {document.extractedData.numero && ` • N° ${document.extractedData.numero}`}
                            </div>
                        )}
                        {document.documentType === 'bank_statement' && document.extractedData?.movimientos && (
                            <div className="text-sm text-gray-600">
                                🏦 {document.extractedData.movimientos.length} movimientos
                                {document.extractedData.banco && ` • ${document.extractedData.banco}`}
                            </div>
                        )}
                    </div>
                </div>

                {/* Indicador de estado */}
                <div className="flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
            </div>
        </div>
    );
};