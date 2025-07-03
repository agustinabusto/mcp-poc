import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CheckComplianceTool } from '../../../src/server/tools/check-compliance.js';

// Mock services
const mockServices = {
  afipClient: {
    getTaxpayerInfo: jest.fn(),
    getFiscalStatus: jest.fn(),
    getVATRegistration: jest.fn(),
    getVATDeclarations: jest.fn(),
    getIncomeTaxDeclarations: jest.fn(),
    getAllTaxReturns: jest.fn()
  },
  complianceEngine: {
    checkCompliance: jest.fn()
  },
  alertManager: {
    createAlert: jest.fn()
  },
  database: {
    query: jest.fn(),
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn()
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
};

describe('CheckComplianceTool', () => {
  let tool;

  beforeEach(() => {
    tool = new CheckComplianceTool(mockServices);

    // Reset all mocks
    Object.values(mockServices).forEach(service => {
      if (typeof service === 'object') {
        Object.values(service).forEach(method => {
          if (jest.isMockFunction(method)) {
            method.mockReset();
          }
        });
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Configuration', () => {
    test('should have correct tool name', () => {
      expect(tool.name).toBe('check_compliance');
    });

    test('should have proper input schema', () => {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.required).toContain('cuit');
      expect(tool.inputSchema.required).toContain('period');
    });

    test('should have valid description', () => {
      expect(tool.description).toContain('compliance fiscal');
      expect(tool.description).length > 10;
    });
  });

  describe('Input Validation', () => {
    test('should validate valid CUIT format', async () => {
      const validArgs = {
        cuit: '20-12345678-9',
        period: {
          from: '2024-01-01',
          to: '2024-12-31'
        }
      };

      await expect(tool.validateArguments(validArgs)).resolves.toBe(true);
    });

    test('should reject invalid CUIT format', async () => {
      const invalidArgs = {
        cuit: '123456789',
        period: {
          from: '2024-01-01',
          to: '2024-12-31'
        }
      };

      await expect(tool.validateArguments(invalidArgs)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR'
      });
    });

    test('should reject invalid date range', async () => {
      const invalidArgs = {
        cuit: '20-12345678-9',
        period: {
          from: '2024-12-31',
          to: '2024-01-01'
        }
      };

      await expect(tool.validateArguments(invalidArgs)).rejects.toMatchObject({
        code: 'INVALID_DATE_RANGE'
      });
    });

    test('should reject period longer than 12 months', async () => {
      const invalidArgs = {
        cuit: '20-12345678-9',
        period: {
          from: '2023-01-01',
          to: '2024-12-31'
        }
      };

      await expect(tool.validateArguments(invalidArgs)).rejects.toMatchObject({
        code: 'PERIOD_TOO_LONG'
      });
    });

    test('should reject future dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const invalidArgs = {
        cuit: '20-12345678-9',
        period: {
          from: '2024-01-01',
          to: futureDate.toISOString().split('T')[0]
        }
      };

      await expect(tool.validateArguments(invalidArgs)).rejects.toMatchObject({
        code: 'FUTURE_DATE'
      });
    });
  });

  describe('CUIT Validation', () => {
    test('should validate correct CUIT checksum', () => {
      // CUIT válido: 20-12345678-9
      expect(() => tool.validateCuit('20-12345678-9')).not.toThrow();
    });

    test('should reject CUIT with invalid checksum', () => {
      expect(() => tool.validateCuit('20-12345678-0')).toThrow();
    });

    test('should reject malformed CUIT', () => {
      expect(() => tool.validateCuit('123456789')).toThrow();
      expect(() => tool.validateCuit('20-1234567-9')).toThrow();
      expect(() => tool.validateCuit('20-123456789-9')).toThrow();
    });
  });

  describe('Compliance Execution', () => {
    const validArgs = {
      cuit: '20-12345678-9',
      period: {
        from: '2024-01-01',
        to: '2024-06-30'
      },
      checks: ['fiscal_status', 'vat_registration'],
      detailed: false
    };

    beforeEach(() => {
      // Setup default mock responses
      mockServices.afipClient.getTaxpayerInfo.mockResolvedValue({
        cuit: '20-12345678-9',
        businessName: 'Test Company',
        active: true,
        incomeTaxLiable: true,
        incomeTaxRegime: 'general'
      });

      mockServices.database.run.mockResolvedValue({ lastID: 1 });
    });

    test('should execute fiscal status check successfully', async () => {
      mockServices.afipClient.getFiscalStatus.mockResolvedValue({
        active: true,
        category: 'activo',
        registrationDate: '2020-01-01',
        lastUpdate: '2024-01-01'
      });

      const result = await tool.runComplianceCheck(
        validArgs.cuit,
        'fiscal_status',
        validArgs.period,
        false
      );

      expect(result).toMatchObject({
        type: 'fiscal_status',
        status: 'compliant',
        score: 100
      });

      expect(mockServices.afipClient.getFiscalStatus).toHaveBeenCalledWith(validArgs.cuit);
    });

    test('should detect inactive fiscal status', async () => {
      mockServices.afipClient.getFiscalStatus.mockResolvedValue({
        active: false,
        category: 'suspendido',
        registrationDate: '2020-01-01',
        lastUpdate: '2024-01-01'
      });

      const result = await tool.runComplianceCheck(
        validArgs.cuit,
        'fiscal_status',
        validArgs.period,
        false
      );

      expect(result).toMatchObject({
        type: 'fiscal_status',
        status: 'non_compliant',
        score: 0
      });

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]).toMatchObject({
        type: 'fiscal_inactive',
        severity: 'high'
      });
    });

    test('should execute VAT registration check', async () => {
      mockServices.afipClient.getVATRegistration.mockResolvedValue({
        registered: true,
        category: 'responsable_inscripto',
        regime: 'general'
      });

      mockServices.afipClient.getVATDeclarations.mockResolvedValue([
        {
          period: '2024-01',
          status: 'presented',
          onTime: true
        },
        {
          period: '2024-02',
          status: 'presented',
          onTime: true
        }
      ]);

      const result = await tool.runComplianceCheck(
        validArgs.cuit,
        'vat_registration',
        validArgs.period,
        false
      );

      expect(result).toMatchObject({
        type: 'vat_registration',
        status: 'compliant',
        score: 100
      });
    });

    test('should detect missing VAT declarations', async () => {
      mockServices.afipClient.getVATRegistration.mockResolvedValue({
        registered: true,
        category: 'responsable_inscripto',
        regime: 'general'
      });

      mockServices.afipClient.getVATDeclarations.mockResolvedValue([
        {
          period: '2024-01',
          status: 'presented',
          onTime: true
        }
        // Falta 2024-02, 2024-03, etc.
      ]);

      const result = await tool.runComplianceCheck(
        validArgs.cuit,
        'vat_registration',
        validArgs.period,
        false
      );

      expect(result.status).toBe('non_compliant');
      expect(result.score).toBeLessThan(100);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].type).toBe('missing_vat_declarations');
    });

    test('should execute full compliance check', async () => {
      // Setup all mock responses for full check
      mockServices.afipClient.getFiscalStatus.mockResolvedValue({
        active: true,
        category: 'activo'
      });

      mockServices.afipClient.getVATRegistration.mockResolvedValue({
        registered: true,
        category: 'responsable_inscripto'
      });

      mockServices.afipClient.getVATDeclarations.mockResolvedValue([]);
      mockServices.afipClient.getIncomeTaxDeclarations.mockResolvedValue([]);
      mockServices.afipClient.getAllTaxReturns.mockResolvedValue([]);

      const fullCheckArgs = {
        ...validArgs,
        checks: ['all']
      };

      const result = await tool.executeLogic(fullCheckArgs);

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          cuit: validArgs.cuit,
          overallStatus: expect.any(String),
          score: expect.any(Number),
          checks: expect.any(Object)
        })
      });

      // Verify all services were called
      expect(mockServices.afipClient.getTaxpayerInfo).toHaveBeenCalled();
      expect(mockServices.afipClient.getFiscalStatus).toHaveBeenCalled();
      expect(mockServices.afipClient.getVATRegistration).toHaveBeenCalled();
    });
  });

  describe('Score Calculation', () => {
    test('should calculate overall status correctly', () => {
      expect(tool.determineOverallStatus(95, [])).toBe('excellent');
      expect(tool.determineOverallStatus(85, [])).toBe('good');
      expect(tool.determineOverallStatus(70, [])).toBe('fair');
      expect(tool.determineOverallStatus(50, [])).toBe('poor');
    });

    test('should consider alert severity in status', () => {
      const highSeverityAlerts = [{ severity: 'high' }];
      const mediumSeverityAlerts = [{ severity: 'medium' }];

      expect(tool.determineOverallStatus(95, highSeverityAlerts)).toBe('fair');
      expect(tool.determineOverallStatus(85, mediumSeverityAlerts)).toBe('good');
      expect(tool.determineOverallStatus(60, highSeverityAlerts)).toBe('poor');
    });
  });

  describe('Required Declarations Calculation', () => {
    test('should calculate required VAT declarations correctly', () => {
      const period = {
        from: '2024-01-01',
        to: '2024-03-31'
      };

      const required = tool.calculateRequiredVATDeclarations(period, 'general');

      expect(required).toHaveLength(3); // Jan, Feb, Mar
      expect(required[0].period).toBe('2024-01');
      expect(required[1].period).toBe('2024-02');
      expect(required[2].period).toBe('2024-03');
    });

    test('should calculate required income tax declarations', () => {
      const period = {
        from: '2023-01-01',
        to: '2024-12-31'
      };

      const required = tool.calculateRequiredIncomeTaxDeclarations(period, 'general');

      expect(required).toHaveLength(2); // 2023, 2024
      expect(required[0].period).toBe('2023');
      expect(required[1].period).toBe('2024');
    });
  });

  describe('Error Handling', () => {
    test('should handle AFIP service errors gracefully', async () => {
      mockServices.afipClient.getTaxpayerInfo.mockRejectedValue(
        new Error('AFIP service unavailable')
      );

      const args = {
        cuit: '20-12345678-9',
        period: {
          from: '2024-01-01',
          to: '2024-06-30'
        }
      };

      const result = await tool.execute(args);

      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        code: 'TOOL_EXECUTION_ERROR'
      });
      expect(mockServices.logger.error).toHaveBeenCalled();
    });

    test('should handle individual check failures', async () => {
      mockServices.afipClient.getTaxpayerInfo.mockResolvedValue({
        cuit: '20-12345678-9',
        active: true
      });

      mockServices.afipClient.getFiscalStatus.mockResolvedValue({
        active: true
      });

      mockServices.afipClient.getVATRegistration.mockRejectedValue(
        new Error('VAT service error')
      );

      const args = {
        cuit: '20-12345678-9',
        period: {
          from: '2024-01-01',
          to: '2024-06-30'
        },
        checks: ['fiscal_status', 'vat_registration']
      };

      const result = await tool.executeLogic(args);

      expect(result.checks.fiscal_status.status).toBe('compliant');
      expect(result.checks.vat_registration.status).toBe('error');
      expect(result.overallStatus).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    test('should save compliance results to database', async () => {
      mockServices.afipClient.getTaxpayerInfo.mockResolvedValue({
        cuit: '20-12345678-9',
        active: true
      });

      mockServices.afipClient.getFiscalStatus.mockResolvedValue({
        active: true
      });

      const args = {
        cuit: '20-12345678-9',
        period: {
          from: '2024-01-01',
          to: '2024-06-30'
        },
        checks: ['fiscal_status']
      };

      await tool.executeLogic(args);

      expect(mockServices.database.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO compliance_results'),
        expect.arrayContaining([
          args.cuit,
          expect.any(String), // timestamp
          args.period.from,
          args.period.to,
          expect.any(String), // overall_status
          expect.any(Number), // score
          expect.any(String), // data JSON
          expect.any(String)  // created_at
        ])
      );
    });

    test('should handle database errors gracefully', async () => {
      mockServices.database.run.mockRejectedValue(
        new Error('Database connection failed')
      );

      mockServices.afipClient.getTaxpayerInfo.mockResolvedValue({
        cuit: '20-12345678-9',
        active: true
      });

      mockServices.afipClient.getFiscalStatus.mockResolvedValue({
        active: true
      });

      const args = {
        cuit: '20-12345678-9',
        period: {
          from: '2024-01-01',
          to: '2024-06-30'
        }
      };

      // Should not throw, should log error
      const result = await tool.executeLogic(args);

      expect(result).toBeDefined();
      expect(mockServices.logger.error).toHaveBeenCalledWith(
        'Error guardando resultado de compliance:',
        expect.any(Error)
      );
    });
  });

  describe('Alert Processing', () => {
    test('should create alerts for high severity issues', async () => {
      const mockAlertManager = mockServices.alertManager;
      mockAlertManager.createAlert.mockResolvedValue({ id: 1 });

      const result = {
        cuit: '20-12345678-9',
        alerts: [
          {
            type: 'fiscal_inactive',
            severity: 'high',
            message: 'Test alert',
            code: 'TEST_CODE'
          }
        ]
      };

      await tool.processAlerts(result);

      expect(mockAlertManager.createAlert).toHaveBeenCalledWith({
        type: 'fiscal_inactive',
        severity: 'high',
        cuit: '20-12345678-9',
        message: 'Test alert',
        code: 'TEST_CODE',
        details: {},
        source: 'compliance_check'
      });
    });

    test('should not create alerts for low severity issues', async () => {
      const result = {
        cuit: '20-12345678-9',
        alerts: [
          {
            type: 'info_alert',
            severity: 'low',
            message: 'Info alert'
          }
        ]
      };

      await tool.processAlerts(result);

      expect(mockServices.alertManager.createAlert).not.toHaveBeenCalled();
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize sensitive data in output', () => {
      const sensitiveData = {
        taxpayerInfo: {
          businessName: 'Test Company',
          apiKey: 'secret-key-123',
          token: 'auth-token-456'
        },
        password: 'secret-password'
      };

      const sanitized = tool.sanitizeOutput(sensitiveData);

      expect(sanitized.taxpayerInfo.businessName).toBe('Test Company');
      expect(sanitized.taxpayerInfo.apiKey).toBe('***HIDDEN***');
      expect(sanitized.taxpayerInfo.token).toBe('***HIDDEN***');
      expect(sanitized.password).toBe('***HIDDEN***');
    });

    test('should handle nested objects in sanitization', () => {
      const nestedData = {
        level1: {
          level2: {
            secret: 'hidden-value',
            public: 'public-value'
          }
        }
      };

      const sanitized = tool.sanitizeOutput(nestedData);

      expect(sanitized.level1.level2.secret).toBe('***HIDDEN***');
      expect(sanitized.level1.level2.public).toBe('public-value');
    });

    test('should handle arrays in sanitization', () => {
      const arrayData = {
        items: [
          { id: 1, apiKey: 'secret1' },
          { id: 2, token: 'secret2' }
        ]
      };

      const sanitized = tool.sanitizeOutput(arrayData);

      expect(sanitized.items[0].id).toBe(1);
      expect(sanitized.items[0].apiKey).toBe('***HIDDEN***');
      expect(sanitized.items[1].token).toBe('***HIDDEN***');
    });
  });

  describe('Metrics Collection', () => {
    test('should track execution metrics', async () => {
      const initialMetrics = tool.getMetrics();
      expect(initialMetrics.executions).toBe(0);

      const args = {
        cuit: '20-12345678-9',
        period: {
          from: '2024-01-01',
          to: '2024-06-30'
        }
      };

      // Mock successful execution
      mockServices.afipClient.getTaxpayerInfo.mockResolvedValue({
        cuit: '20-12345678-9',
        active: true
      });

      await tool.execute(args);

      const updatedMetrics = tool.getMetrics();
      expect(updatedMetrics.executions).toBe(1);
      expect(updatedMetrics.errors).toBe(0);
      expect(updatedMetrics.averageExecutionTime).toBeGreaterThan(0);
    });

    test('should track error metrics', async () => {
      mockServices.afipClient.getTaxpayerInfo.mockRejectedValue(
        new Error('Service error')
      );

      const args = {
        cuit: '20-12345678-9',
        period: {
          from: '2024-01-01',
          to: '2024-06-30'
        }
      };

      try {
        await tool.execute(args);
      } catch (error) {
        // Expected to throw
      }

      const metrics = tool.getMetrics();
      expect(metrics.executions).toBe(1);
      expect(metrics.errors).toBe(1);
      expect(metrics.errorRate).toBe(100);
    });

    test('should reset metrics correctly', () => {
      // Execute tool to generate metrics
      tool.metrics.executions = 5;
      tool.metrics.errors = 1;
      tool.metrics.totalTime = 1000;

      tool.resetMetrics();

      const metrics = tool.getMetrics();
      expect(metrics.executions).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.totalTime).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
    });
  });

  describe('Performance Tests', () => {
    test('should handle timeout correctly', async () => {
      // Mock a slow operation
      mockServices.afipClient.getTaxpayerInfo.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 35000)) // 35 seconds
      );

      const args = {
        cuit: '20-12345678-9',
        period: {
          from: '2024-01-01',
          to: '2024-06-30'
        }
      };

      const promise = tool.executeWithTimeout(
        tool.executeLogic(args),
        1000 // 1 second timeout
      );

      await expect(promise).rejects.toThrow('Operation timeout');
    });

    test('should complete within reasonable time for normal operations', async () => {
      mockServices.afipClient.getTaxpayerInfo.mockResolvedValue({
        cuit: '20-12345678-9',
        active: true
      });

      mockServices.afipClient.getFiscalStatus.mockResolvedValue({
        active: true
      });

      const args = {
        cuit: '20-12345678-9',
        period: {
          from: '2024-01-01',
          to: '2024-06-30'
        },
        checks: ['fiscal_status']
      };

      const startTime = Date.now();
      await tool.execute(args);
      const executionTime = Date.now() - startTime;

      // Should complete within 5 seconds in test environment
      expect(executionTime).toBeLessThan(5000);
    });
  });
});