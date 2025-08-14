import { EventEmitter } from 'events';
import cron from 'node-cron';
import { LoggerService } from './logger-service.js';

export class ComplianceMonitor extends EventEmitter {
    constructor(database, afipClient, riskScoringEngine, alertManager) {
        super();
        this.database = database;
        this.afipClient = afipClient;
        this.riskScoringEngine = riskScoringEngine;
        this.alertManager = alertManager;
        this.logger = LoggerService.createLogger('ComplianceMonitor');
        
        // Estado del monitoreo
        this.isRunning = false;
        this.pollingJobs = new Map(); // CUIT -> job info
        this.circuitBreaker = {
            failures: 0,
            lastFailure: null,
            isOpen: false,
            threshold: 5,
            timeout: 300000 // 5 minutos
        };
        
        // Cache Redis-like en memoria (en producción usar Redis real)
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutos default
        
        // Métricas
        this.metrics = {
            totalChecks: 0,
            successfulChecks: 0,
            failedChecks: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageResponseTime: 0
        };
    }

    /**
     * Inicia el sistema de monitoreo
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('Compliance monitor ya está en ejecución');
            return;
        }

        this.logger.info('Iniciando sistema de monitoreo de compliance');
        this.isRunning = true;

        try {
            // Cargar configuración de monitoreo
            await this.loadMonitoringConfig();
            
            // Programar jobs de polling inteligente
            await this.scheduleIntelligentPolling();
            
            // Programar limpieza de cache
            this.scheduleCacheCleanup();
            
            // Programar actualización de métricas
            this.scheduleMetricsUpdate();
            
            this.emit('started');
            this.logger.info('Sistema de monitoreo iniciado exitosamente');
            
        } catch (error) {
            this.logger.error('Error iniciando monitoreo:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Detiene el sistema de monitoreo
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        this.logger.info('Deteniendo sistema de monitoreo');
        this.isRunning = false;

        // Cancelar todos los jobs
        for (const [cuit, jobInfo] of this.pollingJobs) {
            if (jobInfo.cronJob) {
                jobInfo.cronJob.destroy();
            }
        }
        
        this.pollingJobs.clear();
        this.emit('stopped');
        this.logger.info('Sistema de monitoreo detenido');
    }

    /**
     * Carga la configuración de monitoreo desde la base de datos
     */
    async loadMonitoringConfig() {
        try {
            const configs = await this.database.all(`
                SELECT cm.cuit, cm.status, cm.risk_score, cm.last_check, 
                       cm.next_check, cm.polling_interval, cm.polling_priority,
                       config.enabled, config.auto_polling, config.custom_interval
                FROM compliance_monitoring cm
                LEFT JOIN compliance_monitoring_config config ON cm.cuit = config.cuit
                WHERE config.enabled = 1 AND config.auto_polling = 1
            `);

            this.logger.info(`Cargadas ${configs.length} configuraciones de monitoreo`);
            return configs;
            
        } catch (error) {
            this.logger.error('Error cargando configuración de monitoreo:', error);
            throw error;
        }
    }

    /**
     * Programa polling inteligente basado en risk score
     */
    async scheduleIntelligentPolling() {
        const configs = await this.loadMonitoringConfig();
        
        for (const config of configs) {
            await this.schedulePollingForCuit(config);
        }
        
        this.logger.info(`Programado polling para ${configs.length} CUITs`);
    }

    /**
     * Programa polling para un CUIT específico
     */
    async schedulePollingForCuit(config) {
        const { cuit, risk_score, custom_interval } = config;
        
        // Calcular intervalo basado en risk score o usar custom
        const interval = custom_interval || this.calculatePollingInterval(risk_score);
        
        // Convertir a expresión cron
        const cronExpression = this.intervalToCron(interval);
        
        // Cancelar job existente si existe
        if (this.pollingJobs.has(cuit)) {
            const existing = this.pollingJobs.get(cuit);
            if (existing.cronJob) {
                existing.cronJob.destroy();
            }
        }
        
        // Crear nuevo job
        const cronJob = cron.schedule(cronExpression, async () => {
            await this.performComplianceCheck(cuit, 'scheduled');
        }, {
            scheduled: true,
            timezone: 'America/Argentina/Buenos_Aires'
        });
        
        // Guardar información del job
        this.pollingJobs.set(cuit, {
            cronJob,
            interval,
            cronExpression,
            lastRun: null,
            nextRun: cronJob.nextDate()
        });
        
        this.logger.debug(`Programado polling para ${cuit}: ${cronExpression} (${interval} min)`);
    }

