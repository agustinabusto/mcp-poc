-- ==============================================
-- CONTRIBUYENTES MODULE - SQLite Schema
-- Compatible con el esquema existente de AFIP Monitor
-- ==============================================

-- Crear tabla principal de contribuyentes (solo si no existe)
CREATE TABLE IF NOT EXISTS contributors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuit TEXT UNIQUE NOT NULL,
    business_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columnas solo si no existen (manejo de errores silencioso)
-- SQLite ADD COLUMN es seguro si la columna ya existe

-- Campos de contacto
ALTER TABLE contributors ADD COLUMN contact_email TEXT;
ALTER TABLE contributors ADD COLUMN contact_phone TEXT;
ALTER TABLE contributors ADD COLUMN email TEXT;
ALTER TABLE contributors ADD COLUMN phone TEXT;
ALTER TABLE contributors ADD COLUMN address TEXT;
ALTER TABLE contributors ADD COLUMN category TEXT;
ALTER TABLE contributors ADD COLUMN notes TEXT;

-- Estados y control
ALTER TABLE contributors ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE contributors ADD COLUMN risk_level TEXT DEFAULT 'medium';
ALTER TABLE contributors ADD COLUMN active INTEGER DEFAULT 1;
ALTER TABLE contributors ADD COLUMN compliance_status TEXT DEFAULT 'unknown';
ALTER TABLE contributors ADD COLUMN last_compliance_check DATETIME;
ALTER TABLE contributors ADD COLUMN deleted_at DATETIME;

-- Estados ARCA (nuevas columnas v4.1)
ALTER TABLE contributors ADD COLUMN arca_status TEXT DEFAULT 'unknown';
ALTER TABLE contributors ADD COLUMN iva_status TEXT;
ALTER TABLE contributors ADD COLUMN monotributo_status TEXT;
ALTER TABLE contributors ADD COLUMN ganancias_status TEXT;
ALTER TABLE contributors ADD COLUMN social_security_status TEXT;

-- Compliance avanzado (nuevas columnas v4.1)
ALTER TABLE contributors ADD COLUMN compliance_details TEXT;
ALTER TABLE contributors ADD COLUMN compliance_score REAL DEFAULT 0.0;

-- Timestamps de verificación (nuevos v4.1)
ALTER TABLE contributors ADD COLUMN last_arca_check DATETIME;
ALTER TABLE contributors ADD COLUMN last_iva_check DATETIME;
ALTER TABLE contributors ADD COLUMN last_monotributo_check DATETIME;
ALTER TABLE contributors ADD COLUMN last_ganancias_check DATETIME;
ALTER TABLE contributors ADD COLUMN last_social_security_check DATETIME;

-- Metadatos de importación (nuevos v4.1)
ALTER TABLE contributors ADD COLUMN import_source TEXT;
ALTER TABLE contributors ADD COLUMN import_batch_id TEXT;

-- Índices principales para contributors
CREATE INDEX IF NOT EXISTS idx_contributors_cuit ON contributors(cuit);
CREATE INDEX IF NOT EXISTS idx_contributors_business_name ON contributors(business_name);
CREATE INDEX IF NOT EXISTS idx_contributors_arca_status ON contributors(arca_status);
CREATE INDEX IF NOT EXISTS idx_contributors_compliance_status ON contributors(compliance_status);
CREATE INDEX IF NOT EXISTS idx_contributors_category ON contributors(category);
CREATE INDEX IF NOT EXISTS idx_contributors_created_at ON contributors(created_at);
CREATE INDEX IF NOT EXISTS idx_contributors_updated_at ON contributors(updated_at);
CREATE INDEX IF NOT EXISTS idx_contributors_deleted_at ON contributors(deleted_at);
CREATE INDEX IF NOT EXISTS idx_contributors_composite_search ON contributors(business_name, cuit);
CREATE INDEX IF NOT EXISTS idx_contributors_status_composite ON contributors(arca_status, compliance_status);

