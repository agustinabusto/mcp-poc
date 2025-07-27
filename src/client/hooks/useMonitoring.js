import { useState, useCallback, useRef, useEffect } from 'react';

export const useMonitoring = () => {
    // Detectar el puerto correcto basado en el entorno
    const getServerUrl = useCallback(() => {
        // En desarrollo, el servidor está en 8080
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return {
                http: 'http://localhost:8080',
                ws: 'ws://localhost:8080'
            };
        }
        // En producción, usar el mismo host
        return {
            http: `${window.location.protocol}//${window.location.host}`,
            ws: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
        };
    }, []);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [monitoringData, setMonitoringData] = useState({
        status: 'disconnected',
        alerts: [],
        metrics: {},
        errors: [],
        lastUpdate: null
    });

    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const connectionTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const isConnectingRef = useRef(false);
    const maxReconnectAttempts = 5;

    // ✅ Función para validar URL del WebSocket
    const validateWebSocketUrl = useCallback((url) => {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:';
        } catch {
            return false;
        }
    }, []);

    // ✅ Función para limpiar timeouts
    const clearAllTimeouts = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
        }
    }, []);

    // ✅ Función para registrar errores con más detalle
    const logError = useCallback((message, type = 'general', details = {}) => {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message,
            type,
            details
        };

        console.error(`❌ [${type.toUpperCase()}]`, message, details);

        setMonitoringData(prev => ({
            ...prev,
            errors: [...prev.errors.slice(-9), errorEntry]
        }));
    }, []);

    // ✅ Manejo mejorado de mensajes WebSocket
    const handleMonitoringMessage = useCallback((data) => {
        try {
            console.log('📨 Monitoring message received:', data.type);

            switch (data.type) {
                case 'alert':
                    console.log('🚨 New alert:', data.message);
                    setMonitoringData(prev => ({
                        ...prev,
                        alerts: [...prev.alerts.slice(-19), {
                            id: data.id || Date.now(),
                            timestamp: data.timestamp || new Date().toISOString(),
                            message: data.message,
                            level: data.level || 'info',
                            category: data.category || 'general'
                        }],
                        lastUpdate: new Date().toISOString()
                    }));
                    break;

                case 'metrics':
                    console.log('📊 Metrics update:', data.data);
                    setMonitoringData(prev => ({
                        ...prev,
                        metrics: { ...prev.metrics, ...data.data },
                        lastUpdate: new Date().toISOString()
                    }));
                    break;

                case 'status':
                    console.log('📍 Status update:', data.status);
                    setMonitoringData(prev => ({
                        ...prev,
                        status: data.status,
                        lastUpdate: new Date().toISOString()
                    }));
                    break;

                case 'pong':
                    console.log('🏓 Pong received - connection alive');
                    break;

                case 'error':
                    logError(`Server error: ${data.message}`, 'server_error', data);
                    break;

                case 'server_shutdown':
                    console.warn('⚠️ Server shutting down:', data.message);
                    setIsConnected(false);
                    setMonitoringData(prev => ({
                        ...prev,
                        status: 'server_shutdown'
                    }));
                    logError(data.message, 'server_shutdown');
                    break;

                default:
                    console.log('❓ Unknown message type:', data.type, data);
                    break;
            }
        } catch (error) {
            logError(`Error handling WebSocket message: ${error.message}`, 'message_handling', {
                originalData: data,
                error: error.message
            });
        }
    }, [logError]);

    // ✅ Función de conexión mejorada
    const connect = useCallback(() => {
        // Evitar conexiones concurrentes
        if (isConnectingRef.current) {
            console.log('🔄 Conexión ya en progreso, omitiendo...');
            return;
        }

        console.log("🔌 Intentando conectar WebSocket...");
        isConnectingRef.current = true;

        try {
            const serverUrls = getServerUrl();
            if (!serverUrls || !serverUrls.ws) {
                throw new Error('URL del servidor WebSocket no disponible');
            }

            const wsUrl = serverUrls.ws;
            console.log(`🌐 Conectando a: ${wsUrl}`);

            // Validar URL
            if (!validateWebSocketUrl(wsUrl)) {
                throw new Error(`URL de WebSocket inválida: ${wsUrl}`);
            }

            // Limpiar conexión existente
            if (wsRef.current) {
                if (wsRef.current.readyState === WebSocket.OPEN) {
                    console.log("✅ WebSocket ya conectado");
                    isConnectingRef.current = false;
                    return;
                }

                console.log("🧹 Limpiando conexión WebSocket anterior");
                wsRef.current.close();
                wsRef.current = null;
            }

            // Limpiar timeouts previos
            clearAllTimeouts();

            // Crear nueva conexión
            wsRef.current = new WebSocket(wsUrl);

            // Timeout de conexión
            connectionTimeoutRef.current = setTimeout(() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
                    console.error('⏰ Timeout de conexión WebSocket');
                    wsRef.current.close();
                    logError('Timeout de conexión WebSocket', 'connection_timeout', {
                        url: wsUrl,
                        timeout: 10000
                    });
                }
                isConnectingRef.current = false;
            }, 10000);

            // ✅ Manejo de eventos mejorado
            wsRef.current.onopen = () => {
                console.log('✅ Monitoring WebSocket connected to server');
                clearAllTimeouts();
                isConnectingRef.current = false;

                setIsConnected(true);
                setMonitoringData(prev => ({
                    ...prev,
                    status: 'connected',
                    lastUpdate: new Date().toISOString(),
                    errors: prev.errors.filter(e =>
                        !['connection', 'connection_timeout', 'initialization'].includes(e.type)
                    )
                }));

                reconnectAttempts.current = 0;

                // Enviar suscripción
                try {
                    const subscriptionMessage = {
                        type: 'subscribe',
                        channels: ['alerts', 'metrics', 'status'],
                        timestamp: new Date().toISOString(),
                        clientId: `client_${Date.now()}`
                    };

                    wsRef.current.send(JSON.stringify(subscriptionMessage));
                    console.log('📡 Suscripción enviada al servidor');
                } catch (error) {
                    logError(`Error enviando suscripción: ${error.message}`, 'subscription_error');
                }
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleMonitoringMessage(data);
                } catch (err) {
                    logError(`Error parsing WebSocket message: ${err.message}`, 'parsing', {
                        rawMessage: event.data,
                        error: err.message
                    });
                }
            };

            wsRef.current.onclose = (event) => {
                console.log(`🔌 WebSocket disconnected - Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
                clearAllTimeouts();
                isConnectingRef.current = false;
                setIsConnected(false);
                setMonitoringData(prev => ({ ...prev, status: 'disconnected' }));

                // Mapeo de códigos de cierre
                const closeReasons = {
                    1000: 'Normal closure',
                    1001: 'Going away',
                    1002: 'Protocol error',
                    1003: 'Unsupported data',
                    1006: 'Abnormal closure',
                    1011: 'Server error',
                    1012: 'Service restart'
                };

                const closeReason = closeReasons[event.code] || `Unknown code: ${event.code}`;
                console.log(`📋 Close reason: ${closeReason}`);

                // Determinar si debe reconectar
                const noReconnectCodes = [1000, 1001, 1002, 1003]; // Cierres normales o errores de protocolo
                const shouldReconnect = !noReconnectCodes.includes(event.code) &&
                    reconnectAttempts.current < maxReconnectAttempts;

                if (shouldReconnect) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                    console.log(`🔄 Reintentando conexión en ${delay}ms (intento ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        connect();
                    }, delay);
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    logError('Máximo de intentos de reconexión alcanzado', 'max_reconnect_attempts', {
                        attempts: reconnectAttempts.current,
                        maxAttempts: maxReconnectAttempts
                    });
                }
            };

            // ✅ Manejo mejorado de errores
            wsRef.current.onerror = (error) => {
                console.error('❌ WebSocket error event:', error);
                clearAllTimeouts();
                isConnectingRef.current = false;

                // Obtener información detallada del error
                const errorDetails = {
                    url: wsUrl,
                    readyState: wsRef.current?.readyState,
                    attempt: reconnectAttempts.current + 1,
                    timestamp: new Date().toISOString()
                };

                let errorMessage = 'WebSocket connection error';

                if (wsRef.current) {
                    const readyStateMap = {
                        [WebSocket.CONNECTING]: 'CONNECTING',
                        [WebSocket.OPEN]: 'OPEN',
                        [WebSocket.CLOSING]: 'CLOSING',
                        [WebSocket.CLOSED]: 'CLOSED'
                    };

                    const readyStateStr = readyStateMap[wsRef.current.readyState] || 'UNKNOWN';
                    errorMessage += ` - State: ${readyStateStr}`;
                    errorDetails.readyStateStr = readyStateStr;
                }

                // Intentar determinar el tipo de error
                if (wsUrl.includes('localhost') || wsUrl.includes('127.0.0.1')) {
                    errorMessage += ' (Servidor local no disponible)';
                    errorDetails.errorType = 'local_server_unavailable';
                } else if (!navigator.onLine) {
                    errorMessage += ' (Sin conexión a internet)';
                    errorDetails.errorType = 'network_offline';
                } else {
                    errorDetails.errorType = 'connection_failed';
                }

                logError(errorMessage, 'connection', errorDetails);
            };

        } catch (err) {
            console.error('❌ Error creating WebSocket connection:', err);
            isConnectingRef.current = false;
            logError(`Error creating WebSocket: ${err.message}`, 'initialization', {
                error: err.message,
                stack: err.stack
            });
        }
    }, [getServerUrl, validateWebSocketUrl, clearAllTimeouts, handleMonitoringMessage, logError]);

    // ✅ Función de desconexión
    const disconnect = useCallback(() => {
        console.log('🔌 Desconectando WebSocket...');
        isConnectingRef.current = false;

        if (wsRef.current) {
            // Enviar mensaje de desconexión si es posible
            if (wsRef.current.readyState === WebSocket.OPEN) {
                try {
                    wsRef.current.send(JSON.stringify({
                        type: 'disconnect',
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    console.warn('⚠️ Error enviando mensaje de desconexión:', error);
                }
            }

            wsRef.current.close(1000, 'Client disconnecting');
            wsRef.current = null;
        }

        clearAllTimeouts();
        setIsConnected(false);
        reconnectAttempts.current = 0;

        setMonitoringData(prev => ({
            ...prev,
            status: 'disconnected'
        }));
    }, [clearAllTimeouts]);

    // ✅ Función mejorada para obtener métricas
    const getMetrics = useCallback(async () => {
        if (loading) return {};

        setLoading(true);
        try {
            const serverUrls = getServerUrl();
            if (!serverUrls || !serverUrls.http) {
                throw new Error('URL del servidor HTTP no disponible');
            }

            const response = await fetch(`${serverUrls.http}/api/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 5000
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Transformar datos del servidor al formato esperado
            const metrics = {
                server_status: data.status || 'unknown',
                afip_mode: data.afipMode || 'unknown',
                groq_enabled: data.groqEnabled || false,
                uptime: data.uptime || 0,
                memory_usage: data.memory ?
                    `${Math.round(data.memory.used / 1024 / 1024)}MB / ${Math.round(data.memory.total / 1024 / 1024)}MB` :
                    'N/A',
                cpu_usage: data.cpu ? `${Math.round(data.cpu)}%` : 'N/A',
                connections: data.connections || 0,
                requests_per_minute: data.requestsPerMinute || 0,
                timestamp: new Date().toISOString()
            };

            setMonitoringData(prev => ({
                ...prev,
                metrics,
                lastUpdate: new Date().toISOString()
            }));

            return metrics;
        } catch (error) {
            logError(`Error fetching metrics: ${error.message}`, 'metrics_fetch', {
                error: error.message
            });
            return {};
        } finally {
            setLoading(false);
        }
    }, [getServerUrl, loading, logError]);

    // ✅ Función para enviar ping
    const sendPing = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                wsRef.current.send(JSON.stringify({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                }));
                console.log('🏓 Ping enviado');
            } catch (error) {
                logError(`Error enviando ping: ${error.message}`, 'ping_error');
            }
        }
    }, [logError]);

    // ✅ Cleanup al desmontar el componente
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        loading,
        monitoringData,
        connect,
        disconnect,
        getMetrics,
        sendPing,
        // Funciones adicionales para debugging
        getConnectionState: () => wsRef.current?.readyState,
        getReconnectAttempts: () => reconnectAttempts.current,
        clearErrors: () => setMonitoringData(prev => ({ ...prev, errors: [] }))
    };
};

// Exportar también como default para compatibilidad
export default useMonitoring;