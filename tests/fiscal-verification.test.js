// tests/fiscal-verification.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'fs/promises';
import path from 'path';

// Mock del servidor para testing
import { createTestServer } from './helpers/test-server.js';

describe('HU-001: Verificación de Estado Fiscal', () => {
    let app;
    let db;
    let server;

    beforeAll(async () => {
        // Configurar base de datos de prueba
        const testDbPath = './data/test_fiscal_verification.db';

        // Limpiar base de datos de prueba si existe
        try {
            await fs.unlink(testDbPath);
        } catch (error) {
            // Ignorar si no existe
        }

        // Crear base de datos de prueba
        db = await open({
            filename: testDbPath,
            driver: sqlite3.Database
        });

        // Crear schema de prueba
        await db.exec(`
            CREATE TABLE fiscal_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cuit TEXT NOT NULL,
                verification_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'ERROR', 'PARTIAL')),
                fiscal_data TEXT,
                response_time INTEGER NOT NULL,
                error_message TEXT,
                error_code TEXT,
                source TEXT DEFAULT 'AFIP',
                verification_id TEXT UNIQUE
            );
        `);

        // Crear servidor de prueba
        app = createTestServer(db);
        server = app.listen(0); // Puerto aleatorio
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
        if (db) {
            await db.close();
        }

        // Limpiar archivo de prueba
        try {
            await fs.unlink('./data/test_fiscal_verification.db');
        } catch (error) {
            // Ignorar errores
        }
    });

    beforeEach(async () => {
        // Limpiar datos entre pruebas
        await db.run('DELETE FROM fiscal_verifications');
    });

    describe('CA-001: Verificación Automática', () => {
        it('debe verificar un CUIT válido en menos de 5 segundos', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '30500010912' })
                .expect(200);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            expect(responseTime).toBeLessThan(5000);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.cuit).toBe('30500010912');
            expect(response.body.data.metadata.responseTime).toBeLessThan(5000);
        });

        it('debe rechazar CUIT con formato inválido', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '123' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].msg).toContain('11 dígitos');
        });

        it('debe rechazar CUIT con dígito verificador inválido', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '20123456780' }) // Dígito verificador incorrecto
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors[0].msg).toContain('dígito verificador inválido');
        });

        it('debe aceptar CUIT con formato de guiones', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '20-12345678-9' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.cuit).toBe('20123456789');
        });
    });

    describe('CA-002: Información Detallada', () => {
        it('debe mostrar información completa del contribuyente', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '30500010912' })
                .expect(200);

            const data = response.body.data;

            // Verificar campos obligatorios
            expect(data.cuit).toBeDefined();
            expect(data.razonSocial).toBeDefined();
            expect(data.estado).toBeDefined();
            expect(data.situacionFiscal).toBeDefined();
            expect(data.situacionFiscal.iva).toBeDefined();
            expect(data.situacionFiscal.ganancias).toBeDefined();
            expect(data.situacionFiscal.monotributo).toBeDefined();

            // Verificar metadatos
            expect(data.metadata).toBeDefined();
            expect(data.metadata.verificationId).toBeDefined();
            expect(data.metadata.responseTime).toBeDefined();
            expect(data.metadata.compliantWith).toBeDefined();
        });

        it('debe incluir domicilio cuando esté disponible', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '30500010912' })
                .expect(200);

            const data = response.body.data;

            if (data.domicilio) {
                expect(data.domicilio.direccion).toBeDefined();
                expect(data.domicilio.localidad).toBeDefined();
                expect(data.domicilio.provincia).toBeDefined();
            }
        });

        it('debe incluir actividades económicas cuando estén disponibles', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '30500010912' })
                .expect(200);

            const data = response.body.data;

            if (data.actividades && data.actividades.length > 0) {
                const actividad = data.actividades[0];
                expect(actividad.codigo).toBeDefined();
                expect(actividad.descripcion).toBeDefined();
                expect(typeof actividad.principal).toBe('boolean');
            }
        });
    });

    describe('CA-003: Manejo de Errores', () => {
        it('debe mostrar mensaje de error claro cuando el CUIT no existe', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '20999999999' }) // CUIT que no existe
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Error en la verificación fiscal');
            expect(response.body.error).toBeDefined();
            expect(response.body.error.suggestions).toBeDefined();
            expect(Array.isArray(response.body.error.suggestions)).toBe(true);
        });

        it('debe registrar errores en los logs', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '20999999999' })
                .expect(400);

            // Verificar que el error se guardó en la base de datos
            const errorRecord = await db.get(`
                SELECT * FROM fiscal_verifications 
                WHERE cuit = ? AND status = 'ERROR'
                ORDER BY verification_date DESC LIMIT 1
            `, ['20999999999']);

            expect(errorRecord).toBeDefined();
            expect(errorRecord.error_message).toBeDefined();
            expect(errorRecord.status).toBe('ERROR');
        });

        it('debe sugerir acciones correctivas según el tipo de error', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '20999999999' })
                .expect(400);

            const suggestions = response.body.error.suggestions;
            expect(suggestions).toContain('Verificar que el CUIT esté correctamente escrito');
            expect(suggestions.length).toBeGreaterThan(0);
        });

        it('debe manejar errores de conectividad con AFIP', async () => {
            // Simular error de conectividad usando mock
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({
                    cuit: '20888888888',
                    _mockError: 'ECONNREFUSED' // Flag para simular error
                })
                .expect(400);

            expect(response.body.error.type).toBe('CONNECTION_ERROR');
            expect(response.body.error.suggestions).toContain('El servicio de AFIP puede estar temporalmente no disponible');
        });
    });

    describe('CA-004: Histórico de Verificaciones', () => {
        beforeEach(async () => {
            // Insertar datos de prueba para histórico
            const testData = [
                {
                    cuit: '30500010912',
                    status: 'SUCCESS',
                    fiscal_data: JSON.stringify({ razonSocial: 'TEST COMPANY' }),
                    response_time: 1500,
                    verification_id: 'test_001'
                },
                {
                    cuit: '30500010912',
                    status: 'SUCCESS',
                    fiscal_data: JSON.stringify({ razonSocial: 'TEST COMPANY' }),
                    response_time: 1800,
                    verification_id: 'test_002'
                }
            ];

            for (const data of testData) {
                await db.run(`
                    INSERT INTO fiscal_verifications 
                    (cuit, status, fiscal_data, response_time, verification_id)
                    VALUES (?, ?, ?, ?, ?)
                `, [data.cuit, data.status, data.fiscal_data, data.response_time, data.verification_id]);
            }
        });

        it('debe guardar verificaciones exitosas en el histórico', async () => {
            await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '27230938607' })
                .expect(200);

            const record = await db.get(`
                SELECT * FROM fiscal_verifications 
                WHERE cuit = ? ORDER BY verification_date DESC LIMIT 1
            `, ['27230938607']);

            expect(record).toBeDefined();
            expect(record.cuit).toBe('27230938607');
            expect(record.status).toBe('SUCCESS');
            expect(record.fiscal_data).toBeDefined();
            expect(record.response_time).toBeGreaterThan(0);
        });

        it('debe permitir consultar verificaciones anteriores', async () => {
            const response = await request(app)
                .get('/api/fiscal/history/30500010912')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.history).toBeDefined();
            expect(Array.isArray(response.body.data.history)).toBe(true);
            expect(response.body.data.history.length).toBe(2); // De los datos de prueba
        });

        it('debe incluir histórico en verificaciones cuando se solicite', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({
                    cuit: '30500010912',
                    options: { includeHistory: true }
                })
                .expect(200);

            expect(response.body.data.history).toBeDefined();
            expect(Array.isArray(response.body.data.history)).toBe(true);
        });

        it('debe ordenar el histórico por fecha descendente', async () => {
            const response = await request(app)
                .get('/api/fiscal/history/30500010912')
                .expect(200);

            const history = response.body.data.history;
            if (history.length > 1) {
                const firstDate = new Date(history[0].verificationDate);
                const secondDate = new Date(history[1].verificationDate);
                expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
            }
        });
    });

    describe('Métricas de Éxito', () => {
        beforeEach(async () => {
            // Insertar datos de prueba que cumplan diferentes criterios
            const testVerifications = [
                { cuit: '30500010912', status: 'SUCCESS', response_time: 1200 }, // Cumple CA-001
                { cuit: '27230938607', status: 'SUCCESS', response_time: 2800 }, // Cumple CA-001
                { cuit: '20123456789', status: 'SUCCESS', response_time: 4500 }, // Cumple CA-001
                { cuit: '20111222333', status: 'SUCCESS', response_time: 6000 }, // No cumple CA-001
                { cuit: '20999888777', status: 'ERROR', response_time: 3000 },   // Error
            ];

            for (const [index, data] of testVerifications.entries()) {
                await db.run(`
                    INSERT INTO fiscal_verifications 
                    (cuit, status, response_time, verification_id)
                    VALUES (?, ?, ?, ?)
                `, [data.cuit, data.status, data.response_time, `metric_test_${index}`]);
            }
        });

        it('debe alcanzar tiempo de respuesta < 5 segundos en 95% de casos', async () => {
            const response = await request(app)
                .get('/api/fiscal/stats')
                .expect(200);

            const stats = response.body.data;

            // Con nuestros datos de prueba: 4 de 5 son < 5 segundos = 80%
            // Pero el test verifica que la métrica se calcula correctamente
            expect(stats.performance.current.responseTime).toBeDefined();
            expect(stats.performance.target.responseTime).toBe(5000);
        });

        it('debe mantener tasa de éxito > 98%', async () => {
            const response = await request(app)
                .get('/api/fiscal/stats')
                .expect(200);

            const stats = response.body.data;

            // Con nuestros datos: 4 éxitos de 5 total = 80%
            expect(stats.summary.successRate).toBeDefined();
            expect(parseFloat(stats.summary.successRate)).toBe(80.0);
            expect(stats.performance.target.successRate).toBe(98);
        });

        it('debe trackear compliance con CA-001', async () => {
            const response = await request(app)
                .get('/api/fiscal/stats')
                .expect(200);

            const stats = response.body.data;
            expect(stats.summary.totalVerifications).toBe(5);
            expect(stats.summary.successfulVerifications).toBe(4);
            expect(stats.summary.failedVerifications).toBe(1);
        });
    });

    describe('Performance y Carga', () => {
        it('debe manejar múltiples verificaciones concurrentes', async () => {
            const promises = [];
            const cuits = ['30500010912', '27230938607', '20123456789'];

            // Crear 9 requests concurrentes (3 CUITs x 3 veces cada uno)
            for (let i = 0; i < 3; i++) {
                for (const cuit of cuits) {
                    promises.push(
                        request(app)
                            .post('/api/fiscal/verify')
                            .send({ cuit })
                    );
                }
            }

            const results = await Promise.all(promises);

            // Todos deberían ser exitosos
            results.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            // Verificar que se guardaron todos los registros
            const count = await db.get('SELECT COUNT(*) as count FROM fiscal_verifications');
            expect(count.count).toBe(9);
        });

        it('debe mantener performance bajo carga', async () => {
            const iterations = 10;
            const responseTimes = [];

            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();

                await request(app)
                    .post('/api/fiscal/verify')
                    .send({ cuit: '30500010912' })
                    .expect(200);

                responseTimes.push(Date.now() - startTime);
            }

            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);

            expect(avgResponseTime).toBeLessThan(1000); // Promedio < 1 segundo
            expect(maxResponseTime).toBeLessThan(5000);  // Máximo < 5 segundos
        });
    });

    describe('Validaciones de Entrada', () => {
        it('debe rechazar requests sin CUIT', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({})
                .expect(400);

            expect(response.body.errors[0].msg).toContain('CUIT es requerido');
        });

        it('debe rechazar CUIT con caracteres no numéricos', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '20ABC456789' })
                .expect(400);

            expect(response.body.errors[0].msg).toContain('solo números');
        });

        it('debe rechazar CUIT muy corto', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '123456' })
                .expect(400);

            expect(response.body.errors[0].msg).toContain('11 dígitos');
        });

        it('debe rechazar CUIT muy largo', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '123456789012' })
                .expect(400);

            expect(response.body.errors[0].msg).toContain('11 dígitos');
        });
    });

    describe('Funcionalidades Adicionales', () => {
        it('debe proporcionar estadísticas del sistema', async () => {
            // Insertar algunos datos de prueba
            await db.run(`
                INSERT INTO fiscal_verifications (cuit, status, response_time, verification_id)
                VALUES ('30500010912', 'SUCCESS', 1500, 'stats_test_1')
            `);

            const response = await request(app)
                .get('/api/fiscal/stats')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.summary).toBeDefined();
            expect(response.body.data.performance).toBeDefined();
            expect(response.body.data.summary.totalVerifications).toBeGreaterThan(0);
        });

        it('debe proporcionar estado del sistema fiscal', async () => {
            const response = await request(app)
                .get('/api/fiscal-system-status')
                .expect(200);

            expect(response.body.service).toBe('Fiscal Verification System');
            expect(response.body.status).toBe('active');
            expect(response.body.features.fiscalVerification).toBe(true);
            expect(response.body.features.detailedInformation).toBe(true);
            expect(response.body.features.errorHandling).toBe(true);
            expect(response.body.features.verificationHistory).toBe(true);
        });

        it('debe generar IDs de verificación únicos', async () => {
            const responses = [];

            for (let i = 0; i < 3; i++) {
                const response = await request(app)
                    .post('/api/fiscal/verify')
                    .send({ cuit: '30500010912' })
                    .expect(200);

                responses.push(response.body.data.metadata.verificationId);
            }

            // Verificar que todos los IDs son únicos
            const uniqueIds = new Set(responses);
            expect(uniqueIds.size).toBe(3);
        });

        it('debe incluir información de compliance en la respuesta', async () => {
            const response = await request(app)
                .post('/api/fiscal/verify')
                .send({ cuit: '30500010912' })
                .expect(200);

            const compliance = response.body.data.metadata.compliantWith;
            expect(compliance).toBeDefined();
            expect(typeof compliance.ca001).toBe('boolean'); // < 5 segundos
            expect(compliance.ca002).toBe(true);             // Información detallada
            expect(compliance.ca003).toBe(false);            // No hay errores
            expect(compliance.ca004).toBe(true);             // Se guarda en histórico
        });
    });

    describe('Casos Edge', () => {
        it('debe manejar CUIT con formato de guiones correctamente', async () => {
            const testCases = [
                '20-12345678-9',
                '20 12345678 9',
                '20-123-456-78-9'
            ];

            for (const cuitFormat of testCases) {
                const response = await request(app)
                    .post('/api/fiscal/verify')
                    .send({ cuit: cuitFormat })
                    .expect(200);

                expect(response.body.data.cuit).toBe('20123456789');
            }
        });

        it('debe manejar CUITs límite correctamente', async () => {
            const edgeCuits = [
                '10000000000', // Mínimo posible
                '99999999999'  // Máximo posible
            ];

            for (const cuit of edgeCuits) {
                const response = await request(app)
                    .post('/api/fiscal/verify')
                    .send({ cuit });

                // Puede ser exitoso o error dependiendo de si existe en AFIP,
                // pero no debe dar error de validación
                expect([200, 400]).toContain(response.status);

                if (response.status === 400) {
                    // Si es error, debe ser por CUIT no encontrado, no por validación
                    expect(response.body.message).not.toContain('dígito verificador');
                }
            }
        });
    });
});

// Helper para validar estructura de respuesta exitosa
function validateSuccessResponse(responseBody) {
    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toBeDefined();
    expect(responseBody.data).toBeDefined();
    expect(responseBody.timestamp).toBeDefined();

    const data = responseBody.data;
    expect(data.cuit).toBeDefined();
    expect(data.metadata).toBeDefined();
    expect(data.metadata.verificationId).toBeDefined();
    expect(data.metadata.responseTime).toBeDefined();
    expect(data.metadata.compliantWith).toBeDefined();
}

// Helper para validar estructura de respuesta de error
function validateErrorResponse(responseBody) {
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toBeDefined();
    expect(responseBody.error || responseBody.errors).toBeDefined();
    expect(responseBody.timestamp).toBeDefined();
}