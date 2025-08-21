/**
 * AFIP Validation Routes - User Story 4.2
 * API endpoints for real-time AFIP validation and cross-checking
 */

import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import AfipValidationService from '../services/afip-validation-service.js';
import { ARCAService } from '../services/arca-service.js';
import { Logger } from '../../../utils/logger.js';

const router = express.Router();
const logger = new Logger('AfipValidationRoutes');

// Initialize services
let afipService;
let arcaService;
let db;

// Initialize services and database connection
async function initializeServices() {
    if (!afipService) {
        try {
            // Initialize database connection
            db = await open({
                filename: process.env.DATABASE_PATH || './data/afip_monitor.db',
                driver: sqlite3.Database
            });

            // Initialize ARCA service (simplified cache service for demo)
            const cacheService = {
                cache: new Map(),
                get(key) {
                    const item = this.cache.get(key);
                    if (item && item.expiry > Date.now()) {
                        return item.value;
                    }
                    this.cache.delete(key);
                    return null;
                },
                set(key, value, ttlSeconds) {
                    this.cache.set(key, {
                        value,
                        expiry: Date.now() + (ttlSeconds * 1000)
                    });
                }
            };

            arcaService = new ARCAService({
                ARCA_ENVIRONMENT: 'homologacion',
                ARCA_CUIT: process.env.ARCA_CUIT || '20123456789'
            }, cacheService);

            // Initialize AFIP validation service
            afipService = new AfipValidationService({
                database: { path: process.env.DATABASE_PATH || './data/afip_monitor.db' }
            }, logger, arcaService);

            await afipService.initialize();
            
            logger.info('AFIP validation services initialized');
        } catch (error) {
            logger.error('Failed to initialize AFIP validation services:', error);
            throw error;
        }
    }
}

// Middleware to ensure services are initialized
router.use(async (req, res, next) => {
    try {
        await initializeServices();
        next();
    } catch (error) {
        logger.error('Service initialization failed:', error);
        res.status(500).json({ 
            error: 'Internal server error - services unavailable',
            details: error.message 
        });
    }
});

/**
 * POST /api/afip/validate/:documentId - Execute AFIP validations for a document
 */
