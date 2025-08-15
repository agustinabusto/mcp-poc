import { apiClient } from './apiClient.js';

// Verificar que apiClient esté disponible
if (!apiClient) {
    console.error('⚠️ apiClient not available in complianceHistoryService');
}

/**
 * Cache simple para el servicio de compliance history
 */
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Función de debounce para limitar las llamadas a la API
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Genera una clave de cache basada en los parámetros
 */
function getCacheKey(endpoint, params) {
    const paramString = params ? new URLSearchParams(params).toString() : '';
    return `${endpoint}?${paramString}`;
}

/**
 * Verifica si el cache está vigente
 */
function isCacheValid(timestamp) {
    return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Obtiene datos del cache si están vigentes
 */
function getFromCache(key) {
    const cached = cache.get(key);
    if (cached && isCacheValid(cached.timestamp)) {
        return cached.data;
    }
    return null;
}

/**
 * Guarda datos en el cache
 */
function setInCache(key, data) {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
    
    // Limpiar cache antiguo periódicamente
    if (cache.size > 100) {
        const keysToDelete = [];
        for (const [key, value] of cache.entries()) {
            if (!isCacheValid(value.timestamp)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => cache.delete(key));
    }
}

/**
 * Datos de demostración para testing
 */
const mockComplianceData = {
    'history': {
        cuit: '20-12345678-9',
        totalEvents: 15,
        page: 1,
        pageSize: 50,
        events: [
            {
                event_id: 1,
                type: 'alert',
                timestamp: '2025-08-15T10:00:00Z',
                severity: 'high',
                title: 'Vencimiento próximo de presentación mensual',
                subtype: 'deadline_approaching',
                predicted_date: '2025-08-20T00:00:00Z',
                confidence_level: 0.85,
                details: { daysUntilDue: 5, formType: 'F931', period: '2025-07' },
                resolved: 0,
                acknowledged: 1
            },
            {
                event_id: 2,
                type: 'status_change',
                timestamp: '2025-08-14T15:30:00Z',
                severity: 'medium',
                title: 'Status de compliance actualizado a: fair',
                subtype: 'fair',
                predicted_date: null,
                confidence_level: null,
                details: { previous_status: 'good', new_status: 'fair', risk_score: 5.2 },
                resolved: 0,
                acknowledged: 0
            },
            {
                event_id: 3,
                type: 'compliance_check',
                timestamp: '2025-08-13T09:15:00Z',
                severity: 'low',
                title: 'Verificación de compliance ejecutada',
                subtype: 'good',
                predicted_date: null,
                confidence_level: null,
                details: { score: 78, checks_passed: 8, checks_failed: 2 },
                resolved: 1,
                acknowledged: 1
            }
        ],
        summary: {
            currentRiskScore: 4.2,
            currentStatus: 'fair',
            avgRiskScore: 5.1,
            totalAlerts: 12,
            complianceRate: 78.5
        }
    },
    'trends': {
        cuit: '20-12345678-9',
        timeRange: '30d',
        trends: {
            riskScoreEvolution: [
                { date: '2025-08-01', avgScore: 4.8, minScore: 4.2, maxScore: 5.4, updateCount: 3 },
                { date: '2025-08-02', avgScore: 4.5, minScore: 4.0, maxScore: 5.0, updateCount: 2 },
                { date: '2025-08-03', avgScore: 4.2, minScore: 3.8, maxScore: 4.6, updateCount: 4 },
                { date: '2025-08-04', avgScore: 4.0, minScore: 3.5, maxScore: 4.5, updateCount: 2 },
                { date: '2025-08-05', avgScore: 4.3, minScore: 3.9, maxScore: 4.7, updateCount: 3 }
            ],
            complianceStatusTrend: [
                { date: '2025-08-01', status: 'good', score: 82, checkCount: 1 },
                { date: '2025-08-03', status: 'fair', score: 76, checkCount: 1 },
                { date: '2025-08-05', status: 'fair', score: 78, checkCount: 1 }
            ],
            alertFrequency: [
                { alert_type: 'deadline_approaching', severity: 'high', count: 8, firstAlert: '2025-07-20', lastAlert: '2025-08-15' },
                { alert_type: 'missing_vat_declarations', severity: 'medium', count: 3, firstAlert: '2025-08-01', lastAlert: '2025-08-10' },
                { alert_type: 'late_payment', severity: 'high', count: 2, firstAlert: '2025-08-05', lastAlert: '2025-08-12' }
            ],
            seasonalPatterns: [
                { dayOfWeek: 'Lunes', alertCount: 4, avgSeverityScore: 2.5 },
                { dayOfWeek: 'Martes', alertCount: 6, avgSeverityScore: 2.8 },
                { dayOfWeek: 'Miércoles', alertCount: 3, avgSeverityScore: 2.2 },
                { dayOfWeek: 'Jueves', alertCount: 8, avgSeverityScore: 3.1 },
                { dayOfWeek: 'Viernes', alertCount: 5, avgSeverityScore: 2.7 }
            ]
        }
    },
    'patterns': {
        cuit: '20-12345678-9',
        patterns: {
            recurringIssues: [
                {
                    alert_type: 'deadline_approaching',
                    occurrences: 8,
                    firstOccurrence: '2025-07-01T10:00:00Z',
                    lastOccurrence: '2025-08-15T10:00:00Z',
                    avgResolutionTime: 2.5,
                    resolvedCount: 6,
                    resolutionRate: 75.0
                },
                {
                    alert_type: 'missing_vat_declarations',
                    occurrences: 3,
                    firstOccurrence: '2025-08-01T08:00:00Z',
                    lastOccurrence: '2025-08-10T14:30:00Z',
                    avgResolutionTime: 4.2,
                    resolvedCount: 2,
                    resolutionRate: 66.7
                }
            ],
            performanceTrend: {
                currentRiskScore: 4.2,
                initialRiskScore: 3.8,
                recent30DayAvg: 4.4,
                previous60DayAvg: 4.0,
                recentAlerts: 5,
                previousAlerts: 8
            },
            trendAnalysis: {
                riskScoreTrend: 0.4,
                recent30DayTrend: 0.4,
                alertTrend: -3,
                overallTrend: 'improving'
            },
            predictiveInsights: [
                {
                    alert_type: 'deadline_approaching',
                    avgDaysBetweenOccurrences: 15.2,
                    lastOccurrence: '2025-08-15T10:00:00Z',
                    predictedNextOccurrence: '2025-08-30T10:00:00Z',
                    historicalOccurrences: 8,
                    daysUntilNext: 15
                }
            ]
        }
    }
};

/**
 * Servicio para el manejo de historial de compliance
 * VERSION: MOCK_DEMO_v1.0
 */
export const complianceHistoryService = {
    // Identificador único para verificar que se está usando la versión correcta
    _version: 'MOCK_DEMO_v1.1_FIXED',
    _timestamp: Date.now(),
    /**
     * Obtiene el historial completo de compliance para un CUIT
     * @param {string} cuit - CUIT del contribuyente
     * @param {Object} options - Opciones de filtrado y paginación
     * @returns {Promise<Object>} Historial de compliance
     */
    async getComplianceHistory(cuit, options = {}) {
        console.log('🚀 getComplianceHistory called with:', cuit, options);
        
        try {
            // FORZAR el uso de datos mock para testing
            console.log('🔍 [DEMO MODE] Using mock compliance history data for:', cuit);
            
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Usar datos mock por ahora
            const mockData = { ...mockComplianceData.history };
            mockData.cuit = cuit;
            
            console.log('✅ Returning mock data:', mockData);
            
            return { data: mockData };
            
        } catch (error) {
            console.error('❌ Error in getComplianceHistory:', error);
            throw error;
        }
    },

    /**
     * Obtiene análisis de tendencias para un CUIT
     * @param {string} cuit - CUIT del contribuyente
     * @param {string} timeRange - Rango temporal (7d, 30d, 90d, 180d, 1y)
     * @returns {Promise<Object>} Análisis de tendencias
     */
    async getComplianceTrends(cuit, timeRange = '30d') {
        console.log('🚀 getComplianceTrends called with:', cuit, timeRange);
        
        try {
            // FORZAR el uso de datos mock para testing
            console.log('📈 [DEMO MODE] Using mock trends data for:', cuit, 'timeRange:', timeRange);
            
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Usar datos mock por ahora
            const mockData = { ...mockComplianceData.trends };
            mockData.cuit = cuit;
            mockData.timeRange = timeRange;
            
            console.log('✅ Returning mock trends data:', mockData);
            
            return { data: mockData };
            
        } catch (error) {
            console.error('❌ Error in getComplianceTrends:', error);
            throw error;
        }
    },

    /**
     * Obtiene análisis de patrones para un CUIT
     * @param {string} cuit - CUIT del contribuyente
     * @returns {Promise<Object>} Análisis de patrones
     */
    async getCompliancePatterns(cuit) {
        console.log('🚀 getCompliancePatterns called with:', cuit);
        
        try {
            // FORZAR el uso de datos mock para testing
            console.log('🔍 [DEMO MODE] Using mock patterns data for:', cuit);
            
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 700));
            
            // Usar datos mock por ahora
            const mockData = { ...mockComplianceData.patterns };
            mockData.cuit = cuit;
            
            console.log('✅ Returning mock patterns data:', mockData);
            
            return { data: mockData };
            
        } catch (error) {
            console.error('❌ Error in getCompliancePatterns:', error);
            throw error;
        }
    },

    /**
     * Obtiene resumen de compliance histórico con cache
     * @param {string} cuit - CUIT del contribuyente
     * @returns {Promise<Object>} Resumen de compliance
     */
    async getComplianceSummary(cuit) {
        try {
            // Obtener solo la primera página con 1 elemento para obtener el summary
            const response = await this.getComplianceHistory(cuit, { page: 1, pageSize: 1 });
            return response.data.summary;
        } catch (error) {
            console.error('Error obteniendo resumen de compliance:', error);
            throw error;
        }
    },

    /**
     * Formatea eventos de compliance para visualización
     * @param {Array} events - Array de eventos
     * @returns {Array} Eventos formateados
     */
    formatComplianceEvents(events) {
        return events.map(event => ({
            ...event,
            formattedDate: new Date(event.timestamp).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            severityColor: this.getSeverityColor(event.severity),
            typeIcon: this.getEventTypeIcon(event.type),
            isPredictive: event.predicted_date !== null
        }));
    },

    /**
     * Obtiene el color asociado a un nivel de severidad
     * @param {string} severity - Nivel de severidad
     * @returns {string} Clase CSS de color
     */
    getSeverityColor(severity) {
        const colors = {
            critical: 'text-red-600 bg-red-50 border-red-200',
            high: 'text-orange-600 bg-orange-50 border-orange-200',
            medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
            low: 'text-green-600 bg-green-50 border-green-200'
        };
        return colors[severity] || 'text-gray-600 bg-gray-50 border-gray-200';
    },

    /**
     * Obtiene el icono asociado a un tipo de evento
     * @param {string} eventType - Tipo de evento
     * @returns {string} Nombre del icono
     */
    getEventTypeIcon(eventType) {
        const icons = {
            alert: 'exclamation-triangle',
            status_change: 'exchange-alt',
            risk_score_change: 'chart-line',
            compliance_check: 'check-circle'
        };
        return icons[eventType] || 'info-circle';
    },

    /**
     * Filtra eventos por criterios específicos
     * @param {Array} events - Array de eventos
     * @param {Object} filters - Filtros a aplicar
     * @returns {Array} Eventos filtrados
     */
    filterEvents(events, filters) {
        let filteredEvents = [...events];

        if (filters.severity) {
            filteredEvents = filteredEvents.filter(event => event.severity === filters.severity);
        }

        if (filters.type) {
            filteredEvents = filteredEvents.filter(event => event.type === filters.type);
        }

        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            filteredEvents = filteredEvents.filter(event => new Date(event.timestamp) >= fromDate);
        }

        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            filteredEvents = filteredEvents.filter(event => new Date(event.timestamp) <= toDate);
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredEvents = filteredEvents.filter(event => 
                event.title.toLowerCase().includes(searchTerm) ||
                (event.details && JSON.stringify(event.details).toLowerCase().includes(searchTerm))
            );
        }

        return filteredEvents;
    },

    /**
     * Agrupa eventos por fecha para visualización en timeline
     * @param {Array} events - Array de eventos
     * @returns {Object} Eventos agrupados por fecha
     */
    groupEventsByDate(events) {
        const grouped = {};
        
        events.forEach(event => {
            const date = new Date(event.timestamp).toDateString();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(event);
        });

        // Ordenar eventos dentro de cada fecha por timestamp descendente
        Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        });

        return grouped;
    },

    /**
     * Calcula estadísticas de eventos
     * @param {Array} events - Array de eventos
     * @returns {Object} Estadísticas calculadas
     */
    calculateEventStats(events) {
        console.log('🔍 calculateEventStats called with events:', events);
        
        if (!Array.isArray(events)) {
            console.warn('⚠️ events is not an array:', events);
            return {
                total: 0,
                bySeverity: {},
                byType: {},
                resolved: 0,
                acknowledged: 0,
                pending: 0
            };
        }

        const stats = {
            total: events.length,
            bySeverity: {},
            byType: {},
            resolved: 0,
            acknowledged: 0,
            pending: 0
        };

        events.forEach((event, index) => {
            console.log(`📊 Processing event ${index}:`, {
                event_id: event.event_id,
                type: event.type,
                severity: event.severity,
                resolved: event.resolved,
                acknowledged: event.acknowledged,
                hasMetadata: !!event.metadata,
                metadata: event.metadata
            });
            
            // Por severidad
            stats.bySeverity[event.severity] = (stats.bySeverity[event.severity] || 0) + 1;
            
            // Por tipo
            stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
            
            // Estado de resolución - verificar ambos formatos
            const isResolved = event.resolved || (event.metadata && event.metadata.resolved);
            const isAcknowledged = event.acknowledged || (event.metadata && event.metadata.acknowledged);
            
            if (isResolved) {
                stats.resolved++;
            } else if (isAcknowledged) {
                stats.acknowledged++;
            } else {
                stats.pending++;
            }
            
            console.log(`✅ Event ${index} processed: resolved=${isResolved}, acknowledged=${isAcknowledged}`);
        });

        console.log('📊 Final stats:', stats);
        return stats;
    },

    /**
     * Exporta historial de compliance a formato CSV
     * @param {Array} events - Array de eventos
     * @param {string} cuit - CUIT del contribuyente
     * @returns {string} Contenido CSV
     */
    exportToCSV(events, cuit) {
        const headers = [
            'Fecha',
            'Tipo',
            'Severidad',
            'Título',
            'Subtipo',
            'Resuelto',
            'Reconocido',
            'Detalles'
        ];

        const csvRows = [headers.join(',')];

        events.forEach(event => {
            const row = [
                new Date(event.timestamp).toISOString(),
                event.type,
                event.severity,
                `"${event.title.replace(/"/g, '""')}"`,
                event.subtype || '',
                (event.resolved || (event.metadata && event.metadata.resolved)) ? 'Sí' : 'No',
                (event.acknowledged || (event.metadata && event.metadata.acknowledged)) ? 'Sí' : 'No',
                `"${JSON.stringify(event.details).replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    },

    /**
     * Descarga historial como archivo CSV
     * @param {Array} events - Array de eventos
     * @param {string} cuit - CUIT del contribuyente
     */
    downloadCSV(events, cuit) {
        const csvContent = this.exportToCSV(events, cuit);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `compliance_history_${cuit}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar URL para liberar memoria
        setTimeout(() => URL.revokeObjectURL(url), 100);
    },

    /**
     * Limpia completamente el cache
     */
    clearCache() {
        cache.clear();
    },

    /**
     * Limpia el cache para un CUIT específico
     * @param {string} cuit - CUIT del contribuyente
     */
    clearCacheForCuit(cuit) {
        const keysToDelete = [];
        for (const key of cache.keys()) {
            if (key.includes(cuit)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => cache.delete(key));
    },

    /**
     * Obtiene información del cache
     * @returns {Object} Información del cache
     */
    getCacheInfo() {
        return {
            size: cache.size,
            ttl: CACHE_TTL,
            keys: Array.from(cache.keys())
        };
    },

    /**
     * Debounced version of getComplianceHistory para búsquedas
     */
    debouncedGetHistory: null,

    /**
     * Inicializa las funciones debounced
     */
    init() {
        this.debouncedGetHistory = debounce(this.getComplianceHistory.bind(this), 300);
        console.log('🔧 Compliance History Service initialized');
    }
};

// Log del estado del servicio al cargar
console.log('📦 Compliance History Service loaded, methods available:', {
    version: complianceHistoryService._version,
    timestamp: complianceHistoryService._timestamp,
    getComplianceHistory: typeof complianceHistoryService.getComplianceHistory,
    getComplianceTrends: typeof complianceHistoryService.getComplianceTrends,
    getCompliancePatterns: typeof complianceHistoryService.getCompliancePatterns,
    init: typeof complianceHistoryService.init
});

// Verificación crítica de que NO estamos usando el backend
window.__COMPLIANCE_SERVICE_DEBUG = complianceHistoryService;