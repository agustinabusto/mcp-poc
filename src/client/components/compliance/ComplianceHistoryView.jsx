import React, { useState, useEffect, useCallback } from 'react';
import { complianceHistoryService } from '../../services/complianceHistoryService.js';
import ComplianceTimeline from './ComplianceTimeline.jsx';
import ComplianceTrends from './ComplianceTrends.jsx';
import CompliancePatterns from './CompliancePatterns.jsx';

const ComplianceHistoryView = ({ cuit, onClose, businessName = null }) => {
    // Estado del componente
    const [activeTab, setActiveTab] = useState('timeline');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Datos de compliance
    const [historyData, setHistoryData] = useState(null);
    const [trendsData, setTrendsData] = useState(null);
    const [patternsData, setPatternsData] = useState(null);
    
    // Filtros y paginación
    const [filters, setFilters] = useState({
        eventType: '',
        severity: '',
        dateFrom: '',
        dateTo: '',
        search: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 50,
        total: 0
    });

    // Inicializar servicio
    useEffect(() => {
        if (complianceHistoryService.init) {
            complianceHistoryService.init();
        }
    }, []);

    // Cargar datos iniciales
    useEffect(() => {
        if (cuit && activeTab === 'timeline') {
            loadHistoryData();
        } else if (cuit && activeTab === 'trends') {
            loadTrendsData();
        } else if (cuit && activeTab === 'patterns') {
            loadPatternsData();
        }
    }, [cuit, activeTab, pagination.page, filters]);

    // Función para cargar historial
    const loadHistoryData = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            console.log('🔍 Loading compliance history for CUIT:', cuit);
            
            const response = await complianceHistoryService.getComplianceHistory(cuit, {
                page: pagination.page,
                pageSize: pagination.pageSize,
                ...filters
            });
            
            console.log('✅ History data received:', response);
            
            if (response && response.data) {
                setHistoryData(response.data);
                setPagination(prev => ({
                    ...prev,
                    total: response.data.totalEvents || 0
                }));
            }
        } catch (err) {
            setError('Error cargando historial de compliance: ' + err.message);
            console.error('Error loading compliance history:', err);
        } finally {
            setLoading(false);
        }
    }, [cuit, pagination.page, pagination.pageSize, filters]);

    // Función para cargar tendencias
    const loadTrendsData = useCallback(async (timeRange = '30d') => {
        setLoading(true);
        setError(null);
        
        try {
            console.log('📈 Loading trends for CUIT:', cuit, 'timeRange:', timeRange);
            
            const response = await complianceHistoryService.getComplianceTrends(cuit, timeRange);
            
            console.log('✅ Trends data received:', response);
            
            if (response && response.data) {
                setTrendsData(response.data);
            }
        } catch (err) {
            setError('Error cargando tendencias: ' + err.message);
            console.error('Error loading trends:', err);
        } finally {
            setLoading(false);
        }
    }, [cuit]);

    // Función para cargar patrones
    const loadPatternsData = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            console.log('🔍 Loading patterns for CUIT:', cuit);
            
            const response = await complianceHistoryService.getCompliancePatterns(cuit);
            
            console.log('✅ Patterns data received:', response);
            
            if (response && response.data) {
                setPatternsData(response.data);
            }
        } catch (err) {
            setError('Error cargando patrones: ' + err.message);
            console.error('Error loading patterns:', err);
        } finally {
            setLoading(false);
        }
    }, [cuit]);

    // Manejar cambio de filtros
    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset a primera página
    };

    // Manejar cambio de página
    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    // Manejar cambio de tab
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setError(null);
    };

    // Manejar exportación
    const handleExport = () => {
        if (historyData && historyData.events) {
            complianceHistoryService.downloadCSV(historyData.events, cuit);
        }
    };

    // Limpiar filtros
    const clearFilters = () => {
        setFilters({
            eventType: '',
            severity: '',
            dateFrom: '',
            dateTo: '',
            search: ''
        });
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 lg:w-4/5 xl:w-3/4 shadow-lg rounded-md bg-white">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Historial de Compliance
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            CUIT: {cuit} {businessName && `- ${businessName}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
                        aria-label="Cerrar ventana de historial de compliance"
                    >
                        ×
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: 'timeline', label: 'Timeline de Eventos', icon: '📅' },
                            { id: 'trends', label: 'Análisis de Tendencias', icon: '📈' },
                            { id: 'patterns', label: 'Patrones y Predicciones', icon: '🔍' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                aria-controls={`panel-${tab.id}`}
                                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <span role="img" aria-label={tab.label}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading Spinner */}
                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Cargando datos...</span>
                    </div>
                )}

                {/* Tab Content */}
                {!loading && !error && (
                    <div className="min-h-[600px]" role="tabpanel">
                        {activeTab === 'timeline' && (
                            <div id="panel-timeline" role="tabpanel" aria-labelledby="timeline">
                                <ComplianceTimeline
                                    historyData={historyData}
                                    filters={filters}
                                    pagination={pagination}
                                    onFilterChange={handleFilterChange}
                                    onPageChange={handlePageChange}
                                    onExport={handleExport}
                                    onClearFilters={clearFilters}
                                    loading={loading}
                                />
                            </div>
                        )}

                        {activeTab === 'trends' && (
                            <div id="panel-trends" role="tabpanel" aria-labelledby="trends">
                                <ComplianceTrends
                                    trendsData={trendsData}
                                    cuit={cuit}
                                    onTimeRangeChange={loadTrendsData}
                                    loading={loading}
                                />
                            </div>
                        )}

                        {activeTab === 'patterns' && (
                            <div id="panel-patterns" role="tabpanel" aria-labelledby="patterns">
                                <CompliancePatterns
                                    patternsData={patternsData}
                                    cuit={cuit}
                                    loading={loading}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                        {historyData && (
                            <span>
                                Total de eventos: {historyData.totalEvents} | 
                                Última actualización: {new Date().toLocaleString('es-AR')}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {activeTab === 'timeline' && historyData && (
                            <button
                                onClick={handleExport}
                                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                📥 Exportar CSV
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplianceHistoryView;