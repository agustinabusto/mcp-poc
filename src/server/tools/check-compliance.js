import { BaseTool } from './base-tool.js';

export class CheckComplianceTool extends BaseTool {
  constructor(services) {
    const inputSchema = {
      type: 'object',
      properties: {
        cuit: {
          type: 'string',
          pattern: '^\\d{2}-\\d{8}-\\d{1}$',
          description: 'CUIT en formato XX-XXXXXXXX-X'
        },
        checks: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'fiscal_status',
              'vat_registration',
              'income_tax',
              'social_security',
              'labor_compliance',
              'tax_returns',
              'all'
            ]
          },
          description: 'Tipos de compliance a verificar',
          default: ['all']
        },
        period: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              format: 'date',
              description: 'Fecha de inicio del período a verificar'
            },
            to: {
              type: 'string',
              format: 'date',
              description: 'Fecha de fin del período a verificar'
            }
          },
          required: ['from', 'to'],
          description: 'Período de tiempo para la verificación'
        },
        detailed: {
          type: 'boolean',
          default: false,
          description: 'Incluir detalles adicionales en el resultado'
        }
      },
      required: ['cuit', 'period'],
      additionalProperties: false
    };

    super(
      'check_compliance',
      'Verifica el estado de compliance fiscal de una empresa con AFIP',
      inputSchema,
      services
    );

    this.afipClient = services.afipClient;
    this.complianceEngine = services.complianceEngine;
    this.alertManager = services.alertManager;
  }

  async customValidation(args) {
    // Validar CUIT
    this.validateCuit(args.cuit);

    // Validar período
    this.validateDateRange(args.period.from, args.period.to);

    // Validar que el período no sea mayor a 1 año
    const { start, end } = this.validateDateRange(args.period.from, args.period.to);
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    if (diffMonths > 12) {
      throw {
        code: 'PERIOD_TOO_LONG',
        message: 'El período de verificación no puede ser mayor a 12 meses',
        details: {
          providedMonths: diffMonths,
          maxMonths: 12
        }
      };
    }
  }

  async executeLogic(args) {
    const { cuit, checks = ['all'], period, detailed = false } = args;

    this.logger.info(`Iniciando verificación de compliance para CUIT: ${cuit}`, {
      checks,
      period,
      detailed
    });

    // Resultado base
    const result = {
      cuit,
      period,
      timestamp: new Date().toISOString(),
      overallStatus: 'checking',
      score: 0,
      checks: {},
      alerts: [],
      recommendations: []
    };

    try {
      // Obtener información básica del contribuyente
      const taxpayerInfo = await this.afipClient.getTaxpayerInfo(cuit);
      result.taxpayerInfo = taxpayerInfo;

      // Determinar qué checks ejecutar
      const checksToRun = checks.includes('all')
        ? ['fiscal_status', 'vat_registration', 'income_tax', 'social_security', 'labor_compliance', 'tax_returns']
        : checks;

      // Ejecutar verificaciones en paralelo
      const checkPromises = checksToRun.map(checkType =>
        this.runComplianceCheck(cuit, checkType, period, detailed)
      );

      const checkResults = await Promise.allSettled(checkPromises);

      // Procesar resultados
      let totalScore = 0;
      let validChecks = 0;

      checkResults.forEach((checkResult, index) => {
        const checkType = checksToRun[index];

        if (checkResult.status === 'fulfilled') {
          const checkData = checkResult.value;
          result.checks[checkType] = checkData;

          if (checkData.score !== undefined) {
            totalScore += checkData.score;
            validChecks++;
          }

          // Agregar alertas encontradas
          if (checkData.alerts && checkData.alerts.length > 0) {
            result.alerts.push(...checkData.alerts);
          }

          // Agregar recomendaciones
          if (checkData.recommendations && checkData.recommendations.length > 0) {
            result.recommendations.push(...checkData.recommendations);
          }
        } else {
          result.checks[checkType] = {
            status: 'error',
            error: checkResult.reason.message,
            score: 0
          };

          this.logger.error(`Error en verificación ${checkType}:`, checkResult.reason);
        }
      });

      // Calcular score general
      result.score = validChecks > 0 ? Math.round(totalScore / validChecks) : 0;

      // Determinar estado general
      result.overallStatus = this.determineOverallStatus(result.score, result.alerts);

      // Guardar resultado en base de datos
      await this.saveComplianceResult(result);

      // Crear alertas si es necesario
      await this.processAlerts(result);

      this.logger.info(`Compliance check completado para ${cuit}`, {
        score: result.score,
        status: result.overallStatus,
        alertCount: result.alerts.length
      });

      return this.sanitizeOutput(result);

    } catch (error) {
      this.logger.error('Error en verificación de compliance:', error);

      result.overallStatus = 'error';
      result.error = this.formatError(error);

      return result;
    }
  }

  async runComplianceCheck(cuit, checkType, period, detailed) {
    const startTime = Date.now();

    try {
      switch (checkType) {
        case 'fiscal_status':
          return await this.checkFiscalStatus(cuit, detailed);

        case 'vat_registration':
          return await this.checkVATRegistration(cuit, period, detailed);

        case 'income_tax':
          return await this.checkIncomeTax(cuit, period, detailed);

        case 'social_security':
          return await this.checkSocialSecurity(cuit, period, detailed);

        case 'labor_compliance':
          return await this.checkLaborCompliance(cuit, period, detailed);

        case 'tax_returns':
          return await this.checkTaxReturns(cuit, period, detailed);

        default:
          throw new Error(`Tipo de verificación desconocido: ${checkType}`);
      }
    } catch (error) {
      this.logger.error(`Error en verificación ${checkType}:`, error);
      throw error;
    } finally {
      const executionTime = Date.now() - startTime;
      this.logger.debug(`Verificación ${checkType} completada en ${executionTime}ms`);
    }
  }

  async checkFiscalStatus(cuit, detailed) {
    const status = await this.afipClient.getFiscalStatus(cuit);

    const result = {
      type: 'fiscal_status',
      status: status.active ? 'compliant' : 'non_compliant',
      score: status.active ? 100 : 0,
      data: {
        active: status.active,
        category: status.category,
        registrationDate: status.registrationDate,
        lastUpdate: status.lastUpdate
      },
      alerts: [],
      recommendations: []
    };

    if (!status.active) {
      result.alerts.push({
        type: 'fiscal_inactive',
        severity: 'high',
        message: 'El contribuyente no está activo en AFIP',
        code: 'FISCAL_INACTIVE'
      });

      result.recommendations.push({
        type: 'reactivation',
        message: 'Contactar a AFIP para reactivar el contribuyente',
        priority: 'high'
      });
    }

    if (detailed) {
      result.data.details = await this.afipClient.getFiscalStatusDetails(cuit);
    }

    return result;
  }

  async checkVATRegistration(cuit, period, detailed) {
    const vatInfo = await this.afipClient.getVATRegistration(cuit);

    const result = {
      type: 'vat_registration',
      status: 'checking',
      score: 0,
      data: {
        registered: vatInfo.registered,
        category: vatInfo.category,
        regime: vatInfo.regime
      },
      alerts: [],
      recommendations: []
    };

    // Verificar estado de inscripción
    if (!vatInfo.registered) {
      result.status = 'non_compliant';
      result.score = 0;
      result.alerts.push({
        type: 'vat_not_registered',
        severity: 'high',
        message: 'No está inscripto en IVA',
        code: 'VAT_NOT_REGISTERED'
      });
    } else {
      // Verificar presentaciones en el período
      const declarations = await this.afipClient.getVATDeclarations(cuit, period);
      const requiredDeclarations = this.calculateRequiredVATDeclarations(period, vatInfo.regime);

      const presentedCount = declarations.length;
      const requiredCount = requiredDeclarations.length;

      if (presentedCount >= requiredCount) {
        result.status = 'compliant';
        result.score = 100;
      } else {
        result.status = 'non_compliant';
        result.score = Math.round((presentedCount / requiredCount) * 100);

        result.alerts.push({
          type: 'missing_vat_declarations',
          severity: 'medium',
          message: `Faltan ${requiredCount - presentedCount} declaraciones de IVA`,
          code: 'MISSING_VAT_DECLARATIONS',
          details: {
            presented: presentedCount,
            required: requiredCount,
            missing: requiredDeclarations.filter(req =>
              !declarations.some(dec => dec.period === req.period)
            )
          }
        });
      }

      if (detailed) {
        result.data.declarations = declarations;
        result.data.requiredDeclarations = requiredDeclarations;
      }
    }

    return result;
  }

  async checkIncomeTax(cuit, period, detailed) {
    const taxpayerInfo = await this.afipClient.getTaxpayerInfo(cuit);

    const result = {
      type: 'income_tax',
      status: 'checking',
      score: 0,
      data: {
        liable: taxpayerInfo.incomeTaxLiable,
        regime: taxpayerInfo.incomeTaxRegime
      },
      alerts: [],
      recommendations: []
    };

    if (!taxpayerInfo.incomeTaxLiable) {
      result.status = 'not_applicable';
      result.score = 100; // No aplica = compliant
      result.data.reason = 'No está obligado a Impuesto a las Ganancias';
    } else {
      // Verificar declaraciones juradas
      const declarations = await this.afipClient.getIncomeTaxDeclarations(cuit, period);
      const requiredDeclarations = this.calculateRequiredIncomeTaxDeclarations(period, taxpayerInfo.incomeTaxRegime);

      const presentedCount = declarations.filter(d => d.status === 'presented').length;
      const requiredCount = requiredDeclarations.length;

      if (presentedCount >= requiredCount) {
        result.status = 'compliant';
        result.score = 100;
      } else {
        result.status = 'non_compliant';
        result.score = Math.round((presentedCount / requiredCount) * 100);

        result.alerts.push({
          type: 'missing_income_tax_declarations',
          severity: 'high',
          message: `Faltan ${requiredCount - presentedCount} declaraciones de Ganancias`,
          code: 'MISSING_INCOME_TAX_DECLARATIONS'
        });
      }

      if (detailed) {
        result.data.declarations = declarations;
        result.data.requiredDeclarations = requiredDeclarations;
      }
    }

    return result;
  }

  async checkSocialSecurity(cuit, period, detailed) {
    // Implementación básica - en producción se integraría con ANSES
    const result = {
      type: 'social_security',
      status: 'compliant',
      score: 85, // Score simulado
      data: {
        registered: true,
        regime: 'autonomo',
        lastPayment: '2024-11-01'
      },
      alerts: [],
      recommendations: []
    };

    // Agregar lógica específica de seguridad social aquí

    return result;
  }

  async checkLaborCompliance(cuit, period, detailed) {
    // Implementación básica - en producción se integraría con Ministerio de Trabajo
    const result = {
      type: 'labor_compliance',
      status: 'compliant',
      score: 90, // Score simulado
      data: {
        employeeCount: 0,
        registeredEmployees: 0,
        laborInsurance: true
      },
      alerts: [],
      recommendations: []
    };

    return result;
  }

  async checkTaxReturns(cuit, period, detailed) {
    const allReturns = await this.afipClient.getAllTaxReturns(cuit, period);

    const result = {
      type: 'tax_returns',
      status: 'checking',
      score: 0,
      data: {
        totalReturns: allReturns.length,
        onTimeReturns: 0,
        lateReturns: 0
      },
      alerts: [],
      recommendations: []
    };

    let onTimeCount = 0;
    let lateCount = 0;

    allReturns.forEach(returnInfo => {
      if (returnInfo.presentedOnTime) {
        onTimeCount++;
      } else {
        lateCount++;
      }
    });

    result.data.onTimeReturns = onTimeCount;
    result.data.lateReturns = lateCount;

    if (allReturns.length === 0) {
      result.status = 'no_data';
      result.score = 50;
    } else {
      result.score = Math.round((onTimeCount / allReturns.length) * 100);
      result.status = result.score >= 80 ? 'compliant' : 'non_compliant';

      if (lateCount > 0) {
        result.alerts.push({
          type: 'late_tax_returns',
          severity: 'medium',
          message: `${lateCount} declaraciones presentadas fuera de término`,
          code: 'LATE_TAX_RETURNS'
        });
      }
    }

    if (detailed) {
      result.data.returns = allReturns;
    }

    return result;
  }

  determineOverallStatus(score, alerts) {
    const highSeverityAlerts = alerts.filter(a => a.severity === 'high').length;
    const mediumSeverityAlerts = alerts.filter(a => a.severity === 'medium').length;

    if (score >= 90 && highSeverityAlerts === 0) {
      return 'excellent';
    } else if (score >= 75 && highSeverityAlerts === 0) {
      return 'good';
    } else if (score >= 60 && highSeverityAlerts <= 1) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  async saveComplianceResult(result) {
    try {
      await this.services.database.query(
        `INSERT INTO compliance_results 
         (cuit, check_date, period_from, period_to, overall_status, score, data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.cuit,
          result.timestamp,
          result.period.from,
          result.period.to,
          result.overallStatus,
          result.score,
          JSON.stringify(result),
          new Date().toISOString()
        ]
      );
    } catch (error) {
      this.logger.error('Error guardando resultado de compliance:', error);
    }
  }

  async processAlerts(result) {
    for (const alert of result.alerts) {
      if (alert.severity === 'high' || alert.severity === 'critical') {
        await this.alertManager.createAlert({
          type: alert.type,
          severity: alert.severity,
          cuit: result.cuit,
          message: alert.message,
          code: alert.code,
          details: alert.details || {},
          source: 'compliance_check'
        });
      }
    }
  }

  calculateRequiredVATDeclarations(period, regime) {
    // Implementar lógica según régimen IVA
    const declarations = [];
    const start = new Date(period.from);
    const end = new Date(period.to);

    // Simplificado: declaraciones mensuales
    const current = new Date(start);
    while (current <= end) {
      declarations.push({
        period: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
        dueDate: new Date(current.getFullYear(), current.getMonth() + 1, 20)
      });
      current.setMonth(current.getMonth() + 1);
    }

    return declarations;
  }

  calculateRequiredIncomeTaxDeclarations(period, regime) {
    // Implementar lógica según régimen Ganancias
    const declarations = [];
    const start = new Date(period.from);
    const end = new Date(period.to);

    // Simplificado: declaraciones anuales
    const currentYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let year = currentYear; year <= endYear; year++) {
      declarations.push({
        period: year.toString(),
        dueDate: new Date(year + 1, 4, 31) // 31 de mayo
      });
    }

    return declarations;
  }
}