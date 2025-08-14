import { LoggerService } from './logger-service.js';
import { EventEmitter } from 'events';

export class EscalationEngine extends EventEmitter {
    constructor(database, alertManager, emailService) {
        super();
        this.database = database;
        this.alertManager = alertManager;
        this.emailService = emailService;
        this.logger = LoggerService.createLogger('EscalationEngine');
        
        // Configuración de escalación
        this.config = {
            maxEscalationLevels: 3,
            escalationIntervals: [
                60,   // Nivel 1: 1 hora
                180,  // Nivel 2: 3 horas  
                360   // Nivel 3: 6 horas
            ],
            criticalAlertTimeout: 30, // 30 minutos para alertas críticas
            highAlertTimeout: 120,    // 2 horas para alertas altas
            workingHours: {
                start: 8,  // 8 AM
                end: 18    // 6 PM
            },
            workingDays: [1, 2, 3, 4, 5] // Lunes a viernes
        };
        
        // Estado de escalaciones activas
        this.activeEscalations = new Map();
        this.escalationTimers = new Map();
    }

    /**
     * Inicia el motor de escalación
     */
    async start() {
        try {
            this.logger.info('Iniciando motor de escalación');
            
            // Cargar escalaciones pendientes desde la base de datos
            await this.loadPendingEscalations();
            
            // Configurar limpieza periódica
            this.scheduleCleanup();
            
            this.emit('started');
            this.logger.info('Motor de escalación iniciado exitosamente');
            
        } catch (error) {
            this.logger.error('Error iniciando motor de escalación:', error);
            throw error;
        }
    }

    /**
     * Detiene el motor de escalación
     */
    stop() {
        this.logger.info('Deteniendo motor de escalación');
        
        // Cancelar todos los timers
        for (const timer of this.escalationTimers.values()) {
            clearTimeout(timer);
        }
        
        this.escalationTimers.clear();
        this.activeEscalations.clear();
        
        this.emit('stopped');
        this.logger.info('Motor de escalación detenido');
    }

    /**
     * Programa escalación para una alerta
     */
    async scheduleEscalation(alertId, alertData) {
        try {
            // Verificar si ya existe escalación para esta alerta
            if (this.activeEscalations.has(alertId)) {
                this.logger.debug(`Escalación ya programada para alerta ${alertId}`);
                return;
            }

            // Determinar tiempo de escalación basado en severidad
            const escalationDelay = this.calculateEscalationDelay(alertData);
            
            if (escalationDelay === null) {
                this.logger.debug(`No se requiere escalación para alerta ${alertId} (severidad: ${alertData.severity})`);
                return;
            }

            // Ajustar por horario laboral si es necesario
            const adjustedDelay = this.adjustForWorkingHours(escalationDelay);
            
            // Programar escalación
            const timer = setTimeout(async () => {
                await this.executeEscalation(alertId, alertData);
            }, adjustedDelay);

            // Guardar información de escalación
            const escalationInfo = {
                alertId,
                alertData,
                level: 1,
                scheduledAt: new Date(),
                nextEscalationAt: new Date(Date.now() + adjustedDelay),
                timer
            };

            this.activeEscalations.set(alertId, escalationInfo);
            this.escalationTimers.set(alertId, timer);

            // Guardar en base de datos
            await this.saveEscalationState(alertId, escalationInfo);

            this.logger.info(`Escalación programada para alerta ${alertId}`, {
                severity: alertData.severity,
                delayMinutes: adjustedDelay / (1000 * 60),
                nextEscalation: escalationInfo.nextEscalationAt
            });

        } catch (error) {
            this.logger.error(`Error programando escalación para alerta ${alertId}:`, error);
        }
    }

