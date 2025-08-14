-- ==============================================
-- COMPLIANCE MONITORING MODULE - SQLite Schema
-- Epic 3: Sistema de Monitoreo de Compliance & Alertas Predictivas
-- Compatible con el esquema existente de AFIP Monitor
-- ==============================================

-- Tabla principal de monitoreo de compliance
CREATE TABLE IF NOT EXISTS compliance_monitoring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuit TEXT NOT NULL,
    status TEXT DEFAULT 'unknown' CHECK(status IN ('excellent', 'good', 'fair', 'poor', 'error', 'unknown')),
    risk_score DECIMAL(5,2) DEFAULT 0.00,
    last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_check TIMESTAMP,
    
    -- Configuración de polling inteligente
    polling_interval INTEGER DEFAULT 360, -- en minutos, por defecto 6 horas
    polling_priority TEXT DEFAULT 'low' CHECK(polling_priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices únicos
    UNIQUE(cuit)
);

-- Índices para compliance_monitoring
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_cuit ON compliance_monitoring(cuit);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_status ON compliance_monitoring(status);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_risk_score ON compliance_monitoring(risk_score);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_next_check ON compliance_monitoring(next_check);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_polling_priority ON compliance_monitoring(polling_priority);

-- Tabla de alertas de compliance
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuit TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK(alert_type IN (
        'missing_vat_declarations',
        'missing_income_tax_declarations', 
        'late_tax_returns',
        'fiscal_inactive',
        'vat_not_registered',
        'compliance_degradation',
        'high_risk_detected',
        'deadline_approaching',
        'custom'
    )),
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    
    -- Datos de predicción
    predicted_date TIMESTAMP,
    confidence_level DECIMAL(3,2) DEFAULT 0.00, -- 0.00 a 1.00
    
    -- Estado de la alerta
    acknowledged BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    acknowledged_by TEXT,
    resolved_by TEXT,
    
    -- Datos adicionales
    details TEXT, -- JSON con información adicional
    action_required TEXT,
    escalation_level INTEGER DEFAULT 0
);

-- Índices para compliance_alerts
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_cuit ON compliance_alerts(cuit);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_type ON compliance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity ON compliance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_acknowledged ON compliance_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_resolved ON compliance_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_predicted_date ON compliance_alerts(predicted_date);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_created_at ON compliance_alerts(created_at);

-- Tabla de factores de riesgo
CREATE TABLE IF NOT EXISTS risk_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuit TEXT NOT NULL,
    factor_type TEXT NOT NULL CHECK(factor_type IN (
        'historical_compliance',
        'current_afip_status',
        'predictive_patterns',
        'deadline_proximity',
        'declaration_frequency',
        'correction_history',
        'industry_risk',
        'custom'
    )),
    factor_value TEXT NOT NULL, -- JSON con el valor del factor
    weight DECIMAL(3,2) NOT NULL, -- peso del factor en el cálculo (0.00 a 1.00)
    
    -- Vigencia del factor
    expires_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Cálculo automático
    auto_calculated BOOLEAN DEFAULT TRUE,
    calculation_source TEXT -- 'ml_engine', 'rule_based', 'manual'
);

-- Índices para risk_factors
CREATE INDEX IF NOT EXISTS idx_risk_factors_cuit ON risk_factors(cuit);
CREATE INDEX IF NOT EXISTS idx_risk_factors_type ON risk_factors(factor_type);
CREATE INDEX IF NOT EXISTS idx_risk_factors_expires_at ON risk_factors(expires_at);
CREATE INDEX IF NOT EXISTS idx_risk_factors_weight ON risk_factors(weight);
CREATE INDEX IF NOT EXISTS idx_risk_factors_created_at ON risk_factors(created_at);

-- Tabla de resultados detallados de compliance
CREATE TABLE IF NOT EXISTS compliance_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuit TEXT NOT NULL,
    check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Período de verificación
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    
    -- Resultados generales
    overall_status TEXT NOT NULL CHECK(overall_status IN ('excellent', 'good', 'fair', 'poor', 'error')),
    score INTEGER DEFAULT 0, -- 0 a 100
    
    -- Datos completos del resultado
    data TEXT NOT NULL, -- JSON con el resultado completo del check
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER, -- tiempo de ejecución en milisegundos
    
    -- Referencias
    triggered_by TEXT, -- 'scheduled', 'manual', 'alert', 'api'
    user_id TEXT -- si fue manual
);

