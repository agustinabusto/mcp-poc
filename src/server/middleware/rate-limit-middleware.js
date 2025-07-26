// ===================================================
// src/server/middleware/rate-limit-middleware.js
// ===================================================
import rateLimit from 'express-rate-limit';
import { LoggerService } from '../services/logger-service.js';

export class RateLimitMiddleware {
    static logger = LoggerService.createLogger('RateLimitMiddleware');

    /**
     * Crear limitador de velocidad
     */
    static createLimiter(options = {}) {
        const defaultOptions = {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // límite de requests por ventana por IP
            message: {
                success: false,
                error: 'Demasiadas solicitudes, intenta más tarde',
                timestamp: new Date().toISOString()
            },
            standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers
            keyGenerator: (req) => {
                // Usar usuario autenticado si está disponible, sino IP
                return req.user?.id || req.ip;
            },
            skip: (req) => {
                // Skip rate limiting en desarrollo si está configurado
                return process.env.NODE_ENV === 'development' && process.env.BYPASS_RATE_LIMIT === 'true';
            },
            onLimitReached: (req, res, options) => {
                RateLimitMiddleware.logger.warn(`Rate limit reached for ${req.user?.id || req.ip} on ${req.path}`);
            }
        };

        const mergedOptions = { ...defaultOptions, ...options };
        return rateLimit(mergedOptions);
    }

    /**
     * Limitador específico para operaciones sensibles
     */
    static strictLimiter() {
        return RateLimitMiddleware.createLimiter({
            windowMs: 5 * 60 * 1000, // 5 minutos
            max: 10, // máximo 10 requests cada 5 minutos
            message: {
                success: false,
                error: 'Operación limitada, intenta más tarde',
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Limitador para importaciones masivas
     */
    static importLimiter() {
        return RateLimitMiddleware.createLimiter({
            windowMs: 60 * 60 * 1000, // 1 hora
            max: 5, // máximo 5 importaciones por hora
            message: {
                success: false,
                error: 'Límite de importaciones alcanzado, intenta en una hora',
                timestamp: new Date().toISOString()
            }
        });
    }
}