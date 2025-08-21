/**
 * Simple Logger utility for AFIP Monitor application
 * Provides structured logging with levels and timestamps
 */

class Logger {
    constructor(module = 'App') {
        this.module = module;
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        this.currentLevel = process.env.LOG_LEVEL 
            ? this.levels[process.env.LOG_LEVEL.toUpperCase()] 
            : this.levels.INFO;
    }

    _log(level, message, ...args) {
        if (this.levels[level] <= this.currentLevel) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [${level}] [${this.module}] ${message}`;
            
            if (args.length > 0) {
                console.log(logMessage, ...args);
            } else {
                console.log(logMessage);
            }
        }
    }

    error(message, ...args) {
        this._log('ERROR', message, ...args);
    }

    warn(message, ...args) {
        this._log('WARN', message, ...args);
    }

    info(message, ...args) {
        this._log('INFO', message, ...args);
    }

    debug(message, ...args) {
        this._log('DEBUG', message, ...args);
    }
}

export { Logger };
export default Logger;