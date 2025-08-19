// ===================================================
// 2. SERVICIO DE AUTENTICACIÓN DEL CLIENTE
// src/client/services/auth-service.js
// ===================================================

import { cacheManager } from './cache-manager.js';

class AuthService {
    constructor() {
        this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    }

    /**
     * Login con email/password
     */
    async login(credentials, deviceInfo = {}) {
        const deviceId = deviceInfo.deviceId || this.generateDeviceId();

        const response = await fetch(`${this.baseURL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
                deviceId
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error en login');
        }

        // Invalidar cachés previos del usuario al hacer login exitoso
        try {
            await cacheManager.invalidateByBusinessEvent('user_login', { 
                userId: data.data.user?.id,
                email: data.data.user?.email 
            });
        } catch (cacheError) {
            console.warn('Error clearing cache after login:', cacheError);
        }

        return data.data;
    }

    /**
     * Refresh de tokens
     */
    async refreshToken(refreshToken, deviceId) {
        const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refreshToken,
                deviceId: deviceId || this.getStoredDeviceId()
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error refrescando token');
        }

        return data.data;
    }

    /**
     * Logout
     */
    async logout(refreshToken) {
        try {
            const deviceId = this.getStoredDeviceId();

            await fetch(`${this.baseURL}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAccessToken()}`,
                    'x-refresh-token': refreshToken
                },
                body: JSON.stringify({ deviceId })
            });
        } catch (error) {
            console.error('Error en logout:', error);
        }
    }

    /**
     * Obtener permisos del usuario actual
     */
    async getPermissions() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.getAccessToken()}`
                }
            });

            const data = await response.json();
            return data.success ? data.data.permissions : [];
        } catch (error) {
            console.error('Error obteniendo permisos:', error);
            return [];
        }
    }

    /**
     * Registro de usuario
     */
    async register(userData) {
        const response = await fetch(`${this.baseURL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error en registro');
        }

        // Invalidar cachés después de registro exitoso
        try {
            await cacheManager.invalidateByBusinessEvent('user_registered', { 
                userId: data.data.user?.id,
                email: data.data.user?.email 
            });
        } catch (cacheError) {
            console.warn('Error clearing cache after registration:', cacheError);
        }

        return data.data;
    }

    /**
     * Recuperación de contraseña
     */
    async forgotPassword(email) {
        const response = await fetch(`${this.baseURL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error enviando reset de password');
        }

        return data;
    }

    /**
     * Reset de contraseña
     */
    async resetPassword(token, newPassword) {
        const response = await fetch(`${this.baseURL}/api/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, password: newPassword })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error reseteando password');
        }

        return data;
    }

    // Utilidades
    generateDeviceId() {
        const deviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('@bookkeeper/device_id', deviceId);
        return deviceId;
    }

    getStoredDeviceId() {
        return localStorage.getItem('@bookkeeper/device_id') || this.generateDeviceId();
    }

    getAccessToken() {
        const tokens = localStorage.getItem('@bookkeeper/auth_tokens');
        return tokens ? JSON.parse(tokens).accessToken : null;
    }
}

export const authService = new AuthService();