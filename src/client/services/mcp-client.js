// src/client/services/mcp-client.js - Versión actualizada con soporte ARCA
/**
 * Cliente MCP con soporte completo para ARCA y facturación
 */

class MCPError extends Error {
    constructor(code, message, data = null) {
        super(message);
        this.name = 'MCPError';
        this.code = code;
        this.data = data;
    }
}

export class MCPClient {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || '/api';
        this.timeout = config.timeout || 30000;
        this.apiKey = config.apiKey || null;
        this.requestId = 0;

        // MODO MOCK para desarrollo - pero primero intentamos conectar al servidor real
        this.mockMode = config.mockMode !== undefined ? config.mockMode : false;

        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...config.headers
        };

        // Estado del cliente
        this.initialized = false;
        this.serverInfo = null;
        this.capabilities = {
            tools: [],
            resources: [],
            prompts: []
        };

        this.eventListeners = new Map();
    }

    /**
     * Inicializa la conexión con el servidor MCP
     */
    async initialize() {
        try {
            // Primero verificar que el servidor esté funcionando
            const healthResponse = await fetch('/health');
            if (!healthResponse.ok) {
                throw new Error('Server not available');
            }

            const healthData = await healthResponse.json();
            console.log('✅ Servidor detectado:', healthData);

            this.serverInfo = {
                name: 'AFIP Monitor Server',
                version: healthData.version || '1.0.0',
                afipMode: healthData.afipMode,
                groqEnabled: healthData.services?.groq?.healthy || false,
                arcaEnabled: healthData.services?.arca?.healthy || false
            };

            this.initialized = true;
            this.mockMode = false;

            // Cargar capacidades reales del servidor incluyendo ARCA
            this.capabilities = {
                tools: [
                    { name: 'afip_compliance_check', description: 'Check AFIP compliance using real endpoints' },
                    { name: 'afip_get_taxpayer_info', description: 'Get taxpayer information from AFIP' },
                    { name: 'get_system_status', description: 'Get system status' },
                    { name: 'get_active_alerts', description: 'Get active alerts' },
                    { name: 'send_notification', description: 'Send notifications' },
                    // Nuevas herramientas ARCA
                    { name: 'send_to_arca', description: 'Send invoice to ARCA system' },
                    { name: 'check_arca_status', description: 'Check ARCA submission status' },
                    { name: 'get_arca_config', description: 'Get ARCA configuration' },
                    { name: 'get_arca_stats', description: 'Get ARCA statistics' },
                    { name: 'validate_invoice_arca', description: 'Validate invoice for ARCA submission' },
                    { name: 'resend_to_arca', description: 'Resend failed invoice to ARCA' }
                ],
                resources: [
                    { uri: 'afip://taxpayer', name: 'AFIP Taxpayer Data' },
                    { uri: 'system://health', name: 'System Health' },
                    { uri: 'arca://invoices', name: 'ARCA Invoice Data' },
                    { uri: 'arca://config', name: 'ARCA Configuration' }
                ],
                prompts: []
            };

            console.log('✅ MCP Client conectado al servidor real:', this.serverInfo);
            return { serverInfo: this.serverInfo };

        } catch (error) {
            console.warn('⚠️ Servidor no disponible, activando modo mock:', error.message);

            // Modo mock para desarrollo
            this.mockMode = true;
            this.initialized = true;
            this.serverInfo = {
                name: 'AFIP Monitor Server (Mock)',
                version: '1.0.0-mock',
                afipMode: 'MOCK',
                groqEnabled: false,
                arcaEnabled: true // ARCA habilitado en mock para desarrollo
            };

            // Capacidades mock incluyendo ARCA
            this.capabilities = {
                tools: [
                    { name: 'afip_compliance_check', description: 'Mock AFIP compliance check' },
                    { name: 'get_system_status', description: 'Mock system status' },
                    { name: 'send_to_arca', description: 'Mock ARCA submission' },
                    { name: 'check_arca_status', description: 'Mock ARCA status check' },
                    { name: 'get_arca_stats', description: 'Mock ARCA statistics' }
                ],
                resources: [
                    { uri: 'mock://data', name: 'Mock Data' }
                ],
                prompts: []
            };

            console.log('✅ MCP Client inicializado en modo mock');
            return { serverInfo: this.serverInfo };
        }
    }

    /**
     * Llama a una herramienta MCP
     */
    async callTool(toolName, args = {}) {
        if (!this.initialized) {
            throw new MCPError('NOT_INITIALIZED', 'Cliente MCP no inicializado');
        }

        const requestId = ++this.requestId;

        if (this.mockMode) {
            return this.handleMockToolCall(toolName, args);
        }

        try {
            const response = await this.makeRequest('tools/call', {
                name: toolName,
                arguments: args
            });

            return response;

        } catch (error) {
            console.error(`Error en tool call ${toolName}:`, error);
            throw new MCPError('TOOL_CALL_ERROR', error.message, { toolName, args });
        }
    }

    /**
     * Maneja llamadas mock de herramientas incluyendo ARCA
     */
    async handleMockToolCall(toolName, args) {
        console.log(`🎭 Mock tool call: ${toolName}`, args);

        // Simular latencia
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

        switch (toolName) {
            case 'send_to_arca':
                return this.mockSendToArca(args);

            case 'check_arca_status':
                return this.mockCheckArcaStatus(args);

            case 'get_arca_stats':
                return this.mockGetArcaStats();

            case 'get_arca_config':
                return this.mockGetArcaConfig();

            case 'validate_invoice_arca':
                return this.mockValidateInvoiceArca(args);

            case 'resend_to_arca':
                return this.mockResendToArca(args);

            // Herramientas AFIP existentes
            case 'afip_compliance_check':
                return this.mockAfipComplianceCheck(args);

            case 'get_system_status':
                return this.mockGetSystemStatus();

            default:
                throw new MCPError('UNKNOWN_TOOL', `Herramienta desconocida: ${toolName}`);
        }
    }

    /**
     * Mock: Enviar factura a ARCA
     */
    async mockSendToArca(args) {
        const { cuit, invoiceNumber, amount, date, type, businessName, description } = args;

        // Simular validación
        if (!cuit || !invoiceNumber || !amount) {
            throw new Error('Faltan datos requeridos para ARCA');
        }

        // Simular éxito/error aleatorio (90% éxito)
        if (Math.random() < 0.1) {
            throw new Error('Error de conexión con ARCA');
        }

        const arcaId = `ARCA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        return {
            success: true,
            arcaId,
            message: 'Factura enviada a ARCA exitosamente',
            timestamp: new Date().toISOString(),
            status: 'Enviado',
            details: {
                cuit,
                invoiceNumber,
                amount,
                processingTime: Math.floor(Math.random() * 3000) + 1000
            }
        };
    }

    /**
     * Mock: Verificar estado en ARCA
     */
    async mockCheckArcaStatus(args) {
        const { invoiceId, arcaId } = args;

        const statuses = ['Recibido', 'Procesando', 'Autorizado', 'Rechazado'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        return {
            arcaId,
            invoiceId,
            status: randomStatus,
            timestamp: new Date().toISOString(),
            details: {
                cae: randomStatus === 'Autorizado' ? `CAE-${Math.floor(Math.random() * 100000000)}` : null,
                validUntil: randomStatus === 'Autorizado' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
                rejectionReason: randomStatus === 'Rechazado' ? 'Datos incompletos' : null
            }
        };
    }

    /**
     * Mock: Obtener estadísticas de ARCA
     */
    async mockGetArcaStats() {
        return {
            today: {
                sent: Math.floor(Math.random() * 50) + 10,
                authorized: Math.floor(Math.random() * 45) + 8,
                rejected: Math.floor(Math.random() * 5) + 1,
                pending: Math.floor(Math.random() * 10) + 2
            },
            thisMonth: {
                sent: Math.floor(Math.random() * 1000) + 200,
                authorized: Math.floor(Math.random() * 950) + 180,
                rejected: Math.floor(Math.random() * 50) + 10,
                pending: Math.floor(Math.random() * 100) + 20
            },
            successRate: (Math.random() * 10 + 90).toFixed(1), // 90-100%
            avgProcessingTime: Math.floor(Math.random() * 5000) + 2000, // 2-7 segundos
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Mock: Obtener configuración de ARCA
     */
    async mockGetArcaConfig() {
        return {
            endpoint: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
            environment: 'HOMOLOGACION',
            certificate: {
                valid: true,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            },
            puntoVenta: 1,
            maxRetries: 3,
            timeout: 30000,
            batchSize: 50
        };
    }

    /**
     * Mock: Validar factura para ARCA
     */
    async mockValidateInvoiceArca(args) {
        const { invoice } = args;
        const errors = [];

        if (!invoice.cuit) errors.push('CUIT requerido');
        if (!invoice.businessName) errors.push('Razón social requerida');
        if (!invoice.total || invoice.total <= 0) errors.push('Importe inválido');

        return {
            isValid: errors.length === 0,
            errors,
            warnings: errors.length === 0 ? [] : ['Revisar datos antes del envío']
        };
    }

    /**
     * Mock: Reenviar a ARCA
     */
    async mockResendToArca(args) {
        // Reutilizar la lógica de envío
        return this.mockSendToArca({
            ...args,
            isRetry: true
        });
    }

    /**
     * Mock: AFIP Compliance Check (existente)
     */
    async mockAfipComplianceCheck(args) {
        const { cuit } = args;

        return {
            cuit,
            status: Math.random() > 0.2 ? 'COMPLIANT' : 'NON_COMPLIANT',
            issues: Math.random() > 0.7 ? ['Presentación tardía F.931'] : [],
            lastCheck: new Date().toISOString(),
            nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
    }

    /**
     * Mock: System Status (existente)
     */
    async mockGetSystemStatus() {
        return {
            status: 'healthy',
            services: {
                afip: { healthy: true, responseTime: Math.floor(Math.random() * 1000) + 200 },
                groq: { healthy: Math.random() > 0.1, responseTime: Math.floor(Math.random() * 500) + 100 },
                arca: { healthy: Math.random() > 0.05, responseTime: Math.floor(Math.random() * 2000) + 500 }
            },
            uptime: Math.floor(Math.random() * 86400) + 3600,
            version: '1.0.0-mock',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Realiza una solicitud HTTP al servidor MCP
     */
    async makeRequest(method, params = {}) {
        const endpoint = this.mapMethodToEndpoint(method, params);

        if (!endpoint) {
            throw new Error(`No se pudo mapear el método: ${method}`);
        }

        const requestOptions = {
            method: endpoint.method || 'POST',
            headers: this.defaultHeaders,
            signal: AbortSignal.timeout(this.timeout)
        };

        if (this.apiKey) {
            requestOptions.headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        if (endpoint.method !== 'GET' && endpoint.body) {
            requestOptions.body = JSON.stringify(endpoint.body);
        }

        const response = await fetch(endpoint.url, requestOptions);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return this.normalizeResponse(method, data);
    }

    /**
     * Mapea métodos MCP a endpoints reales del servidor
     */
    mapMethodToEndpoint(method, params) {
        switch (method) {
            case 'tools/call':
                return this.mapToolCall(params.name, params.arguments);

            case 'resources/read':
                return this.mapResourceRead(params.uri);

            case 'tools/list':
                return { url: '/api/status', method: 'GET' };

            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }

    /**
     * Mapea llamadas de herramientas a endpoints específicos
     */
    mapToolCall(toolName, args) {
        switch (toolName) {
            case 'afip_compliance_check':
                return {
                    url: '/api/compliance/check',
                    method: 'POST',
                    body: {
                        cuit: args.cuit,
                        period: args.period || new Date().getFullYear().toString(),
                        sendNotification: args.sendNotification || false
                    }
                };

            case 'afip_get_taxpayer_info':
                return {
                    url: `/api/afip/taxpayer/${args.cuit}`,
                    method: 'GET'
                };

            case 'get_system_status':
                return {
                    url: '/api/status',
                    method: 'GET'
                };

            case 'get_active_alerts':
                return {
                    url: '/api/alerts',
                    method: 'GET'
                };

            case 'send_notification':
                return {
                    url: '/api/notifications/send',
                    method: 'POST',
                    body: args
                };

            // Nuevos endpoints ARCA
            case 'send_to_arca':
                return {
                    url: '/api/arca/send',
                    method: 'POST',
                    body: args
                };

            case 'check_arca_status':
                return {
                    url: `/api/arca/status/${args.arcaId}`,
                    method: 'GET'
                };

            case 'get_arca_stats':
                return {
                    url: '/api/arca/stats',
                    method: 'GET'
                };

            case 'get_arca_config':
                return {
                    url: '/api/arca/config',
                    method: 'GET'
                };

            case 'validate_invoice_arca':
                return {
                    url: '/api/arca/validate',
                    method: 'POST',
                    body: args
                };

            case 'resend_to_arca':
                return {
                    url: '/api/arca/resend',
                    method: 'POST',
                    body: args
                };

            default:
                throw new Error(`Herramienta desconocida: ${toolName}`);
        }
    }

    /**
     * Mapea lectura de recursos
     */
    mapResourceRead(uri) {
        const [protocol, resource] = uri.split('://');

        switch (protocol) {
            case 'afip':
                return {
                    url: `/api/afip/resource/${resource}`,
                    method: 'GET'
                };

            case 'system':
                return {
                    url: `/api/system/resource/${resource}`,
                    method: 'GET'
                };

            case 'arca':
                return {
                    url: `/api/arca/resource/${resource}`,
                    method: 'GET'
                };

            default:
                throw new Error(`Protocolo de recurso desconocido: ${protocol}`);
        }
    }

    /**
     * Normaliza la respuesta del servidor
     */
    normalizeResponse(method, data) {
        // Aquí se puede normalizar la respuesta según el método
        return data;
    }

    /**
     * Obtiene la lista de herramientas disponibles
     */
    async listTools() {
        return this.capabilities.tools;
    }

    /**
     * Obtiene la lista de recursos disponibles
     */
    async listResources() {
        return this.capabilities.resources;
    }

    /**
     * Lee un recurso específico
     */
    async readResource(uri) {
        if (!this.initialized) {
            throw new MCPError('NOT_INITIALIZED', 'Cliente MCP no inicializado');
        }

        try {
            const response = await this.makeRequest('resources/read', { uri });
            return response;
        } catch (error) {
            console.error(`Error leyendo recurso ${uri}:`, error);
            throw new MCPError('RESOURCE_READ_ERROR', error.message, { uri });
        }
    }

    /**
     * Registra un listener para eventos
     */
    addEventListener(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }

    /**
     * Dispara un evento
     */
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`Error en listener del evento ${event}:`, error);
                }
            });
        }
    }

    /**
     * Cierra la conexión MCP
     */
    async close() {
        this.initialized = false;
        this.eventListeners.clear();
        console.log('🔌 Conexión MCP cerrada');
    }
}

// Instancia singleton
let mcpClientInstance = null;

export const getMCPClient = async (config = {}) => {
    if (!mcpClientInstance) {
        mcpClientInstance = new MCPClient(config);
        await mcpClientInstance.initialize();
    }
    return mcpClientInstance;
};

export { MCPError };