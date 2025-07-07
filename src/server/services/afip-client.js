import axios from 'axios';
import https from 'https';
import { EventEmitter } from 'events';

export class AfipClient extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    // URL CORREGIDA - API REST oficial de AFIP
    this.baseURL = config.baseURL || 'https://soa.afip.gob.ar/sr-padron/v2';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.mockMode = config.mockMode || false;

    // Cliente HTTP configurado
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      httpsAgent: new https.Agent({
        rejectUnauthorized: !this.mockMode // En mock mode, aceptar certificados no válidos
      }),
      headers: {
        'User-Agent': 'AFIP-Monitor-MCP/1.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Interceptors para logging y retry
    this.setupInterceptors();

    // Cache en memoria para evitar consultas repetidas
    this.cache = new Map();
    this.cacheTimeout = config.cacheTimeout || 300000; // 5 minutos

    // Rate limiting
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.rateLimitDelay = 1000; // 1 segundo entre requests

    // Métricas de performance
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastRequestTime: null
    };

    // Estado de conexión
    this.connectionStatus = 'disconnected';
    this.lastHealthCheck = null;
  }

  setupInterceptors() {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        this.metrics.totalRequests++;
        this.metrics.lastRequestTime = Date.now();

        this.logger.debug('AFIP Request:', {
          method: config.method,
          url: config.url,
          params: config.params,
          requestId: this.generateRequestId()
        });

        return config;
      },
      (error) => {
        this.logger.error('AFIP Request Error:', error);
        this.emit('error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        this.metrics.successfulRequests++;
        const responseTime = Date.now() - this.metrics.lastRequestTime;
        this.updateAverageResponseTime(responseTime);

        this.logger.debug('AFIP Response:', {
          status: response.status,
          url: response.config.url,
          responseTime,
          dataSize: JSON.stringify(response.data).length
        });

        // Emitir evento de respuesta exitosa
        this.emit('response', {
          status: response.status,
          responseTime,
          url: response.config.url
        });

        return response;
      },
      async (error) => {
        const config = error.config;
        this.metrics.failedRequests++;

        // Retry logic mejorada
        if (!config._retryCount) {
          config._retryCount = 0;
        }

        if (config._retryCount < this.maxRetries && this.shouldRetry(error)) {
          config._retryCount++;

          const delay = this.calculateBackoffDelay(config._retryCount);
          this.logger.warn(`Retrying AFIP request (${config._retryCount}/${this.maxRetries}) in ${delay}ms`, {
            url: config.url,
            error: error.message,
            statusCode: error.response?.status
          });

          await this.delay(delay);
          return this.httpClient(config);
        }

        // Log final error
        this.logger.error('AFIP Response Error:', {
          status: error.response?.status,
          message: error.message,
          url: config?.url,
          retries: config?._retryCount || 0
        });

        // Emitir evento de error
        this.emit('error', {
          error,
          url: config?.url,
          retries: config?._retryCount || 0
        });

        return Promise.reject(this.formatError(error));
      }
    );
  }

  shouldRetry(error) {
    // Retry en errores temporales
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];

    return (
      retryableStatuses.includes(error.response?.status) ||
      retryableCodes.includes(error.code) ||
      (error.message && error.message.includes('timeout'))
    );
  }

  calculateBackoffDelay(retryCount) {
    // Exponential backoff con jitter
    const baseDelay = Math.pow(2, retryCount) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 30000); // Max 30 segundos
  }

  updateAverageResponseTime(responseTime) {
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      // Media móvil simple
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * 0.8) + (responseTime * 0.2);
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  formatError(error) {
    const baseError = {
      code: error.code || 'AFIP_ERROR',
      message: error.message || 'Error desconocido',
      status: error.response?.status,
      url: error.config?.url
    };

    // Mapear errores específicos de AFIP
    if (error.response?.status === 401) {
      return {
        ...baseError,
        code: 'AFIP_UNAUTHORIZED',
        message: 'Credenciales inválidas o expiradas'
      };
    }

    if (error.response?.status === 404) {
      return {
        ...baseError,
        code: 'AFIP_NOT_FOUND',
        message: 'Recurso no encontrado en AFIP'
      };
    }

    if (error.response?.status === 429) {
      return {
        ...baseError,
        code: 'AFIP_RATE_LIMITED',
        message: 'Límite de requests excedido'
      };
    }

    return baseError;
  }

  // MÉTODO INITIALIZE CORREGIDO
  async initialize() {
    try {
      this.logger.info('Inicializando cliente AFIP...', {
        baseURL: this.baseURL,
        mockMode: this.mockMode,
        timeout: this.timeout
      });

      // Si estamos en modo mock, forzar inicialización exitosa
      if (this.mockMode) {
        this.connectionStatus = 'connected';
        this.emit('connected');
        this.logger.info('✅ Cliente AFIP inicializado en modo MOCK');

        // Simular un health check exitoso
        this.lastHealthCheck = {
          healthy: true,
          status: 200,
          responseTime: 0,
          mockMode: true,
          timestamp: new Date().toISOString(),
          message: 'Initialized in mock mode'
        };

        // Iniciar monitoreo mock
        this.startHealthMonitoring();
        return;
      }

      // En modo real, intentar health check pero no fallar si no funciona
      try {
        const healthResult = await this.healthCheck();

        if (healthResult.healthy) {
          this.connectionStatus = 'connected';
          this.emit('connected');
          this.logger.info('✅ Cliente AFIP inicializado correctamente (modo REAL)');
        } else {
          this.connectionStatus = 'degraded';
          this.emit('degraded', healthResult);
          this.logger.warn('⚠️ Cliente AFIP en modo degraded:', healthResult.error);
        }
      } catch (healthError) {
        // No fallar la inicialización por problemas de conectividad
        this.connectionStatus = 'degraded';
        this.emit('degraded', { error: healthError.message });
        this.logger.warn('⚠️ Cliente AFIP inicializado sin verificación de salud:', healthError.message);
      }

      // Iniciar monitoreo periódico de salud
      this.startHealthMonitoring();

    } catch (error) {
      // Solo fallar completamente en errores críticos de configuración
      this.connectionStatus = 'error';
      this.logger.error('❌ Error crítico inicializando cliente AFIP:', error);
      this.emit('error', error);
      throw error;
    }
  }

  startHealthMonitoring() {
    // Health check cada 5 minutos
    setInterval(async () => {
      try {
        const health = await this.healthCheck();
        if (!health.healthy && this.connectionStatus === 'connected') {
          this.connectionStatus = 'degraded';
          this.emit('degraded', health);
        } else if (health.healthy && this.connectionStatus === 'degraded') {
          this.connectionStatus = 'connected';
          this.emit('recovered', health);
        }
      } catch (error) {
        this.logger.warn('Health check error:', error);
      }
    }, 5 * 60 * 1000);
  }

  // MÉTODO HEALTHCHECK CORREGIDO - SIN /ping
  async healthCheck() {
    try {
      const startTime = Date.now();

      if (this.mockMode) {
        // En modo mock, simular health check exitoso SIEMPRE
        await this.delay(50 + Math.random() * 100);
        this.logger.debug('🎭 Health check en modo MOCK - simulando éxito');

        const result = {
          healthy: true,
          status: 200,
          responseTime: Date.now() - startTime,
          mockMode: true,
          timestamp: new Date().toISOString(),
          message: 'Mock mode - health check simulado exitosamente'
        };

        this.lastHealthCheck = result;
        return result;
      }

      // En modo real, verificar conectividad con un CUIT de prueba
      // IMPORTANTE: No usar /ping porque no existe en AFIP
      try {
        // Usar un CUIT de prueba conocido para verificar que el servicio responde
        const testCuit = '30500010912'; // CUIT de prueba oficial de AFIP

        const response = await this.httpClient.get(`/persona/${testCuit}`, {
          timeout: 10000,
          _skipRetry: true,
          validateStatus: function (status) {
            // 200 = OK, 404 = CUIT no encontrado pero servicio funciona
            // 401 = No autorizado pero servicio está up
            return status === 200 || status === 404 || status === 401;
          }
        });

        const result = {
          healthy: true,
          status: response.status,
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          message: `AFIP REST API responding (status: ${response.status})`,
          testCuit: testCuit
        };

        this.lastHealthCheck = result;
        this.logger.debug('✅ Health check AFIP REST exitoso:', result);
        return result;

      } catch (error) {
        // Verificar si el error es de conectividad o de respuesta HTTP
        if (error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ERR_NETWORK') {

          // Error de conectividad - servicio no disponible
          throw new Error(`AFIP service unavailable: ${error.message}`);
        }

        // Si es un error HTTP pero el servidor responde, considerarlo como healthy
        const result = {
          healthy: true,
          status: error.response?.status || 0,
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          message: 'AFIP server responding (with HTTP error)',
          warning: error.message
        };

        this.lastHealthCheck = result;
        this.logger.debug('⚠️ Health check AFIP con warning:', result);
        return result;
      }

    } catch (error) {
      const result = {
        healthy: false,
        error: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString(),
        message: `AFIP health check failed: ${error.message}`
      };

      this.lastHealthCheck = result;
      this.logger.warn('❌ Health check AFIP falló:', result);
      return result;
    }
  }

  async getStatus() {
    return {
      connectionStatus: this.connectionStatus,
      lastHealthCheck: this.lastHealthCheck,
      metrics: this.getMetrics(),
      cacheSize: this.cache.size,
      queueSize: this.requestQueue.length,
      config: {
        baseURL: this.baseURL,
        mockMode: this.mockMode,
        timeout: this.timeout,
        maxRetries: this.maxRetries
      }
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
        : 0,
      cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
        ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
        : 0
    };
  }

  // Método de conexión para testing
  async testConnection() {
    try {
      const health = await this.healthCheck();

      if (health.healthy) {
        return {
          success: true,
          message: 'Conexión exitosa con AFIP',
          details: health
        };
      } else {
        return {
          success: false,
          message: 'Fallo en la conexión con AFIP',
          details: health
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al probar conexión',
        error: error.message
      };
    }
  }

  // Método para obtener estadísticas de uso
  getUsageStats() {
    const stats = this.getMetrics();

    return {
      ...stats,
      uptime: Date.now() - (this.metrics.lastRequestTime || Date.now()),
      cacheInfo: {
        size: this.cache.size,
        maxSize: 1000,
        hitRate: stats.cacheHitRate
      },
      connectionInfo: {
        status: this.connectionStatus,
        lastHealthCheck: this.lastHealthCheck?.timestamp,
        baseURL: this.baseURL,
        mockMode: this.mockMode
      }
    };
  }

  // Cleanup method
  async destroy() {
    try {
      // Limpiar cache
      this.clearCache();

      // Cancelar requests pendientes
      this.requestQueue = [];

      // Emitir evento de desconexión
      this.emit('disconnected');

      this.logger.info('AFIP Client destruido correctamente');
    } catch (error) {
      this.logger.error('Error destruyendo AFIP Client:', error);
    }
  }

  // Método para recargar configuración
  async reloadConfig(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig };

      // Actualizar cliente HTTP si cambió la configuración
      if (newConfig.baseURL || newConfig.timeout) {
        this.httpClient.defaults.baseURL = this.config.baseURL;
        this.httpClient.defaults.timeout = this.config.timeout;
      }

      this.logger.info('Configuración AFIP recargada', newConfig);
      this.emit('config-reloaded', newConfig);

    } catch (error) {
      this.logger.error('Error recargando configuración AFIP:', error);
      throw error;
    }
  }

  // Método para limpiar cache
  clearCache(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      this.logger.info('Cache AFIP completamente limpiado');
    } else {
      let deleted = 0;
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          deleted++;
        }
      }
      this.logger.info(`Cache AFIP limpiado: ${deleted} entradas con patrón '${pattern}'`);
    }
  }

  // Método para exportar datos de cache
  exportCacheData() {
    const cacheData = {};

    for (const [key, value] of this.cache.entries()) {
      cacheData[key] = {
        data: value.data,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      };
    }

    return {
      cacheData,
      totalEntries: this.cache.size,
      exportedAt: new Date().toISOString()
    };
  }
}