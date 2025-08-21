import { MLEnhancedOCRService } from '../../../src/server/services/ml-learning-service.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';

// Mock logger for testing
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
};

// Mock config for testing
const mockConfig = {
    database: {
        path: ':memory:'
    },
    openai: {
        apiKey: 'test-key'
    },
    ocr: {
        maxWorkers: 2
    }
};

describe('MLEnhancedOCRService', () => {
    let mlService;
    let testDb;

    beforeAll(async () => {
        // Create in-memory database for testing
        testDb = await open({
            filename: ':memory:',
            driver: sqlite3.Database
        });

        // Initialize schema for testing
        await testDb.exec(`
            CREATE TABLE IF NOT EXISTS ocr_processing_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                process_id TEXT UNIQUE NOT NULL,
                file_path TEXT NOT NULL,
                document_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'completed',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
        `);
    });

    beforeEach(async () => {
        // Create service instance for each test
        mlService = new MLEnhancedOCRService(mockConfig, mockLogger);
        mlService.db = testDb; // Use test database

        // Clear test data
        await testDb.exec('DELETE FROM ml_corrections');
        await testDb.exec('DELETE FROM ml_document_patterns');
        await testDb.exec('DELETE FROM ocr_processing_log');
    });

    afterAll(async () => {
        if (testDb) {
            await testDb.close();
        }
    });

    describe('learnFromCorrection', () => {
        test('should successfully learn from correction with valid data', async () => {
            // Setup test document
            const result = await testDb.run(
                'INSERT INTO ocr_processing_log (process_id, file_path, document_type) VALUES (?, ?, ?)',
                ['test-doc-1', '/test/path.pdf', 'invoice']
            );
            const documentId = result.lastID;

            const correctedData = {
                type: 'invoice',
                structured: {
                    emisor: {
                        cuit: '30712345678',
                        razonSocial: 'Test Company S.A.'
                    },
                    total: 1500.00,
                    fecha: '2025-08-19'
                }
            };

            const originalData = {
                type: 'invoice',
                structured: {
                    emisor: {
                        cuit: '30712345678',
                        razonSocial: 'Test Company SA' // Slight difference
                    },
                    total: 1500,
                    fecha: '2025-08-19'
                },
                confidence: 0.85
            };

            const result2 = await mlService.learnFromCorrection(documentId, correctedData, originalData);

            expect(result2).toBeDefined();
            expect(result2.cuit).toBe('30712345678');
            expect(result2.correctionCount).toBeGreaterThan(0);
            expect(result2.patternId).toBeDefined();

            // Verify correction was recorded
            const corrections = await testDb.all('SELECT * FROM ml_corrections WHERE document_id = ?', [documentId]);
            expect(corrections.length).toBeGreaterThan(0);

            // Verify pattern was created
            const patterns = await testDb.all('SELECT * FROM ml_document_patterns WHERE cuit = ?', ['30712345678']);
            expect(patterns.length).toBe(1);
        });

        test('should handle missing CUIT gracefully', async () => {
            const result = await testDb.run(
                'INSERT INTO ocr_processing_log (process_id, file_path, document_type) VALUES (?, ?, ?)',
                ['test-doc-2', '/test/path2.pdf', 'invoice']
            );
            const documentId = result.lastID;

            const correctedData = {
                type: 'invoice',
                structured: {
                    total: 1500.00
                    // No CUIT
                }
            };

            const originalData = {
                type: 'invoice',
                structured: {
                    total: 1500
                },
                confidence: 0.85
            };

            const result2 = await mlService.learnFromCorrection(documentId, correctedData, originalData);
            expect(result2).toBeNull();
        });

        test('should throw error for invalid parameters', async () => {
            await expect(mlService.learnFromCorrection(null, null, null))
                .rejects.toThrow('Invalid parameters for learning from correction');
        });
    });

    describe('getProviderTemplate', () => {
        test('should return null when no patterns exist', async () => {
            const template = await mlService.getProviderTemplate('30712345678');
            expect(template).toBeNull();
        });

        test('should return template when patterns exist', async () => {
            // Insert test pattern
            const patternData = {
                layout: { structure: 'standard' },
                fieldMappings: { total: { expectedType: 'number' } },
                extractionRegions: { headerRegion: { x: 0, y: 0 } }
            };

            await testDb.run(`
                INSERT INTO ml_document_patterns 
                (cuit, document_type, pattern_data, usage_count, success_rate)
                VALUES (?, ?, ?, ?, ?)
            `, ['30712345678', 'invoice', JSON.stringify(patternData), 5, 0.95]);

            const template = await mlService.getProviderTemplate('30712345678');

            expect(template).toBeDefined();
            expect(template.cuit).toBe('30712345678');
            expect(template.confidence).toBe(0.95);
            expect(template.usageCount).toBe(5);
            expect(template.pattern).toEqual(patternData);
        });

        test('should use cache when available', async () => {
            // Insert pattern
            await testDb.run(`
                INSERT INTO ml_document_patterns 
                (cuit, document_type, pattern_data, usage_count, success_rate)
                VALUES (?, ?, ?, ?, ?)
            `, ['30712345678', 'invoice', '{"test": "data"}', 3, 0.9]);

            // First call
            const template1 = await mlService.getProviderTemplate('30712345678');
            expect(template1).toBeDefined();

            // Mock database to verify cache is used
            const originalGet = testDb.all;
            testDb.all = jest.fn();

            // Second call should use cache
            const template2 = await mlService.getProviderTemplate('30712345678');
            expect(template2).toEqual(template1);
            expect(testDb.all).not.toHaveBeenCalled();

            // Restore original method
            testDb.all = originalGet;
        });
    });

    describe('calculateDynamicConfidence', () => {
        test('should adjust confidence based on provider history', async () => {
            const extractedData = {
                confidence: 0.8,
                structured: {
                    total: 1500,
                    cuit: '30712345678',
                    fecha: '2025-08-19',
                    numeroFactura: 'A001-12345'
                }
            };

            const providerHistory = {
                success_rate: 95
            };

            const adjustedConfidence = await mlService.calculateDynamicConfidence(extractedData, providerHistory);

            expect(adjustedConfidence).toBeGreaterThan(0.8); // Should be higher than base
            expect(adjustedConfidence).toBeLessThanOrEqual(1.0);
        });

        test('should apply field completeness bonus', async () => {
            const extractedData = {
                confidence: 0.7,
                structured: {
                    total: 1500,
                    cuit: '30712345678',
                    fecha: '2025-08-19',
                    numeroFactura: 'A001-12345'
                }
            };

            const adjustedConfidence = await mlService.calculateDynamicConfidence(extractedData, null);
            
            // Should get bonus for having all critical fields
            expect(adjustedConfidence).toBeGreaterThan(0.7);
        });

        test('should penalize for missing critical fields', async () => {
            const extractedData = {
                confidence: 0.9,
                structured: {
                    total: 1500
                    // Missing cuit, fecha, numeroFactura
                }
            };

            const adjustedConfidence = await mlService.calculateDynamicConfidence(extractedData, null);
            
            // Should be penalized for missing critical fields
            expect(adjustedConfidence).toBeLessThan(0.9);
        });

        test('should handle errors gracefully', async () => {
            const extractedData = { confidence: 0.8 };
            
            const adjustedConfidence = await mlService.calculateDynamicConfidence(extractedData, null);
            
            // The function applies penalties for missing critical fields, so confidence will be lower
            expect(adjustedConfidence).toBeLessThan(0.8);
            expect(adjustedConfidence).toBeGreaterThan(0);
        });
    });

    describe('intelligentPreProcessing', () => {
        test('should return buffer for invoice processing', async () => {
            const mockBuffer = Buffer.from('test image data');
            
            const processedBuffer = await mlService.intelligentPreProcessing(mockBuffer, 'invoice');
            
            expect(processedBuffer).toBeInstanceOf(Buffer);
        });

        test('should handle different document types', async () => {
            const mockBuffer = Buffer.from('test image data');
            
            const invoiceBuffer = await mlService.intelligentPreProcessing(mockBuffer, 'invoice');
            const bankBuffer = await mlService.intelligentPreProcessing(mockBuffer, 'bank_statement');
            const receiptBuffer = await mlService.intelligentPreProcessing(mockBuffer, 'receipt');
            
            expect(invoiceBuffer).toBeInstanceOf(Buffer);
            expect(bankBuffer).toBeInstanceOf(Buffer);
            expect(receiptBuffer).toBeInstanceOf(Buffer);
        });

        test('should fallback to original buffer on error', async () => {
            const mockBuffer = Buffer.from('invalid image data');
            
            // Since sharp processing will throw with invalid data, the function should catch and return original
            const processedBuffer = await mlService.intelligentPreProcessing(mockBuffer, 'invoice');
            
            // Should return original buffer on error
            expect(processedBuffer).toEqual(mockBuffer);
        });
    });

    describe('updateProviderPattern', () => {
        test('should create new pattern when none exists', async () => {
            const correctedData = {
                type: 'invoice',
                structured: {
                    emisor: { cuit: '30712345678' },
                    total: 1500
                }
            };

            const pattern = await mlService.updateProviderPattern('30712345678', 'invoice', correctedData);

            expect(pattern).toBeDefined();
            expect(pattern.cuit).toBe('30712345678');
            expect(pattern.id).toBeDefined();

            // Verify in database
            const dbPattern = await testDb.get(
                'SELECT * FROM ml_document_patterns WHERE cuit = ? AND document_type = ?',
                ['30712345678', 'invoice']
            );
            expect(dbPattern).toBeDefined();
            expect(dbPattern.usage_count).toBe(1);
            expect(dbPattern.success_rate).toBe(1.0);
        });

        test('should update existing pattern', async () => {
            // Create initial pattern
            await testDb.run(`
                INSERT INTO ml_document_patterns 
                (cuit, document_type, pattern_data, usage_count, success_rate)
                VALUES (?, ?, ?, ?, ?)
            `, ['30712345678', 'invoice', '{"test": "data"}', 1, 1.0]);

            const correctedData = {
                type: 'invoice',
                structured: {
                    emisor: { cuit: '30712345678' },
                    total: 2000
                }
            };

            const pattern = await mlService.updateProviderPattern('30712345678', 'invoice', correctedData);

            expect(pattern).toBeDefined();

            // Verify usage count increased
            const dbPattern = await testDb.get(
                'SELECT * FROM ml_document_patterns WHERE cuit = ? AND document_type = ?',
                ['30712345678', 'invoice']
            );
            expect(dbPattern.usage_count).toBe(2);
        });
    });
});