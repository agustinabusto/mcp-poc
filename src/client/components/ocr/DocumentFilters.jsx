// src/client/components/ocr/DocumentFilters.jsx
const DocumentFilters = ({
    searchTerm,
    onSearchChange,
    filterType,
    onFilterChange,
    sortBy,
    onSortChange,
    sortOrder,
    onSortOrderChange,
    stats
}) => {
    const documentTypes = [
        { value: 'all', label: 'Todos los tipos' },
        { value: 'invoice', label: 'Facturas' },
        { value: 'bank_statement', label: 'Extractos bancarios' },
        { value: 'receipt', label: 'Recibos' },
        { value: 'other', label: 'Otros' }
    ];

    const sortOptions = [
        { value: 'processedAt', label: 'Fecha de procesamiento' },
        { value: 'fileName', label: 'Nombre de archivo' },
        { value: 'confidence', label: 'Confianza' },
        { value: 'documentType', label: 'Tipo de documento' }
    ];

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Búsqueda */}
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar documentos..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Estadísticas rápidas */}
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{stats.total} documentos</span>
                    <span>•</span>
                    <span>{stats.avgConfidence}% confianza promedio</span>
                    <span>•</span>
                    <span>{stats.recentCount} procesados hoy</span>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                {/* Filtro por tipo */}
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de documento
                    </label>
                    <select
                        value={filterType}
                        onChange={(e) => onFilterChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {documentTypes.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                                {type.value !== 'all' && stats.byType[type.value]
                                    ? ` (${stats.byType[type.value]})`
                                    : ''
                                }
                            </option>
                        ))}
                    </select>
                </div>

                {/* Ordenamiento */}
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ordenar por
                    </label>
                    <div className="flex space-x-2">
                        <select
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                            title={`Ordenar ${sortOrder === 'asc' ? 'descendente' : 'ascendente'}`}
                        >
                            {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};