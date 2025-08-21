import { renderHook, act, waitFor } from '@testing-library/react';
import { useOCR } from '../../../src/client/hooks/useOCR.js';

// Mock API_BASE_URL
jest.mock('../../../src/client/config/constants.js', () => ({
    API_BASE_URL: 'http://localhost:8080/api'
}));

// Mock fetch
global.fetch = jest.fn();

describe('useOCR Hook - ML Enhancement Functions', () => {
    beforeEach(() => {
        fetch.mockClear();
        global.window = {
            showNotification: jest.fn()
        };
    });

    afterEach(() => {
        delete global.window;
    });

    describe('submitMLCorrection', () => {
        test('should submit ML correction successfully', async () => {
            const mockResponse = {
                success: true,
                learningResult: {
                    correctionCount: 2,
                    patternId: 123,
                    cuit: '30712345678'
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                const response = await result.current.submitMLCorrection(
                    'doc-123',
                    { total: 1500, cuit: '30712345678' },
                    { total: 1400, cuit: '30712345678' }
                );

                expect(response).toEqual(mockResponse);
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/ocr/ml/learn',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: expect.stringContaining('"documentId":"doc-123"')
                })
            );

            expect(global.window.showNotification).toHaveBeenCalledWith(
                'Sistema actualizado con tu corrección',
                'success'
            );
        });

        test('should handle submission errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                try {
                    await result.current.submitMLCorrection('doc-123', {}, {});
                } catch (error) {
                    expect(error.message).toContain('HTTP error! status: 500');
                }
            });

            expect(result.current.error).toContain('HTTP error! status: 500');
        });

        test('should handle API error responses', async () => {
            const errorResponse = {
                success: false,
                error: 'Invalid document ID'
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(errorResponse)
            });

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                try {
                    await result.current.submitMLCorrection('invalid-doc', {}, {});
                } catch (error) {
                    expect(error.message).toBe('Invalid document ID');
                }
            });
        });
    });

    describe('getConfidenceMetrics', () => {
        test('should fetch confidence metrics successfully', async () => {
            const mockMetrics = {
                cuit: '30712345678',
                hasPattern: true,
                successRate: 0.95,
                usageCount: 10,
                maturityLevel: 'mature'
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockMetrics)
            });

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                const metrics = await result.current.getConfidenceMetrics('30712345678');
                expect(metrics).toEqual(mockMetrics);
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/ocr/ml/confidence/30712345678'
            );
        });

        test('should return null on fetch error', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                const metrics = await result.current.getConfidenceMetrics('nonexistent');
                expect(metrics).toBeNull();
            });

            expect(result.current.error).toContain('HTTP error! status: 404');
        });
    });

    describe('getProviderTemplate', () => {
        test('should fetch provider template successfully', async () => {
            const mockTemplate = {
                hasTemplate: true,
                template: {
                    cuit: '30712345678',
                    patternId: 1,
                    confidence: 0.95,
                    pattern: {
                        layout: { structure: 'standard' },
                        fieldMappings: { total: { expectedType: 'number' } }
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTemplate)
            });

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                const template = await result.current.getProviderTemplate('30712345678');
                expect(template).toEqual(mockTemplate);
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/ocr/ml/patterns/30712345678'
            );
        });

        test('should return null on error', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                const template = await result.current.getProviderTemplate('30712345678');
                expect(template).toBeNull();
            });
        });
    });

    describe('processDocumentWithML', () => {
        test('should process document with ML enhancement', async () => {
            const mockResult = {
                success: true,
                result: {
                    structured: { total: 1500 },
                    confidence: 0.92,
                    originalConfidence: 0.85,
                    mlEnhanced: true,
                    providerTemplate: { id: 1, confidence: 0.95 }
                },
                mlEnhanced: true
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResult)
            });

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                const response = await result.current.processDocumentWithML(
                    '/test/invoice.pdf',
                    'invoice',
                    '30712345678'
                );
                expect(response).toEqual(mockResult);
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/ocr/ml/process',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filePath: '/test/invoice.pdf',
                        documentType: 'invoice',
                        cuit: '30712345678'
                    })
                })
            );
        });

        test('should handle processing errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                try {
                    await result.current.processDocumentWithML('/test/doc.pdf', 'invoice');
                } catch (error) {
                    expect(error.message).toContain('HTTP error! status: 500');
                }
            });
        });
    });

    describe('getMLStats', () => {
        test('should fetch ML statistics successfully', async () => {
            const mockStats = {
                overview: {
                    totalProviders: 5,
                    totalPatterns: 8,
                    averageSuccessRate: 0.92
                },
                corrections: {
                    totalCorrections: 25,
                    documentsCorrected: 15
                },
                byDocumentType: [
                    { document_type: 'invoice', pattern_count: 5 }
                ],
                systemHealth: {
                    status: 'active',
                    initialized: true
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockStats)
            });

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                const stats = await result.current.getMLStats();
                expect(stats).toEqual(mockStats);
            });

            expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/ocr/ml/stats');
        });

        test('should return default stats on error', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                const stats = await result.current.getMLStats();
                
                expect(stats.overview.totalProviders).toBe(0);
                expect(stats.systemHealth.status).toBe('unknown');
                expect(stats.systemHealth.initialized).toBe(false);
            });
        });
    });

    describe('deleteProviderPatterns', () => {
        test('should delete provider patterns successfully', async () => {
            const mockResponse = {
                success: true,
                deletedPatterns: 2,
                message: 'Patterns for CUIT 30712345678 have been deleted'
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                const response = await result.current.deleteProviderPatterns('30712345678');
                expect(response).toEqual(mockResponse);
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/ocr/ml/patterns/30712345678',
                { method: 'DELETE' }
            );
        });

        test('should handle deletion errors', async () => {
            const errorResponse = {
                success: false,
                error: 'Provider not found'
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(errorResponse)
            });

            const { result } = renderHook(() => useOCR());

            await act(async () => {
                try {
                    await result.current.deleteProviderPatterns('nonexistent');
                } catch (error) {
                    expect(error.message).toBe('Provider not found');
                }
            });
        });
    });

    describe('loading states', () => {
        test('should set loading state during ML operations', async () => {
            fetch.mockImplementationOnce(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                }), 100))
            );

            const { result } = renderHook(() => useOCR());

            act(() => {
                result.current.getMLStats();
            });

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });
    });

    describe('error handling', () => {
        test('should clear error state on successful operation', async () => {
            const { result } = renderHook(() => useOCR());

            // First operation fails
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            await act(async () => {
                try {
                    await result.current.getConfidenceMetrics('30712345678');
                } catch (error) {
                    // Expected error
                }
            });

            expect(result.current.error).toBeTruthy();

            // Second operation succeeds
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ hasPattern: false })
            });

            await act(async () => {
                await result.current.getConfidenceMetrics('30787654321');
            });

            expect(result.current.error).toBeNull();
        });
    });
});