-- Tabla de facturas de clientes (relacionada con contributors)
CREATE TABLE IF NOT EXISTS client_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contributor_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_type TEXT NOT NULL CHECK(invoice_type IN ('A', 'B', 'C', 'M', 'E')),
    issue_date DATE NOT NULL,
    due_date DATE,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ARS' CHECK(currency IN ('ARS', 'USD', 'EUR')),
    exchange_rate REAL DEFAULT 1.0,
    
    -- Estados de procesamiento
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending', 'sent', 'approved', 'rejected', 'error')),
    arca_status TEXT CHECK(arca_status IN ('not_sent', 'processing', 'approved', 'rejected', 'error')),
    
    -- Datos ARCA
    cae TEXT,
    cae_due_date DATE,
    arca_response TEXT, -- JSON con respuesta completa de ARCA
    
    -- Contenido de la factura
    concept TEXT,
    items TEXT, -- JSON con ítems de la factura
    taxes TEXT, -- JSON con impuestos
    
    -- Metadatos
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_to_arca_at DATETIME,
    approved_at DATETIME,
    
    -- Errores
    error_message TEXT,
    error_code TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Relación con OCR si viene de procesamiento automático
    ocr_process_id TEXT,
    
    FOREIGN KEY (contributor_id) REFERENCES contributors(id) ON DELETE CASCADE
);

-- Índices para client_invoices
CREATE INDEX IF NOT EXISTS idx_client_invoices_contributor_id ON client_invoices(contributor_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_invoice_number ON client_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_client_invoices_status ON client_invoices(status);
CREATE INDEX IF NOT EXISTS idx_client_invoices_arca_status ON client_invoices(arca_status);
CREATE INDEX IF NOT EXISTS idx_client_invoices_issue_date ON client_invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_client_invoices_cae ON client_invoices(cae);
CREATE INDEX IF NOT EXISTS idx_client_invoices_created_at ON client_invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_client_invoices_composite_status ON client_invoices(contributor_id, status);
CREATE INDEX IF NOT EXISTS idx_client_invoices_date_range ON client_invoices(contributor_id, issue_date);

-- Tabla de histórico de compliance
CREATE TABLE IF NOT EXISTS compliance_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contributor_id INTEGER NOT NULL,
    check_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    check_type TEXT NOT NULL CHECK(check_type IN ('arca_general', 'iva', 'monotributo', 'ganancias', 'social_security', 'manual')),
    
    -- Estado anterior y nuevo
    previous_status TEXT,
    new_status TEXT,
    
    -- Detalles del cambio
    details TEXT, -- JSON con detalles específicos
    compliance_score REAL,
    
    -- Información de la verificación
    verification_method TEXT CHECK(verification_method IN ('automatic', 'manual', 'scheduled')),
    user_id TEXT, -- Si fue verificación manual
    
    -- Respuesta completa de ARCA si aplica
    arca_response TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contributor_id) REFERENCES contributors(id) ON DELETE CASCADE
);

-- Índices para compliance_history
CREATE INDEX IF NOT EXISTS idx_compliance_history_contributor_id ON compliance_history(contributor_id);
CREATE INDEX IF NOT EXISTS idx_compliance_history_check_date ON compliance_history(check_date);
CREATE INDEX IF NOT EXISTS idx_compliance_history_check_type ON compliance_history(check_type);
CREATE INDEX IF NOT EXISTS idx_compliance_history_new_status ON compliance_history(new_status);
CREATE INDEX IF NOT EXISTS idx_compliance_history_composite ON compliance_history(contributor_id, check_type, check_date);

-- Tabla de configuración de contribuyentes
CREATE TABLE IF NOT EXISTS contributor_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contributor_id INTEGER UNIQUE NOT NULL,
    
    -- Configuración de monitoreo
    auto_compliance_check INTEGER DEFAULT 1,
    compliance_check_frequency TEXT DEFAULT 'daily' CHECK(compliance_check_frequency IN ('manual', 'daily', 'weekly', 'monthly')),
    
    -- Configuración de notificaciones
    email_notifications INTEGER DEFAULT 1,
    notification_email TEXT,
    alert_on_status_change INTEGER DEFAULT 1,
    alert_on_compliance_issues INTEGER DEFAULT 1,
    
    -- Configuración específica de ARCA
    arca_auto_refresh INTEGER DEFAULT 1,
    arca_refresh_interval INTEGER DEFAULT 24, -- horas
    
    -- Configuración de facturación
    default_invoice_type TEXT DEFAULT 'B' CHECK(default_invoice_type IN ('A', 'B', 'C')),
    auto_send_to_arca INTEGER DEFAULT 0,
    
    -- Metadatos
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contributor_id) REFERENCES contributors(id) ON DELETE CASCADE
);

