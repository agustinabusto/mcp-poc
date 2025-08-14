// Cliente Groq para integración con Llama 3.1
import Groq from 'groq-sdk';
import { EventEmitter } from 'events';

export class GroqClient extends EventEmitter {
    constructor(config, logger) {
        super();
        this.config = config;
        this.logger = logger || console;

        // Guardar la API key
        this.apiKey = config.groqApiKey || config.apiKey || process.env.GROQ_API_KEY;
        
        // Inicializar cliente Groq
        this.groq = new Groq({
            apiKey: this.apiKey
        });

        this.model = config.groqModel || config.model || process.env.GROQ_MODEL || 'llama3-70b-8192';
        this.maxTokens = config.groqMaxTokens || config.maxTokens || parseInt(process.env.GROQ_MAX_TOKENS) || 1000;
        this.temperature = config.groqTemperature || config.temperature || parseFloat(process.env.GROQ_TEMPERATURE) || 0.7;
        this.timeout = config.groqTimeout || config.timeout || parseInt(process.env.GROQ_TIMEOUT) || 30000;

        this.isInitialized = false;
        this.lastHealthCheck = null;

        // Métricas y estado
        this.metrics = {
            requestCount: 0,
            successCount: 0,
            errorCount: 0,
            totalTokensUsed: 0,
            averageResponseTime: 0,
            lastRequestTime: null
        };

        this.logger.info('GroqClient inicializado', { model: this.model, hasApiKey: !!this.apiKey });
    }

