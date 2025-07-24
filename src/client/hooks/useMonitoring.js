// src/client/hooks/useMonitoring.js - VERSIÓN COMPLETA REORGANIZADA
import { useState, useEffect, useCallback, useRef } from 'react';

export const useMonitoring = () => {
    const [monitoringData, setMonitoringData] = useState({
        metrics: {},
        status: 'disconnected',
        lastUpdate: null,
        errors: [],
        alerts: []
    });
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

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

    // ✅ 1. PRIMERO: handleMonitoringMessage (debe estar ANTES de connect)
    const handleMonitoringMessage = useCallback((data) => {
        console.log('📨 WebSocket message received:', data);

        try {
            switch (data.type) {
                case 'welcome':
                    console.log('👋 Welcome message:', data.message);
                    setMonitoringData(prev => ({
                        ...prev,
                        status: 'connected',
                        lastUpdate: new Date().toISOString(),
                        metrics: {
                            ...prev.metrics,
                            server_status: 'connected',
                            groq_enabled: data.groqEnabled,
                            email_notifications: data.emailNotifications,
                            client_id: data.clientId,
                            server_info: data.serverInfo
                        }
                    }));
                    break;

                case 'alert':
                    console.log('🚨 Alert received:', data.data);
                    if (data.data) {
                        setMonitoringData(prev => ({
                            ...prev,
                            alerts: [data.data, ...prev.alerts.slice(0, 19)], // Mantener últimas 20 alertas
                            lastUpdate: new Date().toISOString()
                        }));
                    }
                    break;

                case 'metrics':
                case 'metrics_update':
                    console.log('📊 Metrics update:', data.data);
                    if (data.data) {
                        setMonitoringData(prev => ({
                            ...prev,
                            metrics: { ...prev.metrics, ...data.data },
                            lastUpdate: new Date().toISOString()
                        }));
                    }
                    break;

                case 'new_alert':
                    console.log('🆕 New alert:', data.data);
                    if (data.data) {
                        setMonitoringData(prev => ({
                            ...prev,
                            alerts: [data.data, ...prev.alerts.slice(0, 19)],
                            lastUpdate: new Date().toISOString()
                        }));
                    }
                    break;

                case 'status_update':
                    console.log('🔄 Status update:', data.data);
                    if (data.data) {
                        setMonitoringData(prev => ({
                            ...prev,
                            status: data.data.status || prev.status,
                            metrics: { ...prev.metrics, ...data.data },
                            lastUpdate: new Date().toISOString()
                        }));
                    }
                    break;

                case 'subscription_confirmed':
                    console.log('✅ Subscription confirmed:', data.channels);
                    break;

                case 'pong':
                    console.log('🏓 Pong received');
                    break;

                case 'error':
                    console.error('❌ Server error:', data.message);
                    setMonitoringData(prev => ({
                        ...prev,
                        errors: [...prev.errors.slice(-9), {
                            timestamp: new Date().toISOString(),
                            message: `Server error: ${data.message}`,
                            type: 'server_error'
                        }]
                    }));
                    break;

                case 'server_shutdown':
                    console.warn('⚠️ Server shutting down:', data.message);
                    setIsConnected(false);
                    setMonitoringData(prev => ({
                        ...prev,
                        status: 'server_shutdown',
                        errors: [...prev.errors.slice(-9), {
                            timestamp: new Date().toISOString(),
                            message: data.message,
                            type: 'server_shutdown'
                        }]
                    }));
                    break;

                default:
                    console.log('❓ Unknown message type:', data.type, data);
                    break;
            }
        } catch (error) {
            console.error('❌ Error handling WebSocket message:', error);
            setMonitoringData(prev => ({
                ...prev,
                errors: [...prev.errors.slice(-9), {
                    timestamp: new Date().toISOString(),
                    message: `Error handling message: ${error.message}`,
                    type: 'message_handling'
                }]
            }));
        }
    }, []);

    // ✅ 2. DESPUÉS: connect (usa handleMonitoringMessage)
    const connect = useCallback(() => {
        console.log("🔌 Intentando conectar WebSocket...");

        try {
            const { ws: wsUrl } = getServerUrl();
            console.log(`🌐 Conectando a: ${wsUrl}`);

            // Verificar si ya hay una conexión activa
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log("✅ WebSocket ya conectado");
                return;
            }

            // Limpiar conexión existente si está en estado inválido
            if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
                console.log("🧹 Limpiando conexión WebSocket anterior");
                wsRef.current.close();
                wsRef.current = null;
            }

            // Crear nueva conexión
            wsRef.current = new WebSocket(wsUrl);

            // Configurar timeouts
            const connectionTimeout = setTimeout(() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
                    console.error('⏰ Timeout de conexión WebSocket');
                    wsRef.current.close();
                }
            }, 10000); // 10 segundos timeout

            wsRef.current.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log('✅ Monitoring WebSocket connected to server');
                setIsConnected(true);
                setMonitoringData(prev => ({
                    ...prev,
                    status: 'connected',
                    lastUpdate: new Date().toISOString(),
                    errors: prev.errors.filter(e => e.type !== 'connection') // Limpiar errores de conexión
                }));
                reconnectAttempts.current = 0;

                // Limpiar timeout de reconexión si existe
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }

                // Enviar mensaje de subscripción
                try {
                    wsRef.current.send(JSON.stringify({
                        type: 'subscribe',
                        channels: ['alerts', 'metrics', 'status'],
                        timestamp: new Date().toISOString()
                    }));
                    console.log('📡 Suscripción enviada al servidor');
                } catch (error) {
                    console.error('❌ Error enviando suscripción:', error);
                }
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleMonitoringMessage(data); // ✅ AHORA SÍ está definida
                } catch (err) {
                    console.error('❌ Error parsing monitoring message:', err);
                    console.log('📦 Raw message:', event.data);

                    setMonitoringData(prev => ({
                        ...prev,
                        errors: [...prev.errors.slice(-9), {
                            timestamp: new Date().toISOString(),
                            message: `Error parsing WebSocket message: ${err.message}`,
                            type: 'parsing'
                        }]
                    }));
                }
            };

            wsRef.current.onclose = (event) => {
                clearTimeout(connectionTimeout);
                console.log(`🔌 Monitoring WebSocket disconnected - Code: ${event.code}, Reason: ${event.reason}`);
                setIsConnected(false);
                setMonitoringData(prev => ({ ...prev, status: 'disconnected' }));

                // Determinar si debe reconectar basado en el código de cierre
                const shouldReconnect = event.code !== 1000 && event.code !== 1001; // No reconectar si es cierre normal

                if (shouldReconnect && reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                    console.log(`🔄 Reintentando conexión en ${delay}ms (intento ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        connect();
                    }, delay);
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    console.log('❌ Máximo de intentos de reconexión alcanzado');
                    setMonitoringData(prev => ({
                        ...prev,
                        errors: [...prev.errors.slice(-9), {
                            timestamp: new Date().toISOString(),
                            message: 'Máximo de intentos de reconexión alcanzado',
                            type: 'connection'
                        }]
                    }));
                }
            };

            wsRef.current.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('❌ Monitoring WebSocket error:', error);

                // Agregar información más detallada del error
                let errorMessage = 'WebSocket connection error';

                if (error.target) {
                    errorMessage += ` - ReadyState: ${error.target.readyState}`;

                    switch (error.target.readyState) {
                        case WebSocket.CONNECTING:
                            errorMessage += ' (Connecting)';
                            break;
                        case WebSocket.OPEN:
                            errorMessage += ' (Open)';
                            break;
                        case WebSocket.CLOSING:
                            errorMessage += ' (Closing)';
                            break;
                        case WebSocket.CLOSED:
                            errorMessage += ' (Closed)';
                            break;
                    }
                }

                setMonitoringData(prev => ({
                    ...prev,
                    errors: [...prev.errors.slice(-9), {
                        timestamp: new Date().toISOString(),
                        message: errorMessage,
                        type: 'connection',
                        details: {
                            url: wsUrl,
                            readyState: error.target?.readyState,
                            attempt: reconnectAttempts.current + 1
                        }
                    }]
                }));
            };

        } catch (err) {
            console.error('❌ Error creating WebSocket connection:', err);
            setMonitoringData(prev => ({
                ...prev,
                errors: [...prev.errors.slice(-9), {
                    timestamp: new Date().toISOString(),
                    message: `Error creating WebSocket: ${err.message}`,
                    type: 'initialization'
                }]
            }));
        }
    }, [getServerUrl, handleMonitoringMessage]);

    // ✅ 3. RESTO DE FUNCIONES en orden normal
    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        setIsConnected(false);
        reconnectAttempts.current = 0;
    }, []);

    // Función para obtener métricas usando endpoint real
    const getMetrics = useCallback(async () => {
        if (loading) return {};

        setLoading(true);
        try {
            const { http } = getServerUrl();
            const response = await fetch(`${http}/api/status`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Transformar datos del servidor al formato esperado
            const metrics = {
                server_status: data.status,
                afip_mode: data.afipMode,
                groq_enabled: data.groqEnabled,
                uptime: data.uptime,
                memory_usage: data.memory ? {
                    rss: data.memory.rss,
                    heapUsed: data.memory.heapUsed,
                    heapTotal: data.memory.heapTotal
                } : null,
                timestamp: data.timestamp
            };

            setMonitoringData(prev => ({
                ...prev,
                metrics: { ...prev.metrics, ...metrics },
                lastUpdate: new Date().toISOString()
            }));

            return metrics;
        } catch (err) {
            console.error('❌ Error fetching metrics:', err);

            // Agregar error pero no lanzar excepción para no romper la UI
            setMonitoringData(prev => ({
                ...prev,
                errors: [...prev.errors.slice(-9), {
                    timestamp: new Date().toISOString(),
                    message: `Error fetching metrics: ${err.message}`,
                    type: 'api_error'
                }]
            }));

            return {};
        } finally {
            setLoading(false);
        }
    }, [getServerUrl, loading]);

    // Función para obtener estado del sistema usando endpoint real
    const getSystemStatus = useCallback(async () => {
        try {
            const { http } = getServerUrl();
            const response = await fetch(`${http}/health`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            setMonitoringData(prev => ({
                ...prev,
                status: data.status || 'unknown',
                lastUpdate: new Date().toISOString(),
                metrics: {
                    ...prev.metrics,
                    health_status: data.status,
                    services: data.services
                }
            }));

            return data;
        } catch (err) {
            console.error('❌ Error fetching system status:', err);

            // Agregar error pero no lanzar excepción
            setMonitoringData(prev => ({
                ...prev,
                errors: [...prev.errors.slice(-9), {
                    timestamp: new Date().toISOString(),
                    message: `Error fetching system status: ${err.message}`,
                    type: 'api_error'
                }]
            }));

            return { status: 'error', error: err.message };
        }
    }, [getServerUrl]);

    // ✅ Función para obtener alertas usando endpoint real
    const getAlerts = useCallback(async () => {
        try {
            const { http } = getServerUrl();
            const response = await fetch(`${http}/api/alerts`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // El endpoint devuelve { success: true, data: [...], total: ... }
            const alerts = data.success ? data.data : [];

            setMonitoringData(prev => ({
                ...prev,
                alerts: alerts,
                lastUpdate: new Date().toISOString()
            }));

            console.log(`✅ Alertas obtenidas: ${alerts.length} alertas`);
            return alerts;

        } catch (err) {
            console.error('❌ Error fetching alerts:', err);

            // Agregar error pero no lanzar excepción
            setMonitoringData(prev => ({
                ...prev,
                errors: [...prev.errors.slice(-9), {
                    timestamp: new Date().toISOString(),
                    message: `Error fetching alerts: ${err.message}`,
                    type: 'api_error'
                }]
            }));

            return [];
        }
    }, [getServerUrl]);

    // ✅ Función refreshAlerts
    const refreshAlerts = useCallback(async () => {
        console.log('🔄 Refreshing alerts...');
        return await getAlerts();
    }, [getAlerts]);

    // Función para obtener métricas AFIP específicas
    const getAfipMetrics = useCallback(async () => {
        try {
            const { http } = getServerUrl();
            const response = await fetch(`${http}/api/status`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Extraer métricas específicas de AFIP
            const afipMetrics = {
                connection_status: data.afipClient?.connectionStatus || 'unknown',
                mock_mode: data.afipMode === 'MOCK',
                response_time: data.afipClient?.metrics?.averageResponseTime || 0,
                requests_count: data.afipClient?.metrics?.totalRequests || 0,
                errors_count: data.afipClient?.metrics?.totalErrors || 0,
                last_check: data.timestamp
            };

            setMonitoringData(prev => ({
                ...prev,
                metrics: { ...prev.metrics, afip: afipMetrics },
                lastUpdate: new Date().toISOString()
            }));

            return afipMetrics;
        } catch (err) {
            console.error('❌ Error fetching AFIP metrics:', err);
            return {};
        }
    }, [getServerUrl]);

    // Función para limpiar errores
    const clearErrors = useCallback(() => {
        setMonitoringData(prev => ({
            ...prev,
            errors: []
        }));
    }, []);

    // Función para limpiar alertas
    const clearAlerts = useCallback(() => {
        setMonitoringData(prev => ({
            ...prev,
            alerts: []
        }));
    }, []);

    // Función para generar métricas mock (para desarrollo)
    const generateMockMetrics = useCallback(() => {
        const mockMetrics = {
            server_status: 'running',
            uptime: Math.floor(Math.random() * 86400), // 0-24 horas
            cpu_usage: Math.floor(Math.random() * 100),
            memory_usage: {
                rss: Math.floor(Math.random() * 1000000000), // ~1GB
                heapUsed: Math.floor(Math.random() * 500000000), // ~500MB
                heapTotal: Math.floor(Math.random() * 600000000) // ~600MB
            },
            active_connections: Math.floor(Math.random() * 50),
            requests_per_minute: Math.floor(Math.random() * 1000),
            timestamp: new Date().toISOString()
        };

        setMonitoringData(prev => ({
            ...prev,
            metrics: { ...prev.metrics, ...mockMetrics },
            lastUpdate: new Date().toISOString()
        }));

        return mockMetrics;
    }, []);

    // Función para enviar ping manual
    const sendPing = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                wsRef.current.send(JSON.stringify({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                }));
                console.log('🏓 Ping enviado al servidor');
            } catch (error) {
                console.error('❌ Error enviando ping:', error);
            }
        }
    }, []);

    // Inicialización del hook
    useEffect(() => {
        console.log('🚀 Inicializando useMonitoring...');

        // Obtener datos iniciales
        getMetrics().catch(console.error);
        getAlerts().catch(console.error);

        // Intentar conectar WebSocket
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect, getMetrics, getAlerts]);

    // Polling de métricas cada 30 segundos como fallback
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isConnected) {
                console.log('🔄 Polling metrics (WebSocket disconnected)');
                getMetrics().catch(console.error);
                getAlerts().catch(console.error);
            } else {
                // Si WebSocket está conectado, generar métricas mock ocasionalmente
                generateMockMetrics();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [isConnected, getMetrics, getAlerts, generateMockMetrics]);

    return {
        // State
        monitoringData,
        isConnected,
        loading,

        // Actions
        connect,
        disconnect,

        // API functions
        getMetrics,
        getSystemStatus,
        getAfipMetrics,
        getAlerts,
        refreshAlerts,

        // Utility functions
        clearErrors,
        clearAlerts,
        generateMockMetrics,
        sendPing
    };
};