    /**
     * Ejecuta una escalación
     */
    async executeEscalation(alertId, alertData) {
        try {
            // Verificar si la alerta sigue activa
            const alert = await this.database.get(`
                SELECT * FROM compliance_alerts 
                WHERE id = ? AND acknowledged = 0 AND resolved = 0
            `, [alertId]);

            if (!alert) {
                this.logger.debug(`Alerta ${alertId} ya fue resuelta, cancelando escalación`);
                this.cancelEscalation(alertId);
                return;
            }

            const escalationInfo = this.activeEscalations.get(alertId);
            if (!escalationInfo) {
                this.logger.warn(`No se encontró información de escalación para alerta ${alertId}`);
                return;
            }

            const currentLevel = escalationInfo.level;
            
            // Verificar si hemos alcanzado el máximo nivel
            if (currentLevel >= this.config.maxEscalationLevels) {
                this.logger.warn(`Alerta ${alertId} alcanzó máximo nivel de escalación`);
                await this.handleMaxEscalationReached(alertId, alertData);
                return;
            }

            // Incrementar nivel de escalación
            const newLevel = currentLevel + 1;
            
            // Actualizar en base de datos
            await this.database.run(`
                UPDATE compliance_alerts 
                SET escalation_level = ? 
                WHERE id = ?
            `, [newLevel, alertId]);

            // Enviar notificaciones de escalación
            await this.sendEscalationNotifications(alertId, alertData, newLevel);

            // Actualizar información de escalación
            escalationInfo.level = newLevel;
            escalationInfo.lastEscalatedAt = new Date();

            // Programar siguiente escalación si no es el último nivel
            if (newLevel < this.config.maxEscalationLevels) {
                const nextDelay = this.config.escalationIntervals[newLevel - 1] * 60 * 1000;
                const adjustedDelay = this.adjustForWorkingHours(nextDelay);
                
                const nextTimer = setTimeout(async () => {
                    await this.executeEscalation(alertId, alertData);
                }, adjustedDelay);

                escalationInfo.timer = nextTimer;
                escalationInfo.nextEscalationAt = new Date(Date.now() + adjustedDelay);
                
                this.escalationTimers.set(alertId, nextTimer);
            } else {
                // Es el último nivel, marcar como completado
                this.escalationTimers.delete(alertId);
            }

            // Actualizar en base de datos
            await this.saveEscalationState(alertId, escalationInfo);

            // Emitir evento
            this.emit('escalationExecuted', {
                alertId,
                level: newLevel,
                alertData
            });

            this.logger.info(`Escalación ejecutada para alerta ${alertId}`, {
                level: newLevel,
                maxLevel: this.config.maxEscalationLevels
            });

        } catch (error) {
            this.logger.error(`Error ejecutando escalación para alerta ${alertId}:`, error);
        }
    }

    /**
     * Calcula el delay de escalación basado en severidad
     */
    calculateEscalationDelay(alertData) {
        switch (alertData.severity) {
            case 'critical':
                return this.config.criticalAlertTimeout * 60 * 1000; // 30 min
            case 'high':
                return this.config.highAlertTimeout * 60 * 1000; // 2 horas
            case 'medium':
                return this.config.escalationIntervals[0] * 60 * 1000; // 1 hora
            case 'low':
                return null; // No escalar alertas de baja prioridad
            default:
                return null;
        }
    }

    /**
     * Ajusta el delay por horario laboral
     */
    adjustForWorkingHours(originalDelay) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const hour = now.getHours();
        
        // Si estamos en horario laboral y día laboral, usar delay original
        if (this.config.workingDays.includes(dayOfWeek) && 
            hour >= this.config.workingHours.start && 
            hour < this.config.workingHours.end) {
            return originalDelay;
        }
        
        // Si estamos fuera de horario, calcular tiempo hasta próximo horario laboral
        const nextWorkingTime = this.calculateNextWorkingTime(now);
        const timeToNextWorking = nextWorkingTime.getTime() - now.getTime();
        
        // Si el delay original nos lleva dentro del horario laboral, usarlo
        if (timeToNextWorking < originalDelay) {
            return originalDelay;
        }
        
