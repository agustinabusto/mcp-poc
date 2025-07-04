import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, AlertCircle, CheckCircle, Clock, Building, Zap, Brain, Loader2, TrendingUp } from 'lucide-react';

const GroqChatComponent = ({ config, selectedCuit, onMCPToolSuggestion }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [groqStatus, setGroqStatus] = useState({ status: 'disconnected', metrics: {} });
    const [complianceData, setComplianceData] = useState(null);
    const messagesEndRef = useRef(null);

    // Mensajes predefinidos específicos para AFIP
    const quickPrompts = [
        "¿Cuál es el estado de compliance del CUIT " + (selectedCuit || "20-12345678-9") + "?",
        "Muéstrame las alertas críticas de hoy para mis CUITs monitoreados",
        "¿Qué verificaciones de AFIP debería hacer este mes?",
        "Configura monitoreo automático para detectar cambios en regímenes fiscales",
        "Analiza el riesgo de incumplimiento fiscal para mi cartera de clientes",
        "¿Hay actualizaciones normativas de AFIP que afecten a mis contribuyentes?"
    ];

    // Scroll automático al final de mensajes
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Obtener estado de Groq
    const checkGroqStatus = useCallback(async () => {
        try {
            const response = await fetch(`${config.apiBaseUrl}/api/groq/status`);
            const data = await response.json();
            setGroqStatus(data);
        } catch (error) {
            console.error('Error obteniendo estado Groq:', error);
            setGroqStatus({ status: 'error', metrics: {} });
        }
    }, [config.apiBaseUrl]);

    // Verificar estado al inicializar
    useEffect(() => {
        checkGroqStatus();
        const interval = setInterval(checkGroqStatus, 30000); // Cada 30s
        return () => clearInterval(interval);
    }, [checkGroqStatus]);

    // Llamada principal a Groq
    const callGroqChat = async (prompt) => {
        setIsLoading(true);

        try {
            const response = await fetch(`${config.apiBaseUrl}/api/groq/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,
                    cuit: selectedCuit,
                    includeContext: true,
                    mcpTools: [
                        'check_compliance',
                        'get_alerts',
                        'validate_fiscal',
                        'setup_monitoring'
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Error llamando a Groq:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Manejar envío de mensaje
    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputMessage,
            timestamp: new Date(),
            cuit: selectedCuit
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');

        try {
            const response = await callGroqChat(inputMessage);

            const groqMessage = {
                id: Date.now() + 1,
                type: 'groq',
                content: response.data.response,
                structured: response.data.structured,
                mcpSuggestions: response.data.mcpSuggestions,
                severityLevel: response.data.severityLevel,
                actionItems: response.data.actionItems,
                metadata: response.data.metadata,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, groqMessage]);

            // Actualizar datos de compliance si están disponibles
            if (response.data.cuitContext) {
                setComplianceData(response.data.cuitContext);
            }

            // Notificar sugerencias de herramientas MCP al componente padre
            if (response.data.mcpSuggestions.length > 0 && onMCPToolSuggestion) {
                onMCPToolSuggestion(response.data.mcpSuggestions);
            }

        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1,
                type: 'error',
                content: `Error: ${error.message}. Verifique su conexión e intente nuevamente.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    // Obtener ícono de estado
    const getStatusIcon = (status) => {
        switch (status) {
            case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'disconnected': return <Clock className="w-4 h-4 text-yellow-500" />;
            default: return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    // Obtener color de severidad
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'text-red-600 bg-red-50 border-red-200';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 bg-white dark:bg-gray-900 min-h-screen">
            {/* Header con estado de Groq */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Brain className="w-6 h-6 text-purple-600" />
                        AFIP Monitor + Groq AI
                    </h1>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                        {getStatusIcon(groqStatus.status)}
                        <span className="text-sm font-medium">
                            {groqStatus.status === 'connected' ? 'Llama 3.1 Conectado' : 'Desconectado'}
                        </span>
                    </div>
                </div>

                <p className="text-gray-600 dark:text-gray-400">
                    Consulta sobre compliance fiscal usando Groq + Llama 3.1 (Ultrarrápido ⚡)
                </p>

                {/* Métricas de Groq */}
                {groqStatus.metrics && groqStatus.status === 'connected' && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                            <div className="text-purple-600 dark:text-purple-400 font-medium">Requests</div>
                            <div className="font-bold">{groqStatus.metrics.requestCount || 0}</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            <div className="text-green-600 dark:text-green-400 font-medium">Éxito</div>
                            <div className="font-bold">{Math.round(groqStatus.metrics.successRate || 0)}%</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                            <div className="text-blue-600 dark:text-blue-400 font-medium">Tokens</div>
                            <div className="font-bold">{groqStatus.metrics.totalTokensUsed || 0}</div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                            <div className="text-yellow-600 dark:text-yellow-400 font-medium">Resp. Avg</div>
                            <div className="font-bold">{Math.round(groqStatus.metrics.averageResponseTime || 0)}ms</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Estado de Compliance Actual */}
            {complianceData && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Contexto CUIT: {complianceData.cuit}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600 dark:text-gray-400">Razón Social:</span>
                            <div className="font-medium">{complianceData.businessName || 'No disponible'}</div>
                        </div>
                        <div>
                            <span className="text-gray-600 dark:text-gray-400">Estado Fiscal:</span>
                            <div className="font-medium">{complianceData.fiscalStatus || 'No verificado'}</div>
                        </div>
                        <div>
                            <span className="text-gray-600 dark:text-gray-400">Última Verificación:</span>
                            <div className="font-medium">{complianceData.lastCheck || 'Nunca'}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Consultas Rápidas */}
            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Consultas rápidas especializadas:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {quickPrompts.map((prompt, index) => (
                        <button
                            key={index}
                            onClick={() => setInputMessage(prompt)}
                            className="p-3 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors border border-gray-200 dark:border-gray-700"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Messages */}
            <div className="mb-6 space-y-4 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Haz una consulta sobre compliance fiscal para comenzar</p>
                        <p className="text-xs mt-2">Powered by Groq + Llama 3.1 (280 tokens/segundo ⚡)</p>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${message.type === 'user'
                                    ? 'bg-purple-600 text-white'
                                    : message.type === 'error'
                                        ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                            {/* Información estructurada de Groq */}
                            {message.structured && (
                                <div className="mt-3 space-y-2">
                                    {/* Nivel de severidad */}
                                    {message.severityLevel && (
                                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(message.severityLevel)}`}>
                                            Severidad: {message.severityLevel}
                                        </div>
                                    )}

                                    {/* Herramientas MCP sugeridas */}
                                    {message.mcpSuggestions && message.mcpSuggestions.length > 0 && (
                                        <div className="bg-white/10 rounded p-2">
                                            <div className="text-xs font-medium mb-1">🛠️ MCP Tools Sugeridas:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {message.mcpSuggestions.map((tool, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
                                                        {tool}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Elementos de acción */}
                                    {message.actionItems && message.actionItems.length > 0 && (
                                        <div className="bg-white/10 rounded p-2">
                                            <div className="text-xs font-medium mb-1">✅ Acciones Recomendadas:</div>
                                            <ul className="text-xs space-y-1">
                                                {message.actionItems.slice(0, 3).map((action, idx) => (
                                                    <li key={idx} className="flex items-start gap-1">
                                                        <span className="text-green-400">•</span>
                                                        <span>{action}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                                <span>{message.timestamp.toLocaleTimeString()}</span>
                                {message.metadata && (
                                    <div className="flex items-center gap-2">
                                        {message.metadata.tokensUsed && (
                                            <span className="flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" />
                                                {message.metadata.tokensUsed} tokens
                                            </span>
                                        )}
                                        {message.type === 'groq' && (
                                            <span className="bg-purple-500/20 px-1 rounded text-purple-300">
                                                Llama 3.1
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    Groq está procesando con Llama 3.1...
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                ⚡ Velocidad: ~280 tokens/segundo
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="space-y-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder="Pregunta sobre compliance fiscal argentino..."
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                        disabled={isLoading || groqStatus.status !== 'connected'}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !inputMessage.trim() || groqStatus.status !== 'connected'}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Enviar
                    </button>
                </div>

                {/* Status y info */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            {getStatusIcon(groqStatus.status)}
                            <span>
                                {groqStatus.status === 'connected'
                                    ? 'Conectado a Groq'
                                    : 'Desconectado'}
                            </span>
                        </div>
                        {selectedCuit && (
                            <div className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                <span>CUIT: {selectedCuit}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                            Llama 3.1 70B
                        </span>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                            280 tok/s
                        </span>
                    </div>
                </div>
            </div>

            {/* MCP Tools Status */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        🛠️ Herramientas MCP Disponibles
                    </h4>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        4 activas
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                        { name: 'check_compliance', desc: 'Verificar compliance', active: true },
                        { name: 'get_alerts', desc: 'Obtener alertas', active: true },
                        { name: 'validate_fiscal', desc: 'Validar fiscal', active: true },
                        { name: 'setup_monitoring', desc: 'Configurar monitoreo', active: true }
                    ].map((tool) => (
                        <div
                            key={tool.name}
                            className={`p-2 rounded text-xs border ${tool.active
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                                    : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            <div className="font-medium">{tool.name}</div>
                            <div className="opacity-75">{tool.desc}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    💡 Las herramientas MCP se sugieren automáticamente según el contexto de tu consulta
                </div>
            </div>
        </div>
    );
};

export default GroqChatComponent;