// ===================================================
// src/server/middleware/auth-middleware.js
// ===================================================
import jwt from 'jsonwebtoken';
import { LoggerService } from '../services/logger-service.js';

export class AuthMiddleware {
    static logger = LoggerService.createLogger('AuthMiddleware');

    /**
     * Validar token JWT
     */
    static async validateToken(req, res, next) {
        try {
            // En modo desarrollo, permitir bypass de autenticación
            if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
                req.user = {
                    id: 'dev-user',
                    role: 'admin',
                    name: 'Developer User'
                };
                return next();
            }

            const token = AuthMiddleware.extractToken(req);

            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Token de acceso requerido',
                    timestamp: new Date().toISOString()
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
            req.user = decoded;

            AuthMiddleware.logger.debug(`User authenticated: ${decoded.id}`);
            next();

        } catch (error) {
            AuthMiddleware.logger.warn('Authentication failed:', error.message);

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expirado',
                    timestamp: new Date().toISOString()
                });
            }

            return res.status(401).json({
                success: false,
                error: 'Token inválido',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Extraer token del header o query
     */
    static extractToken(req) {
        // Desde header Authorization
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Desde query parameter (para APIs públicas)
        if (req.query.token) {
            return req.query.token;
        }

        // Desde header x-api-key (para API keys)
        if (req.headers['x-api-key']) {
            return req.headers['x-api-key'];
        }

        return null;
    }

    /**
     * Verificar rol específico
     */
    static requireRole(requiredRole) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Usuario no autenticado',
                    timestamp: new Date().toISOString()
                });
            }

            if (req.user.role !== requiredRole && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Permisos insuficientes',
                    timestamp: new Date().toISOString()
                });
            }

            next();
        };
    }
}