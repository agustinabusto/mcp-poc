// src/client/hooks/useBankReconciliation.js
import { useState, useEffect, useCallback } from 'react';

export const useBankReconciliation = () => {
    const [reconciliations, setReconciliations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const performReconciliation = useCallback(async (reconciliationData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/ocr/bank-reconciliation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reconciliationData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Actualizar lista de reconciliaciones
            setReconciliations(prev => [result, ...prev]);

            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getReconciliationStatus = useCallback(async (reconciliationId) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/ocr/reconciliation-status/${reconciliationId}`);

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

    const getReconciliationHistory = useCallback(async (clientId, period = 30) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/ocr/reconciliation-history/${clientId}?period=${period}`);

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

    const cancelReconciliation = useCallback(async (reconciliationId) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/ocr/reconciliation/${reconciliationId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Remover de la lista local
            setReconciliations(prev => prev.filter(r => r.id !== reconciliationId));

            return true;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const loadReconciliations = useCallback(async () => {
        try {
            // Simulación de datos - en producción vendría de la API
            const mockReconciliations = [
                {
                    id: 1,
                    clientId: 'test-client',
                    startDate: '2024-01-01',
                    endDate: '2024-01-31',
                    matchingRate: 0.95,
                    totalDiscrepancy: 125.50,
                    matchedTransactions: 127,
                    unmatchedBank: 3,
                    unmatchedBook: 2,
                    status: 'completed',
                    createdAt: new Date().toISOString(),
                    completedAt: new Date().toISOString()
                },
                {
                    id: 2,
                    clientId: 'test-client',
                    startDate: '2024-02-01',
                    endDate: '2024-02-28',
                    matchingRate: 0.87,
                    totalDiscrepancy: 287.30,
                    matchedTransactions: 89,
                    unmatchedBank: 5,
                    unmatchedBook: 7,
                    status: 'completed',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    completedAt: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 3,
                    clientId: 'test-client',
                    startDate: '2024-03-01',
                    endDate: '2024-03-31',
                    matchingRate: 0.92,
                    totalDiscrepancy: 65.75,
                    matchedTransactions: 156,
                    unmatchedBank: 2,
                    unmatchedBook: 4,
                    status: 'in_progress',
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    completedAt: null
                }
            ];

            setReconciliations(mockReconciliations);
        } catch (err) {
            console.error('Error loading reconciliations:', err);
        }
    }, []);

    useEffect(() => {
        loadReconciliations();
    }, [loadReconciliations]);

    return {
        reconciliations,
        performReconciliation,
        getReconciliationStatus,
        getReconciliationHistory,
        cancelReconciliation,
        loadReconciliations,
        loading,
        error
    };
};