// ===================================================
// 10. INTEGRACIÓN CON REACT NATIVE / MOBILE
// src/services/auth/MobileAuthService.js
// ===================================================

export class MobileAuthService extends AuthenticationService {
    constructor() {
        super();
        this.deviceTokens = new Map(); // Para push notifications
    }

    /**
     * Autenticación específica para mobile
     */
    async authenticateMobile(credentials, deviceInfo) {
        const { fingerprint, faceId, deviceToken } = deviceInfo;

        try {
            // Autenticación base
            const result = await super.authenticate(credentials, deviceInfo);

            // Configuración específica mobile
            if (deviceToken) {
                await this.registerDeviceToken(result.user.id, deviceToken);
            }

            // Token con mayor duración para mobile
            const mobileTokens = await this.generateMobileTokens(result.user, deviceInfo.deviceId);

            return {
                ...result,
                tokens: mobileTokens,
                biometricEnabled: fingerprint || faceId,
                deviceRegistered: true
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Generar tokens con duración extendida para mobile
     */
    async generateMobileTokens(user, deviceId) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            deviceId,
            platform: 'mobile'
        };

        const accessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'access-secret',
            {
                expiresIn: process.env.MOBILE_TOKEN_EXPIRY || '30m', // Más tiempo para mobile
                issuer: 'bookkeeper-mobile',
                audience: 'bookkeeper-app'
            }
        );

        const refreshToken = jwt.sign(
            { id: user.id, deviceId, type: 'refresh', platform: 'mobile' },
            process.env.JWT_REFRESH_SECRET || 'refresh-secret',
            { expiresIn: '30d' } // 30 días para mobile
        );

        return { accessToken, refreshToken };
    }

    /**
     * Registrar token de device para push notifications
     */
    async registerDeviceToken(userId, deviceToken) {
        this.deviceTokens.set(userId, deviceToken);
        // En producción: guardar en DB para envío de notificaciones
    }

    /**
     * Autenticación biométrica
     */
    async authenticateWithBiometric(storedCredentials, biometricData) {
        // Validar datos biométricos
        if (!this.validateBiometricData(biometricData)) {
            throw new AuthenticationError('Datos biométricos inválidos');
        }

        // Usar credenciales almacenadas de forma segura
        return await this.authenticateMobile(storedCredentials, {
            ...biometricData,
            biometricAuth: true
        });
    }

    /**
     * Validar datos biométricos (placeholder)
     */
    validateBiometricData(biometricData) {
        // Implementar validación específica según el tipo de biometría
        return biometricData && (biometricData.fingerprint || biometricData.faceId);
    }
}