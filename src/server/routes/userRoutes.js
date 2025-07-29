// src/server/routes/userRoutes.js
import express from 'express';
import { UserController } from '../controllers/UserController.js';
import { AuthMiddleware } from '../middleware/auth.js';
import { RBACMiddleware } from '../middleware/rbac.js';
import { ValidationMiddleware } from '../middleware/validation.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(AuthMiddleware.authenticate);

// Crear usuario - Solo Admin
router.post('/',
    RBACMiddleware.requireRole('Admin'),
    UserController.createUserLimited,
    ValidationMiddleware.validateUserCreation,
    UserController.createUser
);

// Listar usuarios - Admin y Manager
router.get('/',
    RBACMiddleware.requireRole(['Admin', 'Manager']),
    UserController.getUsers
);

// Obtener usuario específico - Owner, Admin o Manager
router.get('/:id',
    RBACMiddleware.requireOwnershipOrRole(['Admin', 'Manager']),
    UserController.getUser
);

// Actualizar usuario - Owner para datos básicos, Admin para todo
router.put('/:id',
    UserController.updateUser
);

// Eliminar usuario - Solo Admin
router.delete('/:id',
    RBACMiddleware.requireRole('Admin'),
    UserController.deleteUser
);

// Reset password - con rate limiting
router.post('/:id/reset-password',
    RBACMiddleware.requireRole(['Admin', 'Manager']),
    UserController.resetPasswordLimited,
    UserController.resetPassword
);

export default router;