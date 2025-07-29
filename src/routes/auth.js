// ===================================================
// 7. RUTAS DE AUTENTICACIÓN
// src/routes/auth.js
// ===================================================

import express from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticationService } from '../services/auth/AuthenticationService.js';
import { AuthorizationService } from '../services/auth/AuthorizationService.js';

const router = express.Router();
const authService = new AuthenticationService();
const authzService = new AuthorizationService();

// Validaciones
const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('deviceId').optional().isString()
];

const refreshValidation = [
    body('refreshToken').notEmpty(),
    body('deviceId').optional().isString()
];

/**
 * POST /auth/login - Autenticación
 */
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Datos de entrada inválidos',
                details: errors.array()
            });
        }

        const { email, password, deviceId } = req.body;
        const clientInfo = {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            deviceId: deviceId || `web_${Date.now()}`
        };

        const result = await authService.authenticate(
            { email, password },
            clientInfo
        );

        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            code: error.code || 'INTERNAL_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /auth/refresh - Renovar tokens
 */
router.post('/refresh', refreshValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Datos de entrada inválidos',
                details: errors.array()
            });
        }

        const { refreshToken, deviceId } = req.body;
        const clientInfo = {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            deviceId
        };

        const result = await authService.refreshTokens(refreshToken, clientInfo);

        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(error.statusCode || 401).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /auth/logout - Cerrar sesión
 */
router.post('/logout', AuthMiddleware.authenticate(), async (req, res) => {
    try {
        const { deviceId } = req.body;
        const refreshToken = req.headers['x-refresh-token'];

        await authService.logout(req.user.id, deviceId, refreshToken);

        res.json({
            success: true,
            message: 'Sesión cerrada correctamente',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /auth/me - Información del usuario actual
 */
router.get('/me', AuthMiddleware.authenticate(), async (req, res) => {
    try {
        const permissions = await authzService.getUserPermissions(req.user.id);

        res.json({
            success: true,
            data: {
                user: req.user,
                permissions,
                session: req.session.id
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;