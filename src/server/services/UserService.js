// src/server/services/UserService.js
import { User } from '../models/User.js';
import { ValidationError } from '../utils/errors.js';
import { AuditLogger } from '../utils/auditLogger.js';

export class UserService {
    static async createUser(userData, createdBy) {
        try {
            // Validar datos de entrada
            await this.validateUserData(userData);

            // Verificar que el email no existe
            const existingUser = await User.findOne({ where: { email: userData.email } });
            if (existingUser) {
                throw new ValidationError('Email already exists');
            }

            const user = await User.create(userData);

            // Log de auditoría
            await AuditLogger.log('USER_CREATED', {
                userId: user.id,
                createdBy: createdBy.id,
                email: user.email,
                role: user.role
            });

            return user;
        } catch (error) {
            throw error;
        }
    }

    static async updateUser(userId, updateData, updatedBy) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                throw new ValidationError('User not found');
            }

            // Validar permisos de actualización
            this.validateUpdatePermissions(user, updateData, updatedBy);

            const updatedUser = await user.update(updateData);

            await AuditLogger.log('USER_UPDATED', {
                userId: user.id,
                updatedBy: updatedBy.id,
                changes: updateData
            });

            return updatedUser;
        } catch (error) {
            throw error;
        }
    }

    static async deleteUser(userId, deletedBy) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                throw new ValidationError('User not found');
            }

            // Soft delete
            await user.update({ isActive: false });

            await AuditLogger.log('USER_DELETED', {
                userId: user.id,
                deletedBy: deletedBy.id,
                email: user.email
            });

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    static async getUsersByRole(role) {
        return User.findAll({
            where: { role, isActive: true },
            order: [['firstName', 'ASC']]
        });
    }

    static async validateUserData(userData) {
        const requiredFields = ['email', 'firstName', 'lastName', 'role'];
        for (const field of requiredFields) {
            if (!userData[field]) {
                throw new ValidationError(`${field} is required`);
            }
        }

        const validRoles = ['Admin', 'Manager', 'Operator', 'Viewer'];
        if (!validRoles.includes(userData.role)) {
            throw new ValidationError('Invalid role');
        }
    }

    static validateUpdatePermissions(user, updateData, updatedBy) {
        // Solo admins pueden cambiar roles o permisos
        if ((updateData.role || updateData.permissions) && updatedBy.role !== 'Admin') {
            throw new ValidationError('Insufficient permissions to modify role or permissions');
        }

        // Usuarios no pueden modificar su propio rol
        if (updateData.role && user.id === updatedBy.id) {
            throw new ValidationError('Cannot modify your own role');
        }
    }
}