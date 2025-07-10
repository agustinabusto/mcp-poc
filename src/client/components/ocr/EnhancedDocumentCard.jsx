// ===== 4. COMPONENTE MEJORADO DocumentCard CON SELECCIÓN =====
const EnhancedDocumentCard = ({
    document,
    onClick,
    isSelected,
    onSelect,
    showActions = true
}) => {
    const [showPreview, setShowPreview] = useState(false);

    const handleCardClick = (e) => {
        // Si se hace clic en el checkbox, no abrir el documento
        if (e.target.type === 'checkbox') {
            return;
        }
        onClick(document);
    };

    const handleSelectChange = (e) => {
        e.stopPropagation();
        onSelect(document.id, e.target.checked);
    };

    return (
        <div className={`
            bg-white p-4 rounded-lg border transition-all cursor-pointer relative
            ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'}
        `}>
            {/* Checkbox de selección */}
            {showActions && (
                <div className="absolute top-3 right-3">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelectChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                </div>
            )}

            <div onClick={handleCardClick} className="flex items-start space-x-4 pr-8">
                {/* Vista previa */}
                <div className="flex-shrink-0 relative">
                    {document.previewUrl ? (
                        <div className="relative">
                            <img
                                src={document.previewUrl}
                                alt="Preview"
                                className="w-16 h-16 object-cover rounded border cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPreview(true);
                                }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 rounded flex items-center justify-center transition-all">
                                <Eye className="w-4 h-4 text-white opacity-0 hover:opacity-100" />
                            </div>
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                            {getTypeIcon(document.documentType)}
                        </div>
                    )}
                </div>

                {/* Información del documento - resto igual que antes */}
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

                    {/* Preview de datos extraídos */}
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

            {/* Modal de preview de imagen */}
            {showPreview && document.previewUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowPreview(false)}>
                    <div className="max-w-4xl max-h-screen p-4">
                        <img
                            src={document.previewUrl}
                            alt="Vista previa completa"
                            className="max-w-full max-h-full object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={() => setShowPreview(false)}
                            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};