-- Índices para compliance_results
CREATE INDEX IF NOT EXISTS idx_compliance_results_cuit ON compliance_results(cuit);
CREATE INDEX IF NOT EXISTS idx_compliance_results_check_date ON compliance_results(check_date);
CREATE INDEX IF NOT EXISTS idx_compliance_results_status ON compliance_results(overall_status);
CREATE INDEX IF NOT EXISTS idx_compliance_results_score ON compliance_results(score);
CREATE INDEX IF NOT EXISTS idx_compliance_results_period ON compliance_results(period_from, period_to);

-- Tabla de configuración de monitoreo por CUIT
CREATE TABLE IF NOT EXISTS compliance_monitoring_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuit TEXT UNIQUE NOT NULL,
    
    -- Configuración de monitoreo
    enabled BOOLEAN DEFAULT TRUE,
    auto_polling BOOLEAN DEFAULT TRUE,
    custom_interval INTEGER, -- en minutos, NULL usa el calculado automáticamente
    
    -- Configuración de alertas
    email_notifications BOOLEAN DEFAULT TRUE,
    websocket_notifications BOOLEAN DEFAULT TRUE,
    escalation_enabled BOOLEAN DEFAULT TRUE,
    
    -- Configuración específica
    notification_email TEXT,
    threshold_high_risk DECIMAL(3,2) DEFAULT 0.70,
    threshold_critical_risk DECIMAL(3,2) DEFAULT 0.85,
    
    -- Configuración de ML
    ml_predictions_enabled BOOLEAN DEFAULT TRUE,
    prediction_horizon_days INTEGER DEFAULT 72, -- días hacia adelante para predicciones
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    configured_by TEXT
);

-- Índices para compliance_monitoring_config
CREATE INDEX IF NOT EXISTS idx_compliance_config_cuit ON compliance_monitoring_config(cuit);
CREATE INDEX IF NOT EXISTS idx_compliance_config_enabled ON compliance_monitoring_config(enabled);

-- Tabla de métricas de compliance agregadas
CREATE TABLE IF NOT EXISTS compliance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    
    -- Métricas generales
    total_monitored INTEGER DEFAULT 0,
    total_active INTEGER DEFAULT 0,
    
    -- Métricas por estado
    excellent_count INTEGER DEFAULT 0,
    good_count INTEGER DEFAULT 0,
    fair_count INTEGER DEFAULT 0,
    poor_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    -- Métricas de riesgo
    low_risk_count INTEGER DEFAULT 0,
    medium_risk_count INTEGER DEFAULT 0,
    high_risk_count INTEGER DEFAULT 0,
    critical_risk_count INTEGER DEFAULT 0,
    avg_risk_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Métricas de alertas
    total_alerts INTEGER DEFAULT 0,
    critical_alerts INTEGER DEFAULT 0,
    high_alerts INTEGER DEFAULT 0,
    medium_alerts INTEGER DEFAULT 0,
    low_alerts INTEGER DEFAULT 0,
    acknowledged_alerts INTEGER DEFAULT 0,
    resolved_alerts INTEGER DEFAULT 0,
    
    -- Métricas de performance
    total_checks INTEGER DEFAULT 0,
    successful_checks INTEGER DEFAULT 0,
    failed_checks INTEGER DEFAULT 0,
    avg_response_time_ms DECIMAL(8,2) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para compliance_metrics
CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_metrics_date ON compliance_metrics(date);
CREATE INDEX IF NOT EXISTS idx_compliance_metrics_created_at ON compliance_metrics(created_at);

-- Tabla de logs de polling inteligente
CREATE TABLE IF NOT EXISTS polling_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuit TEXT NOT NULL,
    
    -- Información del polling
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status TEXT CHECK(status IN ('started', 'completed', 'failed', 'timeout')),
    
    -- Configuración usada
    interval_used INTEGER, -- minutos
    priority_level TEXT,
    
    -- Resultados
    changes_detected BOOLEAN DEFAULT FALSE,
    risk_score_before DECIMAL(5,2),
    risk_score_after DECIMAL(5,2),
    alerts_generated INTEGER DEFAULT 0,
    
    -- Performance
    execution_time_ms INTEGER,
    afip_requests_made INTEGER DEFAULT 0,
    
    -- Errores
    error_message TEXT,
    error_code TEXT,
    
    -- Próximo polling
    next_scheduled TIMESTAMP
);

-- Índices para polling_logs
CREATE INDEX IF NOT EXISTS idx_polling_logs_cuit ON polling_logs(cuit);
CREATE INDEX IF NOT EXISTS idx_polling_logs_started_at ON polling_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_polling_logs_status ON polling_logs(status);
CREATE INDEX IF NOT EXISTS idx_polling_logs_next_scheduled ON polling_logs(next_scheduled);