    // Inicializar cliente y verificar conexión
    async initialize() {
        try {
            // Probar conexión con request simple
            await this.testConnection();
            this.isInitialized = true;
            this.logger.info('GroqClient conectado exitosamente');
            this.emit('connected');
            return true;
        } catch (error) {
            this.logger.error('Error conectando con Groq:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Health check del servicio Groq
     */
    async healthCheck() {
        const startTime = Date.now();

        try {
            if (!this.isInitialized) {
                return {
                    isHealthy: false,
                    error: 'Client not initialized',
                    timestamp: new Date().toISOString(),
                    responseTime: Date.now() - startTime
                };
            }

            if (!this.apiKey) {
                return {
                    isHealthy: false,
                    error: 'No API key configured',
                    timestamp: new Date().toISOString(),
                    responseTime: Date.now() - startTime
                };
            }

            // En un cliente real, harías una petición simple a la API
            // Por ahora, simular que está saludable si está inicializado
            this.lastHealthCheck = new Date().toISOString();

            return {
                isHealthy: true,
                model: this.model,
                timestamp: this.lastHealthCheck,
                responseTime: Date.now() - startTime
            };

        } catch (error) {
            this.lastHealthCheck = new Date().toISOString();

            return {
                isHealthy: false,
                error: error.message,
                timestamp: this.lastHealthCheck,
                responseTime: Date.now() - startTime
            };
        }
    }

    /**
    * Enviar mensaje al chat
    */
    async chat(messages, options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Groq client not initialized');
            }

            // Simular respuesta de chat
            return {
                success: true,
                response: 'Esta es una respuesta simulada de Groq',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Consulta principal para AFIP compliance con MCP context
    async consultarCompliance(prompt, mcpTools = [], cuitContext = null) {
        const startTime = Date.now();
        this.metrics.requestCount++;

        try {
            // Construir contexto completo para AFIP
            const systemPrompt = this.buildSystemPrompt(mcpTools, cuitContext);
            const fullPrompt = this.buildCompliancePrompt(prompt, cuitContext);

            this.logger.debug('Enviando consulta a Groq', {
                prompt: prompt.substring(0, 100) + '...',
                model: this.model
            });

            const response = await this.groq.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: fullPrompt
                    }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                top_p: 1,
                stream: false
            });

            // Procesar respuesta
            const result = this.processComplianceResponse(response, prompt);

            // Actualizar métricas
            this.updateMetrics(startTime, response.usage);
            this.metrics.successCount++;

            this.logger.info('Consulta Groq exitosa', {
                tokensUsed: response.usage?.total_tokens,
                responseTime: Date.now() - startTime
            });

            this.emit('response', { prompt, result, usage: response.usage });
            return result;

        } catch (error) {
            this.metrics.errorCount++;
            this.logger.error('Error en consulta Groq:', error);
            this.emit('error', error);

            // Devolver respuesta de fallback
            return this.buildFallbackResponse(prompt, error);
        }
    }

    // Construir prompt del sistema con contexto MCP y AFIP
    buildSystemPrompt(mcpTools, cuitContext) {
        const toolsDescription = mcpTools.length > 0
            ? `\nHerramientas MCP disponibles: ${mcpTools.join(', ')}`
            : '';

        const cuitInfo = cuitContext
            ? `\nCUIT en contexto: ${cuitContext.cuit} - ${cuitContext.businessName || 'N/A'}`
            : '';

        return `Eres un especialista en compliance fiscal argentino integrado con un sistema MCP de monitoreo AFIP.

CONTEXTO:
- Especialista en normativas AFIP y obligaciones fiscales argentinas
- Integrado con sistema Model Context Protocol (MCP) para verificaciones automáticas
- Enfoque en compliance, alertas y recomendaciones proactivas
- Respuestas precisas, accionables y en español argentino${toolsDescription}${cuitInfo}

INSTRUCCIONES:
1. Analiza consultas sobre compliance fiscal con expertise argentino
2. Proporciona respuestas estructuradas y accionables
3. Sugiere uso de herramientas MCP cuando sea relevante
4. Incluye niveles de severidad en alertas (crítica, alta, media, baja)
5. Menciona normativas AFIP específicas cuando corresponda
6. Mantén tono profesional pero accesible

FORMATO DE RESPUESTA:
- Respuesta directa y clara
- Recomendaciones accionables
- Herramientas MCP sugeridas (si aplica)
- Nivel de prioridad/severidad`;
    }

    // Construir prompt específico para compliance
    buildCompliancePrompt(userPrompt, cuitContext) {
        let prompt = `Consulta sobre compliance fiscal: ${userPrompt}`;

        if (cuitContext) {
            prompt += `\n\nContexto adicional:
- CUIT: ${cuitContext.cuit}
- Razón Social: ${cuitContext.businessName || 'No especificada'}
- Estado Fiscal: ${cuitContext.fiscalStatus || 'No verificado'}
- Última verificación: ${cuitContext.lastCheck || 'Nunca'}`;
        }

        return prompt;
    }

    // Procesar respuesta de Groq para extraer información estructurada
    processComplianceResponse(response, originalPrompt) {
        const content = response.choices[0]?.message?.content || '';

        // Intentar extraer información estructurada
        const mcpSuggestions = this.extractMCPSuggestions(content);
        const severityLevel = this.extractSeverityLevel(content);
        const actionItems = this.extractActionItems(content);

        return {
            success: true,
            message: content,
            structured: {
                mcpSuggestions,
                severityLevel,
                actionItems,
                hasCompliance: content.toLowerCase().includes('compliance'),
                hasAlert: content.toLowerCase().includes('alerta'),
                requiresAction: actionItems.length > 0
            },
            metadata: {
                model: this.model,
                tokensUsed: response.usage?.total_tokens,
                prompt: originalPrompt,
                timestamp: new Date().toISOString()
            }
        };
    }

    // Extraer sugerencias de herramientas MCP del texto
    extractMCPSuggestions(content) {
        const mcpTools = [
            'check_compliance',
            'get_alerts',
            'validate_fiscal',
            'setup_monitoring'
        ];

        return mcpTools.filter(tool =>
            content.toLowerCase().includes(tool.replace('_', ' ')) ||
            content.toLowerCase().includes(tool)
        );
    }

    // Extraer nivel de severidad
    extractSeverityLevel(content) {
        const text = content.toLowerCase();

        if (text.includes('crítica') || text.includes('crítico') || text.includes('urgente')) {
            return 'critical';
        } else if (text.includes('alta') || text.includes('importante')) {
            return 'high';
        } else if (text.includes('media') || text.includes('moderada')) {
            return 'medium';
        } else if (text.includes('baja') || text.includes('menor')) {
            return 'low';
        }

        return 'medium'; // Default
    }

    // Extraer elementos de acción
    extractActionItems(content) {
        const actionKeywords = [
            'debe', 'debería', 'necesita', 'requiere', 'recomiendo',
            'sugiero', 'verifique', 'controle', 'actualice'
        ];

        const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);

        return sentences.filter(sentence =>
            actionKeywords.some(keyword =>
                sentence.toLowerCase().includes(keyword)
            )
        ).map(sentence => sentence.trim());
    }

