// src/client/services/search-service.js
import { API_BASE_URL } from '../config/constants.js';

class SearchService {
    constructor() {
        this.baseURL = API_BASE_URL || 'http://localhost:8080/api';
        this.requestQueue = new Map();
        this.rateLimitDelay = 1000; // 1 segundo entre requests
        this.lastRequestTime = 0;
    }

    /**
     * Buscar contribuyente por CUIT
     * @param {string} cuit - CUIT a buscar
     * @param {Object} options - Opciones de búsqueda
     * @returns {Promise<Object>} Datos del contribuyente
     */
    async searchTaxpayer(cuit, options = {}) {
        const {
            includeCompliance = true,
            timeout = 15000,
            retries = 2,
            priority = 'normal'
        } = options;

        // Limpiar CUIT
        const cleanCuit = this.cleanCuit(cuit);

        // Validar formato
        if (!this.isValidCuitFormat(cleanCuit)) {
            throw new Error('Formato de CUIT inválido');
        }

        // Evitar requests duplicados
        const requestKey = `${cleanCuit}-${includeCompliance}`;
        if (this.requestQueue.has(requestKey)) {
            return this.requestQueue.get(requestKey);
        }

        // Rate limiting
        await this.enforceRateLimit();

        // Crear promesa de request
        const requestPromise = this.executeSearch(cleanCuit, {
            includeCompliance,
            timeout,
            retries
        });

        // Agregar a la cola
        this.requestQueue.set(requestKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } catch (error) {
            throw error;
        } finally {
            // Limpiar de la cola después de 30 segundos
            setTimeout(() => {
                this.requestQueue.delete(requestKey);
            }, 30000);
        }
    }

