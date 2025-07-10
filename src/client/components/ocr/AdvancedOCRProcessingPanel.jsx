const AdvancedOCRProcessingPanel = ({
    processedDocuments,
    selectedDocument,
    onSelectDocument,
    onBackToList,
    documentManager
}) => {
    const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

    // Si hay documento seleccionado, mostrar vista detallada
    if (selectedDocument) {
        return (
            <DocumentDetailViewer
                document={selectedDocument}
                onBack={onBackToList}
                onUpdate={(updates) => documentManager.updateDocument(selectedDocument.id, updates)}
                onDelete={() => {
                    documentManager.removeDocument(selectedDocument.id);
                    onBackToList();
                }}
            />
        );
    }

    const handleSelectDocument = (documentId, isSelected) => {
        setSelectedDocumentIds(prev =>
            isSelected
                ? [...prev, documentId]
                : prev.filter(id => id !== documentId)
        );
    };

    const handleSelectAll = () => {
        const allIds = processedDocuments.map(doc => doc.id);
        setSelectedDocumentIds(
            selectedDocumentIds.length === allIds.length ? [] : allIds
        );
    };

    const handleDeleteSelected = () => {
        if (confirm(`¿Estás seguro de que quieres eliminar ${selectedDocumentIds.length} documentos?`)) {
            selectedDocumentIds.forEach(id => documentManager.removeDocument(id));
            setSelectedDocumentIds([]);
        }
    };

    const handleExportSelected = () => {
        const selectedDocs = processedDocuments.filter(doc =>
            selectedDocumentIds.includes(doc.id)
        );

        const exportData = selectedDocs.map(doc => ({
            fileName: doc.fileName,
            documentType: doc.documentType,
            confidence: doc.confidence,
            processedAt: doc.processedAt,
            extractedData: doc.extractedData
        }));

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `documentos_ocr_${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header con acciones */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Documentos Procesados</h2>
                    <p className="text-gray-500">
                        {documentManager.stats.total} documentos •
                        {documentManager.stats.avgConfidence}% confianza promedio
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    {/* Selector de vista */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                        >
                            Lista
                        </button>
                    </div>

                    {/* Acciones principales */}
                    <button
                        onClick={handleSelectAll}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        {selectedDocumentIds.length === processedDocuments.length ? 'Deseleccionar' : 'Seleccionar'} todo
                    </button>

                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('openUploadModal'))}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Subir Documento</span>
                    </button>
                </div>
            </div>

            {/* Filtros y búsqueda */}
            <DocumentFilters
                searchTerm={documentManager.searchTerm}
                onSearchChange={documentManager.setSearchTerm}
                filterType={documentManager.filterType}
                onFilterChange={documentManager.setFilterType}
                sortBy={documentManager.sortBy}
                onSortChange={documentManager.setSortBy}
                sortOrder={documentManager.sortOrder}
                onSortOrderChange={documentManager.setSortOrder}
                stats={documentManager.stats}
            />

            {/* Lista de documentos */}
            {processedDocuments.length === 0 ? (
                <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {documentManager.searchTerm || documentManager.filterType !== 'all'
                            ? 'No se encontraron documentos'
                            : 'No hay documentos procesados'
                        }
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {documentManager.searchTerm || documentManager.filterType !== 'all'
                            ? 'Intenta ajustar los filtros de búsqueda'
                            : 'Sube tu primer documento para comenzar con el procesamiento OCR'
                        }
                    </p>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('openUploadModal'))}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Subir Documento
                    </button>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? 'grid gap-4' : 'space-y-4'}>
                    {processedDocuments.map((doc) => (
                        <EnhancedDocumentCard
                            key={doc.id}
                            document={doc}
                            onClick={onSelectDocument}
                            isSelected={selectedDocumentIds.includes(doc.id)}
                            onSelect={handleSelectDocument}
                        />
                    ))}
                </div>
            )}

            {/* Acciones en lote */}
            <DocumentBatchActions
                selectedDocuments={selectedDocumentIds}
                onClearSelection={() => setSelectedDocumentIds([])}
                onDeleteSelected={handleDeleteSelected}
                onExportSelected={handleExportSelected}
            />
        </div>
    );
};