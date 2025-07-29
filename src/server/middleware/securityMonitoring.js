// src/server/middleware/securityMonitoring.js
export class SecurityMonitoringMiddleware {
    static monitor() {
        return async (req, res, next) => {
            // Verificar si la IP está bloqueada
            const isBlocked = await SecurityService.isIPBlocked(req.ip);
            if (isBlocked) {
                SecurityLogger.logUnauthorizedAccess(req.ip, req.path);
                return res.status(403).json({
                    error: 'IP address temporarily blocked due to suspicious activity'
                });
            }

            // Detectar patrones de ataque
            const attacks = await SecurityService.detectAttackPatterns(req);
            if (attacks.length > 0) {
                return res.status(400).json({
                    error: 'Malicious request detected',
                    detected: attacks
                });
            }

            // Continuar con la request
            next();
        };
    }

    static logRequest() {
        return (req, res, next) => {
            const startTime = Date.now();

            // Log de la request
            SecurityLogger.logger.info('Request received', {
                method: req.method,
                path: req.path,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });

            // Override del res.end para capturar el tiempo de respuesta
            const originalEnd = res.end;
            res.end = function (...args) {
                const duration = Date.now() - startTime;

                SecurityLogger.logger.info('Request completed', {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration,
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                });

                originalEnd.apply(res, args);
            };

            next();
        };
    }
}