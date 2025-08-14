import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ContributorService } from '../../../src/client/services/contributorService.js';

// Mock apiClient
const mockApiClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
};

// Mock apiClient module
jest.mock('../../../src/client/services/apiClient.js', () => ({
    apiClient: mockApiClient
}));

describe('ContributorService', () => {
    beforeEach(() => {
        // Reset all mocks
        Object.values(mockApiClient).forEach(method => {
            if (jest.isMockFunction(method)) {
                method.mockReset();
            }
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getContributors', () => {
        test('should fetch contributors with default params', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: [
                        {
                            id: 'contrib-001',
                            cuit: '20-12345678-9',
                            razonSocial: 'EMPRESA EJEMPLO SA'
                        }
                    ]
                }
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            const result = await ContributorService.getContributors();

            expect(mockApiClient.get).toHaveBeenCalledWith('/contributors', { params: {} });
            expect(result).toEqual(mockResponse.data);
        });

        test('should fetch contributors with custom params', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: []
                }
            };
            const params = { page: 2, limit: 10, search: 'test' };

            mockApiClient.get.mockResolvedValue(mockResponse);

            await ContributorService.getContributors(params);

            expect(mockApiClient.get).toHaveBeenCalledWith('/contributors', { params });
        });

        test('should handle API errors gracefully', async () => {
            const error = new Error('API Error');
            mockApiClient.get.mockRejectedValue(error);

            await expect(ContributorService.getContributors()).rejects.toThrow('API Error');
        });
    });

    describe('getContributor', () => {
        test('should fetch single contributor by ID', async () => {
            const contributorId = 'contrib-001';
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        id: contributorId,
                        cuit: '20-12345678-9',
                        razonSocial: 'EMPRESA EJEMPLO SA'
                    }
                }
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            const result = await ContributorService.getContributor(contributorId);

            expect(mockApiClient.get).toHaveBeenCalledWith(`/contributors/${contributorId}`);
            expect(result).toEqual(mockResponse.data);
        });

        test('should handle not found error', async () => {
            const contributorId = 'non-existent';
            const error = new Error('Contributor not found');
            error.response = { status: 404 };
            
            mockApiClient.get.mockRejectedValue(error);

            await expect(ContributorService.getContributor(contributorId)).rejects.toThrow('Contributor not found');
        });
    });

    describe('createContributor', () => {
        test('should create new contributor successfully', async () => {
            const contributorData = {
                cuit: '20-12345678-9',
                razonSocial: 'NUEVA EMPRESA SA',
                email: 'contacto@nuevaempresa.com',
                categoriaFiscal: 'Responsable Inscripto',
                domicilioFiscal: {
                    calle: 'Av. Test',
                    numero: '123',
                    ciudad: 'CABA',
                    provincia: 'CABA',
                    codigoPostal: 'C1000AAA'
                }
            };

            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        id: 'contrib-new-001',
                        ...contributorData,
                        estado: 'Activo',
                        fechaInscripcion: '2025-01-30T10:00:00Z',
                        complianceScore: 100
                    }
                }
            };

            mockApiClient.post.mockResolvedValue(mockResponse);

            const result = await ContributorService.createContributor(contributorData);

            expect(mockApiClient.post).toHaveBeenCalledWith('/contributors', contributorData);
            expect(result).toEqual(mockResponse.data);
            expect(result.data.id).toBeDefined();
            expect(result.data.estado).toBe('Activo');
        });

        test('should handle validation errors', async () => {
            const invalidData = {
                cuit: 'invalid-cuit',
                razonSocial: ''
            };

            const error = new Error('Validation failed');
            error.response = { 
                status: 400,
                data: {
                    success: false,
                    error: 'Validation failed',
                    errors: [
                        { field: 'cuit', message: 'CUIT debe tener formato XX-XXXXXXXX-X' },
                        { field: 'razonSocial', message: 'Razón social es requerida' }
                    ]
                }
            };

            mockApiClient.post.mockRejectedValue(error);

            await expect(ContributorService.createContributor(invalidData)).rejects.toThrow('Validation failed');
        });

        test('should handle duplicate CUIT error', async () => {
            const duplicateData = {
                cuit: '20-12345678-9',
                razonSocial: 'EMPRESA DUPLICADA SA'
            };

            const error = new Error('Contributor already exists');
            error.response = { 
                status: 409,
                data: {
                    success: false,
                    error: 'El contribuyente ya existe',
                    data: { cuit: '20-12345678-9' }
                }
            };

            mockApiClient.post.mockRejectedValue(error);

            await expect(ContributorService.createContributor(duplicateData)).rejects.toThrow('Contributor already exists');
        });
    });

    describe('updateContributor', () => {
        test('should update contributor successfully', async () => {
            const contributorId = 'contrib-001';
            const updateData = {
                email: 'nuevo@email.com',
                telefono: '011-9999-8888',
                estado: 'Suspendido'
            };

            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        id: contributorId,
                        cuit: '20-12345678-9',
                        razonSocial: 'EMPRESA EJEMPLO SA',
                        ...updateData,
                        ultimaActualizacion: '2025-01-30T11:00:00Z'
                    }
                }
            };

            mockApiClient.put.mockResolvedValue(mockResponse);

            const result = await ContributorService.updateContributor(contributorId, updateData);

            expect(mockApiClient.put).toHaveBeenCalledWith(`/contributors/${contributorId}`, updateData);
            expect(result).toEqual(mockResponse.data);
            expect(result.data.email).toBe(updateData.email);
            expect(result.data.ultimaActualizacion).toBeDefined();
        });

        test('should handle update validation errors', async () => {
            const contributorId = 'contrib-001';
            const invalidData = {
                email: 'invalid-email'
            };

            const error = new Error('Validation failed');
            error.response = { 
                status: 400,
                data: {
                    success: false,
                    error: 'Validation failed',
                    errors: [
                        { field: 'email', message: 'Email debe ser válido' }
                    ]
                }
            };

            mockApiClient.put.mockRejectedValue(error);

            await expect(ContributorService.updateContributor(contributorId, invalidData))
                .rejects.toThrow('Validation failed');
        });
    });

    describe('deleteContributor', () => {
        test('should delete contributor successfully', async () => {
            const contributorId = 'contrib-001';
            const mockResponse = {
                data: {
                    success: true,
                    message: 'Contribuyente eliminado exitosamente'
                }
            };

            mockApiClient.delete.mockResolvedValue(mockResponse);

            const result = await ContributorService.deleteContributor(contributorId);

            expect(mockApiClient.delete).toHaveBeenCalledWith(`/contributors/${contributorId}`);
            expect(result).toEqual(mockResponse.data);
            expect(result.success).toBe(true);
        });

        test('should handle delete not found error', async () => {
            const contributorId = 'non-existent';
            const error = new Error('Contributor not found');
            error.response = { status: 404 };

            mockApiClient.delete.mockRejectedValue(error);

            await expect(ContributorService.deleteContributor(contributorId))
                .rejects.toThrow('Contributor not found');
        });
    });

    describe('validateCuit', () => {
        test('should validate CUIT successfully', async () => {
            const cuit = '20-12345678-9';
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        valid: true,
                        cuit: cuit,
                        razonSocial: 'EMPRESA VALIDADA SA',
                        estado: 'ACTIVO'
                    }
                }
            };

            mockApiClient.post.mockResolvedValue(mockResponse);

            const result = await ContributorService.validateCuit(cuit);

            expect(mockApiClient.post).toHaveBeenCalledWith('/contributors/validate-cuit', { cuit });
            expect(result).toEqual(mockResponse.data);
            expect(result.data.valid).toBe(true);
        });

        test('should handle invalid CUIT', async () => {
            const invalidCuit = '20-12345678-0';
            const mockResponse = {
                data: {
                    success: false,
                    data: {
                        valid: false,
                        cuit: invalidCuit,
                        error: 'CUIT no encontrado en AFIP'
                    }
                }
            };

            mockApiClient.post.mockResolvedValue(mockResponse);

            const result = await ContributorService.validateCuit(invalidCuit);

            expect(result.data.valid).toBe(false);
            expect(result.data.error).toBeDefined();
        });
    });

    describe('bulkImport', () => {
        test('should import contributors successfully', async () => {
            const contributorsData = {
                contributors: [
                    {
                        cuit: '20-11111111-1',
                        razonSocial: 'EMPRESA UNO SA',
                        email: 'uno@empresa.com'
                    },
                    {
                        cuit: '20-22222222-2',
                        razonSocial: 'EMPRESA DOS SA',
                        email: 'dos@empresa.com'
                    }
                ],
                overwriteExisting: false
            };

            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        imported: 2,
                        updated: 0,
                        failed: 0,
                        errors: []
                    }
                }
            };

            mockApiClient.post.mockResolvedValue(mockResponse);

            const result = await ContributorService.bulkImport(contributorsData);

            expect(mockApiClient.post).toHaveBeenCalledWith('/contributors/bulk-import', contributorsData);
            expect(result).toEqual(mockResponse.data);
            expect(result.data.imported).toBe(2);
            expect(result.data.failed).toBe(0);
        });

        test('should handle partial import failures', async () => {
            const contributorsData = {
                contributors: [
                    {
                        cuit: '20-11111111-1',
                        razonSocial: 'EMPRESA UNO SA'
                    },
                    {
                        cuit: 'invalid-cuit',
                        razonSocial: 'EMPRESA INVALIDA'
                    }
                ]
            };

            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        imported: 1,
                        updated: 0,
                        failed: 1,
                        errors: [
                            {
                                cuit: 'invalid-cuit',
                                error: 'CUIT inválido'
                            }
                        ]
                    }
                }
            };

            mockApiClient.post.mockResolvedValue(mockResponse);

            const result = await ContributorService.bulkImport(contributorsData);

            expect(result.data.imported).toBe(1);
            expect(result.data.failed).toBe(1);
            expect(result.data.errors).toHaveLength(1);
        });
    });

    describe('exportContributors', () => {
        test('should export contributors in CSV format', async () => {
            const csvData = 'CUIT,Razón Social,Email\n20-12345678-9,EMPRESA EJEMPLO SA,contacto@ejemplo.com';
            const mockResponse = {
                data: csvData
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            const result = await ContributorService.exportContributors('csv', { estado: 'Activo' });

            expect(mockApiClient.get).toHaveBeenCalledWith('/contributors/export', {
                params: { format: 'csv', estado: 'Activo' },
                responseType: 'blob'
            });
            expect(result).toBe(csvData);
        });

        test('should export with default CSV format', async () => {
            const csvData = 'CUIT,Razón Social,Email\n20-12345678-9,EMPRESA EJEMPLO SA,contacto@ejemplo.com';
            mockApiClient.get.mockResolvedValue({ data: csvData });

            await ContributorService.exportContributors();

            expect(mockApiClient.get).toHaveBeenCalledWith('/contributors/export', {
                params: { format: 'csv' },
                responseType: 'blob'
            });
        });

        test('should export with filters', async () => {
            const filters = { 
                categoriaFiscal: 'Responsable Inscripto',
                estado: 'Activo',
                provincia: 'CABA'
            };
            
            mockApiClient.get.mockResolvedValue({ data: 'exported data' });

            await ContributorService.exportContributors('excel', filters);

            expect(mockApiClient.get).toHaveBeenCalledWith('/contributors/export', {
                params: { format: 'excel', ...filters },
                responseType: 'blob'
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors', async () => {
            const networkError = new Error('Network Error');
            networkError.code = 'NETWORK_ERROR';
            
            mockApiClient.get.mockRejectedValue(networkError);

            await expect(ContributorService.getContributors()).rejects.toThrow('Network Error');
        });

        test('should handle timeout errors', async () => {
            const timeoutError = new Error('Timeout');
            timeoutError.code = 'ECONNABORTED';
            
            mockApiClient.get.mockRejectedValue(timeoutError);

            await expect(ContributorService.getContributors()).rejects.toThrow('Timeout');
        });

        test('should handle server errors', async () => {
            const serverError = new Error('Internal Server Error');
            serverError.response = { 
                status: 500,
                data: {
                    success: false,
                    error: 'Error interno del servidor'
                }
            };
            
            mockApiClient.get.mockRejectedValue(serverError);

            await expect(ContributorService.getContributors()).rejects.toThrow('Internal Server Error');
        });
    });

    describe('Response Data Structure', () => {
        test('should return properly structured contributor data', async () => {
            const mockContributor = {
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
            };

            const mockResponse = {
                data: {
                    success: true,
                    data: mockContributor
                }
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            const result = await ContributorService.getContributor('contrib-001');

            expect(result.data).toMatchObject({
                id: expect.any(String),
                cuit: expect.stringMatching(/^\d{2}-\d{8}-\d{1}$/),
                razonSocial: expect.any(String),
                domicilioFiscal: expect.objectContaining({
                    calle: expect.any(String),
                    numero: expect.any(String),
                    ciudad: expect.any(String),
                    provincia: expect.any(String),
                    codigoPostal: expect.any(String)
                }),
                email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
                categoriaFiscal: expect.stringMatching(/^(Monotributista|Responsable Inscripto|Exento)$/),
                estado: expect.stringMatching(/^(Activo|Suspendido|Dado de baja)$/),
                complianceScore: expect.any(Number),
                riskLevel: expect.stringMatching(/^(Low|Medium|High)$/)
            });
        });
    });
});