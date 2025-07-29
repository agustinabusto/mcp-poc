// src/server/models/ApiKey.js
import { Model, DataTypes } from 'sequelize';
import crypto from 'crypto';

export class ApiKey extends Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            key: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                }
            },
            permissions: {
                type: DataTypes.JSON,
                defaultValue: []
            },
            rateLimit: {
                type: DataTypes.INTEGER,
                defaultValue: 1000 // requests per hour
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            lastUsed: {
                type: DataTypes.DATE
            },
            expiresAt: {
                type: DataTypes.DATE
            }
        }, {
            sequelize,
            modelName: 'ApiKey',
            tableName: 'api_keys',
            hooks: {
                beforeCreate: (apiKey) => {
                    if (!apiKey.key) {
                        apiKey.key = crypto.randomBytes(32).toString('hex');
                    }
                }
            }
        });
    }

    async checkRateLimit() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const usageCount = await ApiKeyUsage.count({
            where: {
                apiKeyId: this.id,
                createdAt: {
                    [Op.gte]: oneHourAgo
                }
            }
        });

        return usageCount >= this.rateLimit;
    }

    async updateLastUsed() {
        await this.update({ lastUsed: new Date() });

        // Registrar uso para rate limiting
        await ApiKeyUsage.create({
            apiKeyId: this.id,
            timestamp: new Date()
        });
    }

    hasPermission(permission) {
        return this.permissions.includes(permission) || this.permissions.includes('*');
    }
}