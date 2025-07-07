// src/client/hooks/useSearch.js
import { useState, useCallback, useEffect } from 'react';

export const useSearch = (onTaxpayerQuery) => {
    const [searchHistory, setSearchHistory] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [searchCache, setSearchCache] = useState(new Map());

    // CUITs de prueba conocidos para sugerencias
    const knownCuits = [
        { cuit: '30500010912', name: 'MERCADOLIBRE S.R.L.', type: 'success', category: 'empresa' },
        { cuit: '27230938607', name: 'RODRIGUEZ MARIA LAURA', type: 'success', category: 'persona' },
        { cuit: '20123456789', name: 'GARCIA CARLOS ALBERTO', type: 'success', category: 'persona' },
        { cuit: '20111222333', name: 'LOPEZ JUAN CARLOS - SIN ACTIVIDADES', type: 'warning', category: 'problematico' },
        { cuit: '27999888777', name: 'GOMEZ CARLOS ALBERTO - MONOTRIBUTO VENCIDO', type: 'warning', category: 'problematico' },
        { cuit: '30555666777', name: 'SERVICIOS DISCONTINUADOS S.R.L. - INACTIVO', type: 'error', category: 'problematico' },
        { cuit: '30777888999', name: 'CONSTRUCTORA IRREGULAR S.A. - PROBLEMAS LABORALES', type: 'error', category: 'problematico' }
    ];

    // Cargar historial del localStorage al inicializar
    useEffect(() => {
        const loadSearchHistory = () => {
            try {
                const saved = localStorage.getItem('afip_search_history');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Filtrar entradas válidas y recientes (últimos 30 días)
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    const validHistory = parsed.filter(item =>
                        item.cuit &&
                        item.timestamp &&
                        new Date(item.timestamp) > thirtyDaysAgo
                    );

                    setSearchHistory(validHistory);
                }
            } catch (error) {
                console.warn('Error loading search history:', error);
                localStorage.removeItem('afip_search_history');
            }
        };

        loadSearchHistory();
    }, []);

    // Validar formato CUIT
    const validateCuit = useCallback((cuit) => {
        if (!cuit || typeof cuit !== 'string') {
            return { valid: false, message: 'CUIT requerido' };
        }

        const cleanCuit = cuit.replace(/[-\s]/g, '');

        if (!/^\d{11}$/.test(cleanCuit)) {
            return { valid: false, message: 'CUIT debe tener 11 dígitos numéricos' };
        }

        // Validación adicional del dígito verificador (algoritmo CUIT)
        if (!isValidCuitChecksum(cleanCuit)) {
            return { valid: false, message: 'CUIT con formato inválido' };
        }

        return { valid: true, message: '', cleanCuit };
    }, []);

    // Algoritmo de validación del dígito verificador del CUIT
    const isValidCuitChecksum = useCallback((cuit) => {
        const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        let sum = 0;

        for (let i = 0; i < 10; i++) {
            sum += parseInt(cuit[i]) * multipliers[i];
        }

        const remainder = sum % 11;
        const checkDigit = remainder < 2 ? remainder : 11 - remainder;

        return checkDigit === parseInt(cuit[10]);
    }, []);

    // Obtener sugerencias basadas en el input
    const getSuggestions = useCallback((input) => {
        if (!input || input.length < 2) return [];

        const filtered = knownCuits.filter(item => {
            const cuitMatch = item.cuit.includes(input);
            const nameMatch = item.name.toLowerCase().includes(input.toLowerCase());
            return cuitMatch || nameMatch;
        });

        return filtered.slice(0, 6);
    }, []);

    // Agregar al historial de búsqueda
    const addToHistory = useCallback((cuit, name = null) => {
        const historyItem = {
            cuit,
            name: name || knownCuits.find(k => k.cuit === cuit)?.name || 'Contribuyente',
            timestamp: new Date().toISOString(),
            id: Date.now().toString()
        };

        setSearchHistory(prev => {
            // Remover duplicados y agregar al inicio
            const filtered = prev.filter(item => item.cuit !== cuit);
            const newHistory = [historyItem, ...filtered].slice(0, 15); // Máximo 15 elementos

            // Guardar en localStorage
            try {
                localStorage.setItem('afip_search_history', JSON.stringify(newHistory));
            } catch (error) {
                console.warn('Error saving search history:', error);
            }

            return newHistory;
        });
    }, []);

    // Limpiar historial
    const clearHistory = useCallback(() => {
        setSearchHistory([]);
        localStorage.removeItem('afip_search_history');
    }, []);

    // Ejecutar búsqueda
    const executeSearch = useCallback(async (cuitInput, options = {}) => {
        const { skipValidation = false, useCache = true } = options;

        if (!cuitInput) {
            setSearchError('CUIT requerido');
            return { success: false, error: 'CUIT requerido' };
        }

        // Validar formato si no se omite la validación
        if (!skipValidation) {
            const validation = validateCuit(cuitInput);
            if (!validation.valid) {
                setSearchError(validation.message);
                return { success: false, error: validation.message };
            }
            cuitInput = validation.cleanCuit;
        }

        // Verificar cache si está habilitado
        if (useCache && searchCache.has(cuitInput)) {
            const cachedResult = searchCache.get(cuitInput);
            const cacheAge = Date.now() - cachedResult.timestamp;

            // Cache válido por 5 minutos
            if (cacheAge < 5 * 60 * 1000) {
                addToHistory(cuitInput, cachedResult.data?.razonSocial);
                return { success: true, data: cachedResult.data, fromCache: true };
            } else {
                searchCache.delete(cuitInput);
            }
        }

        setIsSearching(true);
        setSearchError(null);

        try {
            // Llamar a la función de búsqueda pasada como prop
            const result = await onTaxpayerQuery(cuitInput);

            // Guardar en cache si la búsqueda fue exitosa
            if (result && result.success !== false) {
                const cacheEntry = {
                    data: result,
                    timestamp: Date.now()
                };
                setSearchCache(prev => new Map(prev.set(cuitInput, cacheEntry)));
            }

            // Agregar al historial
            addToHistory(cuitInput, result?.razonSocial);

            return { success: true, data: result };

        } catch (error) {
            console.error('Search error:', error);
            const errorMessage = error.message || 'Error en la búsqueda. Intente nuevamente.';
            setSearchError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsSearching(false);
        }
    }, [onTaxpayerQuery, validateCuit, addToHistory, searchCache]);

    // Limpiar error de búsqueda
    const clearSearchError = useCallback(() => {
        setSearchError(null);
    }, []);

    // Limpiar cache
    const clearCache = useCallback(() => {
        setSearchCache(new Map());
    }, []);

    // Obtener estadísticas de búsqueda
    const getSearchStats = useCallback(() => {
        return {
            totalSearches: searchHistory.length,
            cacheSize: searchCache.size,
            lastSearch: searchHistory[0]?.timestamp || null,
            categoryCounts: {
                empresa: searchHistory.filter(h => {
                    const known = knownCuits.find(k => k.cuit === h.cuit);
                    return known?.category === 'empresa';
                }).length,
                persona: searchHistory.filter(h => {
                    const known = knownCuits.find(k => k.cuit === h.cuit);
                    return known?.category === 'persona';
                }).length,
                problematico: searchHistory.filter(h => {
                    const known = knownCuits.find(k => k.cuit === h.cuit);
                    return known?.category === 'problematico';
                }).length
            }
        };
    }, [searchHistory, searchCache]);

    return {
        // Estado
        searchHistory,
        isSearching,
        searchError,
        knownCuits,

        // Funciones
        executeSearch,
        validateCuit,
        getSuggestions,
        addToHistory,
        clearHistory,
        clearSearchError,
        clearCache,
        getSearchStats
    };
};