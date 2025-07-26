// src/server/services/database-service.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { LoggerService } from './logger-service.js';

export class DatabaseService {
    static db = null;
    static isInitialized = false;
    static logger = LoggerService.createLogger('DatabaseService');

    /**
     * Inicializar conexión a la base de datos
     */
    static async initialize() {
        try {
            if (DatabaseService.isInitialized) {
                return DatabaseService.db;
            }

            const dbPath = process.env.DATABASE_PATH || './data/afip_monitor.db';

            // Asegurar que el directorio existe
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            DatabaseService.db = await open({
                filename: dbPath,
                driver: sqlite3.Database
            });

            // Configurar SQLite para mejor rendimiento
            await DatabaseService.db.exec(`
                PRAGMA journal_mode = WAL;
                PRAGMA synchronous = NORMAL;
                PRAGMA cache_size = 1000;
                PRAGMA foreign_keys = ON;
                PRAGMA temp_store = MEMORY;
            `);

            DatabaseService.isInitialized = true;
            DatabaseService.logger.info(`Database initialized: ${dbPath}`);

            return DatabaseService.db;

        } catch (error) {
            DatabaseService.logger.error('Database initialization error:', error);
            throw error;
        }
    }

    /**
     * Obtener conexión a la base de datos
     */
    static async getConnection() {
        if (!DatabaseService.isInitialized) {
            await DatabaseService.initialize();
        }
        return DatabaseService.db;
    }

    /**
     * Verificar salud de la base de datos
     */
    static async healthCheck() {
        try {
            const db = await DatabaseService.getConnection();
            const result = await db.get('SELECT 1 as test');

            return {
                healthy: result.test === 1,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            DatabaseService.logger.error('Database health check failed:', error);
            return {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Obtener estadísticas de la base de datos
     */
    static async getStats() {
        try {
            const db = await DatabaseService.getConnection();

            const tables = await db.all(`
                SELECT name, type 
                FROM sqlite_master 
                WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
            `);

            const stats = {
                tables: [],
                totalSize: 0
            };

            for (const table of tables) {
                try {
                    const count = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
                    stats.tables.push({
                        name: table.name,
                        rows: count.count
                    });
                } catch (error) {
                    // Si la tabla no existe o hay error, continuar
                    stats.tables.push({
                        name: table.name,
                        rows: 0
                    });
                }
            }

            return stats;

        } catch (error) {
            DatabaseService.logger.error('Error getting database stats:', error);
            return {
                tables: [],
                totalSize: 0
            };
        }
    }

    /**
     * Cerrar conexión
     */
    static async close() {
        try {
            if (DatabaseService.db) {
                await DatabaseService.db.close();
                DatabaseService.db = null;
                DatabaseService.isInitialized = false;
                DatabaseService.logger.info('Database connection closed');
            }

        } catch (error) {
            DatabaseService.logger.error('Error closing database:', error);
            throw error;
        }
    }
}