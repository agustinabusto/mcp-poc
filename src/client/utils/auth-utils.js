// ===================================================
// 13. UTILIDADES ADICIONALES
// src/client/utils/auth-utils.js
// ===================================================

export const authUtils = {
    /**
     * Verificar si un token está próximo a expirar
     */
    isTokenExpiringSoon(token, minutesThreshold = 5) {
        try {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = tokenData.exp * 1000;
            const now = Date.now();
            const threshold = minutesThreshold * 60 * 1000;

            return (expiryTime - now) <= threshold;
        } catch (error) {
            return true;
        }
    },

    /**
     * Extraer datos del token JWT
     */
    decodeToken(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (error) {
            return null;
        }
    },

    /**
     * Formatear errores de autenticación
     */
    formatAuthError(error) {
        const errorMessages = {
            'invalid_credentials': 'Credenciales inválidas',
            'user_inactive': 'Usuario inactivo',
            'token_expired': 'Sesión expirada',
            'rate_limit_exceeded': 'Demasiados intentos. Intenta más tarde',
            'insufficient_permissions': 'Permisos insuficientes'
        };

        return errorMessages[error] || error;
    },

    /**
     * Generar ID único para dispositivo
     */
    generateDeviceFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);

        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');

        return btoa(fingerprint).substring(0, 32);
    }
};