-- Tabla de configuración de notificaciones
CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuit TEXT,
    user_id TEXT,
    
    -- Configuración por canal
    email_enabled BOOLEAN DEFAULT TRUE,
    websocket_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    
    -- Configuración por tipo de alerta
    critical_alerts BOOLEAN DEFAULT TRUE,
    high_alerts BOOLEAN DEFAULT TRUE,
    medium_alerts BOOLEAN DEFAULT FALSE,
    low_alerts BOOLEAN DEFAULT FALSE,
    
    -- Configuración de horarios
    notification_hours_start TIME DEFAULT '08:00',
    notification_hours_end TIME DEFAULT '18:00',
    weekend_notifications BOOLEAN DEFAULT FALSE,
    
    -- Configuración de escalación
    escalation_minutes INTEGER DEFAULT 60, -- tiempo antes de escalar
    max_escalation_level INTEGER DEFAULT 3,
    
    -- Contactos
    primary_email TEXT,
    escalation_emails TEXT, -- JSON array
    phone_numbers TEXT, -- JSON array
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Restricciones
    CONSTRAINT unique_cuit_user UNIQUE(cuit, user_id)
);

-- Índices para notification_settings
CREATE INDEX IF NOT EXISTS idx_notification_settings_cuit ON notification_settings(cuit);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- ==============================================
-- TRIGGERS para mantener datos sincronizados
-- ==============================================

-- Trigger para actualizar updated_at en compliance_monitoring
CREATE TRIGGER IF NOT EXISTS update_compliance_monitoring_updated_at
AFTER UPDATE ON compliance_monitoring
FOR EACH ROW
BEGIN
    UPDATE compliance_monitoring 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en compliance_monitoring_config
CREATE TRIGGER IF NOT EXISTS update_compliance_config_updated_at
AFTER UPDATE ON compliance_monitoring_config
FOR EACH ROW
BEGIN
    UPDATE compliance_monitoring_config 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger para crear configuración por defecto al agregar monitoreo
CREATE TRIGGER IF NOT EXISTS create_default_monitoring_config
AFTER INSERT ON compliance_monitoring
FOR EACH ROW
BEGIN
    INSERT OR IGNORE INTO compliance_monitoring_config (cuit)
    VALUES (NEW.cuit);
END;

-- Trigger para actualizar métricas cuando cambia el estado de compliance
CREATE TRIGGER IF NOT EXISTS update_compliance_metrics_on_change
AFTER UPDATE OF status, risk_score ON compliance_monitoring
FOR EACH ROW
BEGIN
    -- Actualizar o crear entrada de métricas para hoy
    INSERT OR IGNORE INTO compliance_metrics (date) VALUES (date('now'));
    
    -- Recalcular métricas del día
    UPDATE compliance_metrics SET
        total_monitored = (
            SELECT COUNT(*) FROM compliance_monitoring 
            WHERE last_check >= date('now')
        ),
        excellent_count = (
            SELECT COUNT(*) FROM compliance_monitoring 
            WHERE status = 'excellent' AND last_check >= date('now')
        ),
        good_count = (
            SELECT COUNT(*) FROM compliance_monitoring 
            WHERE status = 'good' AND last_check >= date('now')
        ),
        fair_count = (
            SELECT COUNT(*) FROM compliance_monitoring 
            WHERE status = 'fair' AND last_check >= date('now')
        ),
        poor_count = (
            SELECT COUNT(*) FROM compliance_monitoring 
            WHERE status = 'poor' AND last_check >= date('now')
        ),
        avg_risk_score = (
            SELECT COALESCE(AVG(risk_score), 0) FROM compliance_monitoring 
            WHERE last_check >= date('now')
        )
    WHERE date = date('now');
END;

-- Trigger para crear alerta automática cuando el riesgo sube
CREATE TRIGGER IF NOT EXISTS create_high_risk_alert
AFTER UPDATE OF risk_score ON compliance_monitoring
FOR EACH ROW
WHEN NEW.risk_score > 0.70 AND (OLD.risk_score <= 0.70 OR OLD.risk_score IS NULL)
BEGIN
    INSERT INTO compliance_alerts (
        cuit,
        alert_type,
        severity,
        message,
        details,
        action_required
    ) VALUES (
        NEW.cuit,
        'high_risk_detected',
        CASE 
            WHEN NEW.risk_score >= 0.85 THEN 'critical'
            WHEN NEW.risk_score >= 0.70 THEN 'high'
            ELSE 'medium'
        END,
        'Incremento significativo en el riesgo de compliance detectado',
        json_object(
            'previous_risk_score', OLD.risk_score,
            'new_risk_score', NEW.risk_score,
            'increase', NEW.risk_score - COALESCE(OLD.risk_score, 0),
            'threshold_exceeded', CASE WHEN NEW.risk_score >= 0.85 THEN 'critical' ELSE 'high' END
        ),
        'Revisar estado de compliance y tomar acciones correctivas'
    );
