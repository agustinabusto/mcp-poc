import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import contributorsRouter from '../../../src/server/routes/contributors.js';

// Create test app
const createTestApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/contributors', contributorsRouter);
    
    // Error handling middleware
    app.use((error, req, res, next) => {
        res.status(error.status || 500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    });
    
    return app;
};

describe('Contributors Routes', () => {
    let app;

    beforeEach(() => {
        app = createTestApp();
        
        // Set development environment for tests
        process.env.NODE_ENV = 'development';
        process.env.BYPASS_AUTH = 'true';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/contributors', () => {
        test('should return paginated list of contributors', async () => {
            const response = await request(app)
                .get('/api/contributors')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.any(Array),
                pagination: expect.objectContaining({
                    page: expect.any(Number),
                    limit: expect.any(Number),
                    total: expect.any(Number),
                    totalPages: expect.any(Number),
                    hasNextPage: expect.any(Boolean),
                    hasPrevPage: expect.any(Boolean)
                }),
                timestamp: expect.any(String)
            });

            // Check contributor structure
            if (response.body.data.length > 0) {
                expect(response.body.data[0]).toMatchObject({
                    id: expect.any(String),
                    cuit: expect.stringMatching(/^\d{2}-\d{8}-\d{1}$/),
                    razonSocial: expect.any(String),
                    categoriaFiscal: expect.any(String),
                    estado: expect.any(String)
                });
            }
        });

        test('should handle search parameter', async () => {
            const response = await request(app)
                .get('/api/contributors')
                .query({ search: 'EMPRESA' })
                .expect(200);

            expect(response.body.success).toBe(true);
            
            // If any results, they should contain the search term
            response.body.data.forEach(contributor => {
                expect(
                    contributor.razonSocial.toLowerCase().includes('empresa') ||
                    contributor.cuit.includes('EMPRESA') ||
                    (contributor.email && contributor.email.toLowerCase().includes('empresa')) ||
                    (contributor.nombreFantasia && contributor.nombreFantasia.toLowerCase().includes('empresa'))
                ).toBe(true);
            });
        });

        test('should handle categoriaFiscal filter', async () => {
            const response = await request(app)
                .get('/api/contributors')
                .query({ categoriaFiscal: 'Responsable Inscripto' })
                .expect(200);

            expect(response.body.success).toBe(true);
            
            response.body.data.forEach(contributor => {
                expect(contributor.categoriaFiscal).toBe('Responsable Inscripto');
            });
        });

        test('should handle estado filter', async () => {
            const response = await request(app)
                .get('/api/contributors')
                .query({ estado: 'Activo' })
                .expect(200);

            expect(response.body.success).toBe(true);
            
            response.body.data.forEach(contributor => {
                expect(contributor.estado).toBe('Activo');
            });
        });

        test('should handle pagination parameters', async () => {
            const response = await request(app)
                .get('/api/contributors')
                .query({ page: 2, limit: 1 })
                .expect(200);

            expect(response.body.pagination.page).toBe(2);
            expect(response.body.pagination.limit).toBe(1);
            expect(response.body.data.length).toBeLessThanOrEqual(1);
        });

        test('should handle sorting', async () => {
            const response = await request(app)
                .get('/api/contributors')
                .query({ sortBy: 'razonSocial', sortOrder: 'desc' })
                .expect(200);

            expect(response.body.success).toBe(true);
            
            if (response.body.data.length > 1) {
                const first = response.body.data[0].razonSocial;
                const second = response.body.data[1].razonSocial;
                expect(first.localeCompare(second)).toBeGreaterThanOrEqual(0);
            }
        });

        test('should validate search parameter length', async () => {
            const response = await request(app)
                .get('/api/contributors')
                .query({ search: 'x' }) // Too short
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Validation failed');
        });

        test('should validate invalid categoriaFiscal', async () => {
            const response = await request(app)
                .get('/api/contributors')
                .query({ categoriaFiscal: 'Invalid Category' })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/contributors/:cuit', () => {
        test('should return specific contributor by CUIT', async () => {
            const response = await request(app)
                .get('/api/contributors/20-12345678-9')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    cuit: '20-12345678-9',
                    razonSocial: expect.any(String)
                }),
                timestamp: expect.any(String)
            });
        });

        test('should return 404 for non-existent CUIT', async () => {
            const response = await request(app)
                .get('/api/contributors/20-99999999-9')
                .expect(404);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Contribuyente no encontrado'
            });
        });

        test('should validate CUIT format', async () => {
            const response = await request(app)
                .get('/api/contributors/invalid-cuit')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Validation failed');
        });

        test('should validate CUIT length', async () => {
            const response = await request(app)
                .get('/api/contributors/20-123-9')
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/contributors', () => {
        const validContributorData = {
            cuit: '30-71234567-8',
            razonSocial: 'TEST EMPRESA SA',
            nombreFantasia: 'Test Empresa',
            email: 'test@empresa.com',
            telefono: '011-5555-5555',
            categoriaFiscal: 'Responsable Inscripto',
            domicilioFiscal: {
                calle: 'Av. Test',
                numero: '123',
                ciudad: 'Test City',
                provincia: 'Buenos Aires',
                codigoPostal: 'B1234ABC'
            }
        };

        test('should create new contributor successfully', async () => {
            const response = await request(app)
                .post('/api/contributors')
                .send(validContributorData)
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    id: expect.any(String),
                    cuit: validContributorData.cuit,
                    razonSocial: validContributorData.razonSocial,
                    estado: 'Activo',
                    fechaInscripcion: expect.any(String),
                    ultimaActualizacion: expect.any(String),
                    complianceScore: 100,
                    riskLevel: 'Low'
                }),
                message: 'Contribuyente creado exitosamente'
            });
        });

        test('should validate required fields', async () => {
            const invalidData = {
                cuit: validContributorData.cuit
                // Missing razonSocial
            };

            const response = await request(app)
                .post('/api/contributors')
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Validation failed');
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: 'razonSocial'
                    })
                ])
            );
        });

        test('should validate CUIT format in creation', async () => {
            const invalidData = {
                ...validContributorData,
                cuit: 'invalid-format'
            };

            const response = await request(app)
                .post('/api/contributors')
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should validate email format', async () => {
            const invalidData = {
                ...validContributorData,
                email: 'invalid-email'
            };

            const response = await request(app)
                .post('/api/contributors')
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should validate categoriaFiscal values', async () => {
            const invalidData = {
                ...validContributorData,
                categoriaFiscal: 'Invalid Category'
            };

            const response = await request(app)
                .post('/api/contributors')
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should detect duplicate CUIT', async () => {
            // Create first contributor
            await request(app)
                .post('/api/contributors')
                .send(validContributorData)
                .expect(201);

            // Try to create duplicate
            const response = await request(app)
                .post('/api/contributors')
                .send(validContributorData)
                .expect(409);

            expect(response.body).toMatchObject({
                success: false,
                error: 'El contribuyente ya existe',
                data: { cuit: validContributorData.cuit }
            });
        });

        test('should validate CUIT checksum', async () => {
            const invalidChecksumData = {
                ...validContributorData,
                cuit: '20-12345678-0' // Invalid checksum
            };

            const response = await request(app)
                .post('/api/contributors')
                .send(invalidChecksumData)
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                error: 'CUIT inválido'
            });
        });
    });

    describe('PUT /api/contributors/:cuit', () => {
        const updateData = {
            email: 'updated@empresa.com',
            telefono: '011-6666-6666',
            estado: 'Suspendido'
        };

        test('should update existing contributor', async () => {
            const response = await request(app)
                .put('/api/contributors/20-12345678-9')
                .send(updateData)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    cuit: '20-12345678-9',
                    email: updateData.email,
                    telefono: updateData.telefono,
                    estado: updateData.estado,
                    ultimaActualizacion: expect.any(String)
                }),
                message: 'Contribuyente actualizado exitosamente'
            });
        });

        test('should return 404 for non-existent contributor', async () => {
            const response = await request(app)
                .put('/api/contributors/20-99999999-9')
                .send(updateData)
                .expect(404);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Contribuyente no encontrado'
            });
        });

        test('should validate update data', async () => {
            const invalidUpdateData = {
                email: 'invalid-email-format'
            };

            const response = await request(app)
                .put('/api/contributors/20-12345678-9')
                .send(invalidUpdateData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should not allow CUIT modification in URL vs body mismatch', async () => {
            const dataWithDifferentCuit = {
                cuit: '20-87654321-4', // Different from URL
                email: 'test@example.com'
            };

            const response = await request(app)
                .put('/api/contributors/20-12345678-9')
                .send(dataWithDifferentCuit)
                .expect(200);

            // Should maintain original CUIT from URL
            expect(response.body.data.cuit).toBe('20-12345678-9');
        });
    });

    describe('DELETE /api/contributors/:cuit', () => {
        test('should delete existing contributor', async () => {
            const response = await request(app)
                .delete('/api/contributors/20-12345678-9')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Contribuyente eliminado exitosamente'
            });

            // Verify deletion by trying to get the contributor
            await request(app)
                .get('/api/contributors/20-12345678-9')
                .expect(404);
        });

        test('should return 404 for non-existent contributor', async () => {
            const response = await request(app)
                .delete('/api/contributors/20-99999999-9')
                .expect(404);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Contribuyente no encontrado'
            });
        });

        test('should validate CUIT format in deletion', async () => {
            const response = await request(app)
                .delete('/api/contributors/invalid-cuit')
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/contributors/import', () => {
        const importData = {
            contributors: [
                {
                    cuit: '20-11111111-1',
                    razonSocial: 'EMPRESA IMPORT UNO SA',
                    email: 'uno@import.com',
                    categoriaFiscal: 'Monotributista'
                },
                {
                    cuit: '20-22222222-2',
                    razonSocial: 'EMPRESA IMPORT DOS SA',
                    email: 'dos@import.com',
                    categoriaFiscal: 'Responsable Inscripto'
                }
            ],
            overwriteExisting: false
        };

        test('should import contributors successfully', async () => {
            const response = await request(app)
                .post('/api/contributors/import')
                .send(importData)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    imported: expect.any(Number),
                    updated: expect.any(Number),
                    failed: expect.any(Number),
                    errors: expect.any(Array)
                })
            });

            expect(response.body.data.imported + response.body.data.updated).toBe(2);
        });

        test('should handle invalid contributors in import', async () => {
            const invalidImportData = {
                contributors: [
                    {
                        cuit: '20-11111111-1',
                        razonSocial: 'VALID EMPRESA SA'
                    },
                    {
                        cuit: 'invalid-cuit',
                        razonSocial: 'INVALID EMPRESA SA'
                    }
                ]
            };

            const response = await request(app)
                .post('/api/contributors/import')
                .send(invalidImportData)
                .expect(200);

            expect(response.body.data.failed).toBeGreaterThan(0);
            expect(response.body.data.errors.length).toBeGreaterThan(0);
            expect(response.body.data.errors[0]).toMatchObject({
                cuit: 'invalid-cuit',
                error: expect.any(String)
            });
        });

        test('should validate import data structure', async () => {
            const invalidStructure = {
                contributors: 'not an array'
            };

            const response = await request(app)
                .post('/api/contributors/import')
                .send(invalidStructure)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should handle empty contributors array', async () => {
            const emptyData = {
                contributors: []
            };

            const response = await request(app)
                .post('/api/contributors/import')
                .send(emptyData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should handle overwriteExisting flag', async () => {
            // First import
            await request(app)
                .post('/api/contributors/import')
                .send(importData);

            // Second import with overwrite
            const overwriteData = {
                contributors: [
                    {
                        cuit: '20-11111111-1',
                        razonSocial: 'EMPRESA ACTUALIZADA SA',
                        email: 'actualizada@import.com'
                    }
                ],
                overwriteExisting: true
            };

            const response = await request(app)
                .post('/api/contributors/import')
                .send(overwriteData)
                .expect(200);

            expect(response.body.data.updated).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed JSON', async () => {
            const response = await request(app)
                .post('/api/contributors')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should handle missing Content-Type', async () => {
            const response = await request(app)
                .post('/api/contributors')
                .send('some data')
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Response Format', () => {
        test('should always include timestamp in responses', async () => {
            const response = await request(app)
                .get('/api/contributors')
                .expect(200);

            expect(response.body.timestamp).toBeDefined();
            expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
        });

        test('should include success field in all responses', async () => {
            const successResponse = await request(app)
                .get('/api/contributors')
                .expect(200);

            expect(successResponse.body.success).toBe(true);

            const errorResponse = await request(app)
                .get('/api/contributors/invalid-cuit')
                .expect(400);

            expect(errorResponse.body.success).toBe(false);
        });
    });

    describe('Authentication and Authorization', () => {
        test('should work in development mode with bypassed auth', async () => {
            process.env.NODE_ENV = 'development';
            process.env.BYPASS_AUTH = 'true';

            const response = await request(app)
                .get('/api/contributors')
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        test('should require auth in production mode', async () => {
            process.env.NODE_ENV = 'production';
            process.env.BYPASS_AUTH = 'false';

            const response = await request(app)
                .get('/api/contributors')
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Token de acceso requerido'
            });

            // Reset for other tests
            process.env.NODE_ENV = 'development';
            process.env.BYPASS_AUTH = 'true';
        });
    });
});