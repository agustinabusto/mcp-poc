// src/server/controllers/UserController.js
import { UserService } from '../services/UserService.js';
import { RateLimiter } from '../middleware/rateLimiter.js';

export class UserController {
    static async createUser(req, res, next) {
        try {
            const user = await UserService.createUser(req.body, req.user);
            res.status(201).json({
                success: true,
                data: user,
                message: 'User created successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    static async getUsers(req, res, next) {
        try {
            const { page = 1, limit = 10, role, search } = req.query;

            const options = {
                offset: (page - 1) * limit,
                limit: parseInt(limit),
                where: { isActive: true }
            };

            if (role) {
                options.where.role = role;
            }

            if (search) {
                options.where[Op.or] = [
                    { firstName: { [Op.iLike]: `%${search}%` } },
                    { lastName: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const users = await User.findAndCountAll(options);

            res.json({
                success: true,
                data: {
                    users: users.rows,
                    total: users.count,
                    page: parseInt(page),
                    pages: Math.ceil(users.count / limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateUser(req, res, next) {
        try {
            const user = await UserService.updateUser(req.params.id, req.body, req.user);
            res.json({
                success: true,
                data: user,
                message: 'User updated successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteUser(req, res, next) {
        try {
            await UserService.deleteUser(req.params.id, req.user);
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    // Rate limiting específico para operaciones sensibles
    static createUserLimited = RateLimiter.create({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 5, // máximo 5 usuarios nuevos por ventana
        message: 'Too many user creation attempts'
    });

    static resetPasswordLimited = RateLimiter.create({
        windowMs: 60 * 60 * 1000, // 1 hora
        max: 3, // máximo 3 resets por hora
        message: 'Too many password reset attempts'
    });
}