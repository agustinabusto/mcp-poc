import request from 'supertest';
import express from 'express';
import ocrMLRoutes from '../../../src/server/routes/ocr-ml-routes.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

describe('OCR ML Routes', () => {
    let app;
    let testDb;
    let mockMLService;

    beforeAll(async () => {
        // Create test database
        testDb = await open({
            filename: ':memory:',
            driver: sqlite3.Database
        });

        // Initialize schema
        await testDb.exec(`
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ocr_processing_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                process_id TEXT UNIQUE NOT NULL,
                file_path TEXT NOT NULL,
                document_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'completed'
            );
        `);

        // Create mock ML service
        mockMLService = {
            db: testDb,
            initialize: jest.fn(),
            learnFromCorrection: jest.fn(),
            getProviderTemplate: jest.fn(),
            calculateDynamicConfidence: jest.fn(),
            processDocument: jest.fn(),
            clearPatternCache: jest.fn(),
            patternCache: new Map()
        };

        // Setup Express app
        app = express();
        app.use(express.json());

        // Mock app.locals
        app.locals.mlOCRService = mockMLService;
        app.locals.config = {
            database: { path: ':memory:' },
            openai: { apiKey: 'test-key' }
        };
        app.locals.logger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        app.use('/api/ocr/ml', ocrMLRoutes);
    });

    beforeEach(async () => {
        // Clear test data
        await testDb.exec('DELETE FROM ml_corrections');
        await testDb.exec('DELETE FROM ml_document_patterns');
        await testDb.exec('DELETE FROM ocr_processing_log');

        // Reset mocks
        jest.clearAllMocks();
    });

    afterAll(async () => {
        if (testDb) {
            await testDb.close();
        }
    });

    describe('POST /learn', () => {
        test('should successfully process learning request', async () => {
            const documentId = 1;
            const corrections = {
                structured: {
                    emisor: { cuit: '30712345678', razonSocial: 'Test Company' },
                    total: 1500
                }
            };
            const originalData = {
                structured: {
                    emisor: { cuit: '30712345678', razonSocial: 'Test Co' },
                    total: 1500
                }
            };

            mockMLService.learnFromCorrection.mockResolvedValue({
                correctionCount: 1,
                patternId: 123,
                cuit: '30712345678',
                documentType: 'invoice'
            });

            const response = await request(app)
                .post('/api/ocr/ml/learn')
                .send({ documentId, corrections, originalData });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.learningResult.correctionCount).toBe(1);
            expect(mockMLService.learnFromCorrection).toHaveBeenCalledWith(
                documentId, corrections, originalData
            );
        });

        test('should return 400 for missing parameters', async () => {
            const response = await request(app)
                .post('/api/ocr/ml/learn')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Missing required parameters');
        });

        test('should handle service errors', async () => {
            mockMLService.learnFromCorrection.mockRejectedValue(new Error('Learning failed'));

            const response = await request(app)
                .post('/api/ocr/ml/learn')
                .send({
                    documentId: 1,
                    corrections: { test: 'data' }
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toContain('Internal server error');
        });
    });

    describe('GET /confidence/:cuit', () => {
        test('should return confidence metrics for existing provider', async () => {
            // Insert test pattern
            await testDb.run(`
                INSERT INTO ml_document_patterns 
                (cuit, document_type, pattern_data, usage_count, success_rate, confidence_threshold)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['30712345678', 'invoice', '{"test": "data"}', 5, 0.95, 0.8]);

            const response = await request(app)
                .get('/api/ocr/ml/confidence/30712345678');

            expect(response.status).toBe(200);
            expect(response.body.cuit).toBe('30712345678');
            expect(response.body.hasPattern).toBe(true);
            expect(response.body.successRate).toBe(0.95);
            expect(response.body.usageCount).toBe(5);
            expect(response.body.maturityLevel).toBe('developing');
        });

        test('should return no pattern message for non-existent provider', async () => {
            const response = await request(app)
                .get('/api/ocr/ml/confidence/99999999999');

            expect(response.status).toBe(200);
            expect(response.body.cuit).toBe('99999999999');
            expect(response.body.hasPattern).toBe(false);
            expect(response.body.message).toContain('No ML patterns found');
        });

        test('should return 400 for missing CUIT', async () => {
            const response = await request(app)
                .get('/api/ocr/ml/confidence/');

            expect(response.status).toBe(404); // Route not found
        });
    });

    describe('GET /patterns/:cuit', () => {
        test('should return template for existing provider', async () => {
            const patternData = {
                layout: { structure: 'standard' },
                fieldMappings: { total: { expectedType: 'number' } }
            };

            mockMLService.getProviderTemplate.mockResolvedValue({
                cuit: '30712345678',
                patternId: 1,
                confidence: 0.95,
                usageCount: 5,
                pattern: patternData
            });

            const response = await request(app)
                .get('/api/ocr/ml/patterns/30712345678');

            expect(response.status).toBe(200);
            expect(response.body.hasTemplate).toBe(true);
            expect(response.body.template.cuit).toBe('30712345678');
            expect(response.body.template.pattern).toEqual(patternData);
            expect(mockMLService.getProviderTemplate).toHaveBeenCalledWith('30712345678');
        });

        test('should return no template message for non-existent provider', async () => {
            mockMLService.getProviderTemplate.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/ocr/ml/patterns/99999999999');

            expect(response.status).toBe(200);
            expect(response.body.hasTemplate).toBe(false);
            expect(response.body.message).toContain('No template available');
        });
    });

    describe('POST /process', () => {
        test('should process document with ML enhancement', async () => {
            const mockResult = {
                structured: { total: 1500, cuit: '30712345678' },
                confidence: 0.85,
                text: 'Sample invoice text'
            };

            const mockTemplate = {
                patternId: 1,
                confidence: 0.95,
                usageCount: 5
            };

            mockMLService.processDocument.mockResolvedValue(mockResult);
            mockMLService.getProviderTemplate.mockResolvedValue(mockTemplate);
            mockMLService.calculateDynamicConfidence.mockResolvedValue(0.92);

            const response = await request(app)
                .post('/api/ocr/ml/process')
                .send({
                    filePath: '/test/invoice.pdf',
                    documentType: 'invoice',
                    cuit: '30712345678'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.mlEnhanced).toBe(true);
            expect(response.body.result.mlEnhanced).toBe(true);
            expect(response.body.result.confidence).toBe(0.92);
            expect(response.body.result.originalConfidence).toBe(0.85);
        });

        test('should process document without ML when no template available', async () => {
            const mockResult = {
                structured: { total: 1500 },
                confidence: 0.85,
                text: 'Sample invoice text'
            };

            mockMLService.processDocument.mockResolvedValue(mockResult);
            mockMLService.getProviderTemplate.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/ocr/ml/process')
                .send({
                    filePath: '/test/invoice.pdf',
                    documentType: 'invoice'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.mlEnhanced).toBe(false);
            expect(response.body.result.confidence).toBe(0.85);
        });

        test('should return 400 for missing file path', async () => {
            const response = await request(app)
                .post('/api/ocr/ml/process')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('File path is required');
        });
    });

    describe('GET /stats', () => {
        test('should return ML statistics', async () => {
            // Insert test data
            await testDb.run(`
                INSERT INTO ml_document_patterns 
                (cuit, document_type, pattern_data, usage_count, success_rate)
                VALUES (?, ?, ?, ?, ?)
            `, ['30712345678', 'invoice', '{"test": "data"}', 5, 0.95]);

            await testDb.run(`
                INSERT INTO ml_document_patterns 
                (cuit, document_type, pattern_data, usage_count, success_rate)
                VALUES (?, ?, ?, ?, ?)
            `, ['30787654321', 'bank_statement', '{"test": "data"}', 3, 0.90]);

            const response = await request(app)
                .get('/api/ocr/ml/stats');

            expect(response.status).toBe(200);
            expect(response.body.overview.totalProviders).toBe(2);
            expect(response.body.overview.totalPatterns).toBe(2);
            expect(response.body.overview.averageSuccessRate).toBeCloseTo(0.925);
            expect(response.body.byDocumentType).toHaveLength(2);
            expect(response.body.systemHealth.status).toBe('active');
        });

        test('should handle empty database', async () => {
            const response = await request(app)
                .get('/api/ocr/ml/stats');

            expect(response.status).toBe(200);
            expect(response.body.overview.totalProviders).toBe(0);
            expect(response.body.overview.totalPatterns).toBe(0);
        });
    });

    describe('DELETE /patterns/:cuit', () => {
        test('should delete provider patterns', async () => {
            // Insert test pattern
            await testDb.run(`
                INSERT INTO ml_document_patterns 
                (cuit, document_type, pattern_data, usage_count, success_rate)
                VALUES (?, ?, ?, ?, ?)
            `, ['30712345678', 'invoice', '{"test": "data"}', 5, 0.95]);

            const response = await request(app)
                .delete('/api/ocr/ml/patterns/30712345678');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.deletedPatterns).toBe(1);
            expect(mockMLService.clearPatternCache).toHaveBeenCalledWith('30712345678', 'all');

            // Verify pattern was deleted
            const pattern = await testDb.get(
                'SELECT * FROM ml_document_patterns WHERE cuit = ?',
                ['30712345678']
            );
            expect(pattern).toBeUndefined();
        });

        test('should return 400 for missing CUIT', async () => {
            const response = await request(app)
                .delete('/api/ocr/ml/patterns/');

            expect(response.status).toBe(404); // Route not found
        });
    });
});