-- Índice para contributor_config
CREATE INDEX IF NOT EXISTS idx_contributor_config_contributor_id ON contributor_config(contributor_id);

-- Tabla de importaciones en lote
CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY, -- UUID
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT NOT NULL CHECK(file_type IN ('csv', 'excel')),
    
    -- Estado del procesamiento
    status TEXT DEFAULT 'processing' CHECK(status IN ('processing', 'completed', 'failed', 'cancelled')),
    
    -- Estadísticas
    total_records INTEGER DEFAULT 0,
    successful_imports INTEGER DEFAULT 0,
    failed_imports INTEGER DEFAULT 0,
    duplicate_cuits INTEGER DEFAULT 0,
    
    -- Logs
    processing_log TEXT, -- JSON con log detallado
    error_details TEXT, -- JSON con errores específicos
    
    -- Metadatos
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    user_id TEXT,
    
    -- Configuración de importación
    import_options TEXT -- JSON con opciones específicas
);

-- Índices para import_batches
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_started_at ON import_batches(started_at);
CREATE INDEX IF NOT EXISTS idx_import_batches_user_id ON import_batches(user_id);

-- Tabla de métricas de contribuyentes
CREATE TABLE IF NOT EXISTS contributor_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    
    -- Métricas generales
    total_contributors INTEGER DEFAULT 0,
    active_contributors INTEGER DEFAULT 0,
    new_contributors INTEGER DEFAULT 0,
    
    -- Métricas de compliance
    compliant_contributors INTEGER DEFAULT 0,
    non_compliant_contributors INTEGER DEFAULT 0,
    partial_compliance_contributors INTEGER DEFAULT 0,
    pending_contributors INTEGER DEFAULT 0,
    
    -- Métricas de ARCA
    green_status_contributors INTEGER DEFAULT 0,
    yellow_status_contributors INTEGER DEFAULT 0,
    red_status_contributors INTEGER DEFAULT 0,
    unknown_status_contributors INTEGER DEFAULT 0,
    
    -- Métricas de facturación
    total_invoices INTEGER DEFAULT 0,
    approved_invoices INTEGER DEFAULT 0,
    pending_invoices INTEGER DEFAULT 0,
    error_invoices INTEGER DEFAULT 0,
    total_invoice_amount REAL DEFAULT 0.0,
    
    -- Métricas de actividad
    arca_queries_today INTEGER DEFAULT 0,
    compliance_checks_today INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para contributor_metrics
CREATE UNIQUE INDEX IF NOT EXISTS idx_contributor_metrics_date ON contributor_metrics(date);
CREATE INDEX IF NOT EXISTS idx_contributor_metrics_created_at ON contributor_metrics(created_at);

-- Tabla de alertas de contribuyentes
CREATE TABLE IF NOT EXISTS contributor_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contributor_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL CHECK(alert_type IN ('compliance_change', 'arca_status_change', 'invoice_error', 'verification_failed', 'custom')),
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Contenido de la alerta
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT, -- JSON con detalles adicionales
    
    -- Estado de la alerta
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    
    -- Metadatos
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at DATETIME,
    resolved_at DATETIME,
    acknowledged_by TEXT,
    resolved_by TEXT,
    
    -- Referencia a datos relacionados
    reference_id TEXT, -- ID de factura, compliance_history, etc.
    reference_type TEXT, -- 'invoice', 'compliance_check', etc.
    
    FOREIGN KEY (contributor_id) REFERENCES contributors(id) ON DELETE CASCADE
);

-- Índices para contributor_alerts
CREATE INDEX IF NOT EXISTS idx_contributor_alerts_contributor_id ON contributor_alerts(contributor_id);
CREATE INDEX IF NOT EXISTS idx_contributor_alerts_alert_type ON contributor_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_contributor_alerts_severity ON contributor_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_contributor_alerts_status ON contributor_alerts(status);
CREATE INDEX IF NOT EXISTS idx_contributor_alerts_created_at ON contributor_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_contributor_alerts_composite ON contributor_alerts(contributor_id, status, severity);

-- ==============================================
-- TRIGGERS SQLite para mantener datos actualizados
-- ==============================================

