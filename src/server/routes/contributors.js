// ===================================================
// src/server/routes/contributors.js - Versión corregida
// ===================================================
import express from 'express';
import { body, validationResult, param, query } from 'express-validator';

const router = express.Router();

// Datos mock temporales para testing
const mockContributors = [
    {
        id: 1,
        cuit: '30712345678',
        razonSocial: 'ACME Corp S.A.',
        email: 'contacto@acme.com',
        telefono: '+54 11 4444-5555',
        direccion: 'Av. Corrientes 1234, CABA',
        situacionAfip: 'activo',
        categoria: 'responsable_inscripto',
        tags: ['cliente_vip', 'tecnologia'],
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
    },
    {
        id: 2,
        cuit: '27234567890',
        razonSocial: 'Juan Pérez',
        email: 'juan@email.com',
        telefono: '+54 11 5555-6666',
        categoria: 'monotributo',
        situacionAfip: 'activo',
        tags: ['freelancer'],
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
    },
    {
        id: 3,
        cuit: '30999888777',
        razonSocial: 'Tech Solutions S.R.L.',
        email: 'info@techsolutions.com',
        categoria: 'responsable_inscripto',
        situacionAfip: 'activo',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        activo: true
    }
];

// Middleware temporal de autenticación (bypass en desarrollo)
router.use((req, res, next) => {
    if (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') {
        req.user = {
            id: 'dev-user',
            role: 'admin',
            name: 'Developer User'
        };
        return next();
    }

    // En producción, aquí iría la validación JWT real
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Token de acceso requerido',
            timestamp: new Date().toISOString()
        });
    }

    // Simular validación de token
    req.user = { id: 'user-123', role: 'user' };
    next();
});

// ===================================================
// VALIDACIONES
// ===================================================
const contributorValidation = [
    body('cuit')
        .isLength({ min: 11, max: 11 })
        .matches(/^\d{11}$/)
        .withMessage('CUIT debe tener 11 dígitos numéricos'),

    body('razonSocial')
        .isLength({ min: 2, max: 200 })
        .trim()
        .withMessage('Razón social debe tener entre 2 y 200 caracteres'),

    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Email debe ser válido'),

    body('telefono')
        .optional()
        .matches(/^[\+]?[0-9\-\(\)\s]+$/)
        .withMessage('Teléfono debe contener solo números y caracteres válidos'),

    body('categoria')
        .optional()
        .isIn(['responsable_inscripto', 'monotributo', 'exento', 'no_categorizado'])
        .withMessage('Categoría debe ser válida'),

    body('situacionAfip')
        .optional()
        .isIn(['activo', 'dado_de_baja', 'suspendido', 'no_inscripto'])
        .withMessage('Situación AFIP debe ser válida')
];

const importValidation = [
    body('contributors')
        .isArray({ min: 1, max: 1000 })
        .withMessage('Debe ser un array de 1 a 1000 contribuyentes'),

    body('contributors.*.cuit')
        .isLength({ min: 11, max: 11 })
        .matches(/^\d{11}$/)
        .withMessage('Cada CUIT debe tener 11 dígitos numéricos'),

    body('contributors.*.razonSocial')
        .isLength({ min: 2, max: 200 })
        .trim()
        .withMessage('Cada razón social debe tener entre 2 y 200 caracteres')
];

// ===================================================
// FUNCIONES HELPER
// ===================================================

/**
 * Manejo centralizado de errores de validación
 */
function handleValidationErrors(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors: errors.array(),
            timestamp: new Date().toISOString()
        });
    }
    return null;
}

/**
 * Generar ID único para nuevos contribuyentes
 */
function generateId() {
    return Math.max(...mockContributors.map(c => c.id), 0) + 1;
}

/**
 * Validar CUIT (algoritmo básico)
 */
function isValidCuit(cuit) {
    if (!cuit || cuit.length !== 11) return false;

    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let i = 0; i < 10; i++) {
        sum += parseInt(cuit[i]) * multipliers[i];
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;

    return checkDigit === parseInt(cuit[10]);
}

// ===================================================
// ROUTES DEFINITION
// ===================================================

