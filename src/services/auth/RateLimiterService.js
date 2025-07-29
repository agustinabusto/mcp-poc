// ===================================================
// 2. SERVICIO DE RATE LIMITING
// src/services/auth/RateLimiterService.js
// ===================================================

export class RateLimiterService {
    constructor() {
        this.attempts = new Map(); // En producción: usar Redis
        this.limits = {
            auth: { max: 5, window: 15 * 60 * 1000 }, // 5 intentos en 15 min
            api: { max: 100, window: 60 * 1000 }, // 100 requests por minuto
            sensitive: { max: 3, window: 60 * 60 * 1000 } // 3 intentos en 1 hora
        };
    }

    /**
     * Verificar límite de autenticación
     */
    async checkAuthLimit(ip, email) {
        const key = `auth:${ip}:${email}`;
        await this.checkLimit(key, this.limits.auth);
    }

    /**
     * Verificar límite de API por usuario
     */
    async checkApiLimit(userId, endpoint) {
        const key = `api:${userId}:${endpoint}`;
        await this.checkLimit(key, this.limits.api);
    }

    /**
     * Verificar límite genérico
     */
    async checkLimit(key, limit) {
        const now = Date.now();
        const userAttempts = this.attempts.get(key) || { count: 0, firstAttempt: now };

        // Reset si pasó la ventana de tiempo
        if (now - userAttempts.firstAttempt > limit.window) {
            userAttempts.count = 0;
            userAttempts.firstAttempt = now;
        }

        if (userAttempts.count >= limit.max) {
            const timeLeft = Math.ceil((limit.window - (now - userAttempts.firstAttempt)) / 1000);
            throw new RateLimitError(`Límite excedido. Intenta en ${timeLeft} segundos`);
        }

        return true;
    }

    /**
     * Incrementar intentos fallidos
     */
    async incrementFailedAttempts(ip, email) {
        const key = `auth:${ip}:${email}`;
        const now = Date.now();
        const attempts = this.attempts.get(key) || { count: 0, firstAttempt: now };

        attempts.count++;
        attempts.firstAttempt = attempts.firstAttempt || now;

        this.attempts.set(key, attempts);
    }

    /**
     * Limpiar intentos (después de login exitoso)
     */
    async clearAttempts(ip, email) {
        const key = `auth:${ip}:${email}`;
        this.attempts.delete(key);
    }
}