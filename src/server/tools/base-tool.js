import { validate } from 'jsonschema';

export class BaseTool {
  constructor(name, description, inputSchema, services) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.services = services;
    this.logger = services.logger;

    // Metrics
    this.metrics = {
      executions: 0,
      errors: 0,
      totalTime: 0,
      lastExecution: null
    };
  }

  async execute(args) {
    const startTime = Date.now();
    this.metrics.executions++;
    this.metrics.lastExecution = new Date();

    try {
      // Validar argumentos
      await this.validateArguments(args);

      // Log de inicio
      this.logger.info(`Executing tool: ${this.name}`, { args, timestamp: startTime });

      // Ejecutar lógica de la herramienta
      const result = await this.executeLogic(args);

      // Calcular métricas
      const executionTime = Date.now() - startTime;
      this.metrics.totalTime += executionTime;

      // Log de éxito
      this.logger.info(`Tool executed successfully: ${this.name}`, {
        executionTime,
        resultSize: JSON.stringify(result).length
      });

      return {
        success: true,
        data: result,
        metadata: {
          tool: this.name,
          executionTime,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.metrics.errors++;

      // Log de error
      this.logger.error(`Tool execution failed: ${this.name}`, {
        error: error.message,
        stack: error.stack,
        args
      });

      throw {
        success: false,
        error: {
          code: error.code || 'TOOL_EXECUTION_ERROR',
          message: error.message,
          details: error.details || null
        },
        metadata: {
          tool: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async validateArguments(args) {
    try {
      const validation = validate(args, this.inputSchema);

      if (!validation.valid) {
        const errors = validation.errors.map(error => ({
          field: error.property,
          message: error.message,
          value: error.instance
        }));

        throw {
          code: 'VALIDATION_ERROR',
          message: 'Invalid arguments provided',
          details: { errors }
        };
      }

      // Validaciones adicionales específicas del tool
      await this.customValidation(args);

    } catch (error) {
      if (error.code) throw error;

      throw {
        code: 'VALIDATION_ERROR',
        message: 'Argument validation failed',
        details: { originalError: error.message }
      };
    }
  }

  async customValidation(args) {
    // Override en clases hijas para validaciones específicas
    return true;
  }

  async executeLogic(args) {
    throw new Error('executeLogic must be implemented by subclass');
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageExecutionTime: this.metrics.executions > 0
        ? this.metrics.totalTime / this.metrics.executions
        : 0,
      errorRate: this.metrics.executions > 0
        ? (this.metrics.errors / this.metrics.executions) * 100
        : 0
    };
  }

  resetMetrics() {
    this.metrics = {
      executions: 0,
      errors: 0,
      totalTime: 0,
      lastExecution: null
    };
  }

  // Utilidades comunes
  validateCuit(cuit) {
    const cuitPattern = /^\d{2}-\d{8}-\d{1}$/;
    if (!cuitPattern.test(cuit)) {
      throw {
        code: 'INVALID_CUIT',
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
        details: { provided: cuit }
      };
    }

    return cleanCuit;
  }

  validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw {
        code: 'INVALID_DATE',
        message: 'Fechas deben estar en formato ISO válido',
        details: { startDate, endDate }
      };
    }

    if (start > end) {
      throw {
        code: 'INVALID_DATE_RANGE',
        message: 'Fecha de inicio debe ser anterior a fecha de fin',
        details: { startDate, endDate }
      };
    }

    if (end > now) {
      throw {
        code: 'FUTURE_DATE',
        message: 'Fecha de fin no puede ser en el futuro',
        details: { endDate, now: now.toISOString() }
      };
    }

    return { start, end };
  }

  async rateLimitCheck(key, limit = 100, window = 3600000) {
    // Implementar rate limiting básico
    const rateLimitKey = `rate_limit_${this.name}_${key}`;
    // En una implementación real, usar Redis o similar
    return true;
  }

  sanitizeOutput(data) {
    // Remover datos sensibles antes de retornar
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };

      // Campos sensibles a ocultar
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];

      const removeSensitiveData = (obj) => {
        if (Array.isArray(obj)) {
          return obj.map(removeSensitiveData);
        }

        if (typeof obj === 'object' && obj !== null) {
          const cleaned = {};
          for (const [key, value] of Object.entries(obj)) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
              cleaned[key] = '***HIDDEN***';
            } else {
              cleaned[key] = removeSensitiveData(value);
            }
          }
          return cleaned;
        }

        return obj;
      };

      return removeSensitiveData(sanitized);
    }

    return data;
  }

  formatError(error) {
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'Error desconocido',
      details: error.details || null,
      timestamp: new Date().toISOString(),
      tool: this.name
    };
  }

  async executeWithTimeout(promise, timeout = 30000) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ]);
  }
}