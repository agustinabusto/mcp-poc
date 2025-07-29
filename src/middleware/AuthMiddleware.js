// ===================================================
// 5. MIDDLEWARE MEJORADO DE AUTENTICACIÓN
// src/middleware/AuthMiddleware.js
// ===================================================

import { AuthenticationService } from '../services/auth/AuthenticationService.js';
import { RateLimiterService } from '../services/auth/RateLimiterService.js';

export class AuthMiddleware {
    static authService = new AuthenticationService();
    static rateLimiter = new RateLimiterService();

    /**
     * Middleware principal de autenticación
     */
    static authenticate() {
        return async (req, res, next) => {
            try {
                // Bypass en desarrollo
                if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
                    req.user = { id: 'dev-user', role: 'admin', name: 'Developer User' };
                    return next();
                }

                // Rate limiting por IP
                const clientIp = req.ip || req.connection.remoteAddress;
                await this.rateLimiter.checkApiLimit(clientIp, req.path);

                // Extraer y validar token
                const token = this.extractToken(req);
                if (!token) {
                    return this.unauthorizedResponse(res, 'Token de acceso requerido');
                }

                // Verificar token JWT
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'access-secret');

                // Verificar sesión activa
                const session = await this.authService.sessionService.getActiveSession(
                    decoded.id,
                    decoded.deviceId
                );

                if (!session) {
                    return this.unauthorizedResponse(res, 'Sesión inválida o expirada');
                }

                // Actualizar último acceso
                await this.authService.sessionService.updateSession(session.id, {
                    lastAccess: new Date()
                });

                req.user = decoded;
                req.session = session;
                next();

            } catch (error) {
                if (error.name === 'TokenExpiredError') {
                    return this.unauthorizedResponse(res, 'Token expirado');
                }
                if (error.name === 'RateLimitError') {
                    return res.status(429).json({
                        success: false,
                        error: error.message,
                        retryAfter: error.retryAfter
                    });
                }
                return this.unauthorizedResponse(res, 'Token inválido');
            }
        };
    }

    /**
     * Extraer token del request
     */
    static extractToken(req) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return req.query.token || req.headers['x-access-token'];
    }

    /**
     * Respuesta de no autorizado estandarizada
     */
    static unauthorizedResponse(res, message) {
        return res.status(401).json({
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }
}