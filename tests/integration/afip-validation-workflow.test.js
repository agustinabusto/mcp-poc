/**
 * AFIP Validation Workflow Integration Test - User Story 4.2
 * End-to-end test for real-time AFIP validation functionality
 */

import request from 'supertest';
import { createServer } from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import ocrRoutes from '../../src/server/routes/ocr-routes.js';
import afipRoutes from '../../src/server/routes/afip-validation-routes.js';

// Mock services and database
const mockDatabase = {
    getConnection: jest.fn(),
    isInitialized: true
};

const mockConnection = {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn()
};

const mockAfipService = {
    validateDocument: jest.fn(),
    getValidationResults: jest.fn(),
    getConnectivityStatus: jest.fn()
};

describe('AFIP Validation Workflow Integration', () => {
    let app;
    let server;
    let wsServer;
    let wsMessages;

    beforeAll(async () => {
        // Setup Express app
        app = express();
        app.use(express.json());
        
        // Setup mocks
        app.locals.database = mockDatabase;
        app.locals.afipValidationService = mockAfipService;
        
        mockDatabase.getConnection.mockResolvedValue(mockConnection);
        
        // Setup WebSocket server
        server = createServer(app);
        wsServer = new WebSocketServer({ server });
        wsMessages = [];
        
        app.locals.wsServer = {
            broadcast: (message) => {
                wsMessages.push(message);
                wsServer.clients.forEach(client => {
                    if (client.readyState === 1) { // WebSocket.OPEN
                        client.send(JSON.stringify(message));
                    }
                });
            }
        };

        // Mount routes
        app.use('/api/ocr', ocrRoutes);
        app.use('/api/afip', afipRoutes);

        // Start server
        await new Promise((resolve) => {
            server.listen(0, resolve);
        });
    });

    afterAll(async () => {
        if (server) {
            await new Promise((resolve) => {
                server.close(resolve);
            });
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
        wsMessages = [];
    });

    describe('Complete AFIP Validation Workflow', () => {
        it('should process invoice upload and trigger AFIP validation automatically', async () => {
            // Arrange
            const mockInvoiceFile = Buffer.from('%PDF-1.4 Mock Invoice Content');
            const documentId = 123;
            const processId = 'proc-test-123';

            // Mock database responses for OCR upload
            mockConnection.run
                .mockResolvedValueOnce({ lastID: documentId }) // OCR log insert
                .mockResolvedValueOnce({ lastID: 1 }); // OCR results insert

            // Mock AFIP validation results
            const mockValidationResults = {
                documentId: documentId,
                overall: 'valid',
                cuitValidation: {
                    valid: true,
                    cuit: '20123456789',
                    taxpayerName: 'Empresa Ejemplo S.A.',
                    taxpayerType: 'Responsable Inscripto',
                    responseTime: 250
                },
                caeValidation: {
                    valid: true,
                    cae: '12345678901234',
                    expirationDate: '2024-03-15',
                    responseTime: 300
                },
                duplicateCheck: {
                    isDuplicate: false,
                    responseTime: 100
                },
                taxConsistency: {
                    valid: true,
                    issues: [],
                    totalIssues: 0
                },
                processingTimeMs: 750,
                validatedAt: new Date().toISOString()
            };

            mockAfipService.validateDocument.mockResolvedValue(mockValidationResults);

            // Act - Step 1: Upload invoice document
            const uploadResponse = await request(app)
                .post('/api/ocr/upload')
                .attach('document', mockInvoiceFile, 'test-invoice.pdf')
                .field('clientId', 'test-client')
                .field('documentType', 'invoice')
                .expect(200);

            // Verify OCR processing response
            expect(uploadResponse.body).toMatchObject({
                success: true,
                processId: expect.any(String),
                documentId: documentId,
                afipValidation: {
                    triggered: true,
                    status: 'processing'
                }
            });

            // Simulate async AFIP validation completion (in real scenario this happens automatically)
            await new Promise(resolve => setTimeout(resolve, 100));

            // Act - Step 2: Check validation results
            mockAfipService.getValidationResults.mockResolvedValue({
                complete: mockValidationResults
            });

            const validationResponse = await request(app)
                .get(`/api/afip/validate/${documentId}`)
                .expect(200);

            // Assert validation results
            expect(validationResponse.body).toMatchObject({
                success: true,
                documentId: documentId.toString(),
                data: expect.objectContaining({
                    overall: 'valid'
                })
            });

            // Verify that AFIP validation service was called with correct parameters
            expect(mockAfipService.validateDocument).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: documentId,
                    documentType: 'invoice',
                    structured: expect.objectContaining({
                        type: 'invoice'
                    })
                }),
                expect.objectContaining({
                    priority: 2
                })
            );

            // Verify WebSocket messages were sent
            expect(wsMessages).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'afip_validation_triggered',
                        documentId: documentId,
                        documentType: 'invoice'
                    })
                ])
            );
        });

        it('should handle OCR extraction and subsequent AFIP validation', async () => {
            // Arrange
            const filePath = '/test/path/invoice.pdf';
            const documentId = 456;
            
            // Mock document lookup for AFIP validation
            mockConnection.get.mockResolvedValue({
                id: documentId
            });

            const mockValidationResults = {
                documentId: documentId,
                overall: 'valid_with_warnings',
                cuitValidation: { valid: true },
                caeValidation: { valid: true },
                duplicateCheck: { isDuplicate: true, duplicateCount: 1 },
                taxConsistency: { valid: true, issues: [] }
            };

            mockAfipService.validateDocument.mockResolvedValue(mockValidationResults);

            // Act - Extract invoice data
            const extractResponse = await request(app)
                .post('/api/ocr/extract-invoice')
                .send({
                    filePath: filePath,
                    clientId: 'test-client'
                })
                .expect(200);

            // Assert extraction response includes AFIP validation trigger
            expect(extractResponse.body).toMatchObject({
                success: true,
                documentType: 'invoice',
                extractedData: expect.objectContaining({
                    cuit: expect.any(String),
                    numero: expect.any(String)
                }),
                afipValidation: {
                    triggered: true,
                    status: 'processing'
                }
            });

            // Verify WebSocket message for validation completion
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(wsMessages).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: 'afip_validation_completed',
                        documentId: documentId,
                        source: 'invoice_extraction'
                    })
                ])
            );
        });

        it('should handle validation errors gracefully', async () => {
            // Arrange
            const documentId = 789;
            const mockDocumentData = {
                id: documentId,
                structured_data: JSON.stringify({
                    extractedData: {
                        cuit: 'invalid-cuit',
                        cae: '123' // Invalid CAE
                    }
                })
            };

            mockConnection.get.mockResolvedValue(mockDocumentData);

            // Mock AFIP service to return validation errors
            const mockValidationError = {
                documentId: documentId,
                overall: 'invalid',
                cuitValidation: {
                    valid: false,
                    error: 'Formato de CUIT inválido',
                    severity: 'error'
                },
                caeValidation: {
                    valid: false,
                    error: 'CAE inválido - debe tener 14 dígitos',
                    severity: 'error'
                },
                errors: [
                    {
                        type: 'validation_error',
                        message: 'Múltiples errores de validación detectados',
                        severity: 'error'
                    }
                ]
            };

            mockAfipService.validateDocument.mockResolvedValue(mockValidationError);

            // Act
            const response = await request(app)
                .post(`/api/afip/validate/${documentId}`)
                .send({ priority: 1 })
                .expect(200);

            // Assert error handling
            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    overall: 'invalid',
                    errors: expect.arrayContaining([
                        expect.objectContaining({
                            severity: 'error'
                        })
                    ])
                })
            });
        });

        it('should handle connectivity issues with retry mechanism', async () => {
            // Arrange
            const documentId = 999;
            
            mockConnection.get.mockResolvedValue({
                structured_data: JSON.stringify({
                    extractedData: { cuit: '20123456789' }
                })
            });

            // Mock connectivity error first, then success
            mockAfipService.validateDocument
                .mockRejectedValueOnce(new Error('ENOTFOUND api.afip.gov.ar'))
                .mockResolvedValueOnce({
                    documentId: documentId,
                    overall: 'valid',
                    cuitValidation: { valid: true }
                });

            // Act - First attempt (should fail)
            const firstResponse = await request(app)
                .post(`/api/afip/validate/${documentId}`)
                .send({ priority: 1 })
                .expect(500);

            expect(firstResponse.body.error).toContain('ENOTFOUND');

            // Act - Retry (should succeed)
            const retryResponse = await request(app)
                .post(`/api/afip/validate/${documentId}`)
                .send({ priority: 1 })
                .expect(200);

            // Assert retry success
            expect(retryResponse.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    overall: 'valid'
                })
            });
        });

        it('should return validation statistics correctly', async () => {
            // Arrange
            const mockStatsData = {
                general: {
                    total_documents_validated: 100,
                    total_validations: 400,
                    valid_count: 380,
                    success_rate: 95.0,
                    avg_response_time_ms: 300
                },
                byType: [
                    {
                        validation_type: 'cuit',
                        count: 100,
                        valid_count: 98,
                        success_rate: 98.0,
                        avg_response_time_ms: 250
                    },
                    {
                        validation_type: 'cae',
                        count: 100,
                        valid_count: 95,
                        success_rate: 95.0,
                        avg_response_time_ms: 350
                    }
                ],
                connectivity: [
                    {
                        service_name: 'cuit_validation',
                        status: 'online',
                        check_count: 48,
                        avg_response_time: 245,
                        last_check: '2024-01-15T10:00:00Z'
                    }
                ]
            };

            mockConnection.get.mockResolvedValue(mockStatsData.general);
            mockConnection.all
                .mockResolvedValueOnce(mockStatsData.byType)
                .mockResolvedValueOnce(mockStatsData.connectivity);

            // Act
            const response = await request(app)
                .get('/api/afip/stats')
                .query({ period: '30d', clientId: 'test-client' })
                .expect(200);

            // Assert
            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    general: expect.objectContaining({
                        success_rate: 95.0
                    }),
                    byType: expect.arrayContaining([
                        expect.objectContaining({
                            validation_type: 'cuit',
                            success_rate: 98.0
                        })
                    ]),
                    connectivity: expect.arrayContaining([
                        expect.objectContaining({
                            service_name: 'cuit_validation',
                            status: 'online'
                        })
                    ])
                }),
                period: '30d',
                clientId: 'test-client'
            });
        });
    });

    describe('Real-time WebSocket Communication', () => {
        it('should broadcast validation updates via WebSocket', (done) => {
            // Arrange
            const client = new (require('ws'))(`ws://localhost:${server.address().port}`);
            const documentId = 555;
            let messageReceived = false;

            client.on('open', async () => {
                // Setup message listener
                client.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    
                    if (message.type === 'afip_validation_triggered' && message.documentId === documentId) {
                        messageReceived = true;
                        expect(message).toMatchObject({
                            type: 'afip_validation_triggered',
                            documentId: documentId,
                            documentType: 'invoice'
                        });
                        
                        client.close();
                        done();
                    }
                });

                // Trigger validation that should broadcast WebSocket message
                mockConnection.run.mockResolvedValue({ lastID: documentId });
                mockAfipService.validateDocument.mockResolvedValue({
                    documentId: documentId,
                    overall: 'valid'
                });

                await request(app)
                    .post('/api/ocr/upload')
                    .attach('document', Buffer.from('PDF content'), 'test.pdf')
                    .field('documentType', 'invoice')
                    .expect(200);
            });

            client.on('error', (error) => {
                done(error);
            });

            // Timeout fallback
            setTimeout(() => {
                if (!messageReceived) {
                    client.close();
                    done(new Error('WebSocket message not received within timeout'));
                }
            }, 5000);
        });
    });

    describe('Performance and Load Testing', () => {
        it('should handle multiple concurrent validation requests', async () => {
            // Arrange
            const documentIds = [1001, 1002, 1003, 1004, 1005];
            const validationPromises = [];

            mockConnection.get.mockResolvedValue({
                structured_data: JSON.stringify({
                    extractedData: { cuit: '20123456789' }
                })
            });

            mockAfipService.validateDocument.mockImplementation((data) => {
                return Promise.resolve({
                    documentId: data.id,
                    overall: 'valid',
                    processingTimeMs: Math.random() * 500 + 200
                });
            });

            // Act - Send concurrent requests
            for (const documentId of documentIds) {
                const promise = request(app)
                    .post(`/api/afip/validate/${documentId}`)
                    .send({ priority: 1 })
                    .expect(200);
                
                validationPromises.push(promise);
            }

            const responses = await Promise.all(validationPromises);

            // Assert - All requests should succeed
            responses.forEach((response, index) => {
                expect(response.body).toMatchObject({
                    success: true,
                    data: expect.objectContaining({
                        documentId: documentIds[index],
                        overall: 'valid'
                    })
                });
            });

            // Verify service was called for each document
            expect(mockAfipService.validateDocument).toHaveBeenCalledTimes(documentIds.length);
        });
    });
});