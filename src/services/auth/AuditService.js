// ===================================================
// 9. SERVICIO DE AUDIT LOGGING
// src/services/auth/AuditService.js
// ===================================================

export class AuditService {
    constructor() {
        this.logs = []; // En producción: usar DB/logging service
    }

    /**
     * Log de login exitoso
     */
    async logSuccessfulLogin(userId, ip, deviceId) {
        await this.createLog({
            event: 'LOGIN_SUCCESS',
            userId,
            ip,
            deviceId,
            message: 'Usuario autenticado exitosamente'
        });
    }

    /**
     * Log de login fallido
     */
    async logFailedLogin(email, ip, reason) {
        await this.createLog({
            event: 'LOGIN_FAILED',
            email,
            ip,
            reason,
            message: `Intento de login fallido: ${reason}`
        });
    }

    /**
     * Log de logout
     */
    async logLogout(userId, deviceId) {
        await this.createLog({
            event: 'LOGOUT',
            userId,
            deviceId,
            message: 'Usuario cerró sesión'
        });
    }

    /**
     * Log de cambio de permisos
     */
    async logPermissionChange(adminUserId, targetUserId, changes) {
        await this.createLog({
            event: 'PERMISSION_CHANGE',
            userId: adminUserId,
            targetUserId,
            changes,
            message: 'Permisos de usuario modificados'
        });
    }

    /**
     * Crear entrada de log
     */
    async createLog(logData) {
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...logData
        };

        this.logs.push(entry);

        // En desarrollo: console log
        if (process.env.NODE_ENV === 'development') {
            console.log('🔐 AUDIT:', entry);
        }

        return entry;
    }

    /**
     * Obtener logs de seguridad
     */
    async getSecurityLogs(filters = {}) {
        let filteredLogs = [...this.logs];

        if (filters.userId) {
            filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
        }

        if (filters.event) {
            filteredLogs = filteredLogs.filter(log => log.event === filters.event);
        }

        if (filters.fromDate) {
            filteredLogs = filteredLogs.filter(log =>
                new Date(log.timestamp) >= new Date(filters.fromDate)
            );
        }

        return filteredLogs.sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );
    }
}