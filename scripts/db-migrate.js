#!/usr/bin/env node

/**
 * Database Migration System for AFIP Monitor MCP
 * 
 * Handles schema versioning, incremental migrations, and data preservation
 * Usage: npm run db:migrate [--force] [--dry-run]
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Migration configuration
const CONFIG = {
    dbPath: process.env.DATABASE_PATH || path.join(rootDir, 'data/afip_monitor.db'),
    schemasDir: path.join(rootDir, 'src/database/schemas'),
    migrationsDir: path.join(rootDir, 'src/database/migrations'),
    backupDir: path.join(rootDir, 'data/backups'),
    currentVersion: '4.1.0' // Updated for ML features
};

// Schema files in dependency order
const SCHEMA_FILES = [
    'contributors-tables.sql',
    'compliance-monitoring-tables.sql', 
    'ocr-tables.sql' // Contains ML tables as of v4.1
];

class DatabaseMigrator {
    constructor() {
        this.db = null;
        this.isDryRun = process.argv.includes('--dry-run');
        this.force = process.argv.includes('--force');
    }

    async initialize() {
        console.log('🔄 Initializing Database Migrator...');
        
        // Ensure directories exist
        await this.ensureDirectories();
        
        // Connect to database
        this.db = await open({
            filename: CONFIG.dbPath,
            driver: sqlite3.Database
        });

        // Configure SQLite
        await this.db.exec(`
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA foreign_keys = ON;
            PRAGMA temp_store = MEMORY;
        `);

        console.log(`📊 Connected to database: ${CONFIG.dbPath}`);
    }

    async ensureDirectories() {
        const dirs = [
            path.dirname(CONFIG.dbPath),
            CONFIG.backupDir,
            CONFIG.migrationsDir
        ];

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    async getCurrentVersion() {
        try {
            // Create schema_version table if it doesn't exist
            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS schema_version (
                    id INTEGER PRIMARY KEY,
                    version TEXT NOT NULL,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    description TEXT
                );
            `);

            const result = await this.db.get(
                'SELECT version FROM schema_version ORDER BY id DESC LIMIT 1'
            );

            return result?.version || '0.0.0';
        } catch (error) {
            console.error('Error getting current version:', error);
            return '0.0.0';
        }
    }

    async createBackup() {
        if (this.isDryRun) {
            console.log('🔄 [DRY-RUN] Would create backup');
            return null;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(CONFIG.backupDir, `backup-${timestamp}.db`);

        try {
            const data = await fs.readFile(CONFIG.dbPath);
            await fs.writeFile(backupPath, data);
            console.log(`💾 Backup created: ${backupPath}`);
            return backupPath;
        } catch (error) {
            console.error('Error creating backup:', error);
            throw error;
        }
    }

    async getTableInfo() {
        const tables = await this.db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);

        const info = {};
        for (const table of tables) {
            const count = await this.db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
            info[table.name] = count.count;
        }

        return info;
    }

    async executeSchemaFile(schemaFile) {
        const schemaPath = path.join(CONFIG.schemasDir, schemaFile);
        
        try {
            const schemaContent = await fs.readFile(schemaPath, 'utf8');
            
            if (this.isDryRun) {
                console.log(`🔄 [DRY-RUN] Would execute: ${schemaFile}`);
                return;
            }

            console.log(`📄 Executing schema: ${schemaFile}`);
            
            // Split into individual statements to handle ALTER TABLE errors gracefully
            const statements = this.splitSQLStatements(schemaContent);
            let successCount = 0;
            let skipCount = 0;
            
            for (const statement of statements) {
                if (statement.trim().length === 0) continue;
                
                try {
                    await this.db.exec(statement);
                    successCount++;
                } catch (error) {
                    // Handle expected errors for ALTER TABLE on existing columns
                    if (error.message.includes('duplicate column name') || 
                        error.message.includes('column already exists')) {
                        skipCount++;
                        // This is expected - column already exists
                    } else {
                        console.warn(`⚠️ Statement warning in ${schemaFile}: ${error.message}`);
                    }
                }
            }
            
            console.log(`✅ Schema applied: ${schemaFile} (${successCount} statements, ${skipCount} skipped)`);
            
        } catch (error) {
            console.error(`❌ Error applying ${schemaFile}:`, error.message);
            throw error;
        }
    }

    splitSQLStatements(content) {
        // Split SQL content into individual statements
        // Handle multi-line statements and comments
        const lines = content.split('\n');
        const statements = [];
        let currentStatement = '';
        let inComment = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip comments
            if (trimmed.startsWith('--')) continue;
            if (trimmed.startsWith('/*')) {
                inComment = true;
                continue;
            }
            if (trimmed.endsWith('*/')) {
                inComment = false;
                continue;
            }
            if (inComment) continue;
            
            currentStatement += line + '\n';
            
            // Check if statement is complete (ends with semicolon)
            if (trimmed.endsWith(';')) {
                statements.push(currentStatement.trim());
                currentStatement = '';
            }
        }
        
        // Add any remaining statement
        if (currentStatement.trim()) {
            statements.push(currentStatement.trim());
        }
        
        return statements;
    }

    async detectConflicts(currentVersion, targetVersion) {
        const conflicts = [];
        
        // Check for potential data conflicts
        const tables = await this.db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);

        for (const table of tables) {
            // Check if table will be modified by new schema
            const schemaContent = await this.getAllSchemaContent();
            
            if (schemaContent.includes(`ALTER TABLE ${table.name}`) ||
                schemaContent.includes(`DROP TABLE ${table.name}`)) {
                
                const count = await this.db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
                if (count.count > 0) {
                    conflicts.push({
                        table: table.name,
                        type: 'data_loss_risk',
                        records: count.count,
                        message: `Table ${table.name} has ${count.count} records and may be modified`
                    });
                }
            }
        }

        return conflicts;
    }

    async getAllSchemaContent() {
        let content = '';
        for (const schemaFile of SCHEMA_FILES) {
            const schemaPath = path.join(CONFIG.schemasDir, schemaFile);
            try {
                content += await fs.readFile(schemaPath, 'utf8') + '\n';
            } catch (error) {
                console.warn(`⚠️ Could not read ${schemaFile}: ${error.message}`);
            }
        }
        return content;
    }

    async updateSchemaVersion(version, description) {
        if (this.isDryRun) {
            console.log(`🔄 [DRY-RUN] Would update version to: ${version}`);
            return;
        }

        await this.db.run(
            'INSERT INTO schema_version (version, description) VALUES (?, ?)',
            [version, description]
        );
    }

    async validateMigration() {
        console.log('🔍 Validating migration...');
        
        const tables = await this.db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);

        console.log('\n📊 Current database structure:');
        for (const table of tables) {
            const count = await this.db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
            console.log(`  • ${table.name}: ${count.count} records`);
        }

        // Validate ML tables for v4.1
        const mlTables = ['ml_document_patterns', 'ml_corrections'];
        const existingMlTables = tables.filter(t => mlTables.includes(t.name));
        
        if (existingMlTables.length === mlTables.length) {
            console.log('✅ ML Enhancement tables detected');
        } else if (existingMlTables.length > 0) {
            console.log('⚠️ Partial ML tables found - migration may be incomplete');
        }

        return true;
    }

    async runMigration() {
        try {
            const currentVersion = await this.getCurrentVersion();
            const targetVersion = CONFIG.currentVersion;

            console.log(`\n🚀 Database Migration`);
            console.log(`📍 Current version: ${currentVersion}`);
            console.log(`🎯 Target version: ${targetVersion}`);
            
            if (this.isDryRun) {
                console.log('🔍 DRY-RUN MODE - No changes will be made');
            }

            // Show current database state
            console.log('\n📊 Current database state:');
            const currentTables = await this.getTableInfo();
            Object.entries(currentTables).forEach(([table, count]) => {
                console.log(`  • ${table}: ${count} records`);
            });

            // Check for conflicts
            const conflicts = await this.detectConflicts(currentVersion, targetVersion);
            if (conflicts.length > 0 && !this.force) {
                console.log('\n⚠️ Potential conflicts detected:');
                conflicts.forEach(conflict => {
                    console.log(`  • ${conflict.message}`);
                });
                console.log('\nUse --force to proceed anyway or --dry-run to preview changes');
                return false;
            }

            // Create backup if not dry run
            let backupPath = null;
            if (!this.isDryRun && Object.keys(currentTables).length > 0) {
                backupPath = await this.createBackup();
            }

            // Apply schema files
            console.log('\n📄 Applying schema files...');
            for (const schemaFile of SCHEMA_FILES) {
                await this.executeSchemaFile(schemaFile);
            }

            // Update version
            await this.updateSchemaVersion(
                targetVersion, 
                'Applied all schemas including ML Enhancement (User Story 4.1)'
            );

            // Validate migration
            await this.validateMigration();

            if (this.isDryRun) {
                console.log('\n✅ DRY-RUN completed - no changes made');
            } else {
                console.log('\n🎉 Migration completed successfully!');
                if (backupPath) {
                    console.log(`💾 Backup available at: ${backupPath}`);
                }
            }

            return true;

        } catch (error) {
            console.error('\n❌ Migration failed:', error.message);
            
            if (!this.isDryRun) {
                console.log('💡 Consider restoring from backup if available');
                console.log('💡 Run with --dry-run to preview changes first');
            }
            
            throw error;
        }
    }

    async cleanup() {
        if (this.db) {
            await this.db.close();
        }
    }
}

// Main execution
async function main() {
    const migrator = new DatabaseMigrator();
    
    try {
        await migrator.initialize();
        const success = await migrator.runMigration();
        
        if (success) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    } catch (error) {
        console.error('Fatal error during migration:', error);
        process.exit(1);
    } finally {
        await migrator.cleanup();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}