router.post('/validate/:documentId', async (req, res) => {
    const { documentId } = req.params;
    const { priority = 1, options = {} } = req.body;

    try {
        logger.info(`Starting AFIP validation for document ${documentId}`);

        // Get document data from OCR results
        const documentData = await getDocumentData(documentId);
        if (!documentData) {
            return res.status(404).json({ 
                error: 'Documento no encontrado',
                documentId 
            });
        }

        // Execute AFIP validations
        const validationResults = await afipService.validateDocument(documentData, {
            priority,
            ...options
        });

        // Emit WebSocket update if available
        if (req.wsServer) {
            req.wsServer.broadcast({
                type: 'afip_validation_update',
                documentId,
                validationResults,
                timestamp: new Date().toISOString()
            });
        }

        logger.info(`AFIP validation completed for document ${documentId}`, {
            overall: validationResults.overall,
            processingTime: validationResults.processingTimeMs
        });

        res.json({
            success: true,
            documentId,
            validationResults,
            message: 'Validaciones AFIP completadas'
        });

    } catch (error) {
        logger.error(`AFIP validation failed for document ${documentId}:`, error);
        
        res.status(500).json({ 
            error: 'Error ejecutando validaciones AFIP',
            documentId,
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/afip/validate/:documentId - Get validation results for a document
 */
router.get('/validate/:documentId', async (req, res) => {
    const { documentId } = req.params;

    try {
        const validationResults = await afipService.getValidationResults(documentId);
        
        if (Object.keys(validationResults).length === 0) {
            return res.status(404).json({ 
                error: 'No se encontraron validaciones para este documento',
                documentId 
            });
        }

        res.json({
            success: true,
            documentId,
            validationResults,
            retrievedAt: new Date().toISOString()
        });

    } catch (error) {
        logger.error(`Error fetching validation results for document ${documentId}:`, error);
        
        res.status(500).json({ 
            error: 'Error obteniendo resultados de validación',
            documentId,
            details: error.message
        });
    }
});

/**
 * GET /api/afip/status - Get AFIP connectivity and service status
 */
router.get('/status', async (req, res) => {
    try {
        const connectivityStatus = await afipService.getConnectivityStatus();
        
        res.json({
            success: true,
            status: connectivityStatus,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error checking AFIP status:', error);
        
        res.status(500).json({ 
            error: 'Error verificando estado de AFIP',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/afip/retry-queue - Process retry queue for failed validations
 */
router.post('/retry-queue', async (req, res) => {
    try {
        await afipService.processRetryQueue();
        
        res.json({
            success: true,
            message: 'Cola de reintentos procesada exitosamente',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error processing retry queue:', error);
        
        res.status(500).json({ 
            error: 'Error procesando cola de reintentos',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/afip/validate/cuit - Validate a specific CUIT
 */
router.post('/validate/cuit', async (req, res) => {
    const { cuit } = req.body;

    if (!cuit) {
        return res.status(400).json({ 
            error: 'CUIT es requerido',
            field: 'cuit'
        });
    }

    try {
        const validationResult = await arcaService.validateCUIT(cuit);
        
        res.json({
            success: true,
            cuit,
            validationResult,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error(`CUIT validation failed for ${cuit}:`, error);
        
        res.status(500).json({ 
            error: 'Error validando CUIT',
            cuit,
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/afip/validate/cae - Validate a specific CAE
 */
router.post('/validate/cae', async (req, res) => {
    const { cae, invoiceData = {} } = req.body;

    if (!cae) {
        return res.status(400).json({ 
            error: 'CAE es requerido',
            field: 'cae'
        });
    }

    try {
        const validationResult = await arcaService.validateCAE(cae, invoiceData);
        
        res.json({
            success: true,
            cae,
            validationResult,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error(`CAE validation failed for ${cae}:`, error);
        
        res.status(500).json({ 
            error: 'Error validando CAE',
            cae,
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/afip/validations/stats - Get validation statistics
 */
router.get('/validations/stats', async (req, res) => {
    const { period = '30days' } = req.query;

    try {
        const stats = await getValidationStats(period);
        
        res.json({
            success: true,
            period,
            statistics: stats,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error getting validation statistics:', error);
        
        res.status(500).json({ 
            error: 'Error obteniendo estadísticas de validación',
            details: error.message
        });
    }
});

/**
 * GET /api/afip/validations/queue - Get current retry queue status
 */
router.get('/validations/queue', async (req, res) => {
    const { status = 'all' } = req.query;

    try {
        const queueData = await getRetryQueueStatus(status);
        
        res.json({
            success: true,
            queueStatus: queueData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error getting retry queue status:', error);
        
        res.status(500).json({ 
            error: 'Error obteniendo estado de cola de reintentos',
            details: error.message
        });
    }
});

// Helper functions

/**
 * Get document data from OCR processing results
 */
async function getDocumentData(documentId) {
    try {
        const result = await db.get(`
            SELECT p.*, r.structured_data, r.raw_text, r.confidence
            FROM ocr_processing_log p
            LEFT JOIN ocr_extraction_results r ON p.process_id = r.process_id
            WHERE p.id = ? OR r.id = ?
        `, [documentId, documentId]);

        if (!result) {
            return null;
        }

        let structured = {};
        try {
            structured = result.structured_data ? JSON.parse(result.structured_data) : {};
        } catch (error) {
            logger.warn(`Failed to parse structured data for document ${documentId}:`, error);
        }

        return {
            id: documentId,
            processId: result.process_id,
            filePath: result.file_path,
            documentType: result.document_type,
            status: result.status,
            rawText: result.raw_text,
            structured: structured,
            confidence: result.confidence,
            // Map common fields for validation
            cuit: structured.emisor?.cuit || structured.cuit,
            cae: structured.cae || structured.codigoAutorizacion,
            invoiceNumber: structured.numeroFactura || structured.numeroComprobante,
            invoiceType: structured.tipoComprobante || structured.tipoDocumento,
            date: structured.fecha || structured.fechaEmision,
            totalAmount: structured.total || structured.importeTotal,
            createdAt: result.created_at
        };

    } catch (error) {
        logger.error(`Error getting document data for ${documentId}:`, error);
        throw error;
    }
}

/**
 * Get validation statistics for a given period
 */
async function getValidationStats(period) {
    const periodMap = {
        '7days': 7,
        '30days': 30,
        '90days': 90
    };

    const days = periodMap[period] || 30;

    try {
        const stats = await db.all(`
            SELECT 
                validation_type,
                COUNT(*) as total_validations,
                SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) as valid_count,
                AVG(response_time_ms) as avg_response_time,
                MAX(validated_at) as last_validation
            FROM afip_validations 
            WHERE validated_at > datetime('now', '-${days} days')
            GROUP BY validation_type
            ORDER BY total_validations DESC
        `);

        const overall = await db.get(`
            SELECT 
                COUNT(*) as total_validations,
                COUNT(DISTINCT document_id) as unique_documents,
                AVG(response_time_ms) as avg_response_time
            FROM afip_validations 
            WHERE validated_at > datetime('now', '-${days} days')
        `);

        return {
            overall,
            byType: stats,
            period: `${days} days`
        };

    } catch (error) {
        logger.error('Error getting validation statistics:', error);
        throw error;
    }
}

/**
 * Get retry queue status
 */
async function getRetryQueueStatus(statusFilter) {
    try {
        let whereClause = '';
        if (statusFilter !== 'all') {
            whereClause = `WHERE status = '${statusFilter}'`;
        }

        const queueItems = await db.all(`
            SELECT 
                id,
                document_id,
                status,
                priority,
                attempts,
                next_retry_at,
                created_at,
                updated_at
            FROM afip_validation_queue 
            ${whereClause}
            ORDER BY priority DESC, created_at ASC
            LIMIT 100
        `);

        const summary = await db.get(`
            SELECT 
                COUNT(*) as total_items,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
            FROM afip_validation_queue
        `);

        return {
            summary,
            items: queueItems,
            filter: statusFilter
        };

    } catch (error) {
        logger.error('Error getting retry queue status:', error);
        throw error;
    }
}

export default router;