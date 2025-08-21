import request from 'supertest';
import { createServer } from 'http';
import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';
import { MLEnhancedOCRService } from '../../src/server/services/ml-learning-service.js';
import ocrMLRoutes from '../../src/server/routes/ocr-ml-routes.js';

describe('ML-Enhanced OCR Integration Tests', () => {
    let app;
    let server;
    let testDb;
    let mlOCRService;

    beforeAll(async () => {
        // Create test database
        testDb = await open({
            filename: ':memory:',
            driver: sqlite3.Database
        });

        // Initialize complete schema
        await testDb.exec(`
            CREATE TABLE IF NOT EXISTS ocr_processing_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                process_id TEXT UNIQUE NOT NULL,
                file_path TEXT NOT NULL,
                document_type TEXT NOT NULL CHECK(document_type IN ('auto', 'invoice', 'bank_statement', 'receipt', 'general')),
                client_id TEXT,
                status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'processing', 'completed', 'failed')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                extraction_options TEXT,
                result TEXT,
                error_message TEXT
            );

            CREATE TABLE IF NOT EXISTS ml_document_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cuit TEXT NOT NULL,
                document_type TEXT NOT NULL,
                pattern_data JSON NOT NULL,
                confidence_threshold REAL DEFAULT 0.8,
                usage_count INTEGER DEFAULT 1,
                success_rate REAL DEFAULT 1.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(cuit, document_type)
            );

            CREATE TABLE IF NOT EXISTS ml_corrections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                field_name TEXT NOT NULL,
                original_value TEXT,
                corrected_value TEXT NOT NULL,
                confidence_original REAL,
                pattern_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES ocr_processing_log(id),
                FOREIGN KEY (pattern_id) REFERENCES ml_document_patterns(id)
            );

            CREATE INDEX IF NOT EXISTS idx_ml_patterns_cuit ON ml_document_patterns(cuit);
            CREATE INDEX IF NOT EXISTS idx_ml_corrections_document ON ml_corrections(document_id);
        `);

        // Create ML service
        const mockConfig = {
            database: { path: ':memory:' },
            openai: { apiKey: 'test-key' },
            ocr: { maxWorkers: 1 }
        };

        const mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mlOCRService = new MLEnhancedOCRService(mockConfig, mockLogger);
        mlOCRService.db = testDb;

        // Setup Express app
        app = express();
        app.use(express.json());

        // Configure app locals
        app.locals.mlOCRService = mlOCRService;
        app.locals.config = mockConfig;
        app.locals.logger = mockLogger;

        app.use('/api/ocr/ml', ocrMLRoutes);

        server = createServer(app);
    });

    beforeEach(async () => {
        // Clear test data
        await testDb.exec('DELETE FROM ml_corrections');
        await testDb.exec('DELETE FROM ml_document_patterns');
        await testDb.exec('DELETE FROM ocr_processing_log');

        // Clear cache
        mlOCRService.patternCache.clear();
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
        if (testDb) {
            await testDb.close();
        }
    });

    describe('Complete ML Learning Workflow', () => {
        test('should complete full learning cycle: process → correct → learn → improve', async () => {
            const cuit = '30712345678';
            const documentType = 'invoice';

            // Step 1: Insert initial document processing result
            const docResult = await testDb.run(`
                INSERT INTO ocr_processing_log 
                (process_id, file_path, document_type, client_id, status, result)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'test-process-1',
                '/test/invoice.pdf',
                documentType,
                'client-123',
                'completed',
                JSON.stringify({
                    structured: {
                        emisor: { cuit, razonSocial: 'Test Co' }, // Incomplete name
                        total: 1500,
                        fecha: '2025-08-19'
                    },
                    confidence: 0.75
                })
            ]);

            const documentId = docResult.lastID;

            // Step 2: Submit correction to improve ML model
            const correctedData = {
                type: documentType,
                structured: {
                    emisor: { cuit, razonSocial: 'Test Company S.A.' }, // Full correct name
                    total: 1500.00,
                    fecha: '2025-08-19',
                    numeroFactura: 'A001-12345' // Additional field
                }
            };

            const originalData = {
                type: documentType,
                structured: {
                    emisor: { cuit, razonSocial: 'Test Co' },
                    total: 1500,
                    fecha: '2025-08-19'
                },
                confidence: 0.75
            };

            const learningResponse = await request(app)
                .post('/api/ocr/ml/learn')
                .send({ documentId, corrections: correctedData, originalData });

            expect(learningResponse.status).toBe(200);
            expect(learningResponse.body.success).toBe(true);
            expect(learningResponse.body.learningResult.cuit).toBe(cuit);
            expect(learningResponse.body.learningResult.correctionCount).toBeGreaterThan(0);

            // Step 3: Verify pattern was created
            const confidenceResponse = await request(app)
                .get(`/api/ocr/ml/confidence/${cuit}`);

            expect(confidenceResponse.status).toBe(200);
            expect(confidenceResponse.body.hasPattern).toBe(true);
            expect(confidenceResponse.body.usageCount).toBe(1);
            expect(confidenceResponse.body.maturityLevel).toBe('initial');

            // Step 4: Verify template is available
            const templateResponse = await request(app)
                .get(`/api/ocr/ml/patterns/${cuit}`);

            expect(templateResponse.status).toBe(200);
            expect(templateResponse.body.hasTemplate).toBe(true);
            expect(templateResponse.body.template.cuit).toBe(cuit);

            // Step 5: Process another document from same provider (should use ML)
            const processResponse = await request(app)
                .post('/api/ocr/ml/process')
                .send({
                    filePath: '/test/invoice2.pdf',
                    documentType,
                    cuit
                });

            expect(processResponse.status).toBe(200);
            expect(processResponse.body.success).toBe(true);
            // Note: ML processing would be enabled if we had real OCR, 
            // but for integration test we verify the API workflow

            // Step 6: Submit more corrections to improve pattern
            const secondDocId = await testDb.run(`
                INSERT INTO ocr_processing_log 
                (process_id, file_path, document_type, client_id, status)
                VALUES (?, ?, ?, ?, ?)
            `, ['test-process-2', '/test/invoice2.pdf', documentType, 'client-123', 'completed']);

            const secondLearningResponse = await request(app)
                .post('/api/ocr/ml/learn')
                .send({
                    documentId: secondDocId.lastID,
                    corrections: {
                        type: documentType,
                        structured: {
                            emisor: { cuit, razonSocial: 'Test Company S.A.' },
                            total: 2000.00,
                            numeroFactura: 'A001-12346'
                        }
                    },
                    originalData: {
                        type: documentType,
                        structured: {
                            emisor: { cuit, razonSocial: 'Test Co' },
                            total: 2000
                        },
                        confidence: 0.80
                    }
                });

            expect(secondLearningResponse.status).toBe(200);

            // Step 7: Verify pattern improvement
            const improvedConfidenceResponse = await request(app)
                .get(`/api/ocr/ml/confidence/${cuit}`);

            expect(improvedConfidenceResponse.status).toBe(200);
            expect(improvedConfidenceResponse.body.usageCount).toBe(2);
            expect(improvedConfidenceResponse.body.successRate).toBeGreaterThan(1.0);
            expect(improvedConfidenceResponse.body.maturityLevel).toBe('initial');

            // Step 8: Check overall ML statistics
            const statsResponse = await request(app)
                .get('/api/ocr/ml/stats');

            expect(statsResponse.status).toBe(200);
            expect(statsResponse.body.overview.totalProviders).toBe(1);
            expect(statsResponse.body.overview.totalPatterns).toBe(1);
            expect(statsResponse.body.corrections.totalCorrections).toBeGreaterThan(0);
            expect(statsResponse.body.byDocumentType).toHaveLength(1);
            expect(statsResponse.body.byDocumentType[0].document_type).toBe(documentType);
        });

        test('should handle multiple providers with different learning patterns', async () => {
            const provider1 = '30712345678';
            const provider2 = '30787654321';
            const documentType = 'invoice';

            // Create documents for both providers
            const doc1 = await testDb.run(`
                INSERT INTO ocr_processing_log (process_id, file_path, document_type, status)
                VALUES (?, ?, ?, ?)
            `, ['doc1', '/test/p1-invoice.pdf', documentType, 'completed']);

            const doc2 = await testDb.run(`
                INSERT INTO ocr_processing_log (process_id, file_path, document_type, status)
                VALUES (?, ?, ?, ?)
            `, ['doc2', '/test/p2-invoice.pdf', documentType, 'completed']);

            // Submit corrections for provider 1
            await request(app)
                .post('/api/ocr/ml/learn')
                .send({
                    documentId: doc1.lastID,
                    corrections: {
                        type: documentType,
                        structured: {
                            emisor: { cuit: provider1, razonSocial: 'Provider One S.A.' },
                            total: 1000
                        }
                    },
                    originalData: {
                        type: documentType,
                        structured: {
                            emisor: { cuit: provider1, razonSocial: 'Provider One' },
                            total: 1000
                        },
                        confidence: 0.8
                    }
                });

            // Submit corrections for provider 2
            await request(app)
                .post('/api/ocr/ml/learn')
                .send({
                    documentId: doc2.lastID,
                    corrections: {
                        type: documentType,
                        structured: {
                            emisor: { cuit: provider2, razonSocial: 'Provider Two Ltd.' },
                            total: 2000
                        }
                    },
                    originalData: {
                        type: documentType,
                        structured: {
                            emisor: { cuit: provider2, razonSocial: 'Provider Two' },
                            total: 2000
                        },
                        confidence: 0.85
                    }
                });

            // Verify both providers have separate patterns
            const p1Confidence = await request(app)
                .get(`/api/ocr/ml/confidence/${provider1}`);
            expect(p1Confidence.body.hasPattern).toBe(true);

            const p2Confidence = await request(app)
                .get(`/api/ocr/ml/confidence/${provider2}`);
            expect(p2Confidence.body.hasPattern).toBe(true);

            // Verify statistics reflect both providers
            const statsResponse = await request(app)
                .get('/api/ocr/ml/stats');

            expect(statsResponse.body.overview.totalProviders).toBe(2);
            expect(statsResponse.body.overview.totalPatterns).toBe(2);

            // Verify templates are different for each provider
            const p1Template = await request(app)
                .get(`/api/ocr/ml/patterns/${provider1}`);
            const p2Template = await request(app)
                .get(`/api/ocr/ml/patterns/${provider2}`);

            expect(p1Template.body.template.cuit).toBe(provider1);
            expect(p2Template.body.template.cuit).toBe(provider2);
            expect(p1Template.body.template.patternId).not.toBe(p2Template.body.template.patternId);
        });

        test('should handle pattern deletion and cleanup', async () => {
            const cuit = '30712345678';
            
            // Create pattern first
            await testDb.run(`
                INSERT INTO ml_document_patterns 
                (cuit, document_type, pattern_data, usage_count, success_rate)
                VALUES (?, ?, ?, ?, ?)
            `, [cuit, 'invoice', '{"test": "data"}', 5, 0.95]);

            // Verify pattern exists
            const beforeDelete = await request(app)
                .get(`/api/ocr/ml/patterns/${cuit}`);
            expect(beforeDelete.body.hasTemplate).toBe(true);

            // Delete pattern
            const deleteResponse = await request(app)
                .delete(`/api/ocr/ml/patterns/${cuit}`);
            
            expect(deleteResponse.status).toBe(200);
            expect(deleteResponse.body.success).toBe(true);
            expect(deleteResponse.body.deletedPatterns).toBe(1);

            // Verify pattern is gone
            const afterDelete = await request(app)
                .get(`/api/ocr/ml/patterns/${cuit}`);
            expect(afterDelete.body.hasTemplate).toBe(false);

            // Verify confidence metrics reflect deletion
            const confidenceAfterDelete = await request(app)
                .get(`/api/ocr/ml/confidence/${cuit}`);
            expect(confidenceAfterDelete.body.hasPattern).toBe(false);
        });

        test('should handle mature pattern evolution', async () => {
            const cuit = '30712345678';
            const documentType = 'invoice';

            // Create multiple learning cycles to reach maturity
            for (let i = 0; i < 12; i++) {
                const docResult = await testDb.run(`
                    INSERT INTO ocr_processing_log (process_id, file_path, document_type, status)
                    VALUES (?, ?, ?, ?)
                `, [`test-doc-${i}`, `/test/invoice${i}.pdf`, documentType, 'completed']);

                await request(app)
                    .post('/api/ocr/ml/learn')
                    .send({
                        documentId: docResult.lastID,
                        corrections: {
                            type: documentType,
                            structured: {
                                emisor: { cuit, razonSocial: 'Mature Provider S.A.' },
                                total: 1000 + (i * 100),
                                numeroFactura: `A001-${12345 + i}`
                            }
                        },
                        originalData: {
                            type: documentType,
                            structured: {
                                emisor: { cuit, razonSocial: 'Mature Provider' },
                                total: 1000 + (i * 100)
                            },
                            confidence: 0.75 + (i * 0.01)
                        }
                    });
            }

            // Verify pattern reached maturity
            const finalConfidence = await request(app)
                .get(`/api/ocr/ml/confidence/${cuit}`);

            expect(finalConfidence.body.hasPattern).toBe(true);
            expect(finalConfidence.body.usageCount).toBeGreaterThanOrEqual(10);
            expect(finalConfidence.body.maturityLevel).toBe('mature');
            expect(finalConfidence.body.successRate).toBeGreaterThan(1.0);

            // Verify overall system stats reflect mature patterns
            const statsResponse = await request(app)
                .get('/api/ocr/ml/stats');

            expect(statsResponse.body.overview.totalUsage).toBeGreaterThanOrEqual(12);
            expect(statsResponse.body.overview.averageSuccessRate).toBeGreaterThan(1.0);
        });

        test('should handle error scenarios in learning workflow', async () => {
            // Test learning with invalid document ID
            const invalidLearningResponse = await request(app)
                .post('/api/ocr/ml/learn')
                .send({
                    documentId: 99999,
                    corrections: { test: 'data' },
                    originalData: { test: 'data' }
                });

            expect(invalidLearningResponse.status).toBe(500);

            // Test missing required parameters
            const missingParamsResponse = await request(app)
                .post('/api/ocr/ml/learn')
                .send({});

            expect(missingParamsResponse.status).toBe(400);

            // Test confidence for non-existent provider
            const noProviderResponse = await request(app)
                .get('/api/ocr/ml/confidence/99999999999');

            expect(noProviderResponse.status).toBe(200);
            expect(noProviderResponse.body.hasPattern).toBe(false);

            // Test template for non-existent provider
            const noTemplateResponse = await request(app)
                .get('/api/ocr/ml/patterns/99999999999');

            expect(noTemplateResponse.status).toBe(200);
            expect(noTemplateResponse.body.hasTemplate).toBe(false);
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle concurrent learning requests', async () => {
            const cuit = '30712345678';
            const documentType = 'invoice';

            // Create multiple documents
            const docPromises = [];
            for (let i = 0; i < 5; i++) {
                docPromises.push(
                    testDb.run(`
                        INSERT INTO ocr_processing_log (process_id, file_path, document_type, status)
                        VALUES (?, ?, ?, ?)
                    `, [`concurrent-doc-${i}`, `/test/concurrent${i}.pdf`, documentType, 'completed'])
                );
            }

            const docResults = await Promise.all(docPromises);

            // Submit learning requests concurrently
            const learningPromises = docResults.map((result, i) =>
                request(app)
                    .post('/api/ocr/ml/learn')
                    .send({
                        documentId: result.lastID,
                        corrections: {
                            type: documentType,
                            structured: {
                                emisor: { cuit, razonSocial: 'Concurrent Provider' },
                                total: 1000 + (i * 100)
                            }
                        },
                        originalData: {
                            type: documentType,
                            structured: {
                                emisor: { cuit, razonSocial: 'Concurrent' },
                                total: 1000 + (i * 100)
                            },
                            confidence: 0.8
                        }
                    })
            );

            const learningResults = await Promise.all(learningPromises);

            // All requests should succeed
            learningResults.forEach(result => {
                expect(result.status).toBe(200);
                expect(result.body.success).toBe(true);
            });

            // Final pattern should reflect all corrections
            const finalStats = await request(app)
                .get('/api/ocr/ml/stats');

            expect(finalStats.body.corrections.totalCorrections).toBeGreaterThanOrEqual(5);
        });

        test('should maintain performance with large pattern datasets', async () => {
            // Create patterns for many providers
            const insertPromises = [];
            for (let i = 0; i < 100; i++) {
                const cuit = `3071234567${i.toString().padStart(1, '0')}`;
                insertPromises.push(
                    testDb.run(`
                        INSERT INTO ml_document_patterns 
                        (cuit, document_type, pattern_data, usage_count, success_rate)
                        VALUES (?, ?, ?, ?, ?)
                    `, [cuit, 'invoice', '{"test": "data"}', Math.floor(Math.random() * 10) + 1, 0.8 + (Math.random() * 0.2)])
                );
            }

            await Promise.all(insertPromises);

            // Test stats endpoint performance
            const startTime = Date.now();
            const statsResponse = await request(app)
                .get('/api/ocr/ml/stats');
            const endTime = Date.now();

            expect(statsResponse.status).toBe(200);
            expect(statsResponse.body.overview.totalProviders).toBe(100);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

            // Test specific provider lookup performance
            const providerStartTime = Date.now();
            const providerResponse = await request(app)
                .get('/api/ocr/ml/confidence/30712345670');
            const providerEndTime = Date.now();

            expect(providerResponse.status).toBe(200);
            expect(providerEndTime - providerStartTime).toBeLessThan(500); // Should complete within 500ms
        });
    });
});