END;

-- ==============================================
-- VISTAS para reportes y dashboards
-- ==============================================

-- Vista de resumen de compliance en tiempo real
CREATE VIEW IF NOT EXISTS v_compliance_dashboard AS
SELECT 
    cm.cuit,
    cm.status,
    cm.risk_score,
    cm.last_check,
    cm.next_check,
    cm.polling_priority,
    
    -- Alertas activas
    COUNT(ca.id) as active_alerts,
    COUNT(CASE WHEN ca.severity = 'critical' THEN 1 END) as critical_alerts,
    COUNT(CASE WHEN ca.severity = 'high' THEN 1 END) as high_alerts,
    
    -- Información del contribuyente (si existe en la tabla contributors)
    c.business_name,
    c.category,
    c.compliance_status as legacy_status,
    
    -- Configuración
    config.enabled as monitoring_enabled,
    config.email_notifications,
    config.escalation_enabled
    
FROM compliance_monitoring cm
LEFT JOIN compliance_alerts ca ON cm.cuit = ca.cuit 
    AND ca.acknowledged = 0 AND ca.resolved = 0
LEFT JOIN contributors c ON cm.cuit = c.cuit 
    AND c.deleted_at IS NULL
LEFT JOIN compliance_monitoring_config config ON cm.cuit = config.cuit
GROUP BY cm.id, cm.cuit, cm.status, cm.risk_score, cm.last_check, 
         cm.next_check, cm.polling_priority, c.business_name, 
         c.category, c.compliance_status, config.enabled, 
         config.email_notifications, config.escalation_enabled
ORDER BY cm.risk_score DESC, cm.last_check ASC;

-- Vista de tendencias de compliance
CREATE VIEW IF NOT EXISTS v_compliance_trends AS
SELECT 
    date,
    total_monitored,
    excellent_count,
    good_count,
    fair_count,
    poor_count,
    ROUND((CAST(excellent_count + good_count AS REAL) / total_monitored) * 100, 2) as compliance_rate,
    avg_risk_score,
    total_alerts,
    critical_alerts
FROM compliance_metrics
WHERE date >= date('now', '-30 days')
ORDER BY date DESC;

-- Vista de alertas pendientes por severidad
CREATE VIEW IF NOT EXISTS v_pending_alerts AS
SELECT 
    severity,
    alert_type,
    COUNT(*) as count,
    MIN(created_at) as oldest_alert,
    MAX(created_at) as newest_alert,
    AVG(julianday('now') - julianday(created_at)) as avg_age_days
FROM compliance_alerts
WHERE acknowledged = 0 AND resolved = 0
GROUP BY severity, alert_type
ORDER BY 
    CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
    END,
    count DESC;

-- Vista de performance del sistema de polling
CREATE VIEW IF NOT EXISTS v_polling_performance AS
SELECT 
    date(started_at) as date,
    COUNT(*) as total_polls,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_polls,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_polls,
    COUNT(CASE WHEN changes_detected = 1 THEN 1 END) as polls_with_changes,
    AVG(execution_time_ms) as avg_execution_time_ms,
    SUM(alerts_generated) as total_alerts_generated,
    SUM(afip_requests_made) as total_afip_requests
FROM polling_logs
WHERE started_at >= datetime('now', '-7 days')
GROUP BY date(started_at)
ORDER BY date DESC;

-- ==============================================
-- DATOS INICIALES
-- ==============================================

-- Insertar métricas iniciales para hoy
INSERT OR IGNORE INTO compliance_metrics (date) VALUES (date('now'));

-- Insertar configuración por defecto para contribuyentes existentes
INSERT OR IGNORE INTO compliance_monitoring_config (cuit, enabled, auto_polling) 
SELECT DISTINCT cuit, 1, 1 
FROM contributors 
WHERE deleted_at IS NULL 
AND cuit NOT IN (SELECT cuit FROM compliance_monitoring_config);

-- Insertar registros de monitoreo para contribuyentes existentes
INSERT OR IGNORE INTO compliance_monitoring (cuit, status, risk_score) 
SELECT DISTINCT cuit, 'unknown', 0.00 
FROM contributors 
WHERE deleted_at IS NULL 
AND cuit NOT IN (SELECT cuit FROM compliance_monitoring);