// src/server/routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Rate limiting para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos por IP
    message: {
        success: false,
        error: 'Demasiados intentos de login. Intenta en 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting general para API
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 requests por minuto
    message: {
        success: false,
        error: 'Demasiadas requests. Intenta más tarde.',
        code: 'API_RATE_LIMIT_EXCEEDED'
    }
});

// Usuarios mock (en producción usar base de datos)
const mockUsers = [
    {
        id: 1,
        email: 'admin@bookkeeper.com',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKK6WsB/BQ8zt6e', // admin123
        name: 'Administrator',
        role: 'admin',
        active: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        email: 'user@bookkeeper.com',
        password: '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // user123
        name: 'Regular User',
        role: 'user',
        active: true,
        createdAt: new Date().toISOString()
    }
];

// Sesiones activas (en producción usar Redis o base de datos)
const activeSessions = new Map();

// Configuración de roles y permisos
const rolePermissions = {
    admin: ['*'], // Todos los permisos
    manager: [
        'contributors:read',
        'contributors:write',
        'reports:read',
        'dashboard:access'
    ],
    user: [
        'contributors:read',
        'dashboard:access'
    ],
    readonly: [
        'contributors:read',
        'dashboard:access'
    ]
};

// Validaciones
const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Email válido requerido'),
    body('password').isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres'),
    body('deviceId').optional().isString().withMessage('Device ID debe ser string')
];

const refreshValidation = [
    body('refreshToken').notEmpty().withMessage('Refresh token requerido'),
    body('deviceId').optional().isString()
];

const registerValidation = [
    body('name').trim().isLength({ min: 2 }).withMessage('Nombre mínimo 2 caracteres'),
    body('email').isEmail().normalizeEmail().withMessage('Email válido requerido'),
    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Contraseña debe tener 8+ caracteres, 1 mayúscula, 1 minúscula, 1 número')
];

// ===================================================
// UTILIDADES DE AUTENTICACIÓN
// ===================================================

function generateTokens(user, deviceId) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        deviceId
    };

    const accessToken = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'bookkeeper-secret-key',
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
            issuer: 'bookkeeper-api',
            audience: 'bookkeeper-client'
        }
    );

    const refreshToken = jwt.sign(
        { id: user.id, deviceId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'bookkeeper-refresh-secret',
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
            issuer: 'bookkeeper-api'
        }
    );

    return { accessToken, refreshToken };
}

function getUserPermissions(role) {
    return rolePermissions[role] || [];
}

function sanitizeUser(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
}

function generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ===================================================
// MIDDLEWARE DE AUTENTICACIÓN
// ===================================================

