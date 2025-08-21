-- ==============================================
-- AI BOOKKEEPER ASSISTANT - SQLite Schema FINAL
-- Compatible con SQLite puro
-- ==============================================

-- Tabla para log de procesamiento OCR
CREATE TABLE IF NOT EXISTS ocr_processing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_id TEXT UNIQUE NOT NULL,
    file_path TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK(document_type IN ('auto', 'invoice', 'bank_statement', 'receipt', 'general')),
    client_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'processing', 'completed', 'failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    extraction_options TEXT,
    result TEXT,
    error_message TEXT
);

-- Índices para ocr_processing_log
CREATE INDEX IF NOT EXISTS idx_ocr_log_client_status ON ocr_processing_log(client_id, status);
CREATE INDEX IF NOT EXISTS idx_ocr_log_created_at ON ocr_processing_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ocr_log_process_id ON ocr_processing_log(process_id);

-- Tabla para resultados de extracción OCR
CREATE TABLE IF NOT EXISTS ocr_extraction_results (
    id TEXT PRIMARY KEY,
    process_id TEXT NOT NULL,
    client_id TEXT,
    document_type TEXT NOT NULL,
    raw_text TEXT,
    structured_data TEXT,
    confidence REAL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (process_id) REFERENCES ocr_processing_log(process_id) ON DELETE CASCADE
);

-- Índices para ocr_extraction_results
CREATE INDEX IF NOT EXISTS idx_ocr_results_client_type ON ocr_extraction_results(client_id, document_type);
CREATE INDEX IF NOT EXISTS idx_ocr_results_confidence ON ocr_extraction_results(confidence);
CREATE INDEX IF NOT EXISTS idx_ocr_results_created_at ON ocr_extraction_results(created_at);
CREATE INDEX IF NOT EXISTS idx_ocr_results_composite ON ocr_extraction_results(client_id, document_type, created_at);

-- Tabla para historial de categorización automática
CREATE TABLE IF NOT EXISTS categorization_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    description_pattern TEXT NOT NULL,
    original_description TEXT NOT NULL,
    category TEXT NOT NULL,
    confidence REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para categorization_history
CREATE INDEX IF NOT EXISTS idx_cat_history_client_pattern ON categorization_history(client_id, description_pattern);
CREATE INDEX IF NOT EXISTS idx_cat_history_category ON categorization_history(category);
CREATE INDEX IF NOT EXISTS idx_cat_history_confidence ON categorization_history(confidence);
CREATE INDEX IF NOT EXISTS idx_cat_history_created_at ON categorization_history(created_at);
CREATE INDEX IF NOT EXISTS idx_cat_history_composite ON categorization_history(client_id, category, created_at);

-- Tabla para conciliaciones bancarias
CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    bank_movements INTEGER NOT NULL DEFAULT 0,
    book_records INTEGER NOT NULL DEFAULT 0,
    matches INTEGER NOT NULL DEFAULT 0,
    discrepancies INTEGER NOT NULL DEFAULT 0,
    total_discrepancy_amount REAL DEFAULT 0,
    matching_rate REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    options TEXT
);

-- Índices para bank_reconciliations
CREATE INDEX IF NOT EXISTS idx_reconcil_client_period ON bank_reconciliations(client_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reconcil_matching_rate ON bank_reconciliations(matching_rate);
CREATE INDEX IF NOT EXISTS idx_reconcil_created_at ON bank_reconciliations(created_at);
CREATE INDEX IF NOT EXISTS idx_reconcil_composite ON bank_reconciliations(client_id, created_at, matching_rate);

-- Tabla para matches de conciliación
CREATE TABLE IF NOT EXISTS reconciliation_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reconciliation_id TEXT NOT NULL,
    bank_statement_id TEXT NOT NULL,
    book_record_id TEXT NOT NULL,
    confidence REAL NOT NULL,
    match_type TEXT NOT NULL CHECK(match_type IN ('exact', 'high_confidence', 'medium_confidence', 'low_confidence')),
    differences TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliations(id) ON DELETE CASCADE
);

-- Índices para reconciliation_matches
CREATE INDEX IF NOT EXISTS idx_recon_matches_reconciliation ON reconciliation_matches(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_recon_matches_confidence ON reconciliation_matches(confidence);

-- Tabla para discrepancias de conciliación
CREATE TABLE IF NOT EXISTS reconciliation_discrepancies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reconciliation_id TEXT NOT NULL,
    discrepancy_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('unmatched_bank', 'unmatched_book', 'low_confidence_match')),
    description TEXT NOT NULL,
    impact_amount REAL NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
    suggested_actions TEXT,
    resolved INTEGER DEFAULT 0,
    resolution_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliations(id) ON DELETE CASCADE
);

