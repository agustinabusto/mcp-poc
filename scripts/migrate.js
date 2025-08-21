#!/usr/bin/env node

/**
 * Legacy migration wrapper - redirects to new db-migrate.js
 * This maintains backwards compatibility for existing scripts
 */

console.log('= Redirecting to new migration system...');
console.log('=¡ Use "npm run db:migrate" for the enhanced migration system');

// Import and run the new migrator
import('./db-migrate.js').catch(error => {
    console.error('Error loading migration system:', error);
    process.exit(1);
});