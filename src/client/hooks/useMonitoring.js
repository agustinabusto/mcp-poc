// src/client/hooks/useMonitoring.js
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

    // Función para conectar WebSocket
    const connect = useCallback(() => {
        console.log("Conecta al socket")
        try {
            const { ws: wsUrl } = getServerUrl();

            // Tu servidor ya tiene WebSocket en la raíz, no en /ws/monitoring
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('✅ Monitoring WebSocket connected to server');
                setIsConnected(true);
                setMonitoringData(prev => ({ ...prev, status: 'connected' }));
                reconnectAttempts.current = 0;

                // Limpiar timeout de reconexión si existe
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleMonitoringMessage(data);
                } catch (err) {
                    console.error('Error parsing monitoring message:', err);
                }
            };

            wsRef.current.onclose = () => {
                console.log('🔌 Monitoring WebSocket disconnected');
                setIsConnected(false);
                setMonitoringData(prev => ({ ...prev, status: 'disconnected' }));

                // Intentar reconectar si no se ha excedido el límite
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                    console.log(`🔄 Reintentando conexión en ${delay}ms (intento ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        connect();
                    }, delay);
                } else {
                    console.log('❌ Máximo de intentos de reconexión alcanzado');
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('❌ Monitoring WebSocket error:', error);
                setMonitoringData(prev => ({
                    ...prev,
                    errors: [...prev.errors.slice(-9), { // Mantener solo últimos 10 errores
                        timestamp: new Date().toISOString(),
                        message: 'WebSocket connection error',
                        type: 'connection'
                    }]
                }));
            };
        } catch (err) {
            console.error('Error creating WebSocket connection:', err);
        }
    }, [getServerUrl]);

    // Función para desconectar
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

    // Manejar mensajes de monitoreo del servidor
    const handleMonitoringMessage = useCallback((data) => {
        console.log('📨 WebSocket message received:', data);

        switch (data.type) {
            case 'welcome':
                console.log('👋 Welcome message:', data.message);
                setMonitoringData(prev => ({
                    ...prev,
                    lastUpdate: new Date().toISOString()
                }));
                break;

            case 'alert':
                console.log('🚨 Alert received:', data.data);
                setMonitoringData(prev => ({
                    ...prev,
                    alerts: [data.data, ...prev.alerts.slice(0, 19)], // Mantener últimas 20 alertas
                    lastUpdate: new Date().toISOString()
                }));
                break;

            case 'metrics':
                setMonitoringData(prev => ({
                    ...prev,
                    metrics: { ...prev.metrics, ...data.metrics },
                    lastUpdate: new Date().toISOString()
                }));
                break;

            case 'status':
                setMonitoringData(prev => ({
                    ...prev,
                    status: data.status,
                    lastUpdate: new Date().toISOString()
                }));
                break;

            default:
                console.log('📦 Unknown monitoring message type:', data.type, data);
        }
    }, []);

    // Función para obtener métricas usando los endpoints reales del servidor
    const getMetrics = useCallback(async (metricNames = []) => {
        setLoading(true);

        try {
            const { http } = getServerUrl();

            // Usar endpoint real del servidor
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
            console.error('Error fetching metrics:', err);

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
    }, [getServerUrl]);

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
                status: data.status,
                lastUpdate: new Date().toISOString(),
                metrics: {
                    ...prev.metrics,
                    health_status: data.status,
                    services: data.services
                }
            }));

            return data;
        } catch (err) {
            console.error('Error fetching system status:', err);
            throw err;
        }
    }, [getServerUrl]);

    // Función para obtener alertas usando endpoint real
    const getAlerts = useCallback(async () => {
        try {
            const { http } = getServerUrl();
            const response = await fetch(`${http}/api/alerts`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            setMonitoringData(prev => ({
                ...prev,
                alerts: data.data || [],
                lastUpdate: new Date().toISOString()
            }));

            return data.data || [];
        } catch (err) {
            console.error('Error fetching alerts:', err);
            return [];
        }
    }, [getServerUrl]);

    // Función para refrescar alertas (la que faltaba)
    const refreshAlerts = useCallback(async () => {
        console.log('🔄 Refreshing alerts...');
        return await getAlerts();
    }, [getAlerts]);

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

    // Función para obtener métricas específicas de AFIP
    const getAfipMetrics = useCallback(async () => {
        const metrics = await getMetrics();

        // Extraer métricas específicas de AFIP
        return {
            afip_mode: metrics.afip_mode,
            groq_enabled: metrics.groq_enabled,
            server_status: metrics.server_status,
            uptime: metrics.uptime
        };
    }, [getMetrics]);

    // Función para simular métricas en tiempo real
    const generateMockMetrics = useCallback(() => {
        const mockMetrics = {
            cpu_usage: Math.random() * 100,
            memory_usage: 60 + Math.random() * 30,
            active_connections: Math.floor(Math.random() * 50) + 10,
            requests_per_minute: Math.floor(Math.random() * 1000) + 100,
            afip_api_response_time: 200 + Math.random() * 300,
            afip_success_rate: 95 + Math.random() * 5,
            timestamp: new Date().toISOString()
        };

        setMonitoringData(prev => ({
            ...prev,
            metrics: { ...prev.metrics, ...mockMetrics },
            lastUpdate: new Date().toISOString()
        }));

        return mockMetrics;
    }, []);

    // Conectar automáticamente al montar el componente
    useEffect(() => {
        console.log('🚀 Initializing monitoring hook...');

        // Obtener métricas iniciales
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
        monitoringData,
        isConnected,
        loading,
        connect,
        disconnect,
        getMetrics,
        getSystemStatus,
        getAfipMetrics,
        getAlerts,
        refreshAlerts, // ✅ Función que faltaba
        clearErrors,
        clearAlerts,
        generateMockMetrics
    };
};