// ===================================================
// 4. SERVICIO DE SESIONES
// src/services/auth/SessionService.js
// ===================================================

export class SessionService {
    constructor() {
        this.sessions = new Map(); // En producción: usar Redis/DB
    }

    /**
     * Crear nueva sesión
     */
    async createSession(sessionData) {
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            userId: sessionData.userId,
            deviceId: sessionData.deviceId,
            ip: sessionData.ip,
            userAgent: sessionData.userAgent,
            refreshToken: sessionData.refreshToken,
            createdAt: new Date(),
            lastAccess: new Date(),
            active: true
        };

        this.sessions.set(sessionId, session);
        return session;
    }

    /**
     * Obtener sesión activa
     */
    async getActiveSession(userId, deviceId) {
        for (const [id, session] of this.sessions) {
            if (session.userId === userId &&
                session.deviceId === deviceId &&
                session.active) {
                return session;
            }
        }
        return null;
    }

    /**
     * Actualizar sesión
     */
    async updateSession(sessionId, updates) {
        const session = this.sessions.get(sessionId);
        if (session) {
            Object.assign(session, updates);
            this.sessions.set(sessionId, session);
            return session;
        }
        return null;
    }

    /**
     * Invalidar sesión específica
     */
    async invalidateSession(userId, deviceId, refreshToken) {
        for (const [id, session] of this.sessions) {
            if (session.userId === userId &&
                session.deviceId === deviceId &&
                session.refreshToken === refreshToken) {
                session.active = false;
                this.sessions.set(id, session);
                return true;
            }
        }
        return false;
    }

    /**
     * Invalidar todas las sesiones del usuario
     */
    async invalidateAllUserSessions(userId) {
        let count = 0;
        for (const [id, session] of this.sessions) {
            if (session.userId === userId && session.active) {
                session.active = false;
                this.sessions.set(id, session);
                count++;
            }
        }
        return count;
    }

    /**
     * Limpiar sesiones expiradas
     */
    async cleanupExpiredSessions() {
        const now = new Date();
        const expiryTime = 7 * 24 * 60 * 60 * 1000; // 7 días

        for (const [id, session] of this.sessions) {
            if (now - session.lastAccess > expiryTime) {
                this.sessions.delete(id);
            }
        }
    }

    /**
     * Generar ID de sesión único
     */
    generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}