    /**
     * Calcula intervalo de polling basado en risk score
     */
    calculatePollingInterval(riskScore) {
        if (riskScore >= 0.85) return 15;  // Critical: cada 15 minutos
        if (riskScore >= 0.70) return 60;  // High: cada hora  
        if (riskScore >= 0.40) return 360; // Medium: cada 6 horas
        return 1440; // Low: cada 24 horas
    }

    /**
     * Convierte minutos a expresión cron
     */
    intervalToCron(intervalMinutes) {
        if (intervalMinutes <= 60) {
            // Sub-horario: cada X minutos
            return `*/${intervalMinutes} * * * *`;
        } else if (intervalMinutes <= 1440) {
            // Horario: cada X horas
            const hours = Math.floor(intervalMinutes / 60);
            return `0 */${hours} * * *`;
        } else {
            // Diario o más: cada X días
            const days = Math.floor(intervalMinutes / 1440);
            return `0 8 */${days} * *`; // A las 8 AM cada X días
        }
    }

    /**
     * Realiza verificación de compliance para un CUIT
     */
    async performComplianceCheck(cuit, triggeredBy = 'scheduled') {
        const startTime = Date.now();
        
        // Verificar circuit breaker
        if (this.isCircuitBreakerOpen()) {
            this.logger.warn(`Circuit breaker abierto, saltando check para ${cuit}`);
            return null;
        }

        try {
            // Log inicio de polling
            const pollId = await this.logPollingStart(cuit, triggeredBy);
            
            this.logger.info(`Iniciando verificación de compliance para ${cuit}`, { triggeredBy });
            
            // Verificar cache primero
            const cacheKey = `compliance_${cuit}`;
            const cached = this.getFromCache(cacheKey);
            
            if (cached && this.isCacheValid(cached)) {
                this.metrics.cacheHits++;
                this.logger.debug(`Cache hit para ${cuit}`);
                return cached.data;
            }
            
            this.metrics.cacheMisses++;
            
            // Obtener datos actuales del contribuyente
            const currentData = await this.getCurrentComplianceData(cuit);
            
            // Calcular nuevo risk score
            const riskScore = await this.riskScoringEngine.calculateRiskScore(cuit, currentData);
            
            // Detectar cambios significativos
            const previousData = await this.getPreviousComplianceData(cuit);
            const changesDetected = this.detectSignificantChanges(previousData, currentData, riskScore);
            
            // Actualizar base de datos
            await this.updateComplianceMonitoring(cuit, {
                status: this.determineStatus(riskScore),
                risk_score: riskScore,
                last_check: new Date().toISOString(),
                next_check: this.calculateNextCheck(riskScore)
            });
            
            // Guardar en cache
            this.setCache(cacheKey, {
                data: currentData,
                riskScore,
                timestamp: Date.now()
            });
            
            // Generar alertas si es necesario
            let alertsGenerated = 0;
            if (changesDetected.length > 0) {
                alertsGenerated = await this.processDetectedChanges(cuit, changesDetected, riskScore);
            }
            
            // Reajustar polling si cambió el risk score significativamente
            await this.adjustPollingIfNeeded(cuit, riskScore);
            
            // Log completado
            const executionTime = Date.now() - startTime;
            await this.logPollingCompleted(pollId, {
                changes_detected: changesDetected.length > 0,
                risk_score_after: riskScore,
                alerts_generated: alertsGenerated,
                execution_time_ms: executionTime
            });
            
            // Actualizar métricas
            this.updateMetrics(true, executionTime);
            
            // Reset circuit breaker en éxito
            this.resetCircuitBreaker();
            
            this.logger.info(`Compliance check completado para ${cuit}`, {
                riskScore,
                changesDetected: changesDetected.length,
                alertsGenerated,
                executionTime
            });
            
            // Emitir evento
            this.emit('complianceChecked', {
                cuit,
                riskScore,
                status: this.determineStatus(riskScore),
                changesDetected,
                alertsGenerated,
                triggeredBy
            });
            
            return {
                cuit,
                riskScore,
                status: this.determineStatus(riskScore),
                changesDetected,
                alertsGenerated,
                executionTime
            };
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            this.logger.error(`Error en compliance check para ${cuit}:`, error);
            
            // Actualizar circuit breaker
            this.recordCircuitBreakerFailure();
            
            // Actualizar métricas
            this.updateMetrics(false, executionTime);
            
            // Log error
            await this.logPollingError(cuit, error);
            
            throw error;
        }
    }

