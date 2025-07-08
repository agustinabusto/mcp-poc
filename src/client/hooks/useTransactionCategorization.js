// src/client/hooks/useTransactionCategorization.js
import { useState, useEffect, useCallback } from 'react';

export const useTransactionCategorization = () => {
    const [categorizations, setCategorizations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const categorizeTransactions = useCallback(async (transactions, clientId, options = {}) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/ocr/categorize-transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactions,
                    clientId,
                    options
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Actualizar categorizations
            setCategorizations(prev => [...prev, ...result.categorizedTransactions]);

            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getCategorizations = useCallback(async (clientId, limit = 50) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/ocr/categorizations/${clientId}?limit=${limit}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            setCategorizations(result.categorizations || []);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getCategorizationStats = useCallback(async (clientId, period = 30) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/ocr/categorization-stats/${clientId}?period=${period}`);

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

    const updateCategorization = useCallback(async (categorizationId, newCategory, confidence) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/ocr/categorization/${categorizationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    category: newCategory,
                    confidence: confidence || 1.0,
                    manuallyReviewed: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Actualizar en la lista local
            setCategorizations(prev =>
                prev.map(cat =>
                    cat.id === categorizationId
                        ? { ...cat, category: newCategory, confidence, manuallyReviewed: true }
                        : cat
                )
            );

            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteCategorization = useCallback(async (categorizationId) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/ocr/categorization/${categorizationId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Remover de la lista local
            setCategorizations(prev => prev.filter(cat => cat.id !== categorizationId));

            return true;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const loadCategorizations = useCallback(async () => {
        try {
            // Simulación de datos - en producción vendría de la API
            const mockCategorizations = [
                {
                    id: 1,
                    transactionId: 'tx-001',
                    description: 'TRANSFERENCIA BANCARIA CLIENTE ABC',
                    amount: 5000.00,
                    category: 'Transferencias',
                    subcategory: 'Interbancaria',
                    confidence: 0.95,
                    manuallyReviewed: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    transactionId: 'tx-002',
                    description: 'DEBITO AUTOMATICO SERVICIOS PUBLICOS',
                    amount: -850.00,
                    category: 'Servicios',
                    subcategory: 'Servicios Públicos',
                    confidence: 0.92,
                    manuallyReviewed: false,
                    createdAt: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    id: 3,
                    transactionId: 'tx-003',
                    description: 'PAGO TARJETA CREDITO VISA',
                    amount: -1200.00,
                    category: 'Gastos',
                    subcategory: 'Tarjeta de Crédito',
                    confidence: 0.88,
                    manuallyReviewed: true,
                    createdAt: new Date(Date.now() - 7200000).toISOString()
                },
                {
                    id: 4,
                    transactionId: 'tx-004',
                    description: 'DEPOSITO EFECTIVO SUCURSAL',
                    amount: 2500.00,
                    category: 'Ingresos',
                    subcategory: 'Depósitos',
                    confidence: 0.94,
                    manuallyReviewed: false,
                    createdAt: new Date(Date.now() - 10800000).toISOString()
                },
                {
                    id: 5,
                    transactionId: 'tx-005',
                    description: 'COMISION MANTENIMIENTO CUENTA',
                    amount: -45.00,
                    category: 'Gastos',
                    subcategory: 'Comisiones Bancarias',
                    confidence: 0.97,
                    manuallyReviewed: false,
                    createdAt: new Date(Date.now() - 14400000).toISOString()
                }
            ];

            setCategorizations(mockCategorizations);
        } catch (err) {
            console.error('Error loading categorizations:', err);
        }
    }, []);

    const loadCategories = useCallback(async () => {
        try {
            // Simulación de categorías disponibles
            const mockCategories = [
                {
                    id: 1,
                    name: 'Ingresos',
                    subcategories: ['Ventas', 'Servicios', 'Depósitos', 'Transferencias Recibidas'],
                    color: '#10B981'
                },
                {
                    id: 2,
                    name: 'Gastos',
                    subcategories: ['Operativos', 'Administrativos', 'Comisiones Bancarias', 'Tarjeta de Crédito'],
                    color: '#EF4444'
                },
                {
                    id: 3,
                    name: 'Servicios',
                    subcategories: ['Servicios Públicos', 'Internet', 'Telefonía', 'Alquiler'],
                    color: '#F59E0B'
                },
                {
                    id: 4,
                    name: 'Transferencias',
                    subcategories: ['Interbancaria', 'A Terceros', 'Propias'],
                    color: '#8B5CF6'
                },
                {
                    id: 5,
                    name: 'Impuestos',
                    subcategories: ['IVA', 'Ganancias', 'Ingresos Brutos', 'Otros'],
                    color: '#6B7280'
                }
            ];

            setCategories(mockCategories);
        } catch (err) {
            console.error('Error loading categories:', err);
        }
    }, []);

    useEffect(() => {
        loadCategorizations();
        loadCategories();
    }, [loadCategorizations, loadCategories]);

    return {
        categorizations,
        categories,
        categorizeTransactions,
        getCategorizations,
        getCategorizationStats,
        updateCategorization,
        deleteCategorization,
        loadCategorizations,
        loading,
        error
    };
};