-- Trigger para actualizar updated_at en contributors
CREATE TRIGGER IF NOT EXISTS update_contributors_updated_at
AFTER UPDATE ON contributors
FOR EACH ROW
BEGIN
    UPDATE contributors 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en client_invoices
CREATE TRIGGER IF NOT EXISTS update_client_invoices_updated_at
AFTER UPDATE ON client_invoices
FOR EACH ROW
BEGIN
    UPDATE client_invoices 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en contributor_config
CREATE TRIGGER IF NOT EXISTS update_contributor_config_updated_at
AFTER UPDATE ON contributor_config
FOR EACH ROW
BEGIN
    UPDATE contributor_config 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger para crear configuración por defecto al crear contribuyente
CREATE TRIGGER IF NOT EXISTS create_default_contributor_config
AFTER INSERT ON contributors
FOR EACH ROW
BEGIN
    INSERT INTO contributor_config (contributor_id)
    VALUES (NEW.id);
END;

-- Trigger para registrar cambios de compliance
CREATE TRIGGER IF NOT EXISTS log_compliance_changes
AFTER UPDATE OF compliance_status, arca_status ON contributors
FOR EACH ROW
WHEN NEW.compliance_status != OLD.compliance_status OR NEW.arca_status != OLD.arca_status
BEGIN
    INSERT INTO compliance_history (
        contributor_id,
        check_type,
        previous_status,
        new_status,
        verification_method,
        details
    ) VALUES (
        NEW.id,
        CASE 
            WHEN NEW.arca_status != OLD.arca_status THEN 'arca_general'
            ELSE 'manual'
        END,
        COALESCE(OLD.compliance_status, OLD.arca_status),
        COALESCE(NEW.compliance_status, NEW.arca_status),
        'automatic',
        json_object(
            'previous_compliance', OLD.compliance_status,
            'new_compliance', NEW.compliance_status,
            'previous_arca', OLD.arca_status,
            'new_arca', NEW.arca_status
        )
    );
END;

-- Trigger para crear alertas automáticas en cambios críticos
CREATE TRIGGER IF NOT EXISTS create_compliance_alerts
AFTER UPDATE OF compliance_status, arca_status ON contributors
FOR EACH ROW
WHEN (NEW.compliance_status = 'non_compliant' AND OLD.compliance_status != 'non_compliant')
   OR (NEW.arca_status = 'red' AND OLD.arca_status != 'red')
BEGIN
    INSERT INTO contributor_alerts (
        contributor_id,
        alert_type,
        severity,
        title,
        message,
        details
    ) VALUES (
        NEW.id,
        'compliance_change',
        'high',
        'Estado de compliance crítico',
        'El contribuyente ' || NEW.business_name || ' ha cambiado a estado crítico de compliance.',
        json_object(
            'previous_status', OLD.compliance_status,
            'new_status', NEW.compliance_status,
            'previous_arca', OLD.arca_status,
            'new_arca', NEW.arca_status,
            'cuit', NEW.cuit
        )
    );
END;

-- ==============================================
-- VISTAS ÚTILES PARA REPORTES
-- ==============================================

-- Vista de resumen de contribuyentes
CREATE VIEW IF NOT EXISTS v_contributors_summary AS
SELECT 
    c.id,
    c.cuit,
    c.business_name,
    c.category,
    c.arca_status,
    c.compliance_status,
    c.compliance_score,
    c.created_at,
    c.last_arca_check,
    
    -- Estadísticas de facturas
    COUNT(ci.id) as total_invoices,
    COUNT(CASE WHEN ci.status = 'approved' THEN 1 END) as approved_invoices,
    COUNT(CASE WHEN ci.status = 'pending' THEN 1 END) as pending_invoices,
    COUNT(CASE WHEN ci.status = 'error' THEN 1 END) as error_invoices,
    COALESCE(SUM(ci.amount), 0) as total_invoice_amount,
    MAX(ci.issue_date) as last_invoice_date,
    
    -- Alertas activas
    COUNT(ca.id) as active_alerts,
    COUNT(CASE WHEN ca.severity = 'critical' THEN 1 END) as critical_alerts
    
FROM contributors c
LEFT JOIN client_invoices ci ON c.id = ci.contributor_id 
    AND ci.issue_date >= date('now', '-1 year')
LEFT JOIN contributor_alerts ca ON c.id = ca.contributor_id 
    AND ca.status = 'active'
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.cuit, c.business_name, c.category, c.arca_status, c.compliance_status, c.compliance_score, c.created_at, c.last_arca_check;

