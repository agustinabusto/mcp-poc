import axios from 'axios';
import https from 'https';
import { EventEmitter } from 'events';

export class AfipClient extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.baseURL = config.baseURL || 'https://aws.afip.gov.ar/sr-padron/v2';
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

  async initialize() {
    try {
      this.logger.info('Inicializando cliente AFIP...', {
        baseURL: this.baseURL,
        mockMode: this.mockMode,
        timeout: this.timeout
      });

      // Verificar conectividad
      const healthResult = await this.healthCheck();

      if (healthResult.healthy) {
        this.connectionStatus = 'connected';
        this.emit('connected');
        this.logger.info('Cliente AFIP inicializado correctamente');
      } else {
        throw new Error(`Health check failed: ${healthResult.error}`);
      }

      // Iniciar monitoreo periódico de salud
      this.startHealthMonitoring();

    } catch (error) {
      this.connectionStatus = 'error';
      this.logger.error('Error inicializando cliente AFIP:', error);
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

  async healthCheck() {
    try {
      const startTime = Date.now();

      if (this.mockMode) {
        // En modo mock, simular health check
        await this.delay(50 + Math.random() * 100);
        return {
          healthy: true,
          status: 200,
          responseTime: Date.now() - startTime,
          mockMode: true,
          timestamp: new Date().toISOString()
        };
      }

      // En modo real, hacer ping a AFIP
      const response = await this.httpClient.get('/ping', {
        timeout: 10000,
        _skipRetry: true
      });

      const result = {
        healthy: true,
        status: response.status,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      this.lastHealthCheck = result;
      return result;

    } catch (error) {
      const result = {
        healthy: false,
        error: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      };

      this.lastHealthCheck = result;
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

  // === MÉTODOS PRINCIPALES DE CONSULTA ===

  async getTaxpayerInfo(cuit) {
    const cacheKey = `taxpayer_info_${cuit}`;
    return this.executeWithCache(cacheKey, async () => {
      this.validateCuit(cuit);

      if (this.mockMode) {
        return await this.getMockTaxpayerInfo(cuit);
      }

      // En producción, aquí iría la llamada real a AFIP
      const response = await this.httpClient.get(`/taxpayer/${cuit}`);
      return response.data;
    });
  }

  async getFiscalStatus(cuit) {
    const cacheKey = `fiscal_status_${cuit}`;
    return this.executeWithCache(cacheKey, async () => {
      this.validateCuit(cuit);

      if (this.mockMode) {
        return await this.getMockFiscalStatus(cuit);
      }

      const response = await this.httpClient.get(`/fiscal-status/${cuit}`);
      return response.data;
    });
  }

  async getVATRegistration(cuit) {
    const cacheKey = `vat_registration_${cuit}`;
    return this.executeWithCache(cacheKey, async () => {
      this.validateCuit(cuit);

      if (this.mockMode) {
        return await this.getMockVATRegistration(cuit);
      }

      const response = await this.httpClient.get(`/vat-registration/${cuit}`);
      return response.data;
    });
  }

  async getVATDeclarations(cuit, period) {
    const cacheKey = `vat_declarations_${cuit}_${period.from}_${period.to}`;
    return this.executeWithCache(cacheKey, async () => {
      this.validateCuit(cuit);
      this.validatePeriod(period);

      if (this.mockMode) {
        return await this.getMockVATDeclarations(cuit, period);
      }

      const response = await this.httpClient.get(`/vat-declarations/${cuit}`, {
        params: {
          from: period.from,
          to: period.to
        }
      });
      return response.data;
    });
  }

  async getIncomeTaxDeclarations(cuit, period) {
    const cacheKey = `income_tax_declarations_${cuit}_${period.from}_${period.to}`;
    return this.executeWithCache(cacheKey, async () => {
      this.validateCuit(cuit);
      this.validatePeriod(period);

      if (this.mockMode) {
        return await this.getMockIncomeTaxDeclarations(cuit, period);
      }

      const response = await this.httpClient.get(`/income-tax-declarations/${cuit}`, {
        params: {
          from: period.from,
          to: period.to
        }
      });
      return response.data;
    });
  }

  async getAllTaxReturns(cuit, period) {
    const cacheKey = `all_tax_returns_${cuit}_${period.from}_${period.to}`;
    return this.executeWithCache(cacheKey, async () => {
      this.validateCuit(cuit);
      this.validatePeriod(period);

      if (this.mockMode) {
        return await this.getMockAllTaxReturns(cuit, period);
      }

      const response = await this.httpClient.get(`/tax-returns/${cuit}`, {
        params: {
          from: period.from,
          to: period.to
        }
      });
      return response.data;
    });
  }

  async getRegulationUpdates(since = null) {
    const cacheKey = `regulation_updates_${since || 'all'}`;
    return this.executeWithCache(cacheKey, async () => {
      if (this.mockMode) {
        return await this.getMockRegulationUpdates(since);
      }

      const response = await this.httpClient.get('/regulations/updates', {
        params: since ? { since } : {}
      });
      return response.data;
    }, 60000); // Cache por 1 minuto para regulaciones
  }

  async getComplianceRequirements(cuit, activityCode) {
    const cacheKey = `compliance_requirements_${cuit}_${activityCode}`;
    return this.executeWithCache(cacheKey, async () => {
      this.validateCuit(cuit);

      if (this.mockMode) {
        return await this.getMockComplianceRequirements(cuit, activityCode);
      }

      const response = await this.httpClient.get(`/compliance-requirements/${cuit}`, {
        params: { activityCode }
      });
      return response.data;
    });
  }

  // === MÉTODOS DE CACHE ===

  async executeWithCache(key, fn, customTtl = null) {
    // Verificar cache
    const cached = this.getFromCache(key);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    this.metrics.cacheMisses++;

    // Ejecutar función y guardar en cache
    const result = await fn();
    this.setCache(key, result, customTtl);

    return result;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setCache(key, data, customTtl = null) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTtl || this.cacheTimeout
    });

    // Limitar tamaño del cache
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

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

  // === VALIDACIONES ===

  validateCuit(cuit) {
    const cuitPattern = /^\d{2}-\d{8}-\d{1}$/;
    if (!cuitPattern.test(cuit)) {
      throw {
        code: 'INVALID_CUIT_FORMAT',
        message: 'CUIT debe tener formato XX-XXXXXXXX-X',
        details: { provided: cuit }
      };
    }

    // Validar dígito verificador
    const cleanCuit = cuit.replace(/-/g, '');
    const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCuit[i]) * factors[i];
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;

    if (parseInt(cleanCuit[10]) !== checkDigit) {
      throw {
        code: 'INVALID_CUIT_CHECKSUM',
        message: 'Dígito verificador de CUIT inválido',
        details: { provided: cuit, expectedCheckDigit: checkDigit }
      };
    }

    return cleanCuit;
  }

  validatePeriod(period) {
    if (!period || !period.from || !period.to) {
      throw {
        code: 'INVALID_PERIOD',
        message: 'Período debe incluir fechas from y to',
        details: { provided: period }
      };
    }

    const from = new Date(period.from);
    const to = new Date(period.to);
    const now = new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw {
        code: 'INVALID_DATE_FORMAT',
        message: 'Fechas deben estar en formato válido',
        details: { from: period.from, to: period.to }
      };
    }

    if (from > to) {
      throw {
        code: 'INVALID_DATE_RANGE',
        message: 'Fecha de inicio debe ser anterior a fecha de fin',
        details: { from: period.from, to: period.to }
      };
    }

    if (to > now) {
      throw {
        code: 'FUTURE_DATE',
        message: 'Fecha de fin no puede ser en el futuro',
        details: { to: period.to, now: now.toISOString() }
      };
    }
  }

  // === MÉTODOS MOCK PARA POC ===

  async getMockTaxpayerInfo(cuit) {
    await this.simulateNetworkDelay();

    const cleanCuit = cuit.replace(/-/g, '');
    const isActive = parseInt(cleanCuit.slice(-1)) % 2 === 0;

    return {
      cuit,
      businessName: `Empresa Demo ${cleanCuit.slice(-4)}`,
      tradeName: `Demo Trade ${cleanCuit.slice(-4)}`,
      fiscalAddress: {
        street: 'Av. Corrientes 1234',
        city: 'CABA',
        province: 'Capital Federal',
        postalCode: '1043'
      },
      activityCode: '620200',
      activityDescription: 'Servicios de consultoría en informática',
      registrationDate: '2020-01-15',
      lastUpdate: new Date().toISOString(),
      active: isActive,
      incomeTaxLiable: true,
      incomeTaxRegime: 'general',
      vatCategory: 'responsable_inscripto',
      employerRegistration: true,
      taxRegimes: [
        'income_tax',
        'vat',
        'gross_income'
      ]
    };
  }

  async getMockFiscalStatus(cuit) {
    await this.simulateNetworkDelay();

    const cleanCuit = cuit.replace(/-/g, '');
    const isActive = parseInt(cleanCuit.slice(-1)) % 2 === 0;

    return {
      cuit,
      active: isActive,
      category: isActive ? 'activo' : 'suspendido',
      registrationDate: '2020-01-15',
      lastUpdate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      suspensionReason: isActive ? null : 'Falta de presentación de declaraciones',
      reactivationRequirements: isActive ? [] : [
        'Presentar declaraciones adeudadas',
        'Actualizar domicilio fiscal',
        'Regularizar situación impositiva'
      ],
      obligations: {
        vat: isActive,
        incomeTax: isActive,
        grossIncome: isActive
      }
    };
  }

  async getMockVATRegistration(cuit) {
    await this.simulateNetworkDelay();

    const cleanCuit = cuit.replace(/-/g, '');
    const isRegistered = parseInt(cleanCuit.slice(-2)) % 3 !== 0;

    return {
      cuit,
      registered: isRegistered,
      category: isRegistered ? 'responsable_inscripto' : 'no_inscripto',
      regime: isRegistered ? 'general' : null,
      registrationDate: isRegistered ? '2020-02-01' : null,
      exemptions: [],
      specialRegimes: isRegistered ? [] : null,
      nextDueDate: isRegistered ? this.getNextVATDueDate() : null
    };
  }

  getNextVATDueDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 20);
    return nextMonth.toISOString().split('T')[0];
  }

  async getMockVATDeclarations(cuit, period) {
    await this.simulateNetworkDelay();

    const declarations = [];
    const start = new Date(period.from);
    const end = new Date(period.to);

    const current = new Date(start);
    while (current <= end) {
      const month = current.getMonth() + 1;
      const year = current.getFullYear();

      // Simular algunas declaraciones faltantes
      const shouldHaveDeclaration = Math.random() > 0.1;

      if (shouldHaveDeclaration) {
        const presentationDate = new Date(year, month, 15 + Math.floor(Math.random() * 10));
        const dueDate = new Date(year, month, 20);
        const onTime = presentationDate <= dueDate;

        declarations.push({
          period: `${year}-${String(month).padStart(2, '0')}`,
          presentationDate: presentationDate.toISOString(),
          dueDate: dueDate.toISOString(),
          status: 'presented',
          amount: Math.round(Math.random() * 50000),
          onTime,
          cae: this.generateMockCAE(),
          details: {
            taxableAmount: Math.round(Math.random() * 200000),
            taxAmount: Math.round(Math.random() * 50000),
            credits: Math.round(Math.random() * 10000)
          }
        });
      }

      current.setMonth(current.getMonth() + 1);
    }

    return declarations.sort((a, b) => new Date(b.presentationDate) - new Date(a.presentationDate));
  }

  async getMockIncomeTaxDeclarations(cuit, period) {
    await this.simulateNetworkDelay();

    const declarations = [];
    const start = new Date(period.from);
    const end = new Date(period.to);

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      const shouldHaveDeclaration = Math.random() > 0.05;

      if (shouldHaveDeclaration) {
        const presentationDate = new Date(year + 1, 4, 10 + Math.floor(Math.random() * 20));
        const dueDate = new Date(year + 1, 4, 31);
        const onTime = presentationDate <= dueDate;

        declarations.push({
          period: year.toString(),
          presentationDate: presentationDate.toISOString(),
          dueDate: dueDate.toISOString(),
          status: 'presented',
          netIncome: Math.round(Math.random() * 1000000),
          taxAmount: Math.round(Math.random() * 350000),
          onTime,
          paymentPlan: Math.random() > 0.8,
          details: {
            deductions: Math.round(Math.random() * 200000),
            retentions: Math.round(Math.random() * 50000),
            advance_payments: Math.round(Math.random() * 30000)
          }
        });
      }
    }

    return declarations.sort((a, b) => new Date(b.presentationDate) - new Date(a.presentationDate));
  }

  async getMockAllTaxReturns(cuit, period) {
    await this.simulateNetworkDelay();

    const [vatDeclarations, incomeTaxDeclarations] = await Promise.all([
      this.getVATDeclarations(cuit, period),
      this.getIncomeTaxDeclarations(cuit, period)
    ]);

    const allReturns = [
      ...vatDeclarations.map(d => ({
        ...d,
        type: 'vat',
        taxType: 'IVA',
        presentedOnTime: d.onTime
      })),
      ...incomeTaxDeclarations.map(d => ({
        ...d,
        type: 'income_tax',
        taxType: 'Ganancias',
        presentedOnTime: d.onTime
      }))
    ];

    // Agregar declaraciones adicionales simuladas
    const additionalReturns = this.generateAdditionalMockReturns(cuit, period);
    allReturns.push(...additionalReturns);

    return allReturns.sort((a, b) =>
      new Date(b.presentationDate) - new Date(a.presentationDate)
    );
  }

  generateAdditionalMockReturns(cuit, period) {
    const returns = [];
    const start = new Date(period.from);
    const end = new Date(period.to);

    const current = new Date(start);
    while (current <= end) {
      // Simular declaraciones de Ingresos Brutos
      if (Math.random() > 0.7) {
        const month = current.getMonth() + 1;
        const year = current.getFullYear();
        const presentationDate = new Date(year, month, 10);
        const dueDate = new Date(year, month, 15);

        returns.push({
          period: `${year}-${String(month).padStart(2, '0')}`,
          presentationDate: presentationDate.toISOString(),
          dueDate: dueDate.toISOString(),
          status: 'presented',
          type: 'gross_income',
          taxType: 'Ingresos Brutos',
          amount: Math.round(Math.random() * 20000),
          presentedOnTime: Math.random() > 0.1,
          jurisdiction: 'CABA'
        });
      }

      current.setMonth(current.getMonth() + 1);
    }

    return returns;
  }

  async getMockRegulationUpdates(since = null) {
    await this.simulateNetworkDelay();

    const updates = [
      {
        id: 'RG-5124-2024',
        title: 'Modificación régimen IVA para servicios digitales',
        date: '2024-10-15',
        type: 'resolucion_general',
        summary: 'Nuevas obligaciones para prestadores de servicios digitales',
        effectiveDate: '2024-12-01',
        impact: 'medium',
        affectedTaxes: ['vat'],
        url: 'https://www.afip.gob.ar/normativa/RG-5124-2024.pdf'
      },
      {
        id: 'RG-5125-2024',
        title: 'Actualización alícuotas Ganancias',
        date: '2024-11-01',
        type: 'resolucion_general',
        summary: 'Modificación de escalas del impuesto a las ganancias',
        effectiveDate: '2025-01-01',
        impact: 'high',
        affectedTaxes: ['income_tax'],
        url: 'https://www.afip.gob.ar/normativa/RG-5125-2024.pdf'
      },
      {
        id: 'RG-5126-2024',
        title: 'Nuevos códigos de actividad económica',
        date: '2024-11-15',
        type: 'resolucion_general',
        summary: 'Incorporación de códigos para actividades de economía digital',
        effectiveDate: '2025-02-01',
        impact: 'low',
        affectedTaxes: ['vat', 'income_tax'],
        url: 'https://www.afip.gob.ar/normativa/RG-5126-2024.pdf'
      }
    ];

    if (since) {
      const sinceDate = new Date(since);
      return updates.filter(update => new Date(update.date) > sinceDate);
    }

    return updates;
  }

  async getMockComplianceRequirements(cuit, activityCode) {
    await this.simulateNetworkDelay();

    return {
      cuit,
      activityCode,
      requirements: {
        vat: {
          required: true,
          frequency: 'monthly',
          dueDay: 20,
          minimumTurnover: 0
        },
        incomeTax: {
          required: true,
          frequency: 'yearly',
          dueDate: '31/05',
          regime: 'general'
        },
        grossIncome: {
          required: true,
          frequency: 'monthly',
          dueDay: 15,
          jurisdiction: 'CABA',
          exemptThreshold: 2000000
        },
        socialSecurity: {
          required: true,
          frequency: 'monthly',
          dueDay: 30,
          regime: 'autonomo'
        },
        employerObligations: {
          required: false,
          reason: 'No employees registered'
        }
      },
      specialObligations: [
        'Libro IVA Digital',
        'Comprobantes Electrónicos',
        'Información de Terceros'
      ],
      nextDueDates: {
        vat: this.getNextVATDueDate(),
        grossIncome: this.getNextGrossIncomeDueDate(),
        socialSecurity: this.getNextSocialSecurityDueDate()
      },
      riskFactors: [
        {
          factor: 'activity_code',
          risk: 'medium',
          description: 'Actividad con controles especiales'
        }
      ]
    };
  }

  getNextGrossIncomeDueDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    return nextMonth.toISOString().split('T')[0];
  }

  getNextSocialSecurityDueDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 30);
    return nextMonth.toISOString().split('T')[0];
  }

  generateMockCAE() {
    return Math.random().toString().slice(2, 16); // 14 dígitos
  }

  async simulateNetworkDelay() {
    const delay = this.config.mockDelay || { min: 100, max: 500 };
    const randomDelay = delay.min + Math.random() * (delay.max - delay.min);
    await this.delay(randomDelay);
  }

  // === MÉTODOS DE UTILIDAD ===

  async getFiscalStatusDetails(cuit) {
    await this.simulateNetworkDelay();

    return {
      lastDeclarationDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      pendingObligations: Math.floor(Math.random() * 3),
      currentDebt: Math.round(Math.random() * 100000),
      paymentPlans: Math.floor(Math.random() * 2),
      administrativeProceedings: Math.floor(Math.random() * 2),
      creditBalance: Math.round(Math.random() * 50000),
      lastAuditDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      complianceScore: 70 + Math.random() * 30
    };
  }

  // Método para testing de conectividad
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