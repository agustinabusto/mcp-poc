// src/server/models/User.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Model, DataTypes } from 'sequelize';

export class User extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true
                }
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false
            },
            firstName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            lastName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            role: {
                type: DataTypes.ENUM('Admin', 'Manager', 'Operator', 'Viewer'),
                defaultValue: 'Viewer'
            },
            permissions: {
                type: DataTypes.JSON,
                defaultValue: []
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            lastLogin: {
                type: DataTypes.DATE
            },
            twoFactorEnabled: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            twoFactorSecret: {
                type: DataTypes.STRING
            }
        }, {
            sequelize,
            modelName: 'User',
            tableName: 'users',
            hooks: {
                beforeCreate: async (user) => {
                    if (user.password) {
                        user.password = await bcrypt.hash(user.password, 12);
                    }
                },
                beforeUpdate: async (user) => {
                    if (user.changed('password')) {
                        user.password = await bcrypt.hash(user.password, 12);
                    }
                }
            }
        });
    }

    async validatePassword(password) {
        return bcrypt.compare(password, this.password);
    }

    generateJWT() {
        return jwt.sign(
            {
                id: this.id,
                email: this.email,
                role: this.role,
                permissions: this.permissions
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );
    }

    generateRefreshToken() {
        return jwt.sign(
            { id: this.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );
    }

    hasPermission(permission) {
        return this.permissions.includes(permission) || this.role === 'Admin';
    }

    toJSON() {
        const values = { ...this.get() };
        delete values.password;
        delete values.twoFactorSecret;
        return values;
    }
}