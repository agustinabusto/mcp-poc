// src/server/utils/securityLogger.js
import winston from 'winston';
import { AuditLogger } from './auditLogger.js';

export class SecurityLogger {
    static logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
        defaultMeta: { service: 'security' },
        transports: [
            new winston.transports.File({ filename: 'logs/security.log' }),
            new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
        ]
    });

    static logRateLimitExceeded(ip, limitType) {
        this.logger.warn('Rate limit exceeded', {
            ip,
            limitType,
            timestamp: new Date().toISOString(),
            event: 'RATE_LIMIT_EXCEEDED'
        });

        // También registrar en auditoría
        AuditLogger.log('SECURITY_RATE_LIMIT_EXCEEDED', {
            ip,
            limitType
        });
    }

    static logUserRateLimitExceeded(userId, limitType) {
        this.logger.warn('User rate limit exceeded', {
            userId,
            limitType,
            timestamp: new Date().toISOString(),
            event: 'USER_RATE_LIMIT_EXCEEDED'
        });
    }

    static logUnauthorizedAccess(ip, path) {
        this.logger.error('Unauthorized access attempt', {
            ip,
            path,
            timestamp: new Date().toISOString(),
            event: 'UNAUTHORIZED_ACCESS'
        });

        AuditLogger.log('SECURITY_UNAUTHORIZED_ACCESS', { ip, path });
    }

    static logSuspiciousActivity(ip, path, pattern) {
        this.logger.error('Suspicious activity detected', {
            ip,
            path,
            pattern,
            timestamp: new Date().toISOString(),
            event: 'SUSPICIOUS_ACTIVITY'
        });

        AuditLogger.log('SECURITY_SUSPICIOUS_ACTIVITY', { ip, path, pattern });
    }

    static logInvalidTokenAttempt(ip, userId) {
        this.logger.warn('Invalid token attempt', {
            ip,
            userId,
            timestamp: new Date().toISOString(),
            event: 'INVALID_TOKEN_ATTEMPT'
        });
    }

    static logTokenInvalidatedByPasswordChange(ip, userId) {
        this.logger.info('Token invalidated by password change', {
            ip,
            userId,
            timestamp: new Date().toISOString(),
            event: 'TOKEN_INVALIDATED_PASSWORD_CHANGE'
        });
    }

    static logAuthenticationError(ip, error) {
        this.logger.error('Authentication error', {
            ip,
            error,
            timestamp: new Date().toISOString(),
            event: 'AUTHENTICATION_ERROR'
        });
    }

    static logInvalidApiKeyAttempt(ip, apiKey) {
        this.logger.warn('Invalid API key attempt', {
            ip,
            apiKey: apiKey.substring(0, 8) + '...', // Solo mostrar primeros 8 caracteres
            timestamp: new Date().toISOString(),
            event: 'INVALID_API_KEY_ATTEMPT'
        });
    }

    static logApiKeyRateLimitExceeded(ip, apiKeyId) {
        this.logger.warn('API key rate limit exceeded', {
            ip,
            apiKeyId,
            timestamp: new Date().toISOString(),
            event: 'API_KEY_RATE_LIMIT_EXCEEDED'
        });
    }

    static logApiKeyError(ip, error) {
        this.logger.error('API key verification error', {
            ip,
            error,
            timestamp: new Date().toISOString(),
            event: 'API_KEY_ERROR'
        });
    }
}