-- Índices para reconciliation_discrepancies
CREATE INDEX IF NOT EXISTS idx_recon_disc_reconciliation_type ON reconciliation_discrepancies(reconciliation_id, type);
CREATE INDEX IF NOT EXISTS idx_recon_disc_severity ON reconciliation_discrepancies(severity);
CREATE INDEX IF NOT EXISTS idx_recon_disc_resolved ON reconciliation_discrepancies(resolved);

-- Tabla para patrones de documentos aprendidos
CREATE TABLE IF NOT EXISTS document_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    pattern_name TEXT NOT NULL,
    pattern_data TEXT NOT NULL,
    usage_count INTEGER DEFAULT 1,
    success_rate REAL DEFAULT 100.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para document_patterns
CREATE INDEX IF NOT EXISTS idx_doc_patterns_client_type ON document_patterns(client_id, document_type);
CREATE INDEX IF NOT EXISTS idx_doc_patterns_success_rate ON document_patterns(success_rate);
CREATE INDEX IF NOT EXISTS idx_doc_patterns_usage_count ON document_patterns(usage_count);

-- Tabla para auditoria de procesamiento OCR
CREATE TABLE IF NOT EXISTS ocr_audit_trail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_id TEXT NOT NULL,
    client_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    user_id TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para ocr_audit_trail
CREATE INDEX IF NOT EXISTS idx_audit_process_id ON ocr_audit_trail(process_id);
CREATE INDEX IF NOT EXISTS idx_audit_client_action ON ocr_audit_trail(client_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON ocr_audit_trail(created_at);

-- Tabla para configuración de clientes OCR
CREATE TABLE IF NOT EXISTS client_ocr_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT UNIQUE NOT NULL,
    chart_of_accounts TEXT,
    categorization_rules TEXT,
    ocr_preferences TEXT,
    auto_categorize INTEGER DEFAULT 1,
    auto_reconcile INTEGER DEFAULT 0,
    confidence_threshold REAL DEFAULT 75.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índice para client_ocr_config
CREATE INDEX IF NOT EXISTS idx_client_ocr_config_client_id ON client_ocr_config(client_id);

-- Tabla para métricas de rendimiento OCR
CREATE TABLE IF NOT EXISTS ocr_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    client_id TEXT,
    document_type TEXT,
    total_processed INTEGER DEFAULT 0,
    successful_extractions INTEGER DEFAULT 0,
    average_confidence REAL DEFAULT 0,
    average_processing_time REAL DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para ocr_performance_metrics
CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_unique_daily ON ocr_performance_metrics(date, client_id, document_type);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON ocr_performance_metrics(date);
CREATE INDEX IF NOT EXISTS idx_metrics_client_date ON ocr_performance_metrics(client_id, date);

-- Insertar configuración por defecto para nuevos clientes
INSERT OR REPLACE INTO client_ocr_config (client_id, chart_of_accounts, categorization_rules, ocr_preferences) 
VALUES (
    'default',
    '{"1.1.01": {"name": "Caja", "type": "asset"}, "1.1.02": {"name": "Banco Cuenta Corriente", "type": "asset"}, "4.1.01": {"name": "Ventas", "type": "income"}, "5.3.02": {"name": "Servicios Públicos", "type": "expense"}}',
    '[]',
    '{"defaultLanguage": "spa", "enhanceImages": true, "confidenceThreshold": 75, "maxFileSize": 10485760}'
);

-- ==============================================
-- TRIGGERS SQLite para mantener métricas actualizadas
-- ==============================================

-- Trigger para actualizar updated_at en document_patterns
CREATE TRIGGER IF NOT EXISTS update_document_patterns_updated_at
AFTER UPDATE ON document_patterns
FOR EACH ROW
BEGIN
    UPDATE document_patterns 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en client_ocr_config
CREATE TRIGGER IF NOT EXISTS update_client_ocr_config_updated_at
AFTER UPDATE ON client_ocr_config
FOR EACH ROW
BEGIN
    UPDATE client_ocr_config 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en ocr_processing_log
CREATE TRIGGER IF NOT EXISTS update_ocr_processing_log_updated_at
AFTER UPDATE ON ocr_processing_log
FOR EACH ROW
BEGIN
    UPDATE ocr_processing_log 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- ==============================================
-- VISTAS ÚTILES PARA REPORTES
-- ==============================================

-- Vista para resumen diario de OCR
CREATE VIEW IF NOT EXISTS v_ocr_daily_summary AS
SELECT 
    date,
    client_id,
    SUM(total_processed) as total_documents,
    SUM(successful_extractions) as successful_extractions,
    AVG(average_confidence) as avg_confidence,
    SUM(error_count) as total_errors,
    ROUND((CAST(SUM(successful_extractions) AS REAL) / SUM(total_processed)) * 100, 2) as success_rate
FROM ocr_performance_metrics
GROUP BY date, client_id
ORDER BY date DESC, client_id;

-- Vista para resumen de conciliaciones
CREATE VIEW IF NOT EXISTS v_reconciliation_summary AS
SELECT 
    r.client_id,
    COUNT(r.id) as total_reconciliations,
    AVG(r.matching_rate) as avg_matching_rate,
    SUM(r.discrepancies) as total_discrepancies,
    SUM(r.total_discrepancy_amount) as total_discrepancy_amount,
    MAX(r.created_at) as last_reconciliation
FROM bank_reconciliations r
WHERE r.created_at > datetime('now', '-30 days')
GROUP BY r.client_id;

-- Vista para estadísticas de categorización
CREATE VIEW IF NOT EXISTS v_categorization_stats AS
SELECT 
    client_id,
    category,
    COUNT(*) as usage_count,
    AVG(confidence) as avg_confidence,
    MAX(created_at) as last_used
FROM categorization_history
WHERE created_at > datetime('now', '-30 days')
GROUP BY client_id, category
ORDER BY usage_count DESC;

-- ==============================================
-- MACHINE LEARNING ENHANCEMENT TABLES
-- ==============================================

-- Nueva tabla para almacenar patrones aprendidos por proveedor
CREATE TABLE IF NOT EXISTS ml_document_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuit TEXT NOT NULL,
    document_type TEXT NOT NULL,
    pattern_data JSON NOT NULL,
    confidence_threshold REAL DEFAULT 0.8,
    usage_count INTEGER DEFAULT 1,
    success_rate REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cuit, document_type)
);