    /**
     * Ejecutar búsqueda con reintentos
     */
    async executeSearch(cuit, options) {
        const { includeCompliance, timeout, retries } = options;
        let lastError;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                // Construir URL
                const url = `${this.baseURL}/afip/taxpayer/${cuit}`;

                // Configurar request
                const requestConfig = {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(timeout)
                };

                console.log(`🔍 Buscando CUIT: ${cuit} (intento ${attempt + 1}/${retries + 1})`);

                // Ejecutar request
                const response = await fetch(url, requestConfig);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.message || 'Error en la respuesta del servidor');
                }

                // Procesar y enriquecer datos
                const enrichedData = await this.enrichTaxpayerData(data.data, includeCompliance);

                console.log(`✅ CUIT encontrado: ${enrichedData.razonSocial}`);
                return enrichedData;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Error en intento ${attempt + 1}:`, error.message);

                // No reintentar en ciertos errores
                if (this.isNonRetryableError(error)) {
                    break;
                }

                // Esperar antes del siguiente intento
                if (attempt < retries) {
                    await this.delay(Math.pow(2, attempt) * 1000); // Backoff exponencial
                }
            }
        }

        throw lastError;
    }

    /**
     * Enriquecer datos del contribuyente
     */
    async enrichTaxpayerData(taxpayerData, includeCompliance) {
        try {
            const enriched = {
                ...taxpayerData,
                searchTimestamp: new Date().toISOString(),
                displayName: this.getDisplayName(taxpayerData),
                statusSummary: this.getStatusSummary(taxpayerData),
                riskLevel: this.calculateRiskLevel(taxpayerData)
            };

            // Agregar datos de compliance si se solicita
            if (includeCompliance) {
                try {
                    const complianceData = await this.getComplianceData(taxpayerData.cuit);
                    enriched.compliance = complianceData;
                } catch (complianceError) {
                    console.warn('Error obteniendo compliance:', complianceError.message);
                    enriched.compliance = null;
                }
            }

            return enriched;

        } catch (error) {
            console.warn('Error enriqueciendo datos:', error.message);
            return taxpayerData;
        }
    }

    /**
     * Obtener datos de compliance
     */
    async getComplianceData(cuit) {
        try {
            const response = await fetch(`${this.baseURL}/compliance/check`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cuit,
                    period: new Date().toISOString().substring(0, 7), // YYYY-MM
                    sendNotification: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.success ? data.data : null;

        } catch (error) {
            console.warn('Error en compliance check:', error.message);
            return null;
        }
    }

    /**
     * Búsqueda múltiple (batch)
     */
    async searchMultiple(cuits, options = {}) {
        const { concurrency = 3, includeCompliance = false } = options;

        const results = [];
        const errors = [];

        // Procesar en lotes para evitar sobrecarga
        for (let i = 0; i < cuits.length; i += concurrency) {
            const batch = cuits.slice(i, i + concurrency);

            const batchPromises = batch.map(async (cuit) => {
                try {
                    const result = await this.searchTaxpayer(cuit, { includeCompliance });
                    return { cuit, success: true, data: result };
                } catch (error) {
                    return { cuit, success: false, error: error.message };
                }
            });

            const batchResults = await Promise.all(batchPromises);

            batchResults.forEach(result => {
                if (result.success) {
                    results.push(result);
                } else {
                    errors.push(result);
                }
            });

            // Pausa entre lotes
            if (i + concurrency < cuits.length) {
                await this.delay(500);
            }
        }

        return { results, errors, total: cuits.length };
    }

    /**
     * Obtener CUITs problemáticos para testing
     */
    async getProblematicCuits() {
        try {
            const response = await fetch(`${this.baseURL}/afip/problematic-cuits`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.success ? data.data : null;

        } catch (error) {
            console.warn('Error obteniendo CUITs problemáticos:', error.message);
            return null;
        }
    }

    // === MÉTODOS AUXILIARES ===

    cleanCuit(cuit) {
        return cuit ? cuit.toString().replace(/[-\s]/g, '') : '';
    }

    isValidCuitFormat(cuit) {
        return /^\d{11}$/.test(cuit);
    }

    getDisplayName(taxpayerData) {
        if (!taxpayerData) return 'Sin datos';

        return taxpayerData.razonSocial ||
            `${taxpayerData.apellido || ''} ${taxpayerData.nombre || ''}`.trim() ||
            'Sin nombre';
    }

    getStatusSummary(taxpayerData) {
        if (!taxpayerData) return 'Sin datos';

        const status = {
            general: taxpayerData.estado || 'DESCONOCIDO',
            fiscal: taxpayerData.situacionFiscal?.iva || 'NO_ESPECIFICADO',
            activities: taxpayerData.actividades?.length || 0
        };

        // Determinar estado general
        if (status.general === 'ACTIVO' && status.activities > 0) {
            return 'OPERATIVO';
        } else if (status.general === 'ACTIVO' && status.activities === 0) {
            return 'ACTIVO_SIN_ACTIVIDADES';
        } else {
            return 'PROBLEMATICO';
        }
    }

    calculateRiskLevel(taxpayerData) {
        if (!taxpayerData) return 'UNKNOWN';

        let riskScore = 0;

        // Estado inactivo +40 puntos de riesgo
        if (taxpayerData.estado !== 'ACTIVO') riskScore += 40;

        // Sin actividades +30 puntos
        if (!taxpayerData.actividades || taxpayerData.actividades.length === 0) riskScore += 30;

        // Problemas fiscales +20 puntos
        if (taxpayerData.situacionFiscal?.iva === 'NO_INSCRIPTO') riskScore += 20;

        // Sin domicilio +10 puntos
        if (!taxpayerData.domicilio?.direccion || taxpayerData.domicilio.direccion === 'Sin datos') riskScore += 10;

        // Clasificar riesgo
        if (riskScore >= 50) return 'HIGH';
        if (riskScore >= 25) return 'MEDIUM';
        return 'LOW';
    }

    isNonRetryableError(error) {
        const nonRetryableMessages = [
            'Formato de CUIT inválido',
            'CUIT no encontrado',
            'Acceso denegado',
            'Rate limit exceeded'
        ];

        return nonRetryableMessages.some(msg =>
            error.message.toLowerCase().includes(msg.toLowerCase())
        );
    }

    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.rateLimitDelay) {
            const waitTime = this.rateLimitDelay - timeSinceLastRequest;
            await this.delay(waitTime);
        }

        this.lastRequestTime = Date.now();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton
export const searchService = new SearchService();

// Export individual functions for convenience
export const {
    searchTaxpayer,
    searchMultiple,
    getProblematicCuits
} = searchService;