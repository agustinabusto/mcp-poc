import { EventEmitter } from 'events';
import { LoggerService } from './logger-service.js';

export class AlertManager extends EventEmitter {
  constructor(database, notificationManager) {
    super();
    this.database = database;
    this.notificationManager = notificationManager;
    this.logger = LoggerService.createLogger('AlertManager');
    
    // Configuración de alertas
    this.config = {
      maxAlertsPerCuit: 10,
      alertExpirationDays: 30,
      escalationLevels: 3,
      escalationDelayMinutes: 60
    };
    
    // Cache de alertas activas
    this.activeAlerts = new Map();
    
    // Estado de escalación
    this.escalationTimers = new Map();
  }

  /**
   * Crea una nueva alerta de compliance
   */
  async createAlert(alertData) {
    try {
      this.logger.info(`Creando alerta para ${alertData.cuit}`, {
        type: alertData.type,
        severity: alertData.severity
      });

      // Validar datos de entrada
      this.validateAlertData(alertData);

      // Verificar si ya existe una alerta similar activa
      const existingAlert = await this.findSimilarActiveAlert(alertData);
      if (existingAlert) {
        this.logger.debug(`Alerta similar ya existe para ${alertData.cuit}, actualizando`);
        return await this.updateExistingAlert(existingAlert.id, alertData);
      }

      // Crear nueva alerta
      const alertId = await this.insertAlert(alertData);
      
      // Actualizar cache
      this.activeAlerts.set(alertId, {
        ...alertData,
        id: alertId,
        created_at: new Date().toISOString()
      });

      // Procesar notificaciones
      await this.processNotifications(alertId, alertData);

      // Configurar escalación si es necesario
      if (alertData.severity === 'high' || alertData.severity === 'critical') {
        this.scheduleEscalation(alertId, alertData);
      }

      // Emitir evento
      this.emit('alertCreated', {
        id: alertId,
        ...alertData
      });

      this.logger.info(`Alerta creada exitosamente: ${alertId}`);
      
      return {
        id: alertId,
        success: true,
        ...alertData
      };

    } catch (error) {
      this.logger.error('Error creando alerta:', error);
      throw error;
    }
  }

  /**
   * Valida los datos de la alerta
   */
  validateAlertData(alertData) {
    const required = ['cuit', 'alert_type', 'severity', 'message'];
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    
    for (const field of required) {
      if (!alertData[field]) {
        throw new Error(`Campo requerido faltante: ${field}`);
      }
    }

    if (!validSeverities.includes(alertData.severity)) {
      throw new Error(`Severidad inválida: ${alertData.severity}`);
    }

    // Validar CUIT format
    if (!/^\d{2}-\d{8}-\d{1}$/.test(alertData.cuit)) {
      throw new Error(`Formato de CUIT inválido: ${alertData.cuit}`);
    }
  }

  /**
   * Busca una alerta similar activa
   */
  async findSimilarActiveAlert(alertData) {
    try {
      const result = await this.database.get(`
        SELECT id, severity, created_at 
        FROM compliance_alerts 
        WHERE cuit = ? 
        AND alert_type = ? 
        AND acknowledged = 0 
        AND resolved = 0
        AND created_at >= datetime('now', '-24 hours')
        ORDER BY created_at DESC 
        LIMIT 1
      `, [alertData.cuit, alertData.alert_type]);

      return result;
    } catch (error) {
      this.logger.error('Error buscando alertas similares:', error);
      return null;
    }
  }

