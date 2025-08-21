-- Migration: Add ML Enhancement Tables
-- Version: 4.1.0
-- Date: 2025-08-19 12:00
-- Description: Adds machine learning tables for OCR pattern recognition
-- Story: User Story 4.1 - AI-Powered Invoice Intelligence

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

-- Add to migration log (only if not already present)
INSERT OR IGNORE INTO schema_version (version, description) 
VALUES ('4.1.0', 'Add ML Enhancement Tables for OCR pattern recognition - User Story 4.1');