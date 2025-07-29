// 1. SERVICIO PRINCIPAL DE AUTENTICACIÓN
// src/services/auth/AuthenticationService.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { RateLimiterService } from './RateLimiterService.js';
import { SessionService } from './SessionService.js';
import { AuthorizationService } from './AuthorizationService.js';
import { AuditService } from './AuditService.js';

export class AuthenticationService {
    constructor() {
        this.rateLimiter = new RateLimiterService();
        this.sessionService = new SessionService();
        this.authorizationService = new AuthorizationService();
        this.auditService = new AuditService();
    }

    /**
     * Autenticación principal con rate limiting
     */
    async authenticate(credentials, clientInfo = {}) {
        const { email, password, strategy = 'local' } = credentials;
        const { ip, userAgent, deviceId } = clientInfo;

        try {
            // 1. Rate limiting por IP y usuario
            await this.rateLimiter.checkAuthLimit(ip, email);

            // 2. Validar credenciales
            const user = await this.validateCredentials(email, password);
            if (!user) {
                await this.auditService.logFailedLogin(email, ip, 'invalid_credentials');
                throw new AuthenticationError('Credenciales inválidas');
            }

            // 3. Verificar estado del usuario
            if (!user.active) {
                throw new AuthenticationError('Usuario inactivo');
            }

            // 4. Generar tokens JWT
            const tokens = await this.generateTokenPair(user, deviceId);

            // 5. Crear sesión
            const session = await this.sessionService.createSession({
                userId: user.id,
                deviceId,
                ip,
                userAgent,
                refreshToken: tokens.refreshToken
            });

            // 6. Audit log
            await this.auditService.logSuccessfulLogin(user.id, ip, deviceId);

            return {
                user: this.sanitizeUser(user),
                tokens,
                session: session.id,
                permissions: await this.authorizationService.getUserPermissions(user.id)
            };

        } catch (error) {
            await this.rateLimiter.incrementFailedAttempts(ip, email);
            throw error;
        }
    }

    /**
     * Validación de credenciales
     */
    async validateCredentials(email, password) {
        // En producción: consulta a base de datos
        // Mock para desarrollo
        const users = [
            {
                id: 1,
                email: 'admin@bookkeeper.com',
                password: await bcrypt.hash('admin123', 10),
                role: 'admin',
                active: true,
                name: 'Administrator'
            },
            {
                id: 2,
                email: 'user@bookkeeper.com',
                password: await bcrypt.hash('user123', 10),
                role: 'user',
                active: true,
                name: 'Regular User'
            }
        ];

        const user = users.find(u => u.email === email);
        if (!user) return null;

        const isValidPassword = await bcrypt.compare(password, user.password);
        return isValidPassword ? user : null;
    }

    /**
     * Generar par de tokens JWT
     */
    async generateTokenPair(user, deviceId) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            deviceId
        };

        const accessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'access-secret',
            {
                expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
                issuer: 'bookkeeper-api',
                audience: 'bookkeeper-client'
            }
        );

        const refreshToken = jwt.sign(
            { id: user.id, deviceId, type: 'refresh' },
            process.env.JWT_REFRESH_SECRET || 'refresh-secret',
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
                issuer: 'bookkeeper-api'
            }
        );

        return { accessToken, refreshToken };
    }

    /**
     * Renovar tokens usando refresh token
     */
    async refreshTokens(refreshToken, clientInfo = {}) {
        try {
            const decoded = jwt.verify(
                refreshToken,
                process.env.JWT_REFRESH_SECRET || 'refresh-secret'
            );

            // Verificar sesión activa
            const session = await this.sessionService.getActiveSession(
                decoded.id,
                decoded.deviceId
            );

            if (!session || session.refreshToken !== refreshToken) {
                throw new AuthenticationError('Sesión inválida');
            }

            // Obtener usuario actualizado
            const user = await this.getUserById(decoded.id);
            if (!user || !user.active) {
                throw new AuthenticationError('Usuario inválido');
            }

            // Generar nuevos tokens
            const newTokens = await this.generateTokenPair(user, decoded.deviceId);

            // Actualizar sesión
            await this.sessionService.updateSession(session.id, {
                refreshToken: newTokens.refreshToken,
                lastAccess: new Date()
            });

            return {
                user: this.sanitizeUser(user),
                tokens: newTokens,
                permissions: await this.authorizationService.getUserPermissions(user.id)
            };

        } catch (error) {
            throw new AuthenticationError('Token de renovación inválido');
        }
    }

    /**
     * Logout con invalidación de sesión
     */
    async logout(userId, deviceId, refreshToken) {
        try {
            // Invalidar sesión específica
            await this.sessionService.invalidateSession(userId, deviceId, refreshToken);

            // Audit log
            await this.auditService.logLogout(userId, deviceId);

            return { success: true };
        } catch (error) {
            throw new AuthenticationError('Error durante logout');
        }
    }

    /**
     * Sanitizar datos de usuario para respuesta
     */
    sanitizeUser(user) {
        const { password, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    /**
     * Obtener usuario por ID (mock)
     */
    async getUserById(id) {
        // Mock para desarrollo
        const users = [
            { id: 1, email: 'admin@bookkeeper.com', role: 'admin', active: true, name: 'Administrator' },
            { id: 2, email: 'user@bookkeeper.com', role: 'user', active: true, name: 'Regular User' }
        ];
        return users.find(u => u.id === id);
    }
}