// src/client/services/mcp-client.js - Versión con modo mock
/**
 * Cliente MCP con modo mock para desarrollo
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
                groqEnabled: healthData.services?.groq?.healthy || false
            };

            this.initialized = true;
            this.mockMode = false;

            // Cargar capacidades reales del servidor
            this.capabilities = {
                tools: [
                    { name: 'afip_compliance_check', description: 'Check AFIP compliance using real endpoints' },
                    { name: 'afip_get_taxpayer_info', description: 'Get taxpayer information from AFIP' },
                    { name: 'get_system_status', description: 'Get system status' },
                    { name: 'get_active_alerts', description: 'Get active alerts' },
                    { name: 'send_notification', description: 'Send notifications' }
                ],
                resources: [
                    { uri: 'afip://taxpayer', name: 'AFIP Taxpayer Data' },
                    { uri: 'system://health', name: 'System Health' }
                ],
                prompts: []
            };

            console.log('✅ MCP Client conectado al servidor real:', this.serverInfo);
            return { serverInfo: this.serverInfo };

        } catch (error) {
            console.warn('⚠️ No se pudo conectar al servidor, usando modo mock:', error.message);
            return this.initializeMock();
        }
    }

    /**
     * Inicialización en modo mock
     */
    async initializeMock() {
        console.log('🔧 MCP Client running in MOCK MODE');

        this.mockMode = true;
        this.initialized = true;
        this.serverInfo = {
            name: 'AFIP Monitor Mock Server',
            version: '1.0.0-mock'
        };

        // Capacidades mock
        this.capabilities = {
            tools: [
                { name: 'afip_compliance_check', description: 'Check AFIP compliance' },
                { name: 'afip_get_obligations', description: 'Get AFIP obligations' },
                { name: 'get_system_metrics', description: 'Get system metrics' },
                { name: 'get_active_alerts', description: 'Get active alerts' }
            ],
            resources: [
                { uri: 'afip://compliance', name: 'Compliance Data' },
                { uri: 'system://metrics', name: 'System Metrics' }
            ],
            prompts: [
                { name: 'afip_analysis', description: 'AFIP Analysis Prompt' }
            ]
        };

        console.log('Mock capabilities loaded:', this.capabilities);
        return { serverInfo: this.serverInfo };
    }

    /**
     * Request que usa las rutas reales del servidor
     */
    async request(method, params = {}, options = {}) {
        if (!this.initialized && method !== 'initialize') {
            await this.initialize();
        }

        if (this.mockMode) {
            return this.mockRequest(method, params);
        }

        // Mapear métodos MCP a rutas reales del servidor
        const endpoint = this.mapMethodToEndpoint(method, params);

        try {
            const requestOptions = {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
                    ...options.headers
                },
                signal: this.createTimeoutSignal(options.timeout || this.timeout)
            };

            if (endpoint.method !== 'GET' && endpoint.body) {
                requestOptions.body = JSON.stringify(endpoint.body);
            }

            const response = await fetch(endpoint.url, requestOptions);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Normalizar respuesta al formato MCP esperado
            return this.normalizeResponse(method, data);

        } catch (error) {
            console.error(`Request failed for ${method}:`, error);
            throw error;
        }
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
                    url: '/api/notifications/test-email',
                    method: 'POST',
                    body: { to: args.email }
                };

            case 'get_system_health':
                return {
                    url: '/health',
                    method: 'GET'
                };

            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    /**
     * Mapea lectura de recursos a endpoints
     */
    mapResourceRead(uri) {
        if (uri.startsWith('afip://taxpayer/')) {
            const cuit = uri.replace('afip://taxpayer/', '');
            return {
                url: `/api/afip/taxpayer/${cuit}`,
                method: 'GET'
            };
        }

        if (uri === 'system://health') {
            return {
                url: '/health',
                method: 'GET'
            };
        }

        throw new Error(`Unknown resource URI: ${uri}`);
    }

    /**
     * Normaliza respuestas del servidor al formato MCP
     */
    normalizeResponse(method, data) {
        if (method === 'tools/call') {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(data, null, 2)
                }]
            };
        }

        return data;
    }

    /**
     * Mock requests para desarrollo
     */
    async mockRequest(method, params) {
        console.log(`🔧 Mock request: ${method}`, params);

        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

        switch (method) {
            case 'tools/list':
                return { tools: this.capabilities.tools };

            case 'resources/list':
                return { resources: this.capabilities.resources };

            case 'prompts/list':
                return { prompts: this.capabilities.prompts };

            case 'tools/call':
                return this.mockToolCall(params.name, params.arguments);

            default:
                return { success: true, message: `Mock response for ${method}` };
        }
    }

    /**
     * Mock de llamadas a herramientas
     */
    async mockToolCall(toolName, args) {
        console.log(`🔧 Mock tool call: ${toolName}`, args);

        const mockData = {
            'afip_compliance_check': {
                cuit: args?.cuit || '20-12345678-9',
                status: 'compliant',
                score: 85,
                checks: [
                    { name: 'Inscripción AFIP', status: 'passed', description: 'Empresa correctamente inscripta' },
                    { name: 'Presentaciones al día', status: 'passed', description: 'Todas las declaraciones presentadas' },
                    { name: 'Deudas pendientes', status: 'warning', description: 'Deuda menor pendiente' }
                ],
                lastUpdate: new Date().toISOString()
            },

            'afip_get_obligations': {
                cuit: args?.cuit || '20-12345678-9',
                obligations: [
                    {
                        id: 'IVA_202401',
                        type: 'IVA',
                        period: '2024-01',
                        dueDate: '2024-02-20',
                        status: 'pending',
                        amount: 125000
                    },
                    {
                        id: 'GANANCIAS_2023',
                        type: 'Ganancias',
                        period: '2023',
                        dueDate: '2024-05-31',
                        status: 'pending',
                        amount: 850000
                    }
                ]
            },

            'get_system_metrics': {
                timestamp: new Date().toISOString(),
                metrics: {
                    cpu_usage: Math.random() * 100,
                    memory_usage: 60 + Math.random() * 30,
                    active_connections: Math.floor(Math.random() * 50) + 10,
                    requests_per_minute: Math.floor(Math.random() * 1000) + 100,
                    afip_api_response_time: 200 + Math.random() * 300,
                    afip_success_rate: 95 + Math.random() * 5
                }
            },

            'get_active_alerts': {
                alerts: [
                    {
                        id: 'alert_1',
                        type: 'warning',
                        title: 'Vencimiento próximo',
                        message: 'IVA vence en 5 días',
                        timestamp: new Date().toISOString(),
                        priority: 'high'
                    },
                    {
                        id: 'alert_2',
                        type: 'info',
                        title: 'Sistema actualizado',
                        message: 'Nueva versión disponible',
                        timestamp: new Date().toISOString(),
                        priority: 'low'
                    }
                ]
            }
        };

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(mockData[toolName] || { message: `Mock data for ${toolName}` }, null, 2)
            }]
        };
    }

    /**
     * Método de conexión (alias para initialize)
     */
    async connect() {
        return this.initialize();
    }

    /**
     * Método de desconexión (alias para close)
     */
    async disconnect() {
        return this.close();
    }

    async discoverCapabilities() {
        // En modo mock, las capacidades ya están definidas
        if (this.mockMode) {
            return;
        }

        try {
            const toolsResponse = await this.request('tools/list');
            this.capabilities.tools = toolsResponse.tools || [];

            const resourcesResponse = await this.request('resources/list');
            this.capabilities.resources = resourcesResponse.resources || [];

            const promptsResponse = await this.request('prompts/list');
            this.capabilities.prompts = promptsResponse.prompts || [];

            console.log('Capabilities discovered:', this.capabilities);
        } catch (error) {
            console.warn('Failed to discover some capabilities:', error);
        }
    }

    // ============== MÉTODOS ESPECÍFICOS PARA AFIP ================

    async checkAfipCompliance(cuit, options = {}) {
        return this.callTool('afip_compliance_check', { cuit }, options);
    }

    async getAfipObligations(cuit, period = null, options = {}) {
        const params = { cuit };
        if (period) params.period = period;
        return this.callTool('afip_get_obligations', params, options);
    }

    async getSystemMetrics(metricNames = [], options = {}) {
        const params = metricNames.length > 0 ? { metrics: metricNames } : {};
        return this.callTool('get_system_metrics', params, options);
    }

    async getActiveAlerts(filters = {}, options = {}) {
        return this.callTool('get_active_alerts', filters, options);
    }

    // ============== MÉTODOS CORE ================

    async callTool(name, arguments_ = {}, options = {}) {
        try {
            const result = await this.request('tools/call', {
                name,
                arguments: arguments_
            }, options);

            this.emit('tool:executed', { name, arguments: arguments_, result });
            return result;
        } catch (error) {
            this.emit('tool:error', { name, arguments: arguments_, error });
            throw error;
        }
    }

    createTimeoutSignal(timeout) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), timeout);
        return controller.signal;
    }

    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }

    emit(event, data) {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    getCapabilities() {
        return { ...this.capabilities };
    }

    async close() {
        this.initialized = false;
        this.eventListeners.clear();
        console.log('MCP Client closed');
    }
}

// ============== INSTANCIA SINGLETON ================

let mcpClientInstance = null;

export function getMCPClient(config = {}) {
    if (!mcpClientInstance) {
        mcpClientInstance = new MCPClient(config);
    }
    return mcpClientInstance;
}

// Hook de React 
import { useState, useEffect } from 'react';

export function useMCPClient(config = {}) {
    const [client] = useState(() => getMCPClient(config));
    const [initialized, setInitialized] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!client.initialized) {
            client.initialize()
                .then(() => setInitialized(true))
                .catch(err => setError(err));
        } else {
            setInitialized(true);
        }
    }, [client]);

    return { client, initialized, error };
}

export default MCPClient;