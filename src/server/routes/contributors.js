// ===================================================
// src/server/routes/contributors.js - Versión corregida
// ===================================================
import express from 'express';
import { body, validationResult, param, query } from 'express-validator';

const router = express.Router();

// Datos mock temporales para testing - Compatible con frontend
const mockContributors = [
    {
        id: 'contrib-001',
        cuit: '20-12345678-9',
        razonSocial: 'EMPRESA EJEMPLO SA',
        nombreFantasia: 'Empresa Ejemplo',
        domicilioFiscal: {
            calle: 'Av. Corrientes',
            numero: '1234',
            ciudad: 'CABA',
            provincia: 'CABA',
            codigoPostal: 'C1043AAZ'
        },
        email: 'contacto@ejemplo.com',
        telefono: '011-1234-5678',
        categoriaFiscal: 'Responsable Inscripto',
        estado: 'Activo',
        fechaInscripcion: '2024-01-15T09:00:00Z',
        ultimaActualizacion: '2025-01-28T15:45:00Z',
        complianceScore: 85,
        riskLevel: 'Low'
    },
    {
        id: 'contrib-002',
        cuit: '23-87654321-4',
        razonSocial: 'GARCIA MARIA',
        nombreFantasia: null,
        domicilioFiscal: {
            calle: 'San Martín',
            numero: '567',
            ciudad: 'La Plata',
            provincia: 'Buenos Aires',
            codigoPostal: 'B1900'
        },
        email: 'maria.garcia@email.com',
        telefono: '0221-456-7890',
        categoriaFiscal: 'Monotributista',
        estado: 'Activo',
        fechaInscripcion: '2024-03-20T14:30:00Z',
        ultimaActualizacion: '2025-01-29T08:20:00Z',
        complianceScore: 75,
        riskLevel: 'Medium'
    },
    {
        id: 'contrib-003',
        cuit: '30-98765432-1',
        razonSocial: 'LOPEZ CARLOS SRL',
        nombreFantasia: 'Servicios López',
        domicilioFiscal: {
            calle: 'Belgrano',
            numero: '890',
            ciudad: 'Rosario',
            provincia: 'Santa Fe',
            codigoPostal: 'S2000'
        },
        email: 'admin@servicioslopez.com',
        telefono: '0341-234-5678',
        categoriaFiscal: 'Responsable Inscripto',
        estado: 'Suspendido',
        fechaInscripcion: '2023-11-10T16:45:00Z',
        ultimaActualizacion: '2025-01-25T11:15:00Z',
        complianceScore: 45,
        riskLevel: 'High'
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
        .isLength({ min: 13, max: 13 })
        .matches(/^\d{2}-\d{8}-\d{1}$/)
        .withMessage('CUIT debe tener formato XX-XXXXXXXX-X'),

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

    body('categoriaFiscal')
        .optional()
        .isIn(['Monotributista', 'Responsable Inscripto', 'Exento'])
        .withMessage('Categoría fiscal debe ser válida'),

    body('estado')
        .optional()
        .isIn(['Activo', 'Suspendido', 'Dado de baja'])
        .withMessage('Estado debe ser válido'),

    body('domicilioFiscal.calle')
        .optional()
        .isLength({ min: 2, max: 100 })
        .trim()
        .withMessage('Calle debe tener entre 2 y 100 caracteres'),

    body('domicilioFiscal.numero')
        .optional()
        .isLength({ min: 1, max: 20 })
        .trim()
        .withMessage('Número debe tener entre 1 y 20 caracteres'),

    body('domicilioFiscal.ciudad')
        .optional()
        .isLength({ min: 2, max: 50 })
        .trim()
        .withMessage('Ciudad debe tener entre 2 y 50 caracteres'),

    body('domicilioFiscal.provincia')
        .optional()
        .isLength({ min: 2, max: 50 })
        .trim()
        .withMessage('Provincia debe tener entre 2 y 50 caracteres'),

    body('domicilioFiscal.codigoPostal')
        .optional()
        .isLength({ min: 4, max: 10 })
        .trim()
        .withMessage('Código postal debe tener entre 4 y 10 caracteres')
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
    return `contrib-${Date.now()}`;
}

/**
 * Validar CUIT (algoritmo básico) - Acepta formato XX-XXXXXXXX-X
 */
function isValidCuit(cuit) {
    if (!cuit) return false;
    
    // Eliminar guiones para validación
    const cleanCuit = cuit.replace(/-/g, '');
    
    if (cleanCuit.length !== 11) return false;

    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCuit[i]) * multipliers[i];
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;

    return checkDigit === parseInt(cleanCuit[10]);
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

        query('categoriaFiscal')
            .optional()
            .isIn(['Monotributista', 'Responsable Inscripto', 'Exento'])
            .withMessage('Categoría fiscal debe ser válida'),

        query('estado')
            .optional()
            .isIn(['Activo', 'Suspendido', 'Dado de baja'])
            .withMessage('Estado debe ser válido')
    ],
    (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const {
                page = 1,
                limit = 20,
                search,
                categoriaFiscal,
                estado,
                sortBy = 'razonSocial',
                sortOrder = 'asc'
            } = req.query;

            let filteredContributors = [...mockContributors];

            // Aplicar filtros
            if (search) {
                const searchTerm = search.toLowerCase();
                filteredContributors = filteredContributors.filter(c =>
                    c.razonSocial.toLowerCase().includes(searchTerm) ||
                    c.cuit.includes(searchTerm) ||
                    (c.email && c.email.toLowerCase().includes(searchTerm)) ||
                    (c.nombreFantasia && c.nombreFantasia.toLowerCase().includes(searchTerm))
                );
            }

            if (categoriaFiscal) {
                filteredContributors = filteredContributors.filter(c => c.categoriaFiscal === categoriaFiscal);
            }

            if (estado) {
                filteredContributors = filteredContributors.filter(c => c.estado === estado);
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
            .isLength({ min: 13, max: 13 })
            .matches(/^\d{2}-\d{8}-\d{1}$/)
            .withMessage('CUIT debe tener formato XX-XXXXXXXX-X')
    ],
    (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { cuit } = req.params;
            const contributor = mockContributors.find(c => c.cuit === cuit);

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
                estado: contributorData.estado || 'Activo',
                fechaInscripcion: new Date().toISOString(),
                ultimaActualizacion: new Date().toISOString(),
                complianceScore: 100,
                riskLevel: 'Low'
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
            .isLength({ min: 13, max: 13 })
            .matches(/^\d{2}-\d{8}-\d{1}$/)
            .withMessage('CUIT debe tener formato XX-XXXXXXXX-X'),
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

            const contributorIndex = mockContributors.findIndex(c => c.cuit === cuit);
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
                ultimaActualizacion: new Date().toISOString()
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
            .isLength({ min: 13, max: 13 })
            .matches(/^\d{2}-\d{8}-\d{1}$/)
            .withMessage('CUIT debe tener formato XX-XXXXXXXX-X')
    ],
    (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { cuit } = req.params;

            const contributorIndex = mockContributors.findIndex(c => c.cuit === cuit);
            if (contributorIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Contribuyente no encontrado',
                    timestamp: new Date().toISOString()
                });
            }

            // Remove from array (real delete for demo)
            mockContributors.splice(contributorIndex, 1);

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