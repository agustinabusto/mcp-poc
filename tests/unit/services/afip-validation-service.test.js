/**
 * AfipValidationService Unit Tests - User Story 4.2
 * Tests for real-time AFIP validation functionality
 */

import AfipValidationService from '../../../src/server/services/afip-validation-service.js';

// Mock ARCA service
const mockArcaService = {
    validateCUIT: jest.fn(),
    validateCAE: jest.fn(),
    getConnectivityStatus: jest.fn()
};

// Mock logger
const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock database
const mockDatabase = {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
};

describe('AfipValidationService', () => {
    let afipService;
    let mockConfig;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockConfig = {
            database: { path: ':memory:' }
        };

        afipService = new AfipValidationService(mockConfig, mockLogger, mockArcaService);
        afipService.db = mockDatabase;
    });

    describe('validateDocument', () => {
        it('should validate a complete invoice document successfully', async () => {
            // Arrange
            const documentData = {
                id: 'test-doc-1',
                documentType: 'invoice',
                structured: {
                    emisor: { cuit: '20123456789' },
                    cae: '12345678901234',
                    numeroFactura: 'A-001-00000001',
                    fecha: '2024-01-15',
                    total: 1210.00
                }
            };

            mockArcaService.validateCUIT.mockResolvedValue({
                valid: true,
                taxpayerName: 'Empresa Ejemplo S.A.',
                taxpayerType: 'Responsable Inscripto',
                status: 'Activo'
            });

            mockArcaService.validateCAE.mockResolvedValue({
                valid: true,
                expirationDate: '2024-03-15',
                authorizedRange: { from: 1, to: 99999 }
            });

            mockDatabase.get.mockResolvedValue(null); // No duplicates
            mockDatabase.run.mockResolvedValue({ lastID: 1 });

            // Act
            const result = await afipService.validateDocument(documentData);

            // Assert
            expect(result).toBeDefined();
            expect(result.documentId).toBe('test-doc-1');
            expect(result.overall).toMatch(/valid|pending/);
            expect(result.cuitValidation).toBeDefined();
            expect(result.caeValidation).toBeDefined();
            expect(result.duplicateCheck).toBeDefined();
            expect(result.taxConsistency).toBeDefined();

            expect(mockArcaService.validateCUIT).toHaveBeenCalledWith('20123456789');
            expect(mockArcaService.validateCAE).toHaveBeenCalledWith(
                '12345678901234',
                expect.objectContaining({
                    cuit: '20123456789',
                    invoiceNumber: 'A-001-00000001'
                })
            );
        });

        it('should handle missing CUIT gracefully', async () => {
            // Arrange
            const documentData = {
                id: 'test-doc-2',
                documentType: 'invoice',
                structured: {
                    numeroFactura: 'A-001-00000002',
                    fecha: '2024-01-15',
                    total: 1000.00
                }
            };

            mockDatabase.get.mockResolvedValue(null);
            mockDatabase.run.mockResolvedValue({ lastID: 1 });

            // Act
            const result = await afipService.validateDocument(documentData);

            // Assert
            expect(result).toBeDefined();
            expect(result.cuitValidation).toEqual({
                valid: false,
                error: 'CUIT no proporcionado',
                severity: 'warning'
            });
            expect(mockArcaService.validateCUIT).not.toHaveBeenCalled();
        });

        it('should handle ARCA service errors gracefully', async () => {
            // Arrange
            const documentData = {
                id: 'test-doc-3',
                documentType: 'invoice',
                structured: {
                    emisor: { cuit: '20123456789' }
                }
            };

            mockArcaService.validateCUIT.mockRejectedValue(new Error('ARCA service unavailable'));
            mockDatabase.get.mockResolvedValue(null);
            mockDatabase.run.mockResolvedValue({ lastID: 1 });

            // Act
            const result = await afipService.validateDocument(documentData);

            // Assert
            expect(result).toBeDefined();
            expect(result.cuitValidation).toEqual({
                valid: false,
                error: 'ARCA service unavailable',
                severity: 'error'
            });
        });
    });

    describe('validateCUITWithAfip', () => {
        it('should validate a valid CUIT successfully', async () => {
            // Arrange
            const cuit = '20123456789';
            
            mockArcaService.validateCUIT.mockResolvedValue({
                valid: true,
                taxpayerName: 'Juan Pérez',
                taxpayerType: 'Persona Física',
                status: 'Activo'
            });

            mockDatabase.get.mockResolvedValue(null); // No cache
            mockDatabase.run.mockResolvedValue({ lastID: 1 });

            // Act
            const result = await afipService.validateCUITWithAfip(cuit);

            // Assert
            expect(result).toBeDefined();
            expect(result.valid).toBe(true);
            expect(result.cuit).toBe(cuit);
            expect(result.taxpayerName).toBe('Juan Pérez');
            expect(result.taxpayerType).toBe('Persona Física');
            expect(result.validatedAt).toBeDefined();
            expect(result.responseTime).toBeDefined();
            expect(mockArcaService.validateCUIT).toHaveBeenCalledWith(cuit);
        });

        it('should reject invalid CUIT format', async () => {
            // Arrange
            const invalidCuit = '123456789'; // Too short

            // Act
            const result = await afipService.validateCUITWithAfip(invalidCuit);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Formato de CUIT inválido');
            expect(result.severity).toBe('error');
            expect(mockArcaService.validateCUIT).not.toHaveBeenCalled();
        });

        it('should use cached results when available', async () => {
            // Arrange
            const cuit = '20123456789';
            const cachedResult = {
                cache_value: JSON.stringify({
                    valid: true,
                    taxpayerName: 'Cached Company',
                    validatedAt: '2024-01-15T10:00:00Z'
                })
            };

            mockDatabase.get.mockResolvedValue(cachedResult);

            // Act
            const result = await afipService.validateCUITWithAfip(cuit);

            // Assert
            expect(result.valid).toBe(true);
            expect(result.taxpayerName).toBe('Cached Company');
            expect(mockArcaService.validateCUIT).not.toHaveBeenCalled();
        });
    });

    describe('validateCAE', () => {
        it('should validate a valid CAE successfully', async () => {
            // Arrange
            const cae = '12345678901234';
            const invoiceData = {
                cuit: '20123456789',
                invoiceType: 'A',
                invoiceNumber: 'A-001-00000001',
                amount: 1210.00,
                date: '2024-01-15'
            };

            mockArcaService.validateCAE.mockResolvedValue({
                valid: true,
                expirationDate: '2024-03-15',
                authorizedRange: { from: 1, to: 99999 }
            });

            mockDatabase.get.mockResolvedValue(null); // No cache
            mockDatabase.run.mockResolvedValue({ lastID: 1 });

            // Act
            const result = await afipService.validateCAE(cae, invoiceData);

            // Assert
            expect(result).toBeDefined();
            expect(result.valid).toBe(true);
            expect(result.cae).toBe(cae);
            expect(result.expirationDate).toBe('2024-03-15');
            expect(result.authorizedRange).toEqual({ from: 1, to: 99999 });
            expect(result.validatedAt).toBeDefined();
            expect(result.responseTime).toBeDefined();
        });

        it('should reject invalid CAE format', async () => {
            // Arrange
            const invalidCae = '123'; // Too short
            const invoiceData = {};

            // Act
            const result = await afipService.validateCAE(invalidCae, invoiceData);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.error).toBe('CAE inválido - debe tener 14 dígitos');
            expect(result.severity).toBe('error');
            expect(mockArcaService.validateCAE).not.toHaveBeenCalled();
        });
    });

    describe('checkDuplicateInvoice', () => {
        it('should detect duplicate invoices', async () => {
            // Arrange
            const invoiceNumber = 'A-001-00000001';
            const cuit = '20123456789';
            const date = '2024-01-15';

            const existingInvoice = {
                id: 'existing-doc',
                created_at: '2024-01-10T10:00:00Z'
            };

            mockDatabase.all.mockResolvedValue([existingInvoice, existingInvoice]); // Duplicate found

            // Act
            const result = await afipService.checkDuplicateInvoice(invoiceNumber, cuit, date);

            // Assert
            expect(result.isDuplicate).toBe(true);
            expect(result.duplicateCount).toBe(1);
            expect(result.severity).toBe('warning');
        });

        it('should return no duplicates when none exist', async () => {
            // Arrange
            const invoiceNumber = 'A-001-00000001';
            const cuit = '20123456789';
            const date = '2024-01-15';

            mockDatabase.all.mockResolvedValue([{ id: 'current-doc' }]); // Only current document

            // Act
            const result = await afipService.checkDuplicateInvoice(invoiceNumber, cuit, date);

            // Assert
            expect(result.isDuplicate).toBe(false);
            expect(result.duplicateCount).toBe(0);
            expect(result.severity).toBe('info');
        });
    });

    describe('validateTaxConsistency', () => {
        it('should validate tax consistency successfully', async () => {
            // Arrange
            const documentData = {
                structured: {
                    subtotal: 1000.00,
                    iva: 210.00,
                    total: 1210.00
                }
            };

            // Act
            const result = await afipService.validateTaxConsistency(documentData);

            // Assert
            expect(result).toBeDefined();
            expect(result.valid).toBe(true);
            expect(result.issues).toEqual([]);
            expect(result.totalIssues).toBe(0);
            expect(result.validatedAt).toBeDefined();
        });

        it('should detect IVA inconsistencies', async () => {
            // Arrange
            const documentData = {
                structured: {
                    subtotal: 1000.00,
                    iva: 150.00, // Should be 210.00 (21%)
                    total: 1210.00
                }
            };

            // Act
            const result = await afipService.validateTaxConsistency(documentData);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
            expect(result.totalIssues).toBeGreaterThan(0);
        });
    });

    describe('calculateOverallValidation', () => {
        it('should return "valid" when all validations pass', () => {
            // Arrange
            const results = {
                cuitValidation: { valid: true },
                caeValidation: { valid: true },
                duplicateCheck: { isDuplicate: false },
                taxConsistency: { valid: true, issues: [] },
                errors: []
            };

            // Act
            const overall = afipService.calculateOverallValidation(results);

            // Assert
            expect(overall).toBe('valid');
        });

        it('should return "valid_with_warnings" when there are warnings', () => {
            // Arrange
            const results = {
                cuitValidation: { valid: true },
                caeValidation: { valid: true },
                duplicateCheck: { isDuplicate: true, severity: 'warning' },
                taxConsistency: { valid: true, issues: [] },
                errors: [{ severity: 'warning', message: 'Test warning' }]
            };

            // Act
            const overall = afipService.calculateOverallValidation(results);

            // Assert
            expect(overall).toBe('valid_with_warnings');
        });

        it('should return "invalid" when there are critical errors', () => {
            // Arrange
            const results = {
                cuitValidation: { valid: false },
                caeValidation: { valid: true },
                duplicateCheck: { isDuplicate: false },
                taxConsistency: { valid: true, issues: [] },
                errors: [{ severity: 'error', message: 'Test error' }]
            };

            // Act
            const overall = afipService.calculateOverallValidation(results);

            // Assert
            expect(overall).toBe('invalid');
        });
    });

    describe('getConnectivityStatus', () => {
        it('should return connectivity status successfully', async () => {
            // Arrange
            mockDatabase.all.mockResolvedValue([
                {
                    service_name: 'cuit_validation',
                    status: 'online',
                    response_time_ms: 250,
                    checked_at: '2024-01-15T10:00:00Z'
                }
            ]);

            // Act
            const status = await afipService.getConnectivityStatus();

            // Assert
            expect(status).toBeDefined();
            expect(status.services).toBeDefined();
            expect(status.overall).toMatch(/online|degraded|unknown/);
            expect(status.lastChecked).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle database connection errors gracefully', async () => {
            // Arrange
            const documentData = {
                id: 'test-doc-error',
                documentType: 'invoice',
                structured: { emisor: { cuit: '20123456789' } }
            };

            mockDatabase.run.mockRejectedValue(new Error('Database connection failed'));
            mockArcaService.validateCUIT.mockResolvedValue({ valid: true });

            // Act & Assert
            await expect(afipService.validateDocument(documentData)).rejects.toThrow();
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('should identify connectivity errors correctly', () => {
            // Arrange
            const connectivityError = new Error('ENOTFOUND api.afip.gov.ar');
            const regularError = new Error('Invalid input');

            // Act & Assert
            expect(afipService.isConnectivityError(connectivityError)).toBe(true);
            expect(afipService.isConnectivityError(regularError)).toBe(false);
        });
    });

    describe('Cache Management', () => {
        it('should set and get cache correctly', async () => {
            // Arrange
            const cacheKey = 'test_cache_key';
            const testData = { test: 'data', timestamp: Date.now() };
            const cacheType = 'cuit';

            mockDatabase.run.mockResolvedValue({ lastID: 1 });
            mockDatabase.get.mockResolvedValue({
                cache_value: JSON.stringify(testData)
            });

            // Act
            await afipService.setCachedResult(cacheKey, testData, cacheType);
            const result = await afipService.getCachedResult(cacheKey, cacheType);

            // Assert
            expect(result).toEqual(testData);
            expect(mockDatabase.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT OR REPLACE INTO afip_validation_cache'),
                expect.arrayContaining([cacheKey, JSON.stringify(testData), cacheType])
            );
        });
    });
});