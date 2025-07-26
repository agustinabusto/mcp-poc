// ===================================================
// src/server/middleware/cache-middleware.js
// ===================================================
import { CacheService } from '../services/cache-service.js';
import { LoggerService } from '../services/logger-service.js';

export class CacheMiddleware {
    static logger = LoggerService.createLogger('CacheMiddleware');

    /**
     * Middleware de cache para respuestas
     */
    static cache(keyPrefix, ttlSeconds = 300) {
        return async (req, res, next) => {
            try {
                // Generar clave de cache única
                const cacheKey = CacheMiddleware.generateCacheKey(keyPrefix, req);

                // Intentar obtener del cache
                const cached = await CacheService.get(cacheKey);

                if (cached) {
                    CacheMiddleware.logger.debug(`Cache hit for key: ${cacheKey}`);
                    return res.json({
                        ...cached,
                        cached: true,
                        timestamp: new Date().toISOString()
                    });
                }

                // Si no está en cache, continuar con el request
                const originalJson = res.json;
                res.json = function (data) {
                    // Solo cachear respuestas exitosas
                    if (data.success !== false) {
                        CacheService.set(cacheKey, data, ttlSeconds)
                            .catch(error => {
                                CacheMiddleware.logger.warn(`Failed to cache response for ${cacheKey}:`, error.message);
                            });
                    }

                    return originalJson.call(this, data);
                };

                next();

            } catch (error) {
                CacheMiddleware.logger.warn('Cache middleware error:', error.message);
                next(); // Continuar sin cache en caso de error
            }
        };
    }

    /**
     * Generar clave de cache única basada en request
     */
    static generateCacheKey(prefix, req) {
        const { path, query, user } = req;
        const userId = user?.id || 'anonymous';

        // Incluir parámetros relevantes en la clave
        const queryString = new URLSearchParams(query).toString();
        const pathWithQuery = queryString ? `${path}?${queryString}` : path;

        return `${prefix}:${userId}:${Buffer.from(pathWithQuery).toString('base64')}`;
    }

    /**
     * Middleware para invalidar cache específico
     */
    static invalidateCache(patterns) {
        return async (req, res, next) => {
            try {
                const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

                for (const pattern of patternsArray) {
                    await CacheService.invalidatePattern(pattern);
                }

                next();

            } catch (error) {
                CacheMiddleware.logger.warn('Cache invalidation error:', error.message);
                next(); // Continuar aunque falle la invalidación
            }
        };
    }
}