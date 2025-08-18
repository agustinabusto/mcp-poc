// src/client/hooks/useSmartCache.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * Hook de caché inteligente con memoización avanzada
 * Soporta múltiples niveles de caché y estrategias de invalidación
 */
export const useSmartCache = (key, fetcher, options = {}) => {
    const {
        ttl = 300000, // 5 minutos default
        staleWhileRevalidate = true,
        dependsOn = [],
        cacheLevel = 'memory' // 'memory', 'session', 'local'
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const cacheRef = useRef(new Map());
    const requestsInFlightRef = useRef(new Map());

    // Cache storage functions basadas en el nivel
    const cacheStorage = useMemo(() => {
        switch (cacheLevel) {
            case 'session':
                return {
                    get: (key) => {
                        try {
                            const item = sessionStorage.getItem(`cache_${key}`);
                            return item ? JSON.parse(item) : null;
                        } catch {
                            return null;
                        }
                    },
                    set: (key, value) => {
                        try {
                            sessionStorage.setItem(`cache_${key}`, JSON.stringify(value));
                        } catch (error) {
                            console.warn('Session storage full, falling back to memory cache');
                        }
                    },
                    delete: (key) => {
                        sessionStorage.removeItem(`cache_${key}`);
                    }
                };
            case 'local':
                return {
                    get: (key) => {
                        try {
                            const item = localStorage.getItem(`cache_${key}`);
                            return item ? JSON.parse(item) : null;
                        } catch {
                            return null;
                        }
                    },
                    set: (key, value) => {
                        try {
                            localStorage.setItem(`cache_${key}`, JSON.stringify(value));
                        } catch (error) {
                            console.warn('Local storage full, falling back to memory cache');
                        }
                    },
                    delete: (key) => {
                        localStorage.removeItem(`cache_${key}`);
                    }
                };
            default: // memory
                return {
                    get: (key) => cacheRef.current.get(key),
                    set: (key, value) => cacheRef.current.set(key, value),
                    delete: (key) => cacheRef.current.delete(key)
                };
        }
    }, [cacheLevel]);

    // Función para verificar si un item de caché ha expirado
    const isExpired = useCallback((cachedItem, ttlMs) => {
        if (!cachedItem || !cachedItem.timestamp) return true;
        return Date.now() - cachedItem.timestamp > ttlMs;
    }, []);

    // Función para obtener datos del caché
    const getCachedData = useCallback((cacheKey) => {
        // Buscar primero en memory cache para performance
        let cached = cacheRef.current.get(cacheKey);
        
        // Si no está en memoria, buscar en el storage configurado
        if (!cached && cacheLevel !== 'memory') {
            cached = cacheStorage.get(cacheKey);
            // Si lo encontramos, agregarlo a memory cache para futuras consultas
            if (cached) {
                cacheRef.current.set(cacheKey, cached);
            }
        }
        
        return cached;
    }, [cacheLevel, cacheStorage]);

    // Función para almacenar datos en caché
    const setCachedData = useCallback((cacheKey, data) => {
        const cachedItem = {
            data,
            timestamp: Date.now(),
            key: cacheKey
        };

        // Siempre almacenar en memory cache
        cacheRef.current.set(cacheKey, cachedItem);

        // También almacenar en el storage configurado si no es memory
        if (cacheLevel !== 'memory') {
            cacheStorage.set(cacheKey, cachedItem);
        }

        return cachedItem;
    }, [cacheLevel, cacheStorage]);

    // Función para fetch y cache con deduplicación de requests
    const fetchAndCache = useCallback(async (cacheKey, fetcherFn, args) => {
        // Evitar requests duplicados usando un Map de requests en vuelo
        if (requestsInFlightRef.current.has(cacheKey)) {
            return requestsInFlightRef.current.get(cacheKey);
        }

        setLoading(true);
        setError(null);

        const fetchPromise = (async () => {
            try {
                const result = await fetcherFn(...args);
                setCachedData(cacheKey, result);
                setData(result);
                return result;
            } catch (err) {
                setError(err.message || 'Error fetching data');
                throw err;
            } finally {
                setLoading(false);
                requestsInFlightRef.current.delete(cacheKey);
            }
        })();

        requestsInFlightRef.current.set(cacheKey, fetchPromise);
        return fetchPromise;
    }, [setCachedData]);

    // Función principal de caché memoizada
    const cachedFetcher = useCallback(async (...args) => {
        const cacheKey = `${key}_${JSON.stringify(args)}`;
        const cached = getCachedData(cacheKey);
        
        if (cached && !isExpired(cached, ttl)) {
            // Cache hit válido
            setData(cached.data);
            setLoading(false);
            setError(null);

            if (staleWhileRevalidate) {
                // Devolver datos del caché inmediatamente y actualizar en background
                fetchAndCache(cacheKey, fetcher, args).catch(console.error);
            }
            
            return cached.data;
        }
        
        // Cache miss o expirado - fetch nuevo
        return fetchAndCache(cacheKey, fetcher, args);
    }, [key, fetcher, ttl, staleWhileRevalidate, getCachedData, isExpired, fetchAndCache, ...dependsOn]);

    // Función para limpiar caché específico
    const clearCache = useCallback((pattern) => {
        if (pattern) {
            // Limpiar por patrón
            const keysToDelete = [];
            
            // Memory cache
            for (const [cacheKey] of cacheRef.current) {
                if (cacheKey.includes(pattern)) {
                    keysToDelete.push(cacheKey);
                }
            }
            
            keysToDelete.forEach(cacheKey => {
                cacheRef.current.delete(cacheKey);
                cacheStorage.delete(cacheKey);
            });
        } else {
            // Limpiar todo el caché de este hook
            const keysToDelete = [];
            for (const [cacheKey] of cacheRef.current) {
                if (cacheKey.startsWith(key)) {
                    keysToDelete.push(cacheKey);
                }
            }
            
            keysToDelete.forEach(cacheKey => {
                cacheRef.current.delete(cacheKey);
                cacheStorage.delete(cacheKey);
            });
        }
    }, [key, cacheStorage]);

    // Función para invalidar y refetch
    const invalidateAndRefetch = useCallback(async (...args) => {
        const cacheKey = `${key}_${JSON.stringify(args)}`;
        
        // Limpiar caché
        cacheRef.current.delete(cacheKey);
        cacheStorage.delete(cacheKey);
        
        // Refetch
        return fetchAndCache(cacheKey, fetcher, args);
    }, [key, fetcher, fetchAndCache, cacheStorage]);

    // Función para obtener estadísticas del caché
    const getCacheStats = useCallback(() => {
        const memoryEntries = Array.from(cacheRef.current.entries());
        const keyEntries = memoryEntries.filter(([cacheKey]) => cacheKey.startsWith(key));
        
        return {
            totalEntries: keyEntries.length,
            entries: keyEntries.map(([cacheKey, cached]) => ({
                key: cacheKey,
                timestamp: cached.timestamp,
                age: Date.now() - cached.timestamp,
                expired: isExpired(cached, ttl)
            })),
            cacheLevel,
            ttl
        };
    }, [key, isExpired, ttl, cacheLevel]);

    // Cleanup automático de caché expirado
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const keysToDelete = [];
            
            for (const [cacheKey, cached] of cacheRef.current) {
                if (cacheKey.startsWith(key) && isExpired(cached, ttl)) {
                    keysToDelete.push(cacheKey);
                }
            }
            
            keysToDelete.forEach(cacheKey => {
                cacheRef.current.delete(cacheKey);
                if (cacheLevel !== 'memory') {
                    cacheStorage.delete(cacheKey);
                }
            });
            
            if (keysToDelete.length > 0) {
                console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
            }
        }, ttl); // Cleanup cada TTL

        return () => clearInterval(cleanupInterval);
    }, [key, ttl, isExpired, cacheLevel, cacheStorage]);

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            // Cancelar requests en vuelo
            requestsInFlightRef.current.clear();
        };
    }, []);

    return {
        data,
        loading,
        error,
        refetch: cachedFetcher,
        clearCache,
        invalidateAndRefetch,
        getCacheStats,
        // Utilidades adicionales
        isLoading: loading,
        hasData: data !== null,
        hasError: error !== null
    };
};

export default useSmartCache;