        // Si no, escalar al inicio del próximo horario laboral + delay mínimo
        return timeToNextWorking + (30 * 60 * 1000); // +30 min del inicio del horario
    }

    /**
     * Calcula la próxima hora laboral
     */
    calculateNextWorkingTime(fromDate) {
        const next = new Date(fromDate);
        
        // Si es fin de semana, ir al próximo lunes
        if (next.getDay() === 0) { // Domingo
            next.setDate(next.getDate() + 1);
        } else if (next.getDay() === 6) { // Sábado
            next.setDate(next.getDate() + 2);
        }
        
        // Si estamos en día laboral pero fuera de horario
        if (this.config.workingDays.includes(next.getDay())) {
            if (next.getHours() < this.config.workingHours.start) {
                // Antes del horario, ir al inicio del día
                next.setHours(this.config.workingHours.start, 0, 0, 0);
            } else if (next.getHours() >= this.config.workingHours.end) {
                // Después del horario, ir al próximo día laboral
                next.setDate(next.getDate() + 1);
                next.setHours(this.config.workingHours.start, 0, 0, 0);
            }
        }
        
        return next;
    }

    /**
     * Envía notificaciones de escalación
     */
    async sendEscalationNotifications(alertId, alertData, level) {
        try {
            // Obtener configuración de escalación
            const config = await this.database.get(`
                SELECT escalation_emails, escalation_enabled 
                FROM notification_settings 
                WHERE cuit = ? AND escalation_enabled = 1
            `, [alertData.cuit]);

            if (!config || !config.escalation_emails) {
                this.logger.debug(`No hay configuración de escalación para ${alertData.cuit}`);
                return;
            }

            const escalationEmails = JSON.parse(config.escalation_emails);
            const emailIndex = level - 1;

            if (escalationEmails[emailIndex]) {
                // Enviar email de escalación
                if (this.emailService) {
                    await this.emailService.sendEscalationEmail(
                        alertData,
                        escalationEmails[emailIndex],
                        level
                    );
                }

                // Emitir evento para notificaciones WebSocket
                this.emit('escalationNotification', {
                    alertId,
                    level,
                    recipient: escalationEmails[emailIndex],
                    alertData
                });
            }

        } catch (error) {
            this.logger.error(`Error enviando notificaciones de escalación:`, error);
        }
    }

    /**
     * Maneja cuando se alcanza el máximo nivel de escalación
     */
    async handleMaxEscalationReached(alertId, alertData) {
        try {
            this.logger.warn(`Alerta ${alertId} alcanzó máximo nivel de escalación sin resolución`);

            // Crear ticket crítico o notificación especial
            await this.createCriticalTicket(alertId, alertData);

            // Emitir evento crítico
            this.emit('maxEscalationReached', {
                alertId,
                alertData,
                timestamp: new Date()
            });

            // Limpiar escalación
            this.cancelEscalation(alertId);

        } catch (error) {
            this.logger.error(`Error manejando máximo nivel de escalación:`, error);
        }
    }

    /**
     * Crea un ticket crítico para alertas no resueltas
     */
    async createCriticalTicket(alertId, alertData) {
        try {
            // En un sistema real, esto crearía un ticket en el sistema de soporte
            await this.database.run(`
                INSERT INTO critical_tickets (
                    alert_id, cuit, alert_type, severity, message,
                    escalation_failed_at, status, created_at
                ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'open', CURRENT_TIMESTAMP)
            `, [
                alertId,
                alertData.cuit,
                alertData.alert_type,
                'critical',
                `ESCALACIÓN FALLIDA: ${alertData.message}`
            ]);

            this.logger.info(`Ticket crítico creado para alerta ${alertId}`);

        } catch (error) {
            this.logger.error(`Error creando ticket crítico:`, error);
        }
    }

    /**
     * Cancela la escalación de una alerta
     */
    cancelEscalation(alertId) {
        try {
            // Cancelar timer si existe
            if (this.escalationTimers.has(alertId)) {
                clearTimeout(this.escalationTimers.get(alertId));
                this.escalationTimers.delete(alertId);
            }

            // Remover de escalaciones activas
            this.activeEscalations.delete(alertId);

            // Actualizar en base de datos
            this.removeEscalationState(alertId);

            this.logger.debug(`Escalación cancelada para alerta ${alertId}`);

        } catch (error) {
            this.logger.error(`Error cancelando escalación para alerta ${alertId}:`, error);
        }
    }

    /**
     * Guarda el estado de escalación en la base de datos
     */
    async saveEscalationState(alertId, escalationInfo) {
        try {
            await this.database.run(`
                INSERT OR REPLACE INTO escalation_state (
                    alert_id, level, scheduled_at, next_escalation_at, 
                    last_escalated_at, is_active
                ) VALUES (?, ?, ?, ?, ?, 1)
            `, [
                alertId,
                escalationInfo.level,
                escalationInfo.scheduledAt.toISOString(),
                escalationInfo.nextEscalationAt?.toISOString(),
                escalationInfo.lastEscalatedAt?.toISOString()
            ]);

        } catch (error) {
            // Si la tabla no existe, crearla
            if (error.message.includes('no such table')) {
                await this.createEscalationStateTable();
                // Reintentar
                await this.saveEscalationState(alertId, escalationInfo);
            } else {
                this.logger.error(`Error guardando estado de escalación:`, error);
            }
        }
    }

    /**
     * Crea la tabla de estado de escalación si no existe
     */
    async createEscalationStateTable() {
        try {
            await this.database.run(`
                CREATE TABLE IF NOT EXISTS escalation_state (
                    alert_id INTEGER PRIMARY KEY,
                    level INTEGER NOT NULL,
                    scheduled_at TIMESTAMP NOT NULL,
                    next_escalation_at TIMESTAMP,
                    last_escalated_at TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await this.database.run(`
                CREATE INDEX IF NOT EXISTS idx_escalation_state_active 
                ON escalation_state(is_active)
            `);

        } catch (error) {
            this.logger.error('Error creando tabla de estado de escalación:', error);
        }
    }

    /**
     * Remueve el estado de escalación de la base de datos
     */
    async removeEscalationState(alertId) {
        try {
            await this.database.run(`
                UPDATE escalation_state 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE alert_id = ?
            `, [alertId]);

        } catch (error) {
            this.logger.error(`Error removiendo estado de escalación:`, error);
        }
    }

    /**
     * Carga escalaciones pendientes desde la base de datos
     */
    async loadPendingEscalations() {
        try {
            const pendingEscalations = await this.database.all(`
                SELECT es.*, ca.cuit, ca.alert_type, ca.severity, ca.message
                FROM escalation_state es
                JOIN compliance_alerts ca ON es.alert_id = ca.id
                WHERE es.is_active = 1 
                AND ca.acknowledged = 0 
                AND ca.resolved = 0
            `);

            for (const escalation of pendingEscalations) {
                const alertData = {
                    cuit: escalation.cuit,
                    alert_type: escalation.alert_type,
                    severity: escalation.severity,
                    message: escalation.message
                };

                // Recalcular tiempo hasta próxima escalación
                const nextEscalationTime = new Date(escalation.next_escalation_at);
                const now = new Date();
                const timeToNext = nextEscalationTime.getTime() - now.getTime();

                if (timeToNext > 0) {
                    // Reprogramar escalación
                    const timer = setTimeout(async () => {
                        await this.executeEscalation(escalation.alert_id, alertData);
                    }, timeToNext);

                    const escalationInfo = {
                        alertId: escalation.alert_id,
                        alertData,
                        level: escalation.level,
                        scheduledAt: new Date(escalation.scheduled_at),
                        nextEscalationAt: nextEscalationTime,
                        lastEscalatedAt: escalation.last_escalated_at ? 
                            new Date(escalation.last_escalated_at) : null,
                        timer
                    };

                    this.activeEscalations.set(escalation.alert_id, escalationInfo);
                    this.escalationTimers.set(escalation.alert_id, timer);

                    this.logger.debug(`Escalación reprogramada para alerta ${escalation.alert_id}`);
                } else {
                    // Tiempo ya pasado, ejecutar inmediatamente
                    setImmediate(async () => {
                        await this.executeEscalation(escalation.alert_id, alertData);
                    });
                }
            }

            this.logger.info(`Cargadas ${pendingEscalations.length} escalaciones pendientes`);

        } catch (error) {
            this.logger.error('Error cargando escalaciones pendientes:', error);
        }
    }

    /**
     * Programa limpieza periódica
     */
    scheduleCleanup() {
        // Limpiar escalaciones completadas cada hora
        setInterval(async () => {
            await this.cleanupCompletedEscalations();
        }, 60 * 60 * 1000); // 1 hora
    }

    /**
     * Limpia escalaciones completadas
     */
    async cleanupCompletedEscalations() {
        try {
            const result = await this.database.run(`
                DELETE FROM escalation_state 
                WHERE is_active = 0 
                AND updated_at < datetime('now', '-7 days')
            `);

            if (result.changes > 0) {
                this.logger.info(`Limpiadas ${result.changes} escalaciones antiguas`);
            }

        } catch (error) {
            this.logger.error('Error limpiando escalaciones:', error);
        }
    }

    /**
     * Obtiene estadísticas de escalación
     */
    async getEscalationStats(days = 7) {
        try {
            const stats = await this.database.get(`
                SELECT 
                    COUNT(*) as total_escalations,
                    COUNT(CASE WHEN level = 1 THEN 1 END) as level_1_escalations,
                    COUNT(CASE WHEN level = 2 THEN 1 END) as level_2_escalations,
                    COUNT(CASE WHEN level = 3 THEN 1 END) as level_3_escalations,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_escalations,
                    AVG(level) as avg_escalation_level
                FROM escalation_state 
                WHERE created_at >= datetime('now', '-${days} days')
            `);

            return {
                ...stats,
                activeEscalationsInMemory: this.activeEscalations.size,
                activeTimers: this.escalationTimers.size
            };

        } catch (error) {
            this.logger.error('Error obteniendo estadísticas de escalación:', error);
            return null;
        }
    }

    /**
     * Obtiene métricas del motor de escalación
     */
    getMetrics() {
        return {
            activeEscalations: this.activeEscalations.size,
            activeTimers: this.escalationTimers.size,
            config: this.config
        };
    }
}