    // Respuesta de fallback en caso de error
    buildFallbackResponse(prompt, error) {
        return {
            success: false,
            message: 'El sistema de IA no está disponible temporalmente. Por favor, intente nuevamente o consulte manualmente la documentación AFIP.',
            structured: {
                mcpSuggestions: ['check_compliance'],
                severityLevel: 'medium',
                actionItems: ['Verificar manualmente el estado en AFIP'],
                hasCompliance: true,
                hasAlert: true,
                requiresAction: true
            },
            metadata: {
                model: this.model,
                error: error.message,
                fallback: true,
                timestamp: new Date().toISOString()
            }
        };
    }

    // Actualizar métricas de performance
    updateMetrics(startTime, usage) {
        const responseTime = Date.now() - startTime;
        this.metrics.lastRequestTime = Date.now();

        if (usage?.total_tokens) {
            this.metrics.totalTokensUsed += usage.total_tokens;
        }

        // Calcular promedio de tiempo de respuesta
        this.metrics.averageResponseTime = this.metrics.averageResponseTime === 0
            ? responseTime
            : (this.metrics.averageResponseTime + responseTime) / 2;
    }

    // Probar conexión con Groq
    async testConnection() {
        try {
            const response = await this.groq.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "user",
                        content: "Responde solo 'OK' para confirmar conexión."
                    }
                ],
                max_tokens: 10,
                temperature: 0
            });

            return response.choices[0]?.message?.content?.includes('OK');
        } catch (error) {
            this.logger.error('Test de conexión Groq falló:', error);
            throw error;
        }
    }

    // Obtener métricas de uso
    getMetrics() {
        return {
            ...this.metrics,
            isInitialized: this.isInitialized,
            model: this.model,
            successRate: this.metrics.requestCount > 0
                ? (this.metrics.successCount / this.metrics.requestCount) * 100
                : 0,
            averageCostPerRequest: this.calculateAverageCost()
        };
    }

    // Calcular costo promedio (aproximado para Llama 3.1 70B)
    calculateAverageCost() {
        if (this.metrics.requestCount === 0) return 0;

        // Precios Groq Llama 3.1 70B: $0.59 input, $0.79 output por millón de tokens
        const avgTokensPerRequest = this.metrics.totalTokensUsed / this.metrics.requestCount;
        const estimatedInputTokens = avgTokensPerRequest * 0.3; // ~30% input
        const estimatedOutputTokens = avgTokensPerRequest * 0.7; // ~70% output

        const inputCost = (estimatedInputTokens / 1000000) * 0.59;
        const outputCost = (estimatedOutputTokens / 1000000) * 0.79;

        return inputCost + outputCost;
    }

    // Limpiar recursos
    async destroy() {
        try {
            this.removeAllListeners();
            this.isInitialized = false;
            this.logger.info('GroqClient destruido');
        } catch (error) {
            this.logger.error('Error destruyendo GroqClient:', error);
        }
    }
}