-- Tabla para tracking de correcciones y aprendizaje
CREATE TABLE IF NOT EXISTS ml_corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    original_value TEXT,
    corrected_value TEXT NOT NULL,
    confidence_original REAL,
    pattern_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES ocr_processing_log(id),
    FOREIGN KEY (pattern_id) REFERENCES ml_document_patterns(id)
);

-- Índices para performance de ML
CREATE INDEX IF NOT EXISTS idx_ml_patterns_cuit ON ml_document_patterns(cuit);
CREATE INDEX IF NOT EXISTS idx_ml_patterns_type ON ml_document_patterns(document_type);
CREATE INDEX IF NOT EXISTS idx_ml_corrections_document ON ml_corrections(document_id);
CREATE INDEX IF NOT EXISTS idx_ml_corrections_pattern ON ml_corrections(pattern_id);

-- Trigger para actualizar updated_at en ml_document_patterns
CREATE TRIGGER IF NOT EXISTS update_ml_document_patterns_updated_at
AFTER UPDATE ON ml_document_patterns
FOR EACH ROW
BEGIN
    UPDATE ml_document_patterns 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Vista para métricas de ML performance
CREATE VIEW IF NOT EXISTS v_ml_performance AS
SELECT 
    p.cuit,
    p.document_type,
    p.usage_count,
    p.success_rate,
    COUNT(c.id) as total_corrections,
    AVG(c.confidence_original) as avg_original_confidence,
    MAX(p.updated_at) as last_updated
FROM ml_document_patterns p
LEFT JOIN ml_corrections c ON c.pattern_id = p.id
GROUP BY p.cuit, p.document_type
ORDER BY p.usage_count DESC, p.success_rate DESC;

-- ==============================================
-- AFIP REAL-TIME VALIDATION TABLES (User Story 4.2)
-- ==============================================

-- Tabla para almacenar resultados de validaciones AFIP
CREATE TABLE IF NOT EXISTS afip_validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    validation_type TEXT NOT NULL CHECK(validation_type IN ('cuit', 'cae', 'duplicate', 'tax_consistency', 'complete')),
    validation_result JSON NOT NULL,
    is_valid BOOLEAN NOT NULL,
    severity TEXT DEFAULT 'info' CHECK(severity IN ('info', 'warning', 'error', 'critical')),
    error_message TEXT,
    response_time_ms INTEGER,
    validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    expires_at DATETIME, -- Para cache invalidation
    FOREIGN KEY (document_id) REFERENCES ocr_processing_log(id)
);

