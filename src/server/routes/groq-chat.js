// API Routes para chat con Groq + Llama 3.1
import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Rate limiting específico para Groq API
const groqRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // máximo 30 requests por minuto
    message: {
        error: 'Demasiadas consultas a IA. Intente nuevamente en un minuto.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Validaciones de entrada
const chatValidation = [
    body('prompt')
        .isString()
        .isLength({ min: 1, max: 2000 })
        .withMessage('El prompt debe ser un texto entre 1 y 2000 caracteres'),
    body('cuit')
        .optional()
        .matches(/^\d{2}-\d{8}-\d{1}$/)
        .withMessage('CUIT debe tener formato XX-XXXXXXXX-X'),
    body('includeContext')
        .optional()
        .isBoolean()
        .withMessage('includeContext debe ser boolean'),
    body('mcpTools')
        .optional()
        .isArray()
        .withMessage('mcpTools debe ser un array')
];

// POST /api/groq/chat - Chat principal con Groq
router.post('/chat', groqRateLimit, chatValidation, async (req, res) => {
    try {
        // Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Datos de entrada inválidos',
                details: errors.array()
            });
        }

        const {
            prompt,
            cuit,
            includeContext = true,
            mcpTools = []
        } = req.body;

        // Obtener servicios del contexto de la aplicación
        const { groqClient, afipClient, logger } = req.app.locals;

        if (!groqClient.isInitialized) {
            return res.status(503).json({
                success: false,
                error: 'Servicio de IA no disponible',
                message: 'El sistema está inicializando. Intente nuevamente en unos momentos.'
            });
        }

        // Preparar contexto de CUIT si se proporciona
        let cuitContext = null;
        if (cuit && includeContext) {
            try {
                // Obtener información básica del CUIT desde AFIP
                const cuitInfo = await afipClient.getTaxpayerInfo(cuit);
                cuitContext = {
                    cuit,
                    businessName: cuitInfo.businessName,
                    fiscalStatus: cuitInfo.fiscalStatus,
                    lastCheck: cuitInfo.lastCheck
                };
            } catch (error) {
                logger.warn('Error obteniendo contexto CUIT:', { cuit, error: error.message });
                // Continuar sin contexto
            }
        }

        // Realizar consulta a Groq
        const result = await groqClient.consultarCompliance(
            prompt,
            mcpTools,
            cuitContext
        );

        // Preparar respuesta
        const response = {
            success: true,
            message: result.message,
            data: {
                response: result.message,
                structured: result.structured,
                mcpSuggestions: result.structured.mcpSuggestions,
                severityLevel: result.structured.severityLevel,
                actionItems: result.structured.actionItems,
                cuitContext: cuitContext,
                metadata: {
                    model: result.metadata.model,
                    tokensUsed: result.metadata.tokensUsed,
                    timestamp: result.metadata.timestamp,
                    responseTime: Date.now() - new Date(result.metadata.timestamp).getTime()
                }
            }
        };

        // Log de la consulta exitosa
        logger.info('Chat Groq exitoso', {
            prompt: prompt.substring(0, 50) + '...',
            cuit: cuit || 'N/A',
            tokensUsed: result.metadata.tokensUsed,
            severityLevel: result.structured.severityLevel
        });

        res.json(response);

    } catch (error) {
        const { logger } = req.app.locals;
        logger.error('Error en chat Groq:', error);

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No fue posible procesar la consulta. Intente nuevamente.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/groq/status - Estado del servicio Groq
router.get('/status', async (req, res) => {
    try {
        const { groqClient, logger } = req.app.locals;

        if (!groqClient) {
            return res.status(503).json({
                success: false,
                status: 'unavailable',
                message: 'Servicio Groq no configurado'
            });
        }

        // Obtener métricas
        const metrics = groqClient.getMetrics();

        // Probar conexión
        let connectionStatus = 'disconnected';
        try {
            const isConnected = await groqClient.testConnection();
            connectionStatus = isConnected ? 'connected' : 'error';
        } catch (error) {
            logger.warn('Test conexión Groq falló:', error.message);
            connectionStatus = 'error';
        }

        res.json({
            success: true,
            status: connectionStatus,
            metrics: {
                isInitialized: metrics.isInitialized,
                model: metrics.model,
                requestCount: metrics.requestCount,
                successCount: metrics.successCount,
                errorCount: metrics.errorCount,
                successRate: metrics.successRate,
                totalTokensUsed: metrics.totalTokensUsed,
                averageResponseTime: metrics.averageResponseTime,
                averageCostPerRequest: metrics.averageCostPerRequest,
                lastRequestTime: metrics.lastRequestTime
            },
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const { logger } = req.app.locals;
        logger.error('Error obteniendo status Groq:', error);

        res.status(500).json({
            success: false,
            error: 'Error obteniendo estado del servicio'
        });
    }
});

// POST /api/groq/validate-cuit - Validar CUIT con IA
router.post('/validate-cuit', groqRateLimit, [
    body('cuit')
        .matches(/^\d{2}-\d{8}-\d{1}$/)
        .withMessage('CUIT debe tener formato XX-XXXXXXXX-X')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'CUIT inválido',
                details: errors.array()
            });
        }

        const { cuit } = req.body;
        const { groqClient, afipClient, logger } = req.app.locals;

        // Obtener información de AFIP
        const afipInfo = await afipClient.getTaxpayerInfo(cuit);

        // Consultar a IA sobre el estado
        const aiPrompt = `Analiza el siguiente estado fiscal de CUIT ${cuit}: 
${JSON.stringify(afipInfo, null, 2)}

Proporciona un resumen del estado de compliance y recomendaciones.`;

        const aiResponse = await groqClient.consultarCompliance(
            aiPrompt,
            ['check_compliance', 'validate_fiscal'],
            { cuit, ...afipInfo }
        );

        res.json({
            success: true,
            cuit,
            afipData: afipInfo,
            aiAnalysis: {
                summary: aiResponse.message,
                recommendations: aiResponse.structured.actionItems,
                severityLevel: aiResponse.structured.severityLevel,
                mcpSuggestions: aiResponse.structured.mcpSuggestions
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const { logger } = req.app.locals;
        logger.error('Error validando CUIT con IA:', error);

        res.status(500).json({
            success: false,
            error: 'Error validando CUIT',
            message: 'No fue posible validar el CUIT. Intente nuevamente.'
        });
    }
});

// GET /api/groq/models - Listar modelos disponibles
router.get('/models', async (req, res) => {
    try {
        const availableModels = [
            {
                id: 'llama-3.1-70b-versatile',
                name: 'Llama 3.1 70B',
                description: 'Modelo balanceado para compliance y análisis fiscal',
                maxTokens: 32768,
                speed: '280 tok/s',
                costPerMillion: { input: 0.59, output: 0.79 },
                recommended: true
            },
            {
                id: 'llama-3.1-8b-instant',
                name: 'Llama 3.1 8B',
                description: 'Modelo rápido para consultas simples',
                maxTokens: 8192,
                speed: '750 tok/s',
                costPerMillion: { input: 0.05, output: 0.08 },
                recommended: false
            },
            {
                id: 'llama-3.3-70b-versatile',
                name: 'Llama 3.3 70B',
                description: 'Última versión con mejoras en razonamiento',
                maxTokens: 32768,
                speed: '280 tok/s',
                costPerMillion: { input: 0.59, output: 0.79 },
                recommended: false
            }
        ];

        const { groqClient } = req.app.locals;
        const currentModel = groqClient ? groqClient.model : null;

        res.json({
            success: true,
            models: availableModels.map(model => ({
                ...model,
                isCurrent: model.id === currentModel
            })),
            currentModel,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const { logger } = req.app.locals;
        logger.error('Error obteniendo modelos:', error);

        res.status(500).json({
            success: false,
            error: 'Error obteniendo lista de modelos'
        });
    }
});

export default router;