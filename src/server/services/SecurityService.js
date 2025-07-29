// src/server/services/SecurityService.js
import { SecurityLogger } from '../utils/securityLogger.js';
import { AuditLogger } from '../utils/auditLogger.js';

export class SecurityService {
    // Detectar patrones de ataque
    static async detectAttackPatterns(req) {
        const patterns = {
            bruteForce: await this.detectBruteForce(req.ip),
            sqlInjection: this.detectSQLInjection(req),
            xssAttempt: this.detectXSSAttempt(req),
            pathTraversal: this.detectPathTraversal(req)
        };

        const detectedAttacks = Object.entries(patterns)
            .filter(([, detected]) => detected)
            .map(([attack]) => attack);

        if (detectedAttacks.length > 0) {
            SecurityLogger.logger.error('Attack patterns detected', {
                ip: req.ip,
                path: req.path,
                attacks: detectedAttacks,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });

            // Bloquear IP temporalmente si es un ataque grave
            if (detectedAttacks.includes('bruteForce') || detectedAttacks.includes('sqlInjection')) {
                await this.temporaryIPBlock(req.ip);
            }
        }

        return detectedAttacks;
    }

    static async detectBruteForce(ip) {
        const redis = require('ioredis');
        const client = new redis(process.env.REDIS_URL);

        const key = `failed_attempts:${ip}`;
        const attempts = await client.get(key) || 0;

        return parseInt(attempts) >= 10; // 10 intentos fallidos = brute force
    }

    static detectSQLInjection(req) {
        const sqlPatterns = [
            /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
            /((\%27)|(\')|((\%22)|(\")))/i,
            /((\%3D)|(=))[^\n]*((\%27)|(\')|((\%22)|(\")))/i,
            /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i
        ];

        const requestData = JSON.stringify({
            query: req.query,
            body: req.body,
            params: req.params
        });

        return sqlPatterns.some(pattern => pattern.test(requestData));
    }

    static detectXSSAttempt(req) {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /<object/i,
            /<embed/i
        ];

        const requestData = JSON.stringify({
            query: req.query,
            body: req.body,
            params: req.params
        });

        return xssPatterns.some(pattern => pattern.test(requestData));
    }

    static detectPathTraversal(req) {
        const pathTraversalPattern = /(\.\.[\/\\]){2,}/;
        return pathTraversalPattern.test(req.path) ||
            pathTraversalPattern.test(JSON.stringify(req.query));
    }

    static async temporaryIPBlock(ip, duration = 3600000) { // 1 hora por defecto
        const redis = require('ioredis');
        const client = new redis(process.env.REDIS_URL);

        await client.setex(`blocked_ip:${ip}`, duration / 1000, 'blocked');

        SecurityLogger.logger.error('IP temporarily blocked', {
            ip,
            duration,
            timestamp: new Date().toISOString(),
            event: 'IP_BLOCKED'
        });

        AuditLogger.log('SECURITY_IP_BLOCKED', { ip, duration });
    }

    static async isIPBlocked(ip) {
        const redis = require('ioredis');
        const client = new redis(process.env.REDIS_URL);

        const blocked = await client.get(`blocked_ip:${ip}`);
        return !!blocked;
    }

    // Generar reporte de seguridad
    static async generateSecurityReport(timeRange = '24h') {
        const endTime = new Date();
        const startTime = new Date();

        switch (timeRange) {
            case '1h':
                startTime.setHours(startTime.getHours() - 1);
                break;
            case '24h':
                startTime.setDate(startTime.getDate() - 1);
                break;
            case '7d':
                startTime.setDate(startTime.getDate() - 7);
                break;
            case '30d':
                startTime.setDate(startTime.getDate() - 30);
                break;
        }

        const auditLogs = await AuditLogger.getSecurityEvents(startTime, endTime);

        const report = {
            timeRange,
            period: { start: startTime, end: endTime },
            summary: {
                totalEvents: auditLogs.length,
                rateLimitExceeded: auditLogs.filter(log => log.action.includes('RATE_LIMIT')).length,
                unauthorizedAccess: auditLogs.filter(log => log.action === 'SECURITY_UNAUTHORIZED_ACCESS').length,
                suspiciousActivity: auditLogs.filter(log => log.action === 'SECURITY_SUSPICIOUS_ACTIVITY').length,
                blockedIPs: auditLogs.filter(log => log.action === 'SECURITY_IP_BLOCKED').length
            },
            topThreats: this.categorizeThreats(auditLogs),
            recommendations: this.generateSecurityRecommendations(auditLogs)
        };

        return report;
    }

    static categorizeThreats(auditLogs) {
        const threats = {};

        auditLogs.forEach(log => {
            if (log.metadata?.ip) {
                const ip = log.metadata.ip;
                if (!threats[ip]) {
                    threats[ip] = { count: 0, actions: [] };
                }
                threats[ip].count++;
                threats[ip].actions.push(log.action);
            }
        });

        return Object.entries(threats)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 10)
            .map(([ip, data]) => ({ ip, ...data }));
    }

    static generateSecurityRecommendations(auditLogs) {
        const recommendations = [];

        const rateLimitEvents = auditLogs.filter(log => log.action.includes('RATE_LIMIT')).length;
        if (rateLimitEvents > 100) {
            recommendations.push({
                type: 'rate_limiting',
                severity: 'high',
                message: 'Consider reducing rate limits or implementing stricter IP blocking',
                metric: rateLimitEvents
            });
        }

        const suspiciousEvents = auditLogs.filter(log => log.action === 'SECURITY_SUSPICIOUS_ACTIVITY').length;
        if (suspiciousEvents > 50) {
            recommendations.push({
                type: 'suspicious_activity',
                severity: 'medium',
                message: 'High number of suspicious activities detected. Review WAF rules',
                metric: suspiciousEvents
            });
        }

        return recommendations;
    }
}