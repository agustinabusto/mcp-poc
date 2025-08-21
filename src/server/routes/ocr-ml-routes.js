import express from 'express';
import { MLEnhancedOCRService } from '../services/ml-learning-service.js';

const router = express.Router();

// Middleware para inicializar MLEnhancedOCRService si no existe
router.use(async (req, res, next) => {
    try {
        if (!req.app.locals.mlOCRService) {
            const config = req.app.locals.config || {};
            const logger = req.app.locals.logger || console;
            
            req.app.locals.mlOCRService = new MLEnhancedOCRService(config, logger);
            await req.app.locals.mlOCRService.initialize();
        }
        next();
    } catch (error) {
        console.error('Error initializing ML OCR Service:', error);
        res.status(500).json({ error: 'Failed to initialize ML service' });
    }
});

/**
 * POST /api/ocr/ml/learn - Endpoint para aprendizaje
 * Permite al sistema aprender de correcciones manuales
 */
router.post('/learn', async (req, res) => {
    try {
        const { documentId, corrections, originalData } = req.body;
        
        // Validar parámetros requeridos
        if (!documentId || !corrections) {
            return res.status(400).json({ 
                error: 'Missing required parameters: documentId and corrections' 
            });
        }

        const mlService = req.app.locals.mlOCRService;
        
        // Ejecutar aprendizaje
        const result = await mlService.learnFromCorrection(
            documentId, 
            corrections,
            originalData
        );

        res.json({ 
            success: true, 
            learningResult: result,
            message: `Learning completed: ${result?.correctionCount || 0} corrections processed`
        });

    } catch (error) {
        console.error('Error in ML learning endpoint:', error);
        res.status(500).json({ 
            error: 'Internal server error during learning process',
            details: error.message 
        });
    }
});

/**
 * GET /api/ocr/ml/confidence/:cuit - Métricas de confidence
 * Retorna métricas de confianza para un proveedor específico
 */
router.get('/confidence/:cuit', async (req, res) => {
    try {
        const { cuit } = req.params;
        
        if (!cuit) {
            return res.status(400).json({ error: 'CUIT parameter is required' });
        }

        const mlService = req.app.locals.mlOCRService;
        
        // Obtener métricas de confianza del proveedor
        const metrics = await mlService.db.get(`
            SELECT 
                p.cuit,
                p.document_type,
                p.usage_count,
                p.success_rate,
                p.confidence_threshold,
                COUNT(c.id) as total_corrections,
                AVG(c.confidence_original) as avg_original_confidence,
                p.updated_at as last_updated
            FROM ml_document_patterns p
            LEFT JOIN ml_corrections c ON c.pattern_id = p.id
            WHERE p.cuit = ?
            GROUP BY p.cuit, p.document_type
            ORDER BY p.usage_count DESC
        `, [cuit]);

        if (!metrics) {
            return res.json({
                cuit,
                hasPattern: false,
                message: 'No ML patterns found for this provider'
            });
        }

        // Calcular métricas adicionales
        const confidenceMetrics = {
            cuit: metrics.cuit,
            hasPattern: true,
            documentType: metrics.document_type,
            usageCount: metrics.usage_count,
            successRate: metrics.success_rate,
            confidenceThreshold: metrics.confidence_threshold,
            totalCorrections: metrics.total_corrections,
            averageOriginalConfidence: metrics.avg_original_confidence,
            lastUpdated: metrics.last_updated,
            improvementFactor: metrics.success_rate - (metrics.avg_original_confidence || 0),
            maturityLevel: metrics.usage_count >= 10 ? 'mature' : 
                          metrics.usage_count >= 5 ? 'developing' : 'initial'
        };

        res.json(confidenceMetrics);

    } catch (error) {
        console.error('Error fetching confidence metrics:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve confidence metrics',
            details: error.message 
        });
    }
});

/**
 * GET /api/ocr/ml/patterns/:cuit - Template del proveedor
 * Retorna el template aprendido para un proveedor específico
 */
router.get('/patterns/:cuit', async (req, res) => {
    try {
        const { cuit } = req.params;
        
        if (!cuit) {
            return res.status(400).json({ error: 'CUIT parameter is required' });
        }

        const mlService = req.app.locals.mlOCRService;
        const template = await mlService.getProviderTemplate(cuit);

        if (!template) {
            return res.json({
                cuit,
                hasTemplate: false,
                message: 'No template available for this provider yet'
            });
        }

        res.json({
            cuit,
            hasTemplate: true,
            template
        });

    } catch (error) {
        console.error('Error fetching provider template:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve provider template',
            details: error.message 
        });
    }
});