    /**
     * Obtiene datos actuales de compliance desde AFIP
     */
    async getCurrentComplianceData(cuit) {
        const data = {
            cuit,
            timestamp: new Date().toISOString(),
            checks: {}
        };

        try {
            // Verificaciones en paralelo para optimizar performance
            const checks = await Promise.allSettled([
                this.afipClient.getFiscalStatus(cuit),
                this.afipClient.getVATRegistration(cuit),
                this.afipClient.getTaxpayerInfo(cuit)
            ]);

            // Procesar resultados
            if (checks[0].status === 'fulfilled') {
                data.checks.fiscal_status = checks[0].value;
            }
            if (checks[1].status === 'fulfilled') {
                data.checks.vat_registration = checks[1].value;
            }
            if (checks[2].status === 'fulfilled') {
                data.checks.taxpayer_info = checks[2].value;
            }

            return data;
            
        } catch (error) {
            this.logger.error(`Error obteniendo datos de compliance para ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Obtiene datos previos de compliance
     */
    async getPreviousComplianceData(cuit) {
        try {
            const result = await this.database.get(`
                SELECT * FROM compliance_results 
                WHERE cuit = ? 
                ORDER BY check_date DESC 
                LIMIT 1
            `, [cuit]);

            return result ? JSON.parse(result.data) : null;
            
        } catch (error) {
            this.logger.error(`Error obteniendo datos previos para ${cuit}:`, error);
            return null;
        }
    }

    /**
     * Detecta cambios significativos en compliance
     */
    detectSignificantChanges(previousData, currentData, currentRiskScore) {
        const changes = [];

        if (!previousData) {
            changes.push({
                type: 'first_check',
                description: 'Primera verificación de compliance',
                severity: 'info'
            });
            return changes;
        }

        // Comparar cambios en status fiscal
        if (previousData.checks?.fiscal_status?.active !== currentData.checks?.fiscal_status?.active) {
            changes.push({
                type: 'fiscal_status_change',
                description: `Estado fiscal cambió de ${previousData.checks.fiscal_status?.active} a ${currentData.checks.fiscal_status?.active}`,
                severity: currentData.checks.fiscal_status?.active ? 'medium' : 'high',
                previous: previousData.checks.fiscal_status?.active,
                current: currentData.checks.fiscal_status?.active
            });
        }

        // Comparar cambios en IVA
        if (previousData.checks?.vat_registration?.registered !== currentData.checks?.vat_registration?.registered) {
            changes.push({
                type: 'vat_registration_change',
                description: `Registro de IVA cambió`,
                severity: 'medium',
                previous: previousData.checks.vat_registration?.registered,
                current: currentData.checks.vat_registration?.registered
            });
        }

        return changes;
    }

    /**
     * Procesa cambios detectados y genera alertas
     */
    async processDetectedChanges(cuit, changes, riskScore) {
        let alertsGenerated = 0;

        for (const change of changes) {
            if (change.severity === 'high' || change.severity === 'critical') {
                await this.alertManager.createAlert({
                    cuit,
                    type: change.type,
                    severity: change.severity,
                    message: change.description,
                    details: change,
                    source: 'compliance_monitor',
                    risk_score: riskScore
                });
                alertsGenerated++;
            }
        }

        return alertsGenerated;
    }

    /**
     * Determina status basado en risk score
     */
    determineStatus(riskScore) {
        if (riskScore >= 0.90) return 'excellent';
        if (riskScore >= 0.75) return 'good';
        if (riskScore >= 0.60) return 'fair';
        return 'poor';
    }

    /**
     * Calcula próximo check basado en risk score
     */
    calculateNextCheck(riskScore) {
        const interval = this.calculatePollingInterval(riskScore);
        const nextCheck = new Date();
        nextCheck.setMinutes(nextCheck.getMinutes() + interval);
        return nextCheck.toISOString();
    }

    /**
     * Actualiza datos de monitoreo en BD
     */
    async updateComplianceMonitoring(cuit, data) {
        try {
            await this.database.run(`
                UPDATE compliance_monitoring 
                SET status = ?, risk_score = ?, last_check = ?, next_check = ?, updated_at = CURRENT_TIMESTAMP
                WHERE cuit = ?
            `, [data.status, data.risk_score, data.last_check, data.next_check, cuit]);
            
        } catch (error) {
            this.logger.error(`Error actualizando compliance monitoring para ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Reajusta polling si el risk score cambió significativamente
     */
    async adjustPollingIfNeeded(cuit, newRiskScore) {
        const currentJob = this.pollingJobs.get(cuit);
        if (!currentJob) return;

        const newInterval = this.calculatePollingInterval(newRiskScore);
        
        // Si el intervalo cambió significativamente, reprogramar
        if (Math.abs(newInterval - currentJob.interval) > 30) { // 30 minutos de diferencia
            this.logger.info(`Reajustando polling para ${cuit}: ${currentJob.interval}min -> ${newInterval}min`);
            
            await this.schedulePollingForCuit({
                cuit,
                risk_score: newRiskScore,
                custom_interval: null
            });
        }
    }

    // ============ MÉTODOS DE CACHE ============

    getFromCache(key) {
        return this.cache.get(key);
    }

    setCache(key, data, ttl = this.cacheTimeout) {
        this.cache.set(key, {
            ...data,
            expires: Date.now() + ttl
        });
    }

    isCacheValid(cached) {
        return cached && cached.expires > Date.now();
    }

    clearCache() {
        this.cache.clear();
    }

    scheduleCacheCleanup() {
        // Limpiar cache expirado cada 5 minutos
        cron.schedule('*/5 * * * *', () => {
            let cleared = 0;
            const now = Date.now();
            
            for (const [key, value] of this.cache.entries()) {
                if (value.expires <= now) {
                    this.cache.delete(key);
                    cleared++;
                }
            }
            
            if (cleared > 0) {
                this.logger.debug(`Limpiadas ${cleared} entradas de cache expiradas`);
            }
        });
    }

    // ============ CIRCUIT BREAKER ============

    isCircuitBreakerOpen() {
        if (!this.circuitBreaker.isOpen) return false;
        
        // Verificar si es tiempo de intentar de nuevo
        const timeSinceFailure = Date.now() - this.circuitBreaker.lastFailure;
        if (timeSinceFailure > this.circuitBreaker.timeout) {
            this.logger.info('Circuit breaker: intentando reconexión');
            this.circuitBreaker.isOpen = false;
            return false;
        }
        
        return true;
    }

    recordCircuitBreakerFailure() {
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();
        
        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
            this.circuitBreaker.isOpen = true;
            this.logger.warn(`Circuit breaker abierto después de ${this.circuitBreaker.failures} fallos`);
        }
    }

    resetCircuitBreaker() {
        if (this.circuitBreaker.failures > 0) {
            this.circuitBreaker.failures = 0;
            this.circuitBreaker.isOpen = false;
            this.logger.debug('Circuit breaker reset');
        }
    }

    // ============ LOGGING Y MÉTRICAS ============

    async logPollingStart(cuit, triggeredBy) {
        try {
            const result = await this.database.run(`
                INSERT INTO polling_logs (cuit, started_at, status, interval_used, priority_level)
                VALUES (?, CURRENT_TIMESTAMP, 'started', ?, ?)
            `, [cuit, this.calculatePollingInterval(0), 'medium']);
            
            return result.lastID;
        } catch (error) {
            this.logger.error('Error logging polling start:', error);
            return null;
        }
    }

    async logPollingCompleted(pollId, data) {
        if (!pollId) return;
        
        try {
            await this.database.run(`
                UPDATE polling_logs 
                SET completed_at = CURRENT_TIMESTAMP, status = 'completed',
                    changes_detected = ?, risk_score_after = ?, alerts_generated = ?,
                    execution_time_ms = ?
                WHERE id = ?
            `, [
                data.changes_detected ? 1 : 0,
                data.risk_score_after,
                data.alerts_generated,
                data.execution_time_ms,
                pollId
            ]);
        } catch (error) {
            this.logger.error('Error logging polling completed:', error);
        }
    }

    async logPollingError(cuit, error) {
        try {
            await this.database.run(`
                INSERT INTO polling_logs (cuit, started_at, completed_at, status, error_message)
                VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'failed', ?)
            `, [cuit, error.message]);
        } catch (dbError) {
            this.logger.error('Error logging polling error:', dbError);
        }
    }

    updateMetrics(success, executionTime) {
        this.metrics.totalChecks++;
        if (success) {
            this.metrics.successfulChecks++;
        } else {
            this.metrics.failedChecks++;
        }
        
        // Calcular promedio móvil del tiempo de respuesta
        this.metrics.averageResponseTime = 
            (this.metrics.averageResponseTime * (this.metrics.totalChecks - 1) + executionTime) / 
            this.metrics.totalChecks;
    }

    scheduleMetricsUpdate() {
        // Actualizar métricas diarias cada hora
        cron.schedule('0 * * * *', async () => {
            await this.updateDailyMetrics();
        });
    }

    async updateDailyMetrics() {
        try {
            // Obtener estadísticas del día
            const stats = await this.database.get(`
                SELECT 
                    COUNT(*) as total_checks,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_checks,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_checks,
                    AVG(execution_time_ms) as avg_response_time
                FROM polling_logs 
                WHERE date(started_at) = date('now')
            `);

            await this.database.run(`
                INSERT OR REPLACE INTO compliance_metrics (
                    date, total_checks, successful_checks, failed_checks, avg_response_time_ms
                ) VALUES (date('now'), ?, ?, ?, ?)
            `, [
                stats.total_checks || 0,
                stats.successful_checks || 0, 
                stats.failed_checks || 0,
                stats.avg_response_time || 0
            ]);

        } catch (error) {
            this.logger.error('Error actualizando métricas diarias:', error);
        }
    }

    /**
     * Obtiene métricas actuales del sistema
     */
    getMetrics() {
        return {
            ...this.metrics,
            pollingJobs: this.pollingJobs.size,
            cacheSize: this.cache.size,
            circuitBreakerStatus: {
                isOpen: this.circuitBreaker.isOpen,
                failures: this.circuitBreaker.failures
            },
            isRunning: this.isRunning
        };
    }

    /**
     * Verifica compliance manualmente para un CUIT
     */
    async checkComplianceManual(cuit) {
        this.logger.info(`Verificación manual solicitada para ${cuit}`);
        return await this.performComplianceCheck(cuit, 'manual');
    }

    /**
     * Configura monitoreo para un nuevo CUIT
     */
    async addCuitMonitoring(cuit, config = {}) {
        try {
            // Insertar en compliance_monitoring
            await this.database.run(`
                INSERT OR REPLACE INTO compliance_monitoring (cuit, status, risk_score)
                VALUES (?, 'unknown', 0.00)
            `, [cuit]);

            // Insertar configuración
            await this.database.run(`
                INSERT OR REPLACE INTO compliance_monitoring_config (
                    cuit, enabled, auto_polling, custom_interval,
                    email_notifications, escalation_enabled
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                cuit,
                config.enabled !== undefined ? config.enabled : true,
                config.auto_polling !== undefined ? config.auto_polling : true,
                config.custom_interval || null,
                config.email_notifications !== undefined ? config.email_notifications : true,
                config.escalation_enabled !== undefined ? config.escalation_enabled : true
            ]);

            // Programar polling si está habilitado
            if (config.enabled !== false && config.auto_polling !== false) {
                await this.schedulePollingForCuit({
                    cuit,
                    risk_score: 0.00,
                    custom_interval: config.custom_interval
                });
            }

            this.logger.info(`Configurado monitoreo para ${cuit}`);
            
        } catch (error) {
            this.logger.error(`Error configurando monitoreo para ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Remueve monitoreo para un CUIT
     */
    async removeCuitMonitoring(cuit) {
        try {
            // Cancelar job si existe
            if (this.pollingJobs.has(cuit)) {
                const job = this.pollingJobs.get(cuit);
                if (job.cronJob) {
                    job.cronJob.destroy();
                }
                this.pollingJobs.delete(cuit);
            }

            // Deshabilitar en BD (no eliminar para mantener historial)
            await this.database.run(`
                UPDATE compliance_monitoring_config 
                SET enabled = 0, auto_polling = 0 
                WHERE cuit = ?
            `, [cuit]);

            this.logger.info(`Deshabilitado monitoreo para ${cuit}`);
            
        } catch (error) {
            this.logger.error(`Error removiendo monitoreo para ${cuit}:`, error);
            throw error;
        }
    }
}