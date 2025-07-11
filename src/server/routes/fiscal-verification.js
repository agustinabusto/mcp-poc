// src/server/routes/fiscal-verification.js - VERSIÓN FINAL COMPLETA
import express from 'express';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Validar dígito verificador CUIT
function isValidCuitChecksum(cuit) {
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cuit[i]) * multipliers[i];
    }
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;
    return parseInt(cuit[10]) === checkDigit;
}

// Validaciones
const cuitValidation = [
    body('cuit')
        .notEmpty()
        .withMessage('CUIT es requerido')
        .custom((value) => {
            const cleanCuit = value.replace(/[-\s]/g, '');
            if (cleanCuit.length !== 11) {
                throw new Error('CUIT debe tener exactamente 11 dígitos');
            }
            if (!/^\d{11}$/.test(cleanCuit)) {
                throw new Error('CUIT debe contener solo números');
            }
            if (!isValidCuitChecksum(cleanCuit)) {
                throw new Error('CUIT con dígito verificador inválido');
            }
            return true;
        })
];

// Guardar en histórico
async function saveToHistory(db, data) {
    if (!db) return null;
    try {
        const query = `
            INSERT INTO fiscal_verifications (
                cuit, verification_date, status, fiscal_data, response_time, 
                error_message, source, verification_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await db.run(query, [
            data.cuit,
            new Date().toISOString(),
            data.success ? 'SUCCESS' : 'ERROR',
            data.data ? JSON.stringify(data.data) : null,
            data.responseTime,
            data.error || null,
            data.source || 'AFIP',
            data.verificationId
        ]);
        return result.lastID;
    } catch (error) {
        console.error('Error guardando histórico:', error);
        return null;
    }
}

// Sugerencias de error
function getSuggestions(errorMessage) {
    const suggestions = [
        'Verificar que el CUIT esté correctamente escrito',
        'Asegurarse que el contribuyente esté registrado en AFIP',
        'Intentar la consulta nuevamente en unos minutos'
    ];

    if (errorMessage?.includes('ECONNREFUSED') || errorMessage?.includes('timeout')) {
        suggestions.push('El servicio de AFIP puede estar temporalmente no disponible');
    }
    if (errorMessage?.includes('404') || errorMessage?.includes('no encontrado')) {
        suggestions.push('El CUIT puede no estar registrado en AFIP');
    }

    return suggestions;
}

// POST /api/fiscal/verify - ENDPOINT PRINCIPAL
router.post('/verify', cuitValidation, async (req, res) => {
    const startTime = Date.now();
    const logger = req.app.locals.logger || console;

    const afipClient = req.app.locals.afipClient;
    console.log('Métodos de afipClient:', Object.getOwnPropertyNames(Object.getPrototypeOf(afipClient)));
    const db = req.app.locals.db;
    const verificationId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        // Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array(),
                timestamp: new Date().toISOString()
            });
        }

        const { cuit, options = {} } = req.body;
        const cleanCuit = cuit.replace(/[-\s]/g, '');

        logger.info(`🔍 Verificando CUIT: ${cleanCuit} [${verificationId}]`);

        // Consultar AFIP
        let afipData = null;
        let afipError = null;

        try {
            if (afipClient) {
                afipData = await afipClient.getTaxpayerInfo(cleanCuit);
                logger.info(`✅ Datos AFIP obtenidos para ${cleanCuit}`);
            } else {
                throw new Error('Cliente AFIP no disponible');
            }
        } catch (error) {
            afipError = error.message;
            logger.error(`❌ Error AFIP para ${cleanCuit}:`, error.message);
        }

        const responseTime = Date.now() - startTime;
        const ca001Compliant = responseTime < 5000;

        if (!ca001Compliant) {
            logger.warn(`⚠️ Tiempo excedido: ${responseTime}ms`);
        }

        // RESPUESTA EXITOSA
        if (afipData) {
            const verificationData = {
                cuit: cleanCuit,
                razonSocial: afipData.razonSocial,
                estado: afipData.estado,
                tipo: afipData.tipo,
                situacionFiscal: {
                    iva: afipData.situacionFiscal?.iva || 'NO_INSCRIPTO',
                    ganancias: afipData.situacionFiscal?.ganancias || 'NO_INSCRIPTO',
                    monotributo: afipData.situacionFiscal?.monotributo || 'NO_INSCRIPTO'
                },
                domicilio: afipData.domicilio || null,
                actividades: afipData.actividades || [],
                fechaUltimaActualizacion: afipData.fechaUltimaActualizacion || new Date().toISOString(),
                fuente: afipData.fuente || 'AFIP',
                metadata: {
                    verificationId: verificationId,
                    requestTimestamp: new Date(startTime).toISOString(),
                    responseTimestamp: new Date().toISOString(),
                    responseTime: responseTime,
                    apiVersion: '1.0.0',
                    compliantWith: {
                        ca001: ca001Compliant,
                        ca002: true,
                        ca003: false,
                        ca004: !!db
                    }
                }
            };

            // Guardar en histórico
            if (db) {
                await saveToHistory(db, {
                    cuit: cleanCuit,
                    success: true,
                    data: verificationData,
                    responseTime: responseTime,
                    source: 'AFIP',
                    verificationId: verificationId
                });
            }

            // Incluir histórico si se solicita
            if (options.includeHistory && db) {
                try {
                    const history = await db.all(`
                        SELECT verification_date, status, response_time 
                        FROM fiscal_verifications 
                        WHERE cuit = ? 
                        ORDER BY verification_date DESC 
                        LIMIT 10
                    `, [cleanCuit]);
                    verificationData.history = history;
                } catch (error) {
                    logger.warn('Error obteniendo histórico:', error.message);
                }
            }

            logger.info(`✅ Verificación exitosa ${cleanCuit} en ${responseTime}ms`);

            return res.status(200).json({
                success: true,
                message: 'Verificación completada exitosamente',
                data: verificationData,
                timestamp: new Date().toISOString()
            });
        }

        // RESPUESTA DE ERROR
        const errorData = {
            cuit: cleanCuit,
            error: afipError || 'Error desconocido consultando AFIP',
            suggestions: getSuggestions(afipError),
            metadata: {
                verificationId: verificationId,
                requestTimestamp: new Date(startTime).toISOString(),
                responseTimestamp: new Date().toISOString(),
                responseTime: responseTime,
                compliantWith: {
                    ca001: false,
                    ca002: false,
                    ca003: true,
                    ca004: !!db
                }
            }
        };

        // Guardar error en histórico
        if (db) {
            await saveToHistory(db, {
                cuit: cleanCuit,
                success: false,
                data: null,
                responseTime: responseTime,
                error: afipError,
                source: 'AFIP',
                verificationId: verificationId
            });
        }

        logger.error(`❌ Error verificando ${cleanCuit}: ${afipError}`);

        return res.status(400).json({
            success: false,
            message: 'Error en la verificación fiscal',
            error: errorData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const responseTime = Date.now() - startTime;
        logger.error('❌ Error interno:', error);

        // Guardar error interno
        if (db) {
            try {
                await saveToHistory(db, {
                    cuit: req.body.cuit?.replace(/[-\s]/g, '') || 'UNKNOWN',
                    success: false,
                    data: null,
                    responseTime: responseTime,
                    error: `Error interno: ${error.message}`,
                    source: 'INTERNAL',
                    verificationId: verificationId
                });
            } catch (historyError) {
                logger.error('Error guardando error:', historyError);
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: {
                type: 'INTERNAL_ERROR',
                message: 'Ha ocurrido un error interno. Por favor intente nuevamente.',
                suggestions: [
                    'Verificar que el CUIT esté bien escrito',
                    'Intentar nuevamente en unos minutos',
                    'Contactar soporte si el problema persiste'
                ],
                metadata: {
                    verificationId: verificationId,
                    responseTime: responseTime
                }
            },
            timestamp: new Date().toISOString()
        });
    }
});

// GET /api/fiscal/history/:cuit - Histórico
router.get('/history/:cuit', async (req, res) => {
    const logger = req.app.locals.logger || console;
    const db = req.app.locals.db;

    try {
        const { cuit } = req.params;
        const cleanCuit = cuit.replace(/[-\s]/g, '');

        if (!cleanCuit || cleanCuit.length !== 11) {
            return res.status(400).json({
                success: false,
                message: 'CUIT inválido',
                timestamp: new Date().toISOString()
            });
        }

        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Servicio de histórico no disponible',
                timestamp: new Date().toISOString()
            });
        }

        const history = await db.all(`
            SELECT 
                id, verification_date, status, fiscal_data, response_time, 
                error_message, source
            FROM fiscal_verifications 
            WHERE cuit = ? 
            ORDER BY verification_date DESC 
            LIMIT 50
        `, [cleanCuit]);

        const formattedHistory = history.map(row => ({
            id: row.id,
            verificationDate: row.verification_date,
            status: row.status,
            responseTime: row.response_time,
            errorMessage: row.error_message,
            source: row.source,
            data: row.fiscal_data ? JSON.parse(row.fiscal_data) : null
        }));

        logger.info(`📊 Histórico obtenido para ${cleanCuit}: ${history.length} registros`);

        return res.status(200).json({
            success: true,
            message: `Histórico obtenido para CUIT ${cleanCuit}`,
            data: {
                cuit: cleanCuit,
                totalRecords: formattedHistory.length,
                history: formattedHistory
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ Error obteniendo histórico:', error);
        return res.status(500).json({
            success: false,
            message: 'Error obteniendo histórico',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// GET /api/fiscal/stats - Estadísticas
router.get('/stats', async (req, res) => {
    const logger = req.app.locals.logger || console;
    const db = req.app.locals.db;

    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Servicio de estadísticas no disponible',
                timestamp: new Date().toISOString()
            });
        }

        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_verifications,
                COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful,
                COUNT(CASE WHEN status = 'ERROR' THEN 1 END) as failed,
                ROUND(AVG(CASE WHEN status = 'SUCCESS' THEN response_time END)) as avg_response_time,
                COUNT(CASE WHEN status = 'SUCCESS' AND response_time < 5000 THEN 1 END) as ca001_compliant,
                COUNT(DISTINCT cuit) as unique_cuits
            FROM fiscal_verifications
        `);

        const successRate = stats.total_verifications > 0 ?
            ((stats.successful / stats.total_verifications) * 100).toFixed(2) : 0;

        const ca001Rate = stats.successful > 0 ?
            ((stats.ca001_compliant / stats.successful) * 100).toFixed(2) : 0;

        const result = {
            summary: {
                totalVerifications: stats.total_verifications || 0,
                successfulVerifications: stats.successful || 0,
                failedVerifications: stats.failed || 0,
                successRate: parseFloat(successRate),
                averageResponseTime: stats.avg_response_time || 0,
                uniqueCuits: stats.unique_cuits || 0
            },
            performance: {
                target: {
                    responseTime: 5000,
                    successRate: 98,
                    ca001Compliance: 95
                },
                current: {
                    responseTime: stats.avg_response_time || 0,
                    successRate: parseFloat(successRate),
                    ca001Compliance: parseFloat(ca001Rate)
                }
            }
        };

        logger.info('📊 Estadísticas obtenidas exitosamente');

        return res.status(200).json({
            success: true,
            message: 'Estadísticas obtenidas exitosamente',
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ Error obteniendo estadísticas:', error);
        return res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;