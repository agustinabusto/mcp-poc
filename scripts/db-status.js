#!/usr/bin/env node

/**
 * Database Status and Information Tool
 * 
 * Provides detailed information about database structure, data, and health
 * Usage: npm run db:status
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const CONFIG = {
    dbPath: process.env.DATABASE_PATH || path.join(rootDir, 'data/afip_monitor.db')
};

class DatabaseStatus {
    constructor() {
        this.db = null;
    }

    async initialize() {
        try {
            this.db = await open({
                filename: CONFIG.dbPath,
                driver: sqlite3.Database
            });
        } catch (error) {
            console.error(`❌ Cannot connect to database: ${CONFIG.dbPath}`);
            console.error(error.message);
            return false;
        }
        return true;
    }

    async getCurrentVersion() {
        try {
            const result = await this.db.get(
                'SELECT version, applied_at, description FROM schema_version ORDER BY id DESC LIMIT 1'
            );
            return result || null;
        } catch (error) {
            return null;
        }
    }

    async getTableInfo() {
        const tables = await this.db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);

        const info = [];
        for (const table of tables) {
            const count = await this.db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
            const columns = await this.db.all(`PRAGMA table_info(${table.name})`);
            
            info.push({
                name: table.name,
                records: count.count,
                columns: columns.length,
                columnDetails: columns
            });
        }

        return info;
    }

    async getIndexes() {
        const indexes = await this.db.all(`
            SELECT name, tbl_name, sql FROM sqlite_master 
            WHERE type='index' AND name NOT LIKE 'sqlite_%'
            ORDER BY tbl_name, name
        `);
        return indexes;
    }

    async getDatabaseSize() {
        try {
            const fs = await import('fs/promises');
            const stats = await fs.stat(CONFIG.dbPath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    async checkMLFeatures() {
        const mlTables = ['ml_document_patterns', 'ml_corrections'];
        const tables = await this.db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('${mlTables.join("','")}')
        `);

        const hasMLTables = tables.length === mlTables.length;
        
        let mlStats = null;
        if (hasMLTables) {
            mlStats = {
                patterns: await this.db.get('SELECT COUNT(*) as count FROM ml_document_patterns'),
                corrections: await this.db.get('SELECT COUNT(*) as count FROM ml_corrections'),
                providers: await this.db.get('SELECT COUNT(DISTINCT cuit) as count FROM ml_document_patterns')
            };
        }

        return {
            available: hasMLTables,
            tables: tables.map(t => t.name),
            stats: mlStats
        };
    }

    async checkDataIntegrity() {
        const checks = [];

        try {
            // Check foreign key constraints
            const fkViolations = await this.db.all('PRAGMA foreign_key_check');
            checks.push({
                test: 'Foreign Key Integrity',
                passed: fkViolations.length === 0,
                details: fkViolations.length === 0 ? 'All foreign keys valid' : `${fkViolations.length} violations found`
            });

            // Check for duplicate CUITs in contributors
            try {
                const duplicates = await this.db.get(`
                    SELECT COUNT(*) as count FROM contributors 
                    GROUP BY cuit HAVING COUNT(*) > 1
                `);
                checks.push({
                    test: 'Contributors CUIT Uniqueness',
                    passed: !duplicates,
                    details: duplicates ? 'Duplicate CUITs found' : 'All CUITs unique'
                });
            } catch (error) {
                checks.push({
                    test: 'Contributors CUIT Uniqueness',
                    passed: false,
                    details: 'Contributors table not found'
                });
            }

            // Check ML data consistency
            const mlFeatures = await this.checkMLFeatures();
            if (mlFeatures.available) {
                const orphanedCorrections = await this.db.get(`
                    SELECT COUNT(*) as count FROM ml_corrections c
                    LEFT JOIN ocr_processing_log o ON c.document_id = o.id
                    WHERE o.id IS NULL
                `);
                
                checks.push({
                    test: 'ML Data Consistency',
                    passed: orphanedCorrections.count === 0,
                    details: orphanedCorrections.count === 0 ? 'All ML data consistent' : `${orphanedCorrections.count} orphaned corrections`
                });
            }

        } catch (error) {
            checks.push({
                test: 'Integrity Check Error',
                passed: false,
                details: error.message
            });
        }

        return checks;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    async displayStatus() {
        console.log('📊 AFIP Monitor Database Status\n');
        console.log('═'.repeat(50));

        // Basic info
        console.log(`\n📍 Database Location: ${CONFIG.dbPath}`);
        
        const size = await this.getDatabaseSize();
        console.log(`💾 Database Size: ${this.formatBytes(size)}`);

        // Version info
        const version = await this.getCurrentVersion();
        if (version) {
            console.log(`📋 Schema Version: ${version.version}`);
            console.log(`📅 Last Updated: ${new Date(version.applied_at).toLocaleString()}`);
            if (version.description) {
                console.log(`📝 Description: ${version.description}`);
            }
        } else {
            console.log('📋 Schema Version: Not tracked (legacy database)');
        }

        // Tables info
        console.log('\n📊 Tables Summary:');
        const tables = await this.getTableInfo();
        let totalRecords = 0;
        
        tables.forEach(table => {
            console.log(`  • ${table.name.padEnd(30)} ${table.records.toLocaleString().padStart(8)} records  ${table.columns} columns`);
            totalRecords += table.records;
        });
        
        console.log(`  ${'TOTAL'.padEnd(30)} ${totalRecords.toLocaleString().padStart(8)} records`);

        // ML Features status
        console.log('\n🤖 ML Enhancement Features:');
        const mlFeatures = await this.checkMLFeatures();
        if (mlFeatures.available) {
            console.log('  ✅ ML tables present');
            console.log(`  📊 Patterns: ${mlFeatures.stats.patterns.count}`);
            console.log(`  📝 Corrections: ${mlFeatures.stats.corrections.count}`);
            console.log(`  👥 Providers with patterns: ${mlFeatures.stats.providers.count}`);
        } else {
            console.log('  ❌ ML tables not found');
            console.log('  💡 Run "npm run db:migrate" to add ML features');
        }

        // Indexes
        const indexes = await this.getIndexes();
        console.log(`\n🔍 Indexes: ${indexes.length} total`);
        if (process.argv.includes('--verbose')) {
            indexes.forEach(index => {
                console.log(`  • ${index.name} on ${index.tbl_name}`);
            });
        }

        // Data integrity
        console.log('\n🔍 Data Integrity Checks:');
        const checks = await this.checkDataIntegrity();
        checks.forEach(check => {
            const icon = check.passed ? '✅' : '❌';
            console.log(`  ${icon} ${check.test}: ${check.details}`);
        });

        // Detailed table info (if verbose)
        if (process.argv.includes('--verbose')) {
            console.log('\n📋 Detailed Table Structure:');
            tables.forEach(table => {
                console.log(`\n  📄 ${table.name}:`);
                table.columnDetails.forEach(col => {
                    const nullable = col.notnull === 0 ? 'NULL' : 'NOT NULL';
                    const pk = col.pk === 1 ? ' (PK)' : '';
                    const def = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
                    console.log(`    • ${col.name}: ${col.type} ${nullable}${def}${pk}`);
                });
            });
        }

        console.log('\n═'.repeat(50));
        console.log('💡 Use --verbose for detailed structure information');
        console.log('💡 Run "npm run db:migrate --dry-run" to preview migrations');
    }

    async cleanup() {
        if (this.db) {
            await this.db.close();
        }
    }
}

async function main() {
    const status = new DatabaseStatus();
    
    try {
        const connected = await status.initialize();
        if (!connected) {
            process.exit(1);
        }
        
        await status.displayStatus();
        
    } catch (error) {
        console.error('Error checking database status:', error);
        process.exit(1);
    } finally {
        await status.cleanup();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}