// ===================================================
// 3. SERVICIO DE AUTORIZACIÓN (RBAC)
// src/services/auth/AuthorizationService.js
// ===================================================

export class AuthorizationService {
    constructor() {
        this.roles = this.initializeRoles();
        this.permissions = this.initializePermissions();
    }

    /**
     * Inicializar roles del sistema
     */
    initializeRoles() {
        return {
            admin: {
                name: 'Administrador',
                permissions: ['*'] // Todos los permisos
            },
            manager: {
                name: 'Manager',
                permissions: [
                    'contributors:read',
                    'contributors:write',
                    'reports:read',
                    'dashboard:access'
                ]
            },
            user: {
                name: 'Usuario',
                permissions: [
                    'contributors:read',
                    'dashboard:access'
                ]
            },
            readonly: {
                name: 'Solo Lectura',
                permissions: [
                    'contributors:read',
                    'dashboard:access'
                ]
            }
        };
    }

    /**
     * Inicializar permisos del sistema
     */
    initializePermissions() {
        return {
            'contributors:read': 'Leer contribuyentes',
            'contributors:write': 'Escribir contribuyentes',
            'contributors:delete': 'Eliminar contribuyentes',
            'reports:read': 'Ver reportes',
            'reports:write': 'Crear reportes',
            'users:manage': 'Gestionar usuarios',
            'system:admin': 'Administrar sistema',
            'dashboard:access': 'Acceder al dashboard',
            'api:access': 'Acceso a API'
        };
    }

    /**
     * Verificar si usuario tiene permiso
     */
    async hasPermission(userId, permission) {
        const user = await this.getUserWithRole(userId);
        if (!user) return false;

        const userRole = this.roles[user.role];
        if (!userRole) return false;

        // Admin tiene todos los permisos
        if (userRole.permissions.includes('*')) return true;

        return userRole.permissions.includes(permission);
    }

    /**
     * Obtener todos los permisos del usuario
     */
    async getUserPermissions(userId) {
        const user = await this.getUserWithRole(userId);
        if (!user) return [];

        const userRole = this.roles[user.role];
        if (!userRole) return [];

        if (userRole.permissions.includes('*')) {
            return Object.keys(this.permissions);
        }

        return userRole.permissions;
    }

    /**
     * Middleware de autorización
     */
    requirePermission(permission) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        error: 'Autenticación requerida'
                    });
                }

                const hasPermission = await this.hasPermission(req.user.id, permission);
                if (!hasPermission) {
                    return res.status(403).json({
                        success: false,
                        error: 'Permisos insuficientes',
                        required: permission
                    });
                }

                next();
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: 'Error verificando permisos'
                });
            }
        };
    }

    /**
     * Obtener usuario con rol (mock)
     */
    async getUserWithRole(userId) {
        // Mock para desarrollo
        const users = [
            { id: 1, role: 'admin' },
            { id: 2, role: 'user' }
        ];
        return users.find(u => u.id === userId);
    }
}