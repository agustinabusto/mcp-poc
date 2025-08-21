#!/usr/bin/env node

/**
 * Database Backup and Restore Tool
 * 
 * Creates timestamped backups and manages backup retention
 * Usage: npm run db:backup [--restore backup-file] [--cleanup]
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const CONFIG = {
    dbPath: process.env.DATABASE_PATH || path.join(rootDir, 'data/afip_monitor.db'),
    backupDir: path.join(rootDir, 'data/backups'),
    maxBackups: 10, // Keep last 10 backups
    compressionEnabled: false // Future enhancement
};

class DatabaseBackup {
    constructor() {
        this.db = null;
    }

    async initialize() {
        // Ensure backup directory exists
        await fs.mkdir(CONFIG.backupDir, { recursive: true });
    }

    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `afip_monitor_backup_${timestamp}.db`;
        const backupPath = path.join(CONFIG.backupDir, backupName);

        try {
            console.log('🔄 Creating database backup...');
            console.log(`📍 Source: ${CONFIG.dbPath}`);
            console.log(`📍 Backup: ${backupPath}`);

            // Check if source database exists
            try {
                await fs.access(CONFIG.dbPath);
            } catch (error) {
                console.error('❌ Source database not found:', CONFIG.dbPath);
                return null;
            }

            // Copy database file
            const data = await fs.readFile(CONFIG.dbPath);
            await fs.writeFile(backupPath, data);

            // Verify backup integrity
            const isValid = await this.verifyBackup(backupPath);
            if (!isValid) {
                await fs.unlink(backupPath);
                throw new Error('Backup verification failed');
            }

            const stats = await fs.stat(backupPath);
            console.log(`✅ Backup created successfully`);
            console.log(`💾 Size: ${this.formatBytes(stats.size)}`);
            console.log(`📅 Date: ${new Date().toLocaleString()}`);

            return backupPath;

        } catch (error) {
            console.error('❌ Backup creation failed:', error.message);
            throw error;
        }
    }

    async verifyBackup(backupPath) {
        try {
            const db = await open({
                filename: backupPath,
                driver: sqlite3.Database
            });

            // Basic integrity check
            await db.get('SELECT COUNT(*) FROM sqlite_master');
            
            // Check for corruption
            const result = await db.get('PRAGMA integrity_check');
            const isOk = result['integrity_check'] === 'ok';

            await db.close();
            return isOk;

        } catch (error) {
            console.error('Backup verification error:', error.message);
            return false;
        }
    }

    async listBackups() {
        try {
            const files = await fs.readdir(CONFIG.backupDir);
            const backups = [];

            for (const file of files) {
                if (file.endsWith('.db') && file.includes('backup')) {
                    const filePath = path.join(CONFIG.backupDir, file);
                    const stats = await fs.stat(filePath);
                    
                    backups.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime
                    });
                }
            }

            return backups.sort((a, b) => b.created - a.created);
        } catch (error) {
            console.error('Error listing backups:', error.message);
            return [];
        }
    }

    async cleanupOldBackups() {
        console.log('🧹 Cleaning up old backups...');
        
        const backups = await this.listBackups();
        
        if (backups.length <= CONFIG.maxBackups) {
            console.log(`📊 ${backups.length} backups found (within limit of ${CONFIG.maxBackups})`);
            return;
        }

        const toDelete = backups.slice(CONFIG.maxBackups);
        console.log(`🗑️  Removing ${toDelete.length} old backups`);

        for (const backup of toDelete) {
            try {
                await fs.unlink(backup.path);
                console.log(`  ✅ Deleted: ${backup.name}`);
            } catch (error) {
                console.error(`  ❌ Failed to delete ${backup.name}:`, error.message);
            }
        }
    }

    async restoreFromBackup(backupPath) {
        try {
            console.log('🔄 Restoring from backup...');
            console.log(`📍 Backup: ${backupPath}`);
            console.log(`📍 Target: ${CONFIG.dbPath}`);

            // Verify backup exists and is valid
            try {
                await fs.access(backupPath);
            } catch (error) {
                console.error('❌ Backup file not found:', backupPath);
                return false;
            }

            const isValid = await this.verifyBackup(backupPath);
            if (!isValid) {
                console.error('❌ Backup file is corrupted or invalid');
                return false;
            }

            // Create a backup of current database before restore
            const currentBackup = await this.createBackup();
            if (currentBackup) {
                console.log(`📦 Current database backed up as: ${path.basename(currentBackup)}`);
            }

            // Restore database
            const backupData = await fs.readFile(backupPath);
            await fs.writeFile(CONFIG.dbPath, backupData);

            // Verify restore
            const restoreValid = await this.verifyBackup(CONFIG.dbPath);
            if (!restoreValid) {
                console.error('❌ Restore verification failed');
                return false;
            }

            console.log('✅ Database restored successfully');
            return true;

        } catch (error) {
            console.error('❌ Restore failed:', error.message);
            return false;
        }
    }

    async displayBackupInfo() {
        console.log('📦 Database Backup Information\n');
        console.log('═'.repeat(50));

        console.log(`📍 Database: ${CONFIG.dbPath}`);
        console.log(`📁 Backup Directory: ${CONFIG.backupDir}`);
        console.log(`🔢 Max Backups: ${CONFIG.maxBackups}`);

        // Database info
        try {
            const dbStats = await fs.stat(CONFIG.dbPath);
            console.log(`💾 Database Size: ${this.formatBytes(dbStats.size)}`);
            console.log(`📅 Last Modified: ${dbStats.mtime.toLocaleString()}`);
        } catch (error) {
            console.log('❌ Database not found or inaccessible');
        }

        // Backup list
        const backups = await this.listBackups();
        console.log(`\n📋 Available Backups (${backups.length}):`);
        
        if (backups.length === 0) {
            console.log('  No backups found');
        } else {
            let totalSize = 0;
            backups.forEach((backup, index) => {
                console.log(`  ${index + 1}. ${backup.name}`);
                console.log(`     📅 ${backup.created.toLocaleString()}`);
                console.log(`     💾 ${this.formatBytes(backup.size)}`);
                totalSize += backup.size;
            });
            console.log(`\n💾 Total Backup Size: ${this.formatBytes(totalSize)}`);
        }

        console.log('\n💡 Usage:');
        console.log('  Create backup:    npm run db:backup');
        console.log('  Restore backup:   npm run db:backup --restore backup-file.db');
        console.log('  Cleanup old:      npm run db:backup --cleanup');
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

async function main() {
    const backup = new DatabaseBackup();
    await backup.initialize();

    const args = process.argv.slice(2);
    
    try {
        if (args.includes('--restore')) {
            const restoreIndex = args.indexOf('--restore');
            const backupFile = args[restoreIndex + 1];
            
            if (!backupFile) {
                console.error('❌ Please specify backup file to restore');
                console.log('Usage: npm run db:backup --restore backup-file.db');
                process.exit(1);
            }

            const backupPath = path.isAbsolute(backupFile) 
                ? backupFile 
                : path.join(CONFIG.backupDir, backupFile);
                
            const success = await backup.restoreFromBackup(backupPath);
            process.exit(success ? 0 : 1);
            
        } else if (args.includes('--cleanup')) {
            await backup.cleanupOldBackups();
            
        } else if (args.includes('--info')) {
            await backup.displayBackupInfo();
            
        } else {
            // Default action: create backup
            const backupPath = await backup.createBackup();
            
            if (backupPath) {
                // Auto cleanup after successful backup
                await backup.cleanupOldBackups();
            }
        }
        
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}