-- Vista de métricas diarias
CREATE VIEW IF NOT EXISTS v_daily_contributor_metrics AS
SELECT 
    date,
    total_contributors,
    compliant_contributors,
    non_compliant_contributors,
    ROUND((CAST(compliant_contributors AS REAL) / total_contributors) * 100, 2) as compliance_rate,
    total_invoices,
    approved_invoices,
    ROUND((CAST(approved_invoices AS REAL) / total_invoices) * 100, 2) as approval_rate,
    total_invoice_amount
FROM contributor_metrics
WHERE date >= date('now', '-30 days')
ORDER BY date DESC;

-- Vista de alertas por severidad
CREATE VIEW IF NOT EXISTS v_alerts_by_severity AS
SELECT 
    severity,
    alert_type,
    COUNT(*) as alert_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
    MAX(created_at) as latest_alert
FROM contributor_alerts
WHERE created_at >= datetime('now', '-7 days')
GROUP BY severity, alert_type
ORDER BY 
    CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
    END,
    alert_count DESC;

-- Vista de compliance por categoría
CREATE VIEW IF NOT EXISTS v_compliance_by_category AS
SELECT 
    COALESCE(category, 'Sin categoría') as category,
    COUNT(*) as total_contributors,
    COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END) as compliant,
    COUNT(CASE WHEN compliance_status = 'non_compliant' THEN 1 END) as non_compliant,
    COUNT(CASE WHEN compliance_status = 'partial' THEN 1 END) as partial,
    COUNT(CASE WHEN compliance_status = 'pending' THEN 1 END) as pending,
    ROUND(AVG(compliance_score), 2) as avg_compliance_score
FROM contributors
WHERE deleted_at IS NULL
GROUP BY category
ORDER BY total_contributors DESC;

-- ==============================================
-- DATOS INICIALES Y CONFIGURACIÓN
-- ==============================================

-- Insertar métricas iniciales para hoy
INSERT OR IGNORE INTO contributor_metrics (date) VALUES (date('now'));

-- Insertar configuración por defecto para el sistema
INSERT OR IGNORE INTO contributor_config (contributor_id, auto_compliance_check, notification_email) 
SELECT id, 1, email 
FROM contributors 
WHERE id NOT IN (SELECT contributor_id FROM contributor_config);

-- ==============================================
-- FUNCIÓN DE MANTENIMIENTO (comentada para referencia)
-- ==============================================

/*
-- Esta función se puede ejecutar periódicamente para limpiar datos antiguos
-- y mantener métricas actualizadas

-- Limpiar compliance_history más antigua de 1 año
DELETE FROM compliance_history 
WHERE created_at < datetime('now', '-1 year');

-- Limpiar alertas resueltas más antiguas de 3 meses
DELETE FROM contributor_alerts 
WHERE status IN ('resolved', 'dismissed') 
  AND resolved_at < datetime('now', '-3 months');

-- Limpiar métricas más antiguas de 2 años
DELETE FROM contributor_metrics 
WHERE date < date('now', '-2 years');

-- Actualizar métricas del día actual
INSERT OR REPLACE INTO contributor_metrics (
    date,
    total_contributors,
    active_contributors,
    compliant_contributors,
    non_compliant_contributors,
    partial_compliance_contributors,
    pending_contributors,
    green_status_contributors,
    yellow_status_contributors,
    red_status_contributors,
    unknown_status_contributors
) 
SELECT 
    date('now'),
    COUNT(*),
    COUNT(CASE WHEN last_arca_check >= datetime('now', '-7 days') THEN 1 END),
    COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END),
    COUNT(CASE WHEN compliance_status = 'non_compliant' THEN 1 END),
    COUNT(CASE WHEN compliance_status = 'partial' THEN 1 END),
    COUNT(CASE WHEN compliance_status = 'pending' THEN 1 END),
    COUNT(CASE WHEN arca_status = 'green' THEN 1 END),
    COUNT(CASE WHEN arca_status = 'yellow' THEN 1 END),
    COUNT(CASE WHEN arca_status = 'red' THEN 1 END),
    COUNT(CASE WHEN arca_status = 'unknown' THEN 1 END)
FROM contributors 
WHERE deleted_at IS NULL;
*/