/**
 * POST /api/ocr/ml/process - Procesamiento OCR con ML
 * Procesa un documento usando ML enhanced OCR
 */
router.post('/process', async (req, res) => {
    try {
        const { filePath, documentType, cuit } = req.body;
        
        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const mlService = req.app.locals.mlOCRService;
        
        // Obtener template del proveedor si se proporciona CUIT
        let providerTemplate = null;
        if (cuit) {
            providerTemplate = await mlService.getProviderTemplate(cuit);
        }

        // Procesar documento
        const result = await mlService.processDocument(filePath, documentType || 'auto');
        
        // Aplicar ML enhancements si hay template disponible
        if (providerTemplate && result.structured) {
            // Calcular confidence dinámico
            const providerHistory = {
                success_rate: providerTemplate.confidence * 100,
                usage_count: providerTemplate.usageCount
            };
            
            const enhancedConfidence = await mlService.calculateDynamicConfidence(
                result,
                providerHistory
            );
            
            result.mlEnhanced = true;
            result.originalConfidence = result.confidence;
            result.confidence = enhancedConfidence;
            result.providerTemplate = {
                id: providerTemplate.patternId,
                confidence: providerTemplate.confidence,
                usageCount: providerTemplate.usageCount
            };
        }

        res.json({
            success: true,
            result,
            mlEnhanced: Boolean(providerTemplate),
            providerId: cuit
        });

    } catch (error) {
        console.error('Error in ML OCR processing:', error);
        res.status(500).json({ 
            error: 'Failed to process document with ML',
            details: error.message 
        });
    }
});

/**
 * GET /api/ocr/ml/stats - Estadísticas generales de ML
 * Retorna estadísticas del sistema de ML
 */
router.get('/stats', async (req, res) => {
    try {
        const mlService = req.app.locals.mlOCRService;
        
        // Consultar estadísticas generales
        const stats = await mlService.db.get(`
            SELECT 
                COUNT(DISTINCT cuit) as total_providers,
                COUNT(*) as total_patterns,
                AVG(success_rate) as avg_success_rate,
                SUM(usage_count) as total_usage,
                MAX(updated_at) as last_pattern_update
            FROM ml_document_patterns
        `);

        const correctionStats = await mlService.db.get(`
            SELECT 
                COUNT(*) as total_corrections,
                COUNT(DISTINCT document_id) as documents_corrected,
                COUNT(DISTINCT field_name) as fields_corrected
            FROM ml_corrections
        `);

        // Estadísticas por tipo de documento
        const documentTypeStats = await mlService.db.all(`
            SELECT 
                document_type,
                COUNT(*) as pattern_count,
                AVG(success_rate) as avg_success_rate,
                SUM(usage_count) as total_usage
            FROM ml_document_patterns
            GROUP BY document_type
            ORDER BY pattern_count DESC
        `);

        const response = {
            overview: {
                totalProviders: stats.total_providers || 0,
                totalPatterns: stats.total_patterns || 0,
                averageSuccessRate: stats.avg_success_rate || 0,
                totalUsage: stats.total_usage || 0,
                lastPatternUpdate: stats.last_pattern_update
            },
            corrections: {
                totalCorrections: correctionStats.total_corrections || 0,
                documentsCorrected: correctionStats.documents_corrected || 0,
                fieldsCorrected: correctionStats.fields_corrected || 0
            },
            byDocumentType: documentTypeStats,
            systemHealth: {
                status: 'active',
                cacheSize: mlService.patternCache.size,
                initialized: true
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Error fetching ML stats:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve ML statistics',
            details: error.message 
        });
    }
});

/**
 * DELETE /api/ocr/ml/patterns/:cuit - Eliminar patrón de proveedor
 * Elimina los patrones aprendidos para un proveedor específico
 */
router.delete('/patterns/:cuit', async (req, res) => {
    try {
        const { cuit } = req.params;
        
        if (!cuit) {
            return res.status(400).json({ error: 'CUIT parameter is required' });
        }

        const mlService = req.app.locals.mlOCRService;
        
        // Eliminar patrón
        const result = await mlService.db.run(`
            DELETE FROM ml_document_patterns WHERE cuit = ?
        `, [cuit]);

        // Limpiar cache
        mlService.clearPatternCache(cuit, 'all');

        res.json({
            success: true,
            deletedPatterns: result.changes,
            message: `Patterns for CUIT ${cuit} have been deleted`
        });

    } catch (error) {
        console.error('Error deleting provider patterns:', error);
        res.status(500).json({ 
            error: 'Failed to delete provider patterns',
            details: error.message 
        });
    }
});

export default router;