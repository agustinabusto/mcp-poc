// src/client/hooks/useOCR.js - Versión corregida
import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/constants.js';

export const useOCR = () => {
    const [processingQueue, setProcessingQueue] = useState([]);
    const [recentExtractions, setRecentExtractions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Para desarrollo con proxy de Vite, usar rutas relativas
    const getApiUrl = (endpoint) => {
        // Usar la misma lógica que api.js
        const isDevelopment = import.meta.env.DEV;
        const isViteProxy = isDevelopment && window.location.port === '3030';
        
        if (isViteProxy) {
            return endpoint; // El proxy de Vite se encarga del routing
        }
        
        // Si no, construir URL completa
        return `${API_BASE_URL}${endpoint}`;
    };

    const uploadDocument = useCallback(async (file, documentType, clientId) => {
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('documentType', documentType);
            formData.append('clientId', clientId);

            const apiUrl = getApiUrl('/api/ocr/upload');
            console.log('[useOCR] Upload URL:', apiUrl);
            console.log('[useOCR] File:', { name: file.name, size: file.size, type: file.type });

            // Usar ruta relativa para que el proxy funcione
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            console.log('[useOCR] Response:', { status: response.status, ok: response.ok });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[useOCR] Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Error procesando documento');
            }

            // Actualizar datos locales
            await loadRecentExtractions();

            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const extractInvoiceData = useCallback(async (filePath, clientId) => {
        setLoading(true);
        setError(null);

        try {
            // Usar ruta relativa para que el proxy funcione
            const response = await fetch(getApiUrl('/api/ocr/extract-invoice'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filePath, clientId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const extractBankStatementData = useCallback(async (filePath, clientId) => {
        setLoading(true);
        setError(null);

        try {
            // Usar ruta relativa para que el proxy funcione
            const response = await fetch(getApiUrl('/api/ocr/extract-bank-statement'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filePath, clientId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getOCRHistory = useCallback(async (clientId, page = 1, limit = 20) => {
        setLoading(true);
        setError(null);

        try {
            // CORRECCIÓN: Usar URL absoluta
            const response = await fetch(getApiUrl(`/api/ocr/history/${clientId}?page=${page}&limit=${limit}`));

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getOCRStats = useCallback(async (clientId) => {
        setLoading(true);
        setError(null);

        try {
            // CORRECCIÓN: Usar URL absoluta
            const response = await fetch(getApiUrl(`/api/ocr/stats/${clientId}`));

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.success ? result.stats : {};
        } catch (err) {
            setError(err.message);
            return {
                documentsProcessed: 0,
                successRate: 0,
                averageProcessingTime: 0,
                totalInQueue: 0
            };
        } finally {
            setLoading(false);
        }
    }, []);

    const loadRecentExtractions = useCallback(async () => {
        try {
            // Simulación de datos recientes - en producción vendría de la API
            const mockExtractions = [
                {
                    id: 1,
                    documentType: 'Factura A-001-12345',
                    confidence: 95.8,
                    timeAgo: '2 min',
                    status: 'completed'
                },
                {
                    id: 2,
                    documentType: 'Extracto Bancario',
                    confidence: 92.3,
                    timeAgo: '15 min',
                    status: 'completed'
                },
                {
                    id: 3,
                    documentType: 'Recibo de Servicios',
                    confidence: 88.9,
                    timeAgo: '1 hour',
                    status: 'completed'
                }
            ];

            setRecentExtractions(mockExtractions);
        } catch (err) {
            console.error('Error loading recent extractions:', err);
        }
    }, []);

    // ML Enhancement Functions
    const submitMLCorrection = useCallback(async (documentId, corrections, originalData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl('/api/ocr/ml/learn'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    documentId,
                    corrections,
                    originalData,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Error submitting ML correction');
            }

            // Show user feedback notification
            if (typeof window !== 'undefined' && window.showNotification) {
                window.showNotification('Sistema actualizado con tu corrección', 'success');
            } else {
                console.log('Sistema actualizado con tu corrección');
            }

            return result;
        } catch (err) {
            setError(err.message);
            console.error('Error submitting ML correction:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getConfidenceMetrics = useCallback(async (cuit) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl(`/api/ocr/ml/confidence/${cuit}`));

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            setError(err.message);
            console.error('Error fetching confidence metrics:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const getProviderTemplate = useCallback(async (cuit) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl(`/api/ocr/ml/patterns/${cuit}`));

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            setError(err.message);
            console.error('Error fetching provider template:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const processDocumentWithML = useCallback(async (filePath, documentType, cuit) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl('/api/ocr/ml/process'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filePath,
                    documentType,
                    cuit
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Error processing document with ML');
            }

            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getMLStats = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl('/api/ocr/ml/stats'));

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            setError(err.message);
            console.error('Error fetching ML stats:', err);
            return {
                overview: { totalProviders: 0, totalPatterns: 0, averageSuccessRate: 0 },
                corrections: { totalCorrections: 0, documentsCorrected: 0 },
                byDocumentType: [],
                systemHealth: { status: 'unknown', initialized: false }
            };
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteProviderPatterns = useCallback(async (cuit) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl(`/api/ocr/ml/patterns/${cuit}`), {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Error deleting provider patterns');
            }

            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRecentExtractions();
    }, [loadRecentExtractions]);

    return {
        // Original OCR functions
        processingQueue,
        recentExtractions,
        uploadDocument,
        extractInvoiceData,
        extractBankStatementData,
        getOCRHistory,
        getOCRStats,
        loading,
        error,
        
        // ML Enhancement functions
        submitMLCorrection,
        getConfidenceMetrics,
        getProviderTemplate,
        processDocumentWithML,
        getMLStats,
        deleteProviderPatterns
    };
};