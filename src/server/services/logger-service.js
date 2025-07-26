// src/server/services/logger-service.js
export class LoggerService {
    static loggers = new Map();

    /**
     * Crear un logger para un módulo específico
     */
    static createLogger(moduleName) {
        if (LoggerService.loggers.has(moduleName)) {
            return LoggerService.loggers.get(moduleName);
        }

        const logger = new Logger(moduleName);
        LoggerService.loggers.set(moduleName, logger);
        return logger;
    }

    /**
     * Configurar nivel de logging global
     */
    static setLogLevel(level) {
        Logger.globalLogLevel = level;
    }

    /**
     * Obtener todos los loggers activos
     */
    static getLoggers() {
        return Array.from(LoggerService.loggers.keys());
    }
}

class Logger {
    static globalLogLevel = process.env.LOG_LEVEL || 'info';
    static logLevels = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };

    constructor(moduleName) {
        this.moduleName = moduleName;
        this.logLevel = Logger.globalLogLevel;
    }

    /**
     * Verificar si se debe loggear según el nivel
     */
    shouldLog(level) {
        const currentLevel = Logger.logLevels[this.logLevel] || 1;
        const messageLevel = Logger.logLevels[level] || 1;
        return messageLevel >= currentLevel;
    }

    /**
     * Formatear mensaje de log
     */
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase().padEnd(5);
        const module = this.moduleName.padEnd(20);

        let formattedMessage = `${timestamp} [${levelUpper}] ${module} - ${message}`;

        if (args.length > 0) {
            formattedMessage += ' ' + args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
        }

        return formattedMessage;
    }

    /**
     * Log de debug
     */
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message, ...args));
        }
    }

    /**
     * Log de información
     */
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message, ...args));
        }
    }

    /**
     * Log de advertencia
     */
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, ...args));
        }
    }

    /**
     * Log de error
     */
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, ...args));
        }
    }

    /**
     * Log condicional
     */
    log(level, message, ...args) {
        switch (level) {
            case 'debug':
                this.debug(message, ...args);
                break;
            case 'info':
                this.info(message, ...args);
                break;
            case 'warn':
                this.warn(message, ...args);
                break;
            case 'error':
                this.error(message, ...args);
                break;
            default:
                this.info(message, ...args);
        }
    }
}