// src/client/hooks/useOCR.js
import { useState, useEffect, useCallback } from 'react';

export const useOCR = () => {
    const [processingQueue, setProcessingQueue] = useState([]);
    const [recentExtractions, setRecentExtractions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const uploadDocument = useCallback(async (file, documentType, clientId) => {
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('documentType', documentType);
            formData.append('clientId', clientId);

            const response = await fetch('/api/ocr/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
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
            const response = await fetch('/api/ocr/extract-invoice', {
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
            const response = await fetch('/api/ocr/extract-bank-statement', {
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
            const response = await fetch(`/api/ocr/history/${clientId}?page=${page}&limit=${limit}`);

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
            const response = await fetch(`/api/ocr/stats/${clientId}`);

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

    useEffect(() => {
        loadRecentExtractions();
    }, [loadRecentExtractions]);

    return {
        processingQueue,
        recentExtractions,
        uploadDocument,
        extractInvoiceData,
        extractBankStatementData,
        getOCRHistory,
        getOCRStats,
        loading,
        error
    };
};