  /**
   * Actualiza una alerta existente
   */
  async updateExistingAlert(alertId, newData) {
    try {
      await this.database.run(`
        UPDATE compliance_alerts 
        SET message = ?, 
            details = ?,
            severity = ?,
            confidence_level = ?,
            created_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        newData.message,
        JSON.stringify(newData.details || {}),
        newData.severity,
        newData.confidence_level || 0.0,
        alertId
      ]);

      // Actualizar cache
      this.activeAlerts.set(alertId, {
        ...newData,
        id: alertId,
        created_at: new Date().toISOString()
      });

      this.emit('alertUpdated', { id: alertId, ...newData });
      
      return { id: alertId, success: true, action: 'updated' };
      
    } catch (error) {
      this.logger.error(`Error actualizando alerta ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Inserta nueva alerta en la base de datos
   */
  async insertAlert(alertData) {
    try {
      const result = await this.database.run(`
        INSERT INTO compliance_alerts (
          cuit, alert_type, severity, message, predicted_date,
          confidence_level, details, action_required, escalation_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        alertData.cuit,
        alertData.alert_type,
        alertData.severity,
        alertData.message,
        alertData.predicted_date || null,
        alertData.confidence_level || 0.0,
        JSON.stringify(alertData.details || {}),
        alertData.action_required || null,
        0 // escalation_level inicial
      ]);

      return result.lastID;
      
    } catch (error) {
      this.logger.error('Error insertando alerta en BD:', error);
      throw error;
    }
  }

  /**
   * Procesa las notificaciones para una alerta
   */
  async processNotifications(alertId, alertData) {
    try {
      // Verificar configuración de notificaciones para el CUIT
      const notificationConfig = await this.getNotificationConfig(alertData.cuit);
      
      if (!notificationConfig) {
        this.logger.debug(`No hay configuración de notificaciones para ${alertData.cuit}`);
        return;
      }

      // Determinar qué notificaciones enviar basado en severidad
      const shouldNotify = this.shouldSendNotification(alertData.severity, notificationConfig);
      
      if (shouldNotify.email && this.notificationManager) {
        await this.notificationManager.sendEmailAlert(alertData, notificationConfig);
      }

      if (shouldNotify.websocket) {
        this.emit('websocketAlert', {
          id: alertId,
          ...alertData,
          timestamp: new Date().toISOString()
        });
      }

      if (shouldNotify.sms && this.notificationManager) {
        await this.notificationManager.sendSMSAlert(alertData, notificationConfig);
      }

    } catch (error) {
      this.logger.error(`Error procesando notificaciones para alerta ${alertId}:`, error);
    }
  }

  /**
   * Obtiene configuración de notificaciones
   */
  async getNotificationConfig(cuit) {
    try {
      const config = await this.database.get(`
        SELECT * FROM notification_settings 
        WHERE cuit = ? OR (cuit IS NULL AND user_id IS NOT NULL)
        ORDER BY cuit IS NULL ASC
        LIMIT 1
      `, [cuit]);

      return config;
    } catch (error) {
      this.logger.error(`Error obteniendo configuración de notificaciones para ${cuit}:`, error);
      return null;
    }
  }

  /**
   * Determina si debe enviar notificación basado en severidad
   */
  shouldSendNotification(severity, config) {
    return {
      email: config.email_enabled && (
        (severity === 'critical' && config.critical_alerts) ||
        (severity === 'high' && config.high_alerts) ||
        (severity === 'medium' && config.medium_alerts) ||
        (severity === 'low' && config.low_alerts)
      ),
      websocket: config.websocket_enabled && (
        severity === 'critical' || severity === 'high'
      ),
      sms: config.sms_enabled && severity === 'critical'
    };
  }

  /**
   * Programa escalación para alertas críticas
   */
  scheduleEscalation(alertId, alertData) {
    if (this.escalationTimers.has(alertId)) {
      clearTimeout(this.escalationTimers.get(alertId));
    }

    const escalationDelay = this.config.escalationDelayMinutes * 60 * 1000; // a milisegundos

    const timer = setTimeout(async () => {
      await this.escalateAlert(alertId, alertData);
    }, escalationDelay);

    this.escalationTimers.set(alertId, timer);

    this.logger.debug(`Escalación programada para alerta ${alertId} en ${this.config.escalationDelayMinutes} minutos`);
  }

  /**
   * Escala una alerta
   */
  async escalateAlert(alertId, alertData) {
    try {
      // Verificar si la alerta sigue activa
      const alert = await this.database.get(`
        SELECT escalation_level, acknowledged, resolved 
        FROM compliance_alerts 
        WHERE id = ?
      `, [alertId]);

      if (!alert || alert.acknowledged || alert.resolved) {
        this.logger.debug(`Alerta ${alertId} ya fue resuelta, cancelando escalación`);
        return;
      }

      if (alert.escalation_level >= this.config.escalationLevels) {
        this.logger.warn(`Alerta ${alertId} alcanzó máximo nivel de escalación`);
        return;
      }

      const newEscalationLevel = alert.escalation_level + 1;

      // Actualizar nivel de escalación
      await this.database.run(`
        UPDATE compliance_alerts 
        SET escalation_level = ? 
        WHERE id = ?
      `, [newEscalationLevel, alertId]);

      // Enviar notificaciones de escalación
      await this.sendEscalationNotifications(alertId, alertData, newEscalationLevel);

      // Programar siguiente escalación si no es el último nivel
      if (newEscalationLevel < this.config.escalationLevels) {
        this.scheduleEscalation(alertId, alertData);
      }

      this.emit('alertEscalated', {
        id: alertId,
        escalationLevel: newEscalationLevel,
        ...alertData
      });

      this.logger.info(`Alerta ${alertId} escalada al nivel ${newEscalationLevel}`);

    } catch (error) {
      this.logger.error(`Error escalando alerta ${alertId}:`, error);
    }
  }

  /**
   * Envía notificaciones de escalación
   */
  async sendEscalationNotifications(alertId, alertData, escalationLevel) {
    try {
      const config = await this.getNotificationConfig(alertData.cuit);
      if (!config || !config.escalation_emails) {
        return;
      }

      const escalationEmails = JSON.parse(config.escalation_emails);
      const emailLevel = escalationLevel - 1; // Array indexado desde 0

      if (escalationEmails[emailLevel] && this.notificationManager) {
        await this.notificationManager.sendEscalationEmail(
          alertData, 
          escalationEmails[emailLevel], 
          escalationLevel
        );
      }

    } catch (error) {
      this.logger.error(`Error enviando notificaciones de escalación:`, error);
    }
  }

  /**
   * Marca una alerta como reconocida
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    try {
      await this.database.run(`
        UPDATE compliance_alerts 
        SET acknowledged = 1, 
            acknowledged_at = CURRENT_TIMESTAMP,
            acknowledged_by = ?
        WHERE id = ?
      `, [acknowledgedBy, alertId]);

      // Cancelar escalación
      if (this.escalationTimers.has(alertId)) {
        clearTimeout(this.escalationTimers.get(alertId));
        this.escalationTimers.delete(alertId);
      }

      // Actualizar cache
      const cachedAlert = this.activeAlerts.get(alertId);
      if (cachedAlert) {
        cachedAlert.acknowledged = true;
        cachedAlert.acknowledged_by = acknowledgedBy;
        cachedAlert.acknowledged_at = new Date().toISOString();
      }

      this.emit('alertAcknowledged', {
        id: alertId,
        acknowledgedBy,
        timestamp: new Date().toISOString()
      });

      this.logger.info(`Alerta ${alertId} reconocida por ${acknowledgedBy}`);
      
      return { success: true, alertId, acknowledgedBy };

    } catch (error) {
      this.logger.error(`Error reconociendo alerta ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Marca una alerta como resuelta
   */
  async resolveAlert(alertId, resolvedBy, resolution = null) {
    try {
      await this.database.run(`
        UPDATE compliance_alerts 
        SET resolved = 1, 
            resolved_at = CURRENT_TIMESTAMP,
            resolved_by = ?,
            details = json_patch(details, ?)
        WHERE id = ?
      `, [
        resolvedBy, 
        JSON.stringify({ resolution: resolution || 'Resuelta manualmente' }), 
        alertId
      ]);

      // Cancelar escalación
      if (this.escalationTimers.has(alertId)) {
        clearTimeout(this.escalationTimers.get(alertId));
        this.escalationTimers.delete(alertId);
      }

      // Remover del cache de alertas activas
      this.activeAlerts.delete(alertId);

      this.emit('alertResolved', {
        id: alertId,
        resolvedBy,
        resolution,
        timestamp: new Date().toISOString()
      });

      this.logger.info(`Alerta ${alertId} resuelta por ${resolvedBy}`);
      
      return { success: true, alertId, resolvedBy, resolution };

    } catch (error) {
      this.logger.error(`Error resolviendo alerta ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene alertas activas
   */
  async getActiveAlerts(filters = {}) {
    try {
      let query = `
        SELECT ca.*, c.business_name 
        FROM compliance_alerts ca
        LEFT JOIN contributors c ON ca.cuit = c.cuit
        WHERE ca.acknowledged = 0 AND ca.resolved = 0
      `;
      const params = [];

      if (filters.cuit) {
        query += ' AND ca.cuit = ?';
        params.push(filters.cuit);
      }

      if (filters.severity) {
        query += ' AND ca.severity = ?';
        params.push(filters.severity);
      }

      if (filters.alert_type) {
        query += ' AND ca.alert_type = ?';
        params.push(filters.alert_type);
      }

      query += ' ORDER BY ca.severity DESC, ca.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const alerts = await this.database.all(query, params);
      
      return alerts.map(alert => ({
        ...alert,
        details: this.safeJSONParse(alert.details)
      }));

    } catch (error) {
      this.logger.error('Error obteniendo alertas activas:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de alertas
   */
  async getAlertStats(days = 7) {
    try {
      const stats = await this.database.get(`
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_alerts,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_alerts,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_alerts,
          COUNT(CASE WHEN acknowledged = 1 THEN 1 END) as acknowledged_alerts,
          COUNT(CASE WHEN resolved = 1 THEN 1 END) as resolved_alerts,
          AVG(
            CASE WHEN resolved = 1 THEN 
              (julianday(resolved_at) - julianday(created_at)) * 24 * 60 
            END
          ) as avg_resolution_time_minutes
        FROM compliance_alerts 
        WHERE created_at >= datetime('now', '-${days} days')
      `);

      return {
        ...stats,
        active_alerts: stats.total_alerts - stats.resolved_alerts,
        resolution_rate: stats.total_alerts > 0 ? 
          (stats.resolved_alerts / stats.total_alerts * 100).toFixed(2) : 0,
        acknowledgment_rate: stats.total_alerts > 0 ? 
          (stats.acknowledged_alerts / stats.total_alerts * 100).toFixed(2) : 0
      };

    } catch (error) {
      this.logger.error('Error obteniendo estadísticas de alertas:', error);
      throw error;
    }
  }

  /**
   * Limpia alertas antiguas
   */
  async cleanupOldAlerts() {
    try {
      const result = await this.database.run(`
        DELETE FROM compliance_alerts 
        WHERE resolved = 1 
        AND resolved_at < datetime('now', '-${this.config.alertExpirationDays} days')
      `);

      this.logger.info(`Limpiadas ${result.changes} alertas antiguas`);
      
      return result.changes;

    } catch (error) {
      this.logger.error('Error limpiando alertas antiguas:', error);
      throw error;
    }
  }

  /**
   * Parse JSON seguro
   */
  safeJSONParse(jsonString) {
    try {
      return JSON.parse(jsonString || '{}');
    } catch (error) {
      return {};
    }
  }

  /**
   * Obtiene métricas del alert manager
   */
  getMetrics() {
    return {
      activeAlerts: this.activeAlerts.size,
      escalationTimers: this.escalationTimers.size,
      config: this.config
    };
  }

  /**
   * Destructor para limpiar timers
   */
  destroy() {
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();
    this.activeAlerts.clear();
  }
}

