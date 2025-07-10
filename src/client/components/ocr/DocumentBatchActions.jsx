// ===== 3. COMPONENTE DE ACCIONES EN LOTE =====
const DocumentBatchActions = ({ selectedDocuments, onClearSelection, onDeleteSelected, onExportSelected }) => {
    if (selectedDocuments.length === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 flex items-center space-x-4 z-50">
            <span className="text-sm text-gray-600">
                {selectedDocuments.length} documento{selectedDocuments.length !== 1 ? 's' : ''} seleccionado{selectedDocuments.length !== 1 ? 's' : ''}
            </span>

            <div className="flex space-x-2">
                <button
                    onClick={onExportSelected}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Exportar
                </button>
                <button
                    onClick={onDeleteSelected}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                    Eliminar
                </button>
                <button
                    onClick={onClearSelection}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};