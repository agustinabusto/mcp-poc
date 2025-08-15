import React, { useState, useMemo } from 'react';
import { complianceHistoryService } from '../../services/complianceHistoryService.js';

const ComplianceTimeline = ({ 
    historyData, 
    filters, 
    pagination, 
    onFilterChange, 
    onPageChange, 
    onExport, 
    onClearFilters,
    loading 
}) => {
    const [expandedEvent, setExpandedEvent] = useState(null);

    // Formatear eventos para visualización
    const formattedEvents = useMemo(() => {
        if (!historyData?.events) return [];
        return complianceHistoryService.formatComplianceEvents(historyData.events);
    }, [historyData]);

    // Agrupar eventos por fecha
    const groupedEvents = useMemo(() => {
        return complianceHistoryService.groupEventsByDate(formattedEvents);
    }, [formattedEvents]);

    // Calcular estadísticas
    const eventStats = useMemo(() => {
        return complianceHistoryService.calculateEventStats(formattedEvents);
    }, [formattedEvents]);

    // Manejar cambio de filtro individual
    const handleFilterUpdate = (key, value) => {
        onFilterChange({ [key]: value });
    };

    // Expandir/contraer detalles de evento
    const toggleEventDetails = (eventId) => {
        setExpandedEvent(expandedEvent === eventId ? null : eventId);
    };

    // Renderizar filtros
    const renderFilters = () => (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Filtro por tipo de evento */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Evento
                    </label>
                    <select
                        value={filters.eventType}
                        onChange={(e) => handleFilterUpdate('eventType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todos los tipos</option>
                        <option value="alert">Alertas</option>
                        <option value="status_change">Cambios de Estado</option>
                        <option value="risk_score_change">Cambios de Risk Score</option>
                        <option value="compliance_check">Verificaciones</option>
                    </select>
                </div>

                {/* Filtro por severidad */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Severidad
                    </label>
                    <select
                        value={filters.severity}
                        onChange={(e) => handleFilterUpdate('severity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todas las severidades</option>
                        <option value="critical">Crítica</option>
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                    </select>
                </div>

                {/* Fecha desde */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Desde
                    </label>
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => handleFilterUpdate('dateFrom', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Fecha hasta */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hasta
                    </label>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => handleFilterUpdate('dateTo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Búsqueda */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Buscar
                    </label>
                    <input
                        type="text"
                        placeholder="Buscar en eventos..."
                        value={filters.search}
                        onChange={(e) => handleFilterUpdate('search', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="flex justify-between items-center mt-4">
                <button
                    onClick={onClearFilters}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                    Limpiar filtros
                </button>
                <button
                    onClick={onExport}
                    disabled={!formattedEvents.length}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    📥 Exportar
                </button>
            </div>
        </div>
    );

    // Renderizar estadísticas
    const renderStats = () => (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{eventStats.total}</div>
                <div className="text-sm text-blue-700">Total Eventos</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                    {(eventStats.bySeverity.critical || 0) + (eventStats.bySeverity.high || 0)}
                </div>
                <div className="text-sm text-red-700">Alta Prioridad</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{eventStats.pending}</div>
                <div className="text-sm text-yellow-700">Pendientes</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{eventStats.resolved}</div>
                <div className="text-sm text-green-700">Resueltos</div>
            </div>
        </div>
    );

    // Renderizar evento individual
    const renderEvent = (event, isLast = false) => {
        const isExpanded = expandedEvent === event.event_id;
        
        return (
            <div key={event.event_id} className="relative">
                {/* Línea del timeline */}
                {!isLast && (
                    <div className="absolute left-4 top-12 w-0.5 h-full bg-gray-200"></div>
                )}
                
                {/* Contenido del evento */}
                <div className="flex items-start space-x-4">
                    {/* Icono del evento */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${event.severityColor} border-2`}>
                        <span className="text-xs">
                            {event.type === 'alert' ? '⚠️' : 
                             event.type === 'status_change' ? '🔄' :
                             event.type === 'risk_score_change' ? '📊' : '✅'}
                        </span>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                        <div 
                            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => toggleEventDetails(event.event_id)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{event.formattedDate}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event.severityColor}`}>
                                        {event.severity}
                                    </span>
                                    {event.isPredictive && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            Predictivo
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Estado de resolución */}
                            {((event.resolved || (event.metadata && event.metadata.resolved)) || 
                              (event.acknowledged || (event.metadata && event.metadata.acknowledged))) && (
                                <div className="flex space-x-4 mt-2">
                                    {(event.acknowledged || (event.metadata && event.metadata.acknowledged)) && (
                                        <span className="text-xs text-blue-600">✓ Reconocido</span>
                                    )}
                                    {(event.resolved || (event.metadata && event.metadata.resolved)) && (
                                        <span className="text-xs text-green-600">✓ Resuelto</span>
                                    )}
                                </div>
                            )}

                            {/* Detalles expandidos */}
                            {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium">Tipo:</span> {event.type}
                                        </div>
                                        <div>
                                            <span className="font-medium">Subtipo:</span> {event.subtype || 'N/A'}
                                        </div>
                                        {event.predicted_date && (
                                            <>
                                                <div>
                                                    <span className="font-medium">Fecha predicha:</span> {new Date(event.predicted_date).toLocaleDateString('es-AR')}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Confianza:</span> {(event.confidence_level * 100).toFixed(1)}%
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    
                                    {event.details && Object.keys(event.details).length > 0 && (
                                        <div className="mt-3">
                                            <span className="font-medium text-sm">Detalles:</span>
                                            <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                                {JSON.stringify(event.details, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Renderizar timeline agrupado por fecha
    const renderTimeline = () => {
        const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(b) - new Date(a));
        
        if (sortedDates.length === 0) {
            return (
                <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📅</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay eventos</h3>
                    <p className="text-gray-600">No se encontraron eventos para los filtros aplicados.</p>
                </div>
            );
        }

        return (
            <div className="space-y-8">
                {sortedDates.map((date, dateIndex) => (
                    <div key={date}>
                        {/* Header de fecha */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 pb-2 mb-4 z-10">
                            <h3 className="text-lg font-medium text-gray-900">
                                {new Date(date).toLocaleDateString('es-AR', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {groupedEvents[date].length} evento{groupedEvents[date].length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        {/* Eventos de la fecha */}
                        <div className="space-y-4">
                            {groupedEvents[date].map((event, eventIndex) => 
                                renderEvent(event, eventIndex === groupedEvents[date].length - 1 && dateIndex === sortedDates.length - 1)
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Renderizar paginación
    const renderPagination = () => {
        if (pagination.total <= pagination.pageSize) return null;

        const totalPages = Math.ceil(pagination.total / pagination.pageSize);
        const currentPage = pagination.page;

        return (
            <div className="flex items-center justify-between mt-8">
                <div className="text-sm text-gray-700">
                    Mostrando {((currentPage - 1) * pagination.pageSize) + 1} a{' '}
                    {Math.min(currentPage * pagination.pageSize, pagination.total)} de{' '}
                    {pagination.total} eventos
                </div>
                
                <div className="flex space-x-1">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Anterior
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                            pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                        } else {
                            pageNumber = currentPage - 2 + i;
                        }
                        
                        return (
                            <button
                                key={pageNumber}
                                onClick={() => onPageChange(pageNumber)}
                                className={`px-3 py-2 text-sm border rounded-md ${
                                    pageNumber === currentPage
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {pageNumber}
                            </button>
                        );
                    })}
                    
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        );
    };

    if (!historyData) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
                <p className="text-gray-600">Cargue los datos para ver el timeline de compliance.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Resumen de compliance */}
            {historyData.summary && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Compliance</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <div className="text-2xl font-bold text-blue-600">
                                {historyData.summary.currentRiskScore?.toFixed(1) || '0.0'}
                            </div>
                            <div className="text-sm text-gray-600">Risk Score Actual</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-indigo-600">
                                {historyData.summary.complianceRate?.toFixed(1) || '0.0'}%
                            </div>
                            <div className="text-sm text-gray-600">Tasa de Compliance</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-600">
                                {historyData.summary.totalAlerts || 0}
                            </div>
                            <div className="text-sm text-gray-600">Alertas (30 días)</div>
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${
                                historyData.summary.currentStatus === 'excellent' ? 'text-green-600' :
                                historyData.summary.currentStatus === 'good' ? 'text-blue-600' :
                                historyData.summary.currentStatus === 'fair' ? 'text-yellow-600' :
                                'text-red-600'
                            }`}>
                                {historyData.summary.currentStatus || 'unknown'}
                            </div>
                            <div className="text-sm text-gray-600">Estado Actual</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filtros */}
            {renderFilters()}

            {/* Estadísticas */}
            {renderStats()}

            {/* Timeline */}
            {renderTimeline()}

            {/* Paginación */}
            {renderPagination()}
        </div>
    );
};

export default ComplianceTimeline;