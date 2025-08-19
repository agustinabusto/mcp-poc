// src/server/models/contributors-model.js
import { DatabaseService } from '../services/database-service.js';
import { LoggerService } from '../services/logger-service.js';

export class ContributorsModel {
    static logger = LoggerService.createLogger('ContributorsModel');
    static tableName = 'contributors';

    /**
     * Crear tabla de contribuyentes si no existe
     */
    static async initializeTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${ContributorsModel.tableName} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cuit TEXT UNIQUE NOT NULL,
                business_name TEXT NOT NULL,
                contact_email TEXT,
                contact_phone TEXT,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
                risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
                last_compliance_check DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                active INTEGER DEFAULT 1,
                category TEXT,
                compliance_status TEXT DEFAULT 'unknown',
                deleted_at DATETIME
            )
        `;

        const createIndexes = [
            `CREATE INDEX IF NOT EXISTS idx_contributors_cuit ON ${ContributorsModel.tableName}(cuit)`,
            `CREATE INDEX IF NOT EXISTS idx_contributors_business_name ON ${ContributorsModel.tableName}(business_name)`,
            `CREATE INDEX IF NOT EXISTS idx_contributors_status ON ${ContributorsModel.tableName}(status)`,
            `CREATE INDEX IF NOT EXISTS idx_contributors_category ON ${ContributorsModel.tableName}(category)`,
            `CREATE INDEX IF NOT EXISTS idx_contributors_active ON ${ContributorsModel.tableName}(active)`,
            `CREATE INDEX IF NOT EXISTS idx_contributors_created_at ON ${ContributorsModel.tableName}(created_at)`
        ];

        try {
            const db = await DatabaseService.getConnection();

            await db.exec(createTableSQL);

            for (const indexSQL of createIndexes) {
                await db.exec(indexSQL);
            }

            ContributorsModel.logger.info('Contributors table initialized successfully');

        } catch (error) {
            ContributorsModel.logger.error('Error initializing contributors table:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas básicas
     */
    static async getStats() {
        try {
            const db = await DatabaseService.getConnection();

            // Estadísticas básicas
            const basicStats = await db.get(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
                    SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as inactivos
                FROM ${ContributorsModel.tableName}
            `);

            // Si no hay datos, devolver estadísticas vacías
            if (!basicStats || basicStats.total === 0) {
                return {
                    total: 0,
                    activos: 0,
                    inactivos: 0,
                    porCategoria: {},
                    porSituacionAfip: {},
                    creadosUltimos30Dias: 0
                };
            }

            // Por categoría
            const porCategoria = await db.all(`
                SELECT categoria, COUNT(*) as count
                FROM ${ContributorsModel.tableName}
                WHERE activo = 1
                GROUP BY categoria
            `);

            // Por situación AFIP
            const porSituacionAfip = await db.all(`
                SELECT situacion_afip as situacion, COUNT(*) as count
                FROM ${ContributorsModel.tableName}
                WHERE activo = 1
                GROUP BY situacion_afip
            `);

            // Creados en últimos 30 días
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - 30);

            const creadosUltimos30Dias = await db.get(`
                SELECT COUNT(*) as count
                FROM ${ContributorsModel.tableName}
                WHERE fecha_creacion >= ? AND activo = 1
            `, [fechaLimite.toISOString()]);

            return {
                total: basicStats.total || 0,
                activos: basicStats.activos || 0,
                inactivos: basicStats.inactivos || 0,
                porCategoria: porCategoria.reduce((acc, item) => {
                    acc[item.categoria] = item.count;
                    return acc;
                }, {}),
                porSituacionAfip: porSituacionAfip.reduce((acc, item) => {
                    acc[item.situacion] = item.count;
                    return acc;
                }, {}),
                creadosUltimos30Dias: creadosUltimos30Dias?.count || 0
            };

        } catch (error) {
            ContributorsModel.logger.error('Error getting contributors stats:', error);
            // Devolver estadísticas vacías en caso de error
            return {
                total: 0,
                activos: 0,
                inactivos: 0,
                porCategoria: {},
                porSituacionAfip: {},
                creadosUltimos30Dias: 0
            };
        }
    }

    /**
     * Verificar si existe un contribuyente por CUIT
     */
    static async existsByCuit(cuit) {
        try {
            const db = await DatabaseService.getConnection();
            const result = await db.get(`
                SELECT COUNT(*) as count
                FROM ${ContributorsModel.tableName}
                WHERE cuit = ? AND activo = 1
            `, [cuit]);

            return result.count > 0;

        } catch (error) {
            ContributorsModel.logger.error(`Error checking if contributor exists ${cuit}:`, error);
            return false;
        }
    }

    /**
     * Crear un contribuyente
     */
    static async create(contributorData) {
        try {
            const db = await DatabaseService.getConnection();

            const sql = `
                INSERT INTO ${ContributorsModel.tableName} (
                    cuit,
                    business_name,
                    contact_email,
                    contact_phone,
                    status,
                    risk_level,
                    last_compliance_check,
                    created_at,
                    updated_at,
                    active,
                    category,
                    compliance_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                contributorData.cuit,
                contributorData.businessName || contributorData.business_name || contributorData.razonSocial,
                contributorData.contactEmail || contributorData.contact_email || contributorData.email || null,
                contributorData.contactPhone || contributorData.contact_phone || contributorData.telefono || null,
                contributorData.status || 'active',
                contributorData.riskLevel || contributorData.risk_level || 'medium',
                contributorData.lastComplianceCheck || contributorData.last_compliance_check || null,
                contributorData.createdAt || contributorData.created_at || new Date().toISOString(),
                contributorData.updatedAt || contributorData.updated_at || new Date().toISOString(),
                contributorData.active !== undefined ? (contributorData.active ? 1 : 0) : 1,
                contributorData.category || contributorData.categoria || null,
                contributorData.complianceStatus || contributorData.compliance_status || 'unknown'
            ];

            const result = await db.run(sql, params);

            ContributorsModel.logger.info(`Contributor created with ID: ${result.lastID}`);

            return result.lastID;

        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                const duplicateError = new Error('El contribuyente ya existe');
                duplicateError.code = 'DUPLICATE_ENTRY';
                throw duplicateError;
            }
            ContributorsModel.logger.error('Error creating contributor:', error);
            throw error;
        }
    }
}