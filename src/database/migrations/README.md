# Database Migrations

This directory contains incremental database migrations for schema changes that need to be applied in a specific order.

## Migration File Naming Convention

`YYYY-MM-DD-HHmm-description.sql`

Examples:
- `2025-08-19-1200-add-ml-enhancement-tables.sql`
- `2025-08-20-0900-add-user-preferences-table.sql`

## Migration File Structure

```sql
-- Migration: Add ML Enhancement Tables
-- Version: 4.1.0
-- Date: 2025-08-19
-- Description: Adds machine learning tables for OCR pattern recognition

-- Check if migration is needed
-- This prevents running the same migration twice

-- Migration code here
CREATE TABLE IF NOT EXISTS ml_document_patterns (...);

-- Add to migration log
INSERT OR IGNORE INTO schema_version (version, description) 
VALUES ('4.1.0', 'Add ML Enhancement Tables for OCR pattern recognition');
```

## Running Migrations

```bash
# Run all pending migrations (recommended)
npm run db:migrate

# Preview migrations without applying (dry-run)
npm run db:migrate:dry

# Force migrations (skip conflict checks)
npm run db:migrate:force

# Check current database status
npm run db:status

# Check database status with detailed info
npm run db:status:verbose
```

## Migration Best Practices

1. **Always use `IF NOT EXISTS`** for CREATE statements
2. **Add migration log entry** at the end of each migration
3. **Test migrations** on a copy of production data first
4. **Create backups** before running migrations on production
5. **Use transactions** for complex migrations
6. **Document breaking changes** clearly in the migration

## Current Schema Modules

1. **contributors-tables.sql** - Contributor/client management
2. **compliance-monitoring-tables.sql** - Compliance tracking and alerts  
3. **ocr-tables.sql** - OCR processing and ML enhancement (includes ML tables as of v4.1)

## Migration System Features

- ✅ **Version Tracking**: Tracks applied migrations in `schema_version` table
- ✅ **Data Preservation**: Migrations preserve existing data
- ✅ **Conflict Detection**: Warns about potential data conflicts
- ✅ **Automatic Backups**: Creates backups before applying migrations
- ✅ **Dry-Run Mode**: Preview changes without applying them
- ✅ **Rollback Support**: Backups enable manual rollback if needed
- ✅ **Integrity Checks**: Validates database integrity after migrations