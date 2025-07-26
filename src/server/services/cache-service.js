// src/server/services/cache-service.js
import { LoggerService } from './logger-service.js';

export class CacheService {
    static cache = new Map();
    static ttlMap = new Map();
    static logger = LoggerService.createLogger('CacheService');

    /**
     * Obtener valor del cache
     */
    static async get(key) {
        try {
            if (CacheService.isExpired(key)) {
                await CacheService.delete(key);
                return null;
            }

            const value = CacheService.cache.get(key);
            return value ? JSON.parse(value) : null;

        } catch (error) {
            CacheService.logger.warn(`Cache get error for key ${key}:`, error.message);
            return null;
        }
    }

    /**
     * Establecer valor en cache
     */
    static async set(key, value, ttlSeconds = 300) {
        try {
            const serializedValue = JSON.stringify(value);
            CacheService.cache.set(key, serializedValue);

            const expirationTime = Date.now() + (ttlSeconds * 1000);
            CacheService.ttlMap.set(key, expirationTime);

        } catch (error) {
            CacheService.logger.warn(`Cache set error for key ${key}:`, error.message);
        }
    }

    /**
     * Eliminar clave del cache
     */
    static async delete(key) {
        try {
            CacheService.cache.delete(key);
            CacheService.ttlMap.delete(key);

        } catch (error) {
            CacheService.logger.warn(`Cache delete error for key ${key}:`, error.message);
        }
    }

    /**
     * Invalidar cache por patrón
     */
    static async invalidatePattern(pattern) {
        try {
            const keysToDelete = [];

            for (const key of CacheService.cache.keys()) {
                if (key.includes(pattern)) {
                    keysToDelete.push(key);
                }
            }

            for (const key of keysToDelete) {
                await CacheService.delete(key);
            }

        } catch (error) {
            CacheService.logger.warn(`Cache pattern invalidation error for ${pattern}:`, error.message);
        }
    }

    /**
     * Verificar si una clave ha expirado
     */
    static isExpired(key) {
        const expirationTime = CacheService.ttlMap.get(key);
        if (!expirationTime) return false;
        return Date.now() > expirationTime;
    }

    /**
     * Inicializar servicio de cache
     */
    static initialize() {
        // Limpiar cache expirado cada 5 minutos
        setInterval(() => {
            CacheService.cleanupExpired();
        }, 5 * 60 * 1000);

        CacheService.logger.info('Cache service initialized');
    }

    /**
     * Limpiar claves expiradas
     */
    static cleanupExpired() {
        try {
            const now = Date.now();
            const expiredKeys = [];

            for (const [key, expirationTime] of CacheService.ttlMap.entries()) {
                if (now > expirationTime) {
                    expiredKeys.push(key);
                }
            }

            for (const key of expiredKeys) {
                CacheService.cache.delete(key);
                CacheService.ttlMap.delete(key);
            }

        } catch (error) {
            CacheService.logger.warn('Cache cleanup error:', error.message);
        }
    }

    /**
     * Obtener estadísticas del cache
     */
    static getStats() {
        return {
            totalKeys: CacheService.cache.size,
            memoryUsage: {
                bytes: 0,
                mb: '0.00'
            },
            hitRate: {
                hits: 0,
                misses: 0,
                rate: 0
            }
        };
    }
}

// Inicializar al importar
CacheService.initialize();