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
                razon_social TEXT NOT NULL,
                email TEXT,
                telefono TEXT,
                direccion TEXT,
                situacion_afip TEXT DEFAULT 'no_categorizado',
                categoria TEXT DEFAULT 'no_categorizado',
                tags TEXT, -- JSON array as text
                afip_data TEXT, -- JSON object as text
                last_afip_sync DATETIME,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                activo INTEGER DEFAULT 1,
                notas TEXT
            )
        `;

        const createIndexes = [
            `CREATE INDEX IF NOT EXISTS idx_contributors_cuit ON ${ContributorsModel.tableName}(cuit)`,
            `CREATE INDEX IF NOT EXISTS idx_contributors_razon_social ON ${ContributorsModel.tableName}(razon_social)`,
            `CREATE INDEX IF NOT EXISTS idx_contributors_situacion_afip ON ${ContributorsModel.tableName}(situacion_afip)`,
            `CREATE INDEX IF NOT EXISTS idx_contributors_categoria ON ${ContributorsModel.tableName}(categoria)`,
            `CREATE INDEX IF NOT EXISTS idx_contributors_activo ON ${ContributorsModel.tableName}(activo)`,
            `CREATE INDEX IF NOT EXISTS idx_contributors_fecha_creacion ON ${ContributorsModel.tableName}(fecha_creacion)`
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
                    razon_social,
                    email,
                    telefono,
                    direccion,
                    situacion_afip,
                    categoria,
                    tags,
                    afip_data,
                    last_afip_sync,
                    fecha_creacion,
                    fecha_modificacion,
                    activo,
                    notas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                contributorData.cuit,
                contributorData.razonSocial,
                contributorData.email || null,
                contributorData.telefono || null,
                contributorData.direccion || null,
                contributorData.situacionAfip || 'no_categorizado',
                contributorData.categoria || 'no_categorizado',
                contributorData.tags ? JSON.stringify(contributorData.tags) : null,
                contributorData.afipData ? JSON.stringify(contributorData.afipData) : null,
                contributorData.lastAfipSync || null,
                contributorData.fechaCreacion || new Date().toISOString(),
                contributorData.fechaModificacion || new Date().toISOString(),
                contributorData.activo !== undefined ? (contributorData.activo ? 1 : 0) : 1,
                contributorData.notas || null
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