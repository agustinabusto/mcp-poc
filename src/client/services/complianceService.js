/**
 * Servicio para la gestión de compliance
 * Maneja todas las interacciones con las APIs de compliance
 */

class ComplianceService {
    constructor() {
        this.baseUrl = '/api/compliance';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Obtiene datos del dashboard de compliance
     */
    async getDashboardData() {
        try {
            const response = await fetch(`${this.baseUrl}/dashboard`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error obteniendo datos del dashboard:', error);
            throw error;
        }
    }

    /**
     * Obtiene estado del sistema de monitoreo
     */
    async getSystemStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/status`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error obteniendo estado del sistema:', error);
            throw error;
        }
    }

    /**
     * Obtiene información detallada de compliance para un CUIT
     */
    async getComplianceDetail(cuit) {
        try {
            const cacheKey = `compliance_detail_${cuit}`;
            const cached = this.getFromCache(cacheKey);
            
            if (cached) {
                return cached;
            }

            const response = await fetch(`${this.baseUrl}/cuit/${cuit}`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            const result = data.success ? data.data : null;
            
            if (result) {
                this.setCache(cacheKey, result);
            }
            
            return result;
        } catch (error) {
            console.error(`Error obteniendo detalle de compliance para ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Ejecuta verificación manual de compliance
     */
    async runComplianceCheck(cuit) {
        try {
            const response = await fetch(`${this.baseUrl}/check/${cuit}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Limpiar cache para este CUIT
            this.clearCacheForCuit(cuit);
            
            return data.success ? data.data : null;
        } catch (error) {
            console.error(`Error ejecutando check de compliance para ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Configura monitoreo para un CUIT
     */
    async configureMonitoring(cuit, config) {
        try {
            const response = await fetch(`${this.baseUrl}/monitor/${cuit}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error(`Error configurando monitoreo para ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Deshabilita monitoreo para un CUIT
     */
    async disableMonitoring(cuit) {
        try {
            const response = await fetch(`${this.baseUrl}/monitor/${cuit}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error(`Error deshabilitando monitoreo para ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Obtiene alertas activas
     */
    async getActiveAlerts(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                    queryParams.append(key, filters[key]);
                }
            });
            
            const url = `${this.baseUrl}/alerts${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error obteniendo alertas activas:', error);
            throw error;
        }
    }

    /**
     * Reconoce una alerta
     */
    async acknowledgeAlert(alertId, acknowledgedBy) {
        try {
            const response = await fetch(`${this.baseUrl}/alerts/${alertId}/acknowledge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ acknowledgedBy })
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error(`Error reconociendo alerta ${alertId}:`, error);
            throw error;
        }
    }

    /**
     * Resuelve una alerta
     */
    async resolveAlert(alertId, resolvedBy, resolution = null) {
        try {
            const response = await fetch(`${this.baseUrl}/alerts/${alertId}/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resolvedBy, resolution })
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error(`Error resolviendo alerta ${alertId}:`, error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de alertas
     */
    async getAlertStats(days = 7) {
        try {
            const response = await fetch(`${this.baseUrl}/alerts/stats?days=${days}`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error obteniendo estadísticas de alertas:', error);
            throw error;
        }
    }

    /**
     * Obtiene configuración de compliance para un CUIT
     */
    async getComplianceConfig(cuit) {
        try {
            const response = await fetch(`${this.baseUrl}/config/${cuit}`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error(`Error obteniendo configuración para ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Actualiza configuración de compliance
     */
    async updateComplianceConfig(cuit, config) {
        try {
            const response = await fetch(`${this.baseUrl}/config/${cuit}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error(`Error actualizando configuración para ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Obtiene métricas del sistema
     */
    async getSystemMetrics(days = 7) {
        try {
            const response = await fetch(`${this.baseUrl}/metrics?days=${days}`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error obteniendo métricas del sistema:', error);
            throw error;
        }
    }

    /**
     * Genera reporte diario
     */
    async getDailyReport(date = null) {
        try {
            const dateParam = date || new Date().toISOString().split('T')[0];
            const response = await fetch(`${this.baseUrl}/reports/daily?date=${dateParam}`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error obteniendo reporte diario:', error);
            throw error;
        }
    }

    /**
     * Recalcula todos los risk scores (admin)
     */
    async recalculateRiskScores() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/recalculate-risk-scores`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error recalculando risk scores:', error);
            throw error;
        }
    }

    /**
     * Limpia alertas antiguas (admin)
     */
    async cleanupOldAlerts() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/cleanup-alerts`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error limpiando alertas:', error);
            throw error;
        }
    }

    // ============ MÉTODOS DE CACHE ============

    /**
     * Obtiene datos del cache
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    /**
     * Guarda datos en cache
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Limpia cache específico de un CUIT
     */
    clearCacheForCuit(cuit) {
        const keysToDelete = [];
        for (const [key] of this.cache) {
            if (key.includes(cuit)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Limpia todo el cache
     */
    clearCache() {
        this.cache.clear();
    }

    // ============ MÉTODOS DE UTILIDAD ============

    /**
     * Valida formato CUIT
     */
    validateCuit(cuit) {
        const cuitRegex = /^\d{2}-\d{8}-\d{1}$/;
        return cuitRegex.test(cuit);
    }

    /**
     * Formatea número de CUIT
     */
    formatCuit(cuit) {
        // Remover caracteres no numéricos
        const digits = cuit.replace(/\D/g, '');
        
        // Formatear como XX-XXXXXXXX-X
        if (digits.length === 11) {
            return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
        }
        
        return cuit;
    }

    /**
     * Obtiene nivel de riesgo basado en score
     */
    getRiskLevel(riskScore) {
        if (riskScore >= 0.85) return { level: 'critical', label: 'Crítico', color: 'red' };
        if (riskScore >= 0.70) return { level: 'high', label: 'Alto', color: 'orange' };
        if (riskScore >= 0.40) return { level: 'medium', label: 'Medio', color: 'yellow' };
        return { level: 'low', label: 'Bajo', color: 'green' };
    }

    /**
     * Obtiene descripción de estado de compliance
     */
    getComplianceStatusInfo(status) {
        const statuses = {
            excellent: { label: 'Excelente', color: 'green', description: 'Cumplimiento óptimo' },
            good: { label: 'Bueno', color: 'blue', description: 'Cumplimiento satisfactorio' },
            fair: { label: 'Regular', color: 'yellow', description: 'Cumplimiento parcial' },
            poor: { label: 'Deficiente', color: 'red', description: 'Requiere atención' }
        };
        return statuses[status] || { label: 'Desconocido', color: 'gray', description: 'Estado no determinado' };
    }

    /**
     * Obtiene información de tipo de alerta
     */
    getAlertTypeInfo(alertType) {
        const types = {
            'missing_vat_declarations': { 
                label: 'Declaraciones IVA Faltantes', 
                category: 'fiscal',
                severity: 'high' 
            },
            'missing_income_tax_declarations': { 
                label: 'Declaraciones Ganancias Faltantes', 
                category: 'fiscal',
                severity: 'high' 
            },
            'late_tax_returns': { 
                label: 'Declaraciones Fuera de Término', 
                category: 'fiscal',
                severity: 'medium' 
            },
            'fiscal_inactive': { 
                label: 'Contribuyente Inactivo', 
                category: 'status',
                severity: 'critical' 
            },
            'vat_not_registered': { 
                label: 'No Registrado en IVA', 
                category: 'registration',
                severity: 'high' 
            },
            'compliance_degradation': { 
                label: 'Degradación de Cumplimiento', 
                category: 'trend',
                severity: 'medium' 
            },
            'high_risk_detected': { 
                label: 'Alto Riesgo Detectado', 
                category: 'risk',
                severity: 'high' 
            },
            'deadline_approaching': { 
                label: 'Vencimiento Próximo', 
                category: 'deadline',
                severity: 'medium' 
            }
        };
        
        return types[alertType] || { 
            label: alertType.replace(/_/g, ' ').toUpperCase(), 
            category: 'other',
            severity: 'low' 
        };
    }

    /**
     * Subscripción a WebSocket para alertas en tiempo real
     */
    subscribeToAlerts(callback) {
        if (typeof window !== 'undefined' && window.WebSocket) {
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${protocol}//${window.location.host}/ws/compliance/alerts`;
                
                const ws = new WebSocket(wsUrl);
                
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'compliance_alert') {
                            callback(data);
                        }
                    } catch (error) {
                        console.error('Error procesando mensaje WebSocket:', error);
                    }
                };
                
                ws.onerror = (error) => {
                    console.error('Error en WebSocket:', error);
                };
                
                return () => {
                    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                        ws.close();
                    }
                };
            } catch (error) {
                console.error('Error configurando WebSocket:', error);
                return () => {};
            }
        }
        
        return () => {};
    }
}

// Crear instancia singleton
const complianceService = new ComplianceService();

export default complianceService;