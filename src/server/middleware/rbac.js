// src/server/middleware/rbac.js (Role-Based Access Control)
export class RBACMiddleware {
    static requireRole(roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const userRole = req.user.role;
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    required: allowedRoles,
                    current: userRole
                });
            }

            next();
        };
    }

    static requirePermission(permission) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            if (!req.user.hasPermission(permission)) {
                return res.status(403).json({
                    error: 'Permission denied',
                    required: permission
                });
            }

            next();
        };
    }

    static requireOwnershipOrRole(roles) {
        return (req, res, next) => {
            const userId = req.params.id || req.params.userId;
            const currentUserId = req.user.id;
            const userRole = req.user.role;
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            // Permitir si es el mismo usuario o tiene rol suficiente
            if (userId === currentUserId || allowedRoles.includes(userRole)) {
                return next();
            }

            return res.status(403).json({
                error: 'Access denied - insufficient permissions or not owner'
            });
        };
    }
}