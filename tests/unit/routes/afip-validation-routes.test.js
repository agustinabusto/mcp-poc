/**
 * AFIP Validation Routes Unit Tests - User Story 4.2
 * Tests for AFIP validation API endpoints
 */

import request from 'supertest';
import express from 'express';
import afipValidationRoutes from '../../../src/server/routes/afip-validation-routes.js';

// Mock AfipValidationService
const mockAfipService = {
    validateDocument: jest.fn(),
    getValidationResults: jest.fn(),
    getConnectivityStatus: jest.fn(),
    processRetryQueue: jest.fn(),
    validateCUITWithAfip: jest.fn(),
    validateCAE: jest.fn()
};

// Mock database
const mockDatabase = {
    getConnection: jest.fn(),
    isInitialized: true
};

const mockConnection = {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
};

describe('AFIP Validation Routes', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        
        app = express();
        app.use(express.json());
        
        // Mock app.locals
        app.locals.afipValidationService = mockAfipService;
        app.locals.database = mockDatabase;
        app.locals.wsServer = {
            broadcast: jest.fn()
        };
        
        mockDatabase.getConnection.mockResolvedValue(mockConnection);
        
        app.use('/api/afip', afipValidationRoutes);
    });

    describe('GET /api/afip/test', () => {
        it('should return connectivity test success', async () => {
            // Arrange
            mockAfipService.getConnectivityStatus.mockResolvedValue({
                status: 'online',
                services: { wsaa: 'online', wsfev1: 'online' }
            });

            // Act
            const response = await request(app)
                .get('/api/afip/test')
                .expect(200);

            // Assert
            expect(response.body).toEqual({
                success: true,
                message: 'AFIP validation service is available',
                timestamp: expect.any(String),
                connectivity: expect.any(Object)
            });
        });

        it('should handle service unavailable', async () => {
            // Arrange
            app.locals.afipValidationService = null;

            // Act
            const response = await request(app)
                .get('/api/afip/test')
                .expect(503);

            // Assert
            expect(response.body).toEqual({
                success: false,
                error: 'AFIP Validation Service not initialized',
                code: 'SERVICE_NOT_AVAILABLE'
            });
        });
    });

    describe('POST /api/afip/validate/:documentId', () => {
        it('should validate document successfully', async () => {
            // Arrange
            const documentId = 'test-doc-123';
            const mockDocumentData = {
                id: documentId,
                documentType: 'invoice',
                structured: {
                    cuit: '20123456789',
                    cae: '12345678901234',
                    numero: 'A-001-00000001'
                }
            };

            const mockValidationResults = {
                documentId: documentId,
                overall: 'valid',
                cuitValidation: { valid: true, taxpayerName: 'Test Company' },
                caeValidation: { valid: true, expirationDate: '2024-03-15' },
                duplicateCheck: { isDuplicate: false },
                taxConsistency: { valid: true, issues: [] }
            };

            mockConnection.get.mockResolvedValue({
                process_id: 'proc-123',
                file_path: '/test/path',
                document_type: 'invoice',
                client_id: 'test-client',
                structured_data: JSON.stringify({ extractedData: mockDocumentData.structured }),
                raw_text: 'Test invoice text',
                confidence: 95.5
            });

            mockAfipService.validateDocument.mockResolvedValue(mockValidationResults);

            // Act
            const response = await request(app)
                .post(`/api/afip/validate/${documentId}`)
                .send({ priority: 1 })
                .expect(200);

            // Assert
            expect(response.body).toEqual({
                success: true,
                data: mockValidationResults,
                message: 'AFIP validation completed successfully'
            });

            expect(mockAfipService.validateDocument).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: documentId,
                    cuit: '20123456789',
                    cae: '12345678901234'
                }),
                expect.objectContaining({ priority: 1 })
            );
        });

        it('should handle document not found', async () => {
            // Arrange
            const documentId = 'non-existent-doc';
            mockConnection.get.mockResolvedValue(null);

            // Act
            const response = await request(app)
                .post(`/api/afip/validate/${documentId}`)
                .expect(404);

            // Assert
            expect(response.body).toEqual({
                success: false,
                error: 'Document not found',
                code: 'DOCUMENT_NOT_FOUND'
            });
        });

        it('should handle validation service errors', async () => {
            // Arrange
            const documentId = 'test-doc-error';
            
            mockConnection.get.mockResolvedValue({
                id: documentId,
                structured_data: JSON.stringify({ cuit: '20123456789' })
            });

            mockAfipService.validateDocument.mockRejectedValue(
                new Error('AFIP service temporarily unavailable')
            );

            // Act
            const response = await request(app)
                .post(`/api/afip/validate/${documentId}`)
                .expect(500);

            // Assert
            expect(response.body).toEqual({
                success: false,
                error: 'AFIP service temporarily unavailable',
                code: 'VALIDATION_ERROR'
            });
        });
    });

    describe('GET /api/afip/validate/:documentId', () => {
        it('should return existing validation results', async () => {
            // Arrange
            const documentId = 'test-doc-123';
            const mockResults = {
                complete: {
                    overall: 'valid',
                    validatedAt: '2024-01-15T10:00:00Z'
                },
                cuit: {
                    valid: true,
                    taxpayerName: 'Test Company',
                    validatedAt: '2024-01-15T10:00:00Z'
                }
            };

            mockAfipService.getValidationResults.mockResolvedValue(mockResults);

            // Act
            const response = await request(app)
                .get(`/api/afip/validate/${documentId}`)
                .expect(200);

            // Assert
            expect(response.body).toEqual({
                success: true,
                data: expect.objectContaining({
                    overall: 'valid',
                    cuitValidation: expect.objectContaining({
                        valid: true,
                        validatedAt: expect.any(String)
                    })
                }),
                documentId: documentId
            });
        });

        it('should handle no validation results found', async () => {
            // Arrange
            const documentId = 'no-validation-doc';
            mockAfipService.getValidationResults.mockResolvedValue({});

            // Act
            const response = await request(app)
                .get(`/api/afip/validate/${documentId}`)
                .expect(404);

            // Assert
            expect(response.body).toEqual({
                success: false,
                error: 'No validation results found for this document',
                code: 'VALIDATION_NOT_FOUND'
            });
        });
    });

    describe('GET /api/afip/status', () => {
        it('should return AFIP connectivity status', async () => {
            // Arrange
            const mockStatus = {
                status: 'online',
                services: {
                    wsaa: 'online',
                    wsfev1: 'online',
                    wsmtxca: 'online'
                },
                lastCheck: '2024-01-15T10:00:00Z'
            };

            mockAfipService.getConnectivityStatus.mockResolvedValue(mockStatus);

            // Act
            const response = await request(app)
                .get('/api/afip/status')
                .expect(200);

            // Assert
            expect(response.body).toEqual({
                success: true,
                data: mockStatus,
                timestamp: expect.any(String)
            });
        });
    });

    describe('POST /api/afip/retry-queue', () => {
        it('should process retry queue successfully', async () => {
            // Arrange
            mockAfipService.processRetryQueue.mockResolvedValue();

            // Act
            const response = await request(app)
                .post('/api/afip/retry-queue')
                .expect(200);

            // Assert
            expect(response.body).toEqual({
                success: true,
                message: 'Retry queue processed successfully',
                timestamp: expect.any(String)
            });

            expect(mockAfipService.processRetryQueue).toHaveBeenCalled();
        });
    });

    describe('POST /api/afip/validate-cuit', () => {
        it('should validate CUIT successfully', async () => {
            // Arrange
            const cuit = '20123456789';
            const mockValidationResult = {
                valid: true,
                cuit: cuit,
                taxpayerName: 'Juan Pérez',
                taxpayerType: 'Persona Física',
                responseTime: 250
            };

            mockAfipService.validateCUITWithAfip.mockResolvedValue(mockValidationResult);

            // Act
            const response = await request(app)
                .post('/api/afip/validate-cuit')
                .send({ cuit })
                .expect(200);

            // Assert
            expect(response.body).toEqual({
                success: true,
                data: mockValidationResult,
                cuit: cuit
            });

            expect(mockAfipService.validateCUITWithAfip).toHaveBeenCalledWith(cuit);
        });

        it('should handle missing CUIT', async () => {
            // Act
            const response = await request(app)
                .post('/api/afip/validate-cuit')
                .send({})
                .expect(400);

            // Assert
            expect(response.body).toEqual({
                success: false,
                error: 'CUIT is required',
                code: 'MISSING_CUIT'
            });
        });
    });

    describe('POST /api/afip/validate-cae', () => {
        it('should validate CAE successfully', async () => {
            // Arrange
            const cae = '12345678901234';
            const invoiceData = {
                cuit: '20123456789',
                invoiceNumber: 'A-001-00000001',
                amount: 1210.00
            };

            const mockValidationResult = {
                valid: true,
                cae: cae,
                expirationDate: '2024-03-15',
                authorizedRange: { from: 1, to: 99999 },
                responseTime: 300
            };

            mockAfipService.validateCAE.mockResolvedValue(mockValidationResult);

            // Act
            const response = await request(app)
                .post('/api/afip/validate-cae')
                .send({ cae, invoiceData })
                .expect(200);

            // Assert
            expect(response.body).toEqual({
                success: true,
                data: mockValidationResult,
                cae: cae
            });

            expect(mockAfipService.validateCAE).toHaveBeenCalledWith(cae, invoiceData);
        });

        it('should handle missing CAE', async () => {
            // Act
            const response = await request(app)
                .post('/api/afip/validate-cae')
                .send({ invoiceData: {} })
                .expect(400);

            // Assert
            expect(response.body).toEqual({
                success: false,
                error: 'CAE is required',
                code: 'MISSING_CAE'
            });
        });
    });

    describe('GET /api/afip/stats', () => {
        it('should return validation statistics', async () => {
            // Arrange
            const mockStats = {
                general: {
                    total_documents_validated: 150,
                    total_validations: 600,
                    valid_count: 580,
                    success_rate: 96.7,
                    avg_response_time_ms: 275
                },
                byType: [
                    {
                        validation_type: 'cuit',
                        count: 150,
                        valid_count: 148,
                        success_rate: 98.7,
                        avg_response_time_ms: 250
                    }
                ],
                connectivity: [
                    {
                        service_name: 'cuit_validation',
                        status: 'online',
                        check_count: 24,
                        avg_response_time: 245,
                        last_check: '2024-01-15T10:00:00Z'
                    }
                ]
            };

            mockConnection.get.mockResolvedValue(mockStats.general);
            mockConnection.all
                .mockResolvedValueOnce(mockStats.byType)
                .mockResolvedValueOnce(mockStats.connectivity);

            // Act
            const response = await request(app)
                .get('/api/afip/stats')
                .query({ period: '30d' })
                .expect(200);

            // Assert
            expect(response.body).toEqual({
                success: true,
                data: expect.objectContaining({
                    general: expect.any(Object),
                    byType: expect.any(Array),
                    connectivity: expect.any(Array)
                }),
                period: '30d',
                clientId: 'all',
                generatedAt: expect.any(String)
            });
        });
    });

    describe('DELETE /api/afip/cache/:documentId', () => {
        it('should clear validation cache successfully', async () => {
            // Arrange
            const documentId = 'test-doc-123';
            mockConnection.run.mockResolvedValue({ changes: 1 });

            // Act
            const response = await request(app)
                .delete(`/api/afip/cache/${documentId}`)
                .expect(200);

            // Assert
            expect(response.body).toEqual({
                success: true,
                message: 'AFIP validation cache cleared successfully',
                documentId: documentId
            });

            expect(mockConnection.run).toHaveBeenCalledWith(
                'DELETE FROM afip_validations WHERE document_id = ?',
                [documentId]
            );
        });
    });

    describe('WebSocket Integration', () => {
        it('should broadcast WebSocket events on validation completion', async () => {
            // Arrange
            const documentId = 'test-doc-123';
            const mockValidationResults = {
                documentId: documentId,
                overall: 'valid'
            };

            mockConnection.get.mockResolvedValue({
                structured_data: JSON.stringify({ cuit: '20123456789' })
            });

            mockAfipService.validateDocument.mockResolvedValue(mockValidationResults);

            // Act
            await request(app)
                .post(`/api/afip/validate/${documentId}`)
                .send({ priority: 1 })
                .expect(200);

            // Assert
            expect(app.locals.wsServer.broadcast).toHaveBeenCalledWith({
                type: 'afip_validation_complete',
                documentId: documentId,
                validationResults: mockValidationResults
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle database connection errors', async () => {
            // Arrange
            const documentId = 'test-doc-error';
            mockDatabase.getConnection.mockRejectedValue(new Error('Database connection failed'));

            // Act
            const response = await request(app)
                .post(`/api/afip/validate/${documentId}`)
                .expect(500);

            // Assert
            expect(response.body).toEqual({
                success: false,
                error: 'Database connection failed',
                code: 'VALIDATION_ERROR'
            });
        });

        it('should handle service unavailable scenarios', async () => {
            // Arrange
            app.locals.afipValidationService = null;

            // Act
            const response = await request(app)
                .get('/api/afip/status')
                .expect(503);

            // Assert
            expect(response.body).toEqual({
                success: false,
                error: 'AFIP Validation Service not available',
                code: 'SERVICE_NOT_AVAILABLE'
            });
        });
    });
});