/**
 * GET /api/contributors
 * Lista paginada de contribuyentes con filtros
 */
router.get('/',
    [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page debe ser un entero mayor a 0'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit debe ser entre 1 y 100'),

        query('search')
            .optional()
            .isLength({ min: 2, max: 100 })
            .trim()
            .withMessage('Search debe tener entre 2 y 100 caracteres'),

        query('categoria')
            .optional()
            .isIn(['responsable_inscripto', 'monotributo', 'exento', 'no_categorizado'])
            .withMessage('Categoría debe ser válida'),

        query('situacionAfip')
            .optional()
            .isIn(['activo', 'dado_de_baja', 'suspendido', 'no_inscripto'])
            .withMessage('Situación AFIP debe ser válida')
    ],
    (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const {
                page = 1,
                limit = 20,
                search,
                categoria,
                situacionAfip,
                sortBy = 'razonSocial',
                sortOrder = 'asc'
            } = req.query;

            let filteredContributors = mockContributors.filter(c => c.activo);

            // Aplicar filtros
            if (search) {
                const searchTerm = search.toLowerCase();
                filteredContributors = filteredContributors.filter(c =>
                    c.razonSocial.toLowerCase().includes(searchTerm) ||
                    c.cuit.includes(searchTerm) ||
                    (c.email && c.email.toLowerCase().includes(searchTerm))
                );
            }

            if (categoria) {
                filteredContributors = filteredContributors.filter(c => c.categoria === categoria);
            }

            if (situacionAfip) {
                filteredContributors = filteredContributors.filter(c => c.situacionAfip === situacionAfip);
            }

            // Ordenamiento
            filteredContributors.sort((a, b) => {
                const aValue = a[sortBy] || '';
                const bValue = b[sortBy] || '';

                if (sortOrder === 'desc') {
                    return bValue.localeCompare(aValue);
                }
                return aValue.localeCompare(bValue);
            });

            // Paginación
            const pageInt = parseInt(page);
            const limitInt = parseInt(limit);
            const total = filteredContributors.length;
            const totalPages = Math.ceil(total / limitInt);
            const startIndex = (pageInt - 1) * limitInt;
            const endIndex = startIndex + limitInt;

            const paginatedContributors = filteredContributors.slice(startIndex, endIndex);

            res.json({
                success: true,
                data: paginatedContributors,
                pagination: {
                    page: pageInt,
                    limit: limitInt,
                    total: total,
                    totalPages: totalPages,
                    hasNextPage: pageInt < totalPages,
                    hasPrevPage: pageInt > 1
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error getting contributors:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * GET /api/contributors/:cuit
 * Obtener contribuyente específico por CUIT
 */
router.get('/:cuit',
    [
        param('cuit')
            .isLength({ min: 11, max: 11 })
            .matches(/^\d{11}$/)
            .withMessage('CUIT debe tener 11 dígitos numéricos')
    ],
    (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { cuit } = req.params;
            const contributor = mockContributors.find(c => c.cuit === cuit && c.activo);

            if (!contributor) {
                return res.status(404).json({
                    success: false,
                    error: 'Contribuyente no encontrado',
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                data: contributor,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error getting contributor by CUIT:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * POST /api/contributors
 * Crear nuevo contribuyente
 */
router.post('/',
    contributorValidation,
    (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const contributorData = req.body;

            // Verificar CUIT válido
            if (!isValidCuit(contributorData.cuit)) {
                return res.status(400).json({
                    success: false,
                    error: 'CUIT inválido',
                    timestamp: new Date().toISOString()
                });
            }

            // Verificar si ya existe
            const existing = mockContributors.find(c => c.cuit === contributorData.cuit);
            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'El contribuyente ya existe',
                    data: { cuit: contributorData.cuit },
                    timestamp: new Date().toISOString()
                });
            }

            const newContributor = {
                id: generateId(),
                ...contributorData,
                fechaCreacion: new Date().toISOString(),
                fechaModificacion: new Date().toISOString(),
                activo: true
            };

            mockContributors.push(newContributor);

            res.status(201).json({
                success: true,
                data: newContributor,
                message: 'Contribuyente creado exitosamente',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error creating contributor:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * PUT /api/contributors/:cuit
 * Actualizar contribuyente existente
 */
router.put('/:cuit',
    [
        param('cuit')
            .isLength({ min: 11, max: 11 })
            .matches(/^\d{11}$/)
            .withMessage('CUIT debe tener 11 dígitos numéricos'),
        ...contributorValidation.filter(validation =>
            !validation.builder.fields.includes('cuit') // Excluir validación de CUIT en update
        )
    ],
    (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { cuit } = req.params;
            const updateData = req.body;

            const contributorIndex = mockContributors.findIndex(c => c.cuit === cuit && c.activo);
            if (contributorIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Contribuyente no encontrado',
                    timestamp: new Date().toISOString()
                });
            }

            // Actualizar contribuyente
            mockContributors[contributorIndex] = {
                ...mockContributors[contributorIndex],
                ...updateData,
                cuit, // Mantener CUIT original
                fechaModificacion: new Date().toISOString()
            };

            res.json({
                success: true,
                data: mockContributors[contributorIndex],
                message: 'Contribuyente actualizado exitosamente',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error updating contributor:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * DELETE /api/contributors/:cuit
 * Eliminar contribuyente (soft delete)
 */
router.delete('/:cuit',
    [
        param('cuit')
            .isLength({ min: 11, max: 11 })
            .matches(/^\d{11}$/)
            .withMessage('CUIT debe tener 11 dígitos numéricos')
    ],
    (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { cuit } = req.params;

            const contributorIndex = mockContributors.findIndex(c => c.cuit === cuit && c.activo);
            if (contributorIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Contribuyente no encontrado',
                    timestamp: new Date().toISOString()
                });
            }

            // Soft delete
            mockContributors[contributorIndex].activo = false;
            mockContributors[contributorIndex].fechaModificacion = new Date().toISOString();

            res.json({
                success: true,
                message: 'Contribuyente eliminado exitosamente',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error deleting contributor:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * POST /api/contributors/import
 * Importación masiva de contribuyentes
 */
router.post('/import',
    importValidation,
    (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { contributors, overwriteExisting = false, validateAfip = false } = req.body;

            const results = {
                imported: 0,
                updated: 0,
                failed: 0,
                errors: []
            };

            contributors.forEach(contributorData => {
                try {
                    // Validar CUIT
                    if (!isValidCuit(contributorData.cuit)) {
                        results.failed++;
                        results.errors.push({
                            cuit: contributorData.cuit,
                            error: 'CUIT inválido'
                        });
                        return;
                    }

                    const existingIndex = mockContributors.findIndex(c => c.cuit === contributorData.cuit);

                    if (existingIndex !== -1) {
                        if (overwriteExisting) {
                            mockContributors[existingIndex] = {
                                ...mockContributors[existingIndex],
                                ...contributorData,
                                fechaModificacion: new Date().toISOString()
                            };
                            results.updated++;
                        } else {
                            results.failed++;
                            results.errors.push({
                                cuit: contributorData.cuit,
                                error: 'Ya existe y overwriteExisting es false'
                            });
                        }
                    } else {
                        const newContributor = {
                            id: generateId(),
                            ...contributorData,
                            fechaCreacion: new Date().toISOString(),
                            fechaModificacion: new Date().toISOString(),
                            activo: true
                        };
                        mockContributors.push(newContributor);
                        results.imported++;
                    }

                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        cuit: contributorData.cuit,
                        error: error.message
                    });
                }
            });

            res.json({
                success: true,
                data: results,
                message: `Import completado: ${results.imported} creados, ${results.updated} actualizados, ${results.failed} fallos`,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error importing contributors:', error);
            res.status(500).json({
                success: false,
                error: 'Error en importación masiva',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * GET /api/contributors/stats/summary
 * Estadísticas resumen de contribuyentes
 */
router.get('/stats/summary', (req, res) => {
    try {
        const activeContributors = mockContributors.filter(c => c.activo);

        const stats = {
            total: mockContributors.length,
            activos: activeContributors.length,
            inactivos: mockContributors.length - activeContributors.length,
            porCategoria: {
                responsable_inscripto: activeContributors.filter(c => c.categoria === 'responsable_inscripto').length,
                monotributo: activeContributors.filter(c => c.categoria === 'monotributo').length,
                exento: activeContributors.filter(c => c.categoria === 'exento').length,
                no_categorizado: activeContributors.filter(c => c.categoria === 'no_categorizado').length
            },
            porSituacionAfip: {
                activo: activeContributors.filter(c => c.situacionAfip === 'activo').length,
                dado_de_baja: activeContributors.filter(c => c.situacionAfip === 'dado_de_baja').length,
                suspendido: activeContributors.filter(c => c.situacionAfip === 'suspendido').length,
                no_inscripto: activeContributors.filter(c => c.situacionAfip === 'no_inscripto').length
            },
            creadosUltimos30Dias: activeContributors.filter(c => {
                const createdDate = new Date(c.fechaCreacion);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return createdDate >= thirtyDaysAgo;
            }).length,
            lastUpdate: new Date().toISOString()
        };

        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/contributors/:cuit/compliance
 * Verificar compliance de contribuyente específico
 */
router.get('/:cuit/compliance',
    [
        param('cuit')
            .isLength({ min: 11, max: 11 })
            .matches(/^\d{11}$/)
            .withMessage('CUIT debe tener 11 dígitos numéricos')
    ],
    (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { cuit } = req.params;
            const contributor = mockContributors.find(c => c.cuit === cuit && c.activo);

            if (!contributor) {
                return res.status(404).json({
                    success: false,
                    error: 'Contribuyente no encontrado',
                    timestamp: new Date().toISOString()
                });
            }

            // Simular verificación de compliance
            const compliance = {
                cuit: cuit,
                razonSocial: contributor.razonSocial,
                situacionAfip: contributor.situacionAfip,
                categoria: contributor.categoria,
                afipCompliance: {
                    success: true,
                    status: 'compliant'
                },
                lastCheck: new Date().toISOString(),
                issues: [],
                score: 100
            };

            // Simular algunos problemas de compliance
            if (contributor.situacionAfip !== 'activo') {
                compliance.score -= 50;
                compliance.issues.push('Situación AFIP no activa');
                compliance.afipCompliance.status = 'non_compliant';
            }

            if (!contributor.email) {
                compliance.score -= 10;
                compliance.issues.push('Email no registrado');
            }

            res.json({
                success: true,
                data: compliance,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error getting compliance:', error);
            res.status(500).json({
                success: false,
                error: 'Error verificando compliance',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * POST /api/contributors/:cuit/sync-afip
 * Sincronizar datos con AFIP
 */
router.post('/:cuit/sync-afip',
    [
        param('cuit')
            .isLength({ min: 11, max: 11 })
            .matches(/^\d{11}$/)
            .withMessage('CUIT debe tener 11 dígitos numéricos')
    ],
    (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { cuit } = req.params;
            const contributorIndex = mockContributors.findIndex(c => c.cuit === cuit && c.activo);

            if (contributorIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Contribuyente no encontrado',
                    timestamp: new Date().toISOString()
                });
            }

            // Simular sincronización con AFIP
            const originalData = { ...mockContributors[contributorIndex] };

            // Simular actualización de datos desde AFIP
            mockContributors[contributorIndex] = {
                ...mockContributors[contributorIndex],
                situacionAfip: 'activo', // Simular dato actualizado
                lastAfipSync: new Date().toISOString(),
                fechaModificacion: new Date().toISOString()
            };

            const syncResult = {
                contributor: mockContributors[contributorIndex],
                syncDate: new Date().toISOString(),
                changes: [
                    {
                        field: 'lastAfipSync',
                        oldValue: originalData.lastAfipSync || null,
                        newValue: mockContributors[contributorIndex].lastAfipSync
                    }
                ]
            };

            res.json({
                success: true,
                data: syncResult,
                message: 'Sincronización con AFIP completada',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error syncing with AFIP:', error);
            res.status(500).json({
                success: false,
                error: 'Error sincronizando con AFIP',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }
);

export default router;