-- Tabla para tracking de conectividad AFIP
CREATE TABLE IF NOT EXISTS afip_connectivity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL CHECK(service_name IN ('cuit_validation', 'cae_validation', 'arca_tools', 'afip_web_services')),
    endpoint TEXT,
    status TEXT NOT NULL CHECK(status IN ('online', 'offline', 'degraded', 'timeout')),
    response_time_ms INTEGER,
    error_message TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success_rate REAL, -- Rolling success rate
    last_success_at DATETIME
);

-- Tabla para cache de validaciones AFIP (para performance)
CREATE TABLE IF NOT EXISTS afip_validation_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,
    cache_value JSON NOT NULL,
    cache_type TEXT NOT NULL CHECK(cache_type IN ('cuit', 'cae', 'taxpayer_data')),
    expires_at DATETIME NOT NULL,
    hit_count INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para queue de validaciones pendientes
CREATE TABLE IF NOT EXISTS afip_validation_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    validation_data JSON NOT NULL,
    priority INTEGER DEFAULT 1 CHECK(priority BETWEEN 1 AND 5), -- 5 = highest priority
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    next_retry_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES ocr_processing_log(id)
);

-- Índices para performance de validaciones AFIP
CREATE INDEX IF NOT EXISTS idx_afip_validations_document_id ON afip_validations(document_id);
CREATE INDEX IF NOT EXISTS idx_afip_validations_type ON afip_validations(validation_type);
CREATE INDEX IF NOT EXISTS idx_afip_validations_severity ON afip_validations(severity);
CREATE INDEX IF NOT EXISTS idx_afip_validations_date ON afip_validations(validated_at);
CREATE INDEX IF NOT EXISTS idx_afip_connectivity_service ON afip_connectivity_log(service_name);
CREATE INDEX IF NOT EXISTS idx_afip_connectivity_status ON afip_connectivity_log(status);
CREATE INDEX IF NOT EXISTS idx_afip_connectivity_date ON afip_connectivity_log(checked_at);
CREATE INDEX IF NOT EXISTS idx_afip_cache_key ON afip_validation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_afip_cache_expires ON afip_validation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_afip_cache_type ON afip_validation_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_afip_queue_status ON afip_validation_queue(status);
CREATE INDEX IF NOT EXISTS idx_afip_queue_priority ON afip_validation_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_afip_queue_retry ON afip_validation_queue(next_retry_at);

-- Trigger para actualizar updated_at en cache
CREATE TRIGGER IF NOT EXISTS update_afip_cache_updated_at
AFTER UPDATE ON afip_validation_cache
FOR EACH ROW
BEGIN
    UPDATE afip_validation_cache 
    SET updated_at = CURRENT_TIMESTAMP,
        hit_count = hit_count + 1
    WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en queue
CREATE TRIGGER IF NOT EXISTS update_afip_queue_updated_at
AFTER UPDATE ON afip_validation_queue
FOR EACH ROW
BEGIN
    UPDATE afip_validation_queue 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Vista para estadísticas de validaciones AFIP
CREATE VIEW IF NOT EXISTS v_afip_validation_stats AS
SELECT 
    validation_type,
    COUNT(*) as total_validations,
    SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) as valid_count,
    ROUND(AVG(CASE WHEN is_valid = 1 THEN 100.0 ELSE 0.0 END), 2) as success_rate,
    AVG(response_time_ms) as avg_response_time_ms,
    MAX(validated_at) as last_validation,
    COUNT(DISTINCT document_id) as unique_documents
FROM afip_validations
WHERE validated_at > datetime('now', '-30 days')
GROUP BY validation_type
ORDER BY success_rate DESC;

-- Vista para estado de conectividad AFIP
CREATE VIEW IF NOT EXISTS v_afip_connectivity_status AS
SELECT 
    service_name,
    status,
    COUNT(*) as check_count,
    AVG(response_time_ms) as avg_response_time,
    MAX(checked_at) as last_check,
    AVG(success_rate) as avg_success_rate,
    MAX(last_success_at) as last_success
FROM afip_connectivity_log
WHERE checked_at > datetime('now', '-1 days')
GROUP BY service_name, status
ORDER BY service_name, last_check DESC;