const authenticateToken = (req, res, next) => {
    // Bypass en desarrollo si está configurado
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
        req.user = {
            id: 'dev-user',
            role: 'admin',
            name: 'Developer User'
        };
        return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Token de acceso requerido',
            timestamp: new Date().toISOString()
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'bookkeeper-secret-key', (err, user) => {
        if (err) {
            const errorMessage = err.name === 'TokenExpiredError'
                ? 'Token expirado'
                : 'Token inválido';

            return res.status(401).json({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
        }

        req.user = user;
        next();
    });
};

// ===================================================
// ENDPOINTS
// ===================================================

/**
 * POST /api/auth/login
 */
router.post('/login', authLimiter, loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Datos de entrada inválidos',
                details: errors.array(),
                timestamp: new Date().toISOString()
            });
        }

        const { email, password, deviceId } = req.body;
        const clientInfo = {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            deviceId: deviceId || `web_${Date.now()}`
        };

        // Buscar usuario
        const user = mockUsers.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS',
                timestamp: new Date().toISOString()
            });
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS',
                timestamp: new Date().toISOString()
            });
        }

        // Verificar usuario activo
        if (!user.active) {
            return res.status(401).json({
                success: false,
                error: 'Usuario inactivo',
                code: 'USER_INACTIVE',
                timestamp: new Date().toISOString()
            });
        }

        // Generar tokens
        const tokens = generateTokens(user, clientInfo.deviceId);

        // Crear sesión
        const sessionId = generateSessionId();
        activeSessions.set(sessionId, {
            userId: user.id,
            deviceId: clientInfo.deviceId,
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            refreshToken: tokens.refreshToken,
            createdAt: new Date(),
            lastAccess: new Date()
        });

        // Obtener permisos
        const permissions = getUserPermissions(user.role);

        console.log(`✅ Login exitoso: ${user.email} desde ${clientInfo.ip}`);

        res.json({
            success: true,
            data: {
                user: sanitizeUser(user),
                tokens,
                session: sessionId,
                permissions
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', apiLimiter, refreshValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Datos de entrada inválidos',
                details: errors.array(),
                timestamp: new Date().toISOString()
            });
        }

        const { refreshToken, deviceId } = req.body;

        // Verificar refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'bookkeeper-refresh-secret');
        } catch (err) {
            return res.status(401).json({
                success: false,
                error: 'Token de renovación inválido',
                timestamp: new Date().toISOString()
            });
        }

        // Buscar sesión activa
        let activeSession = null;
        for (const [sessionId, session] of activeSessions) {
            if (session.userId === decoded.id &&
                session.deviceId === decoded.deviceId &&
                session.refreshToken === refreshToken) {
                activeSession = { id: sessionId, ...session };
                break;
            }
        }

        if (!activeSession) {
            return res.status(401).json({
                success: false,
                error: 'Sesión inválida o expirada',
                timestamp: new Date().toISOString()
            });
        }

        // Buscar usuario
        const user = mockUsers.find(u => u.id === decoded.id);
        if (!user || !user.active) {
            return res.status(401).json({
                success: false,
                error: 'Usuario inválido',
                timestamp: new Date().toISOString()
            });
        }

        // Generar nuevos tokens
        const newTokens = generateTokens(user, decoded.deviceId);

        // Actualizar sesión
        activeSessions.set(activeSession.id, {
            ...activeSession,
            refreshToken: newTokens.refreshToken,
            lastAccess: new Date()
        });

        // Obtener permisos
        const permissions = getUserPermissions(user.role);

        console.log(`🔄 Token renovado: ${user.email}`);

        res.json({
            success: true,
            data: {
                user: sanitizeUser(user),
                tokens: newTokens,
                permissions
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en refresh:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, (req, res) => {
    try {
        const { deviceId } = req.body;
        const refreshToken = req.headers['x-refresh-token'];

        // Invalidar sesión
        for (const [sessionId, session] of activeSessions) {
            if (session.userId === req.user.id &&
                session.deviceId === deviceId &&
                session.refreshToken === refreshToken) {
                activeSessions.delete(sessionId);
                break;
            }
        }

        console.log(`👋 Logout: usuario ${req.user.id}`);

        res.json({
            success: true,
            message: 'Sesión cerrada correctamente',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, (req, res) => {
    try {
        const user = mockUsers.find(u => u.id === req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado',
                timestamp: new Date().toISOString()
            });
        }

        const permissions = getUserPermissions(user.role);

        res.json({
            success: true,
            data: {
                user: sanitizeUser(user),
                permissions,
                session: req.user.sessionId
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en /me:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/auth/register
 */
router.post('/register', apiLimiter, registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Datos de entrada inválidos',
                details: errors.array(),
                timestamp: new Date().toISOString()
            });
        }

        const { name, email, password } = req.body;

        // Verificar si el email ya existe
        const existingUser = mockUsers.find(u => u.email === email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'El email ya está registrado',
                code: 'EMAIL_EXISTS',
                timestamp: new Date().toISOString()
            });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 12);

        // Crear nuevo usuario (en producción: guardar en DB)
        const newUser = {
            id: mockUsers.length + 1,
            email,
            password: hashedPassword,
            name: name.trim(),
            role: 'user',
            active: true,
            createdAt: new Date().toISOString()
        };

        mockUsers.push(newUser);

        console.log(`✅ Usuario registrado: ${email}`);

        res.status(201).json({
            success: true,
            data: {
                user: sanitizeUser(newUser),
                message: 'Usuario registrado exitosamente'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', apiLimiter, [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Email válido requerido',
                timestamp: new Date().toISOString()
            });
        }

        const { email } = req.body;

        // En desarrollo, siempre responder éxito por seguridad
        // En producción: verificar usuario y enviar email

        console.log(`📧 Solicitud reset password: ${email}`);

        res.json({
            success: true,
            message: 'Si el email existe, recibirás un enlace de recuperación',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en forgot-password:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/auth/sessions (para administradores)
 */
router.get('/sessions', authenticateToken, (req, res) => {
    // Solo admins pueden ver sesiones
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Permisos insuficientes',
            timestamp: new Date().toISOString()
        });
    }

    const sessions = Array.from(activeSessions.entries()).map(([id, session]) => ({
        id,
        userId: session.userId,
        deviceId: session.deviceId,
        ip: session.ip,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastAccess: session.lastAccess
    }));

    res.json({
        success: true,
        data: {
            sessions,
            total: sessions.length
        },
        timestamp: new Date().toISOString()
    });
});

export default router;