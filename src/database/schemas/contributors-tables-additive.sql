-- ==============================================
-- CONTRIBUYENTES MODULE - Additive Schema Updates
-- Preserva datos existentes y agrega nuevas columnas
-- ==============================================

-- Agregar columnas nuevas solo si no existen
-- SQLite no tiene ADD COLUMN IF NOT EXISTS, así que usamos manejo de errores

-- Agregar columnas de contacto adicionales (compatibles con nombres existentes)
ALTER TABLE contributors ADD COLUMN email TEXT;
ALTER TABLE contributors ADD COLUMN phone TEXT;
ALTER TABLE contributors ADD COLUMN address TEXT;
ALTER TABLE contributors ADD COLUMN notes TEXT;

-- Agregar estados ARCA (nuevas columnas)
ALTER TABLE contributors ADD COLUMN arca_status TEXT DEFAULT 'unknown' CHECK(arca_status IN ('green', 'yellow', 'red', 'unknown'));
ALTER TABLE contributors ADD COLUMN iva_status TEXT;
ALTER TABLE contributors ADD COLUMN monotributo_status TEXT;
ALTER TABLE contributors ADD COLUMN ganancias_status TEXT;
ALTER TABLE contributors ADD COLUMN social_security_status TEXT;

-- Agregar compliance adicional
ALTER TABLE contributors ADD COLUMN compliance_details TEXT; -- JSON con detalles de compliance
ALTER TABLE contributors ADD COLUMN compliance_score REAL DEFAULT 0.0;

-- Agregar timestamps de verificación
ALTER TABLE contributors ADD COLUMN last_arca_check DATETIME;
ALTER TABLE contributors ADD COLUMN last_iva_check DATETIME;
ALTER TABLE contributors ADD COLUMN last_monotributo_check DATETIME;
ALTER TABLE contributors ADD COLUMN last_ganancias_check DATETIME;
ALTER TABLE contributors ADD COLUMN last_social_security_check DATETIME;

-- Agregar metadatos de importación
ALTER TABLE contributors ADD COLUMN import_source TEXT; -- 'manual', 'csv', 'excel'
ALTER TABLE contributors ADD COLUMN import_batch_id TEXT;

-- Crear índices para nuevas columnas (solo si la columna existe)
CREATE INDEX IF NOT EXISTS idx_contributors_arca_status ON contributors(arca_status);
CREATE INDEX IF NOT EXISTS idx_contributors_email ON contributors(email);
CREATE INDEX IF NOT EXISTS idx_contributors_import_source ON contributors(import_source);

-- Vista de compatibilidad para mapear nombres de columnas
CREATE VIEW IF NOT EXISTS v_contributors_unified AS
SELECT 
    id,
    cuit,
    business_name,
    COALESCE(email, contact_email) as email,
    COALESCE(phone, contact_phone) as phone,
    address,
    category,
    notes,
    arca_status,
    iva_status,
    monotributo_status,
    ganancias_status,
    social_security_status,
    compliance_status,
    compliance_details,
    compliance_score,
    COALESCE(status, 'active') as status,
    risk_level,
    last_compliance_check,
    last_arca_check,
    last_iva_check,
    last_monotributo_check,
    last_ganancias_check,
    last_social_security_check,
    created_at,
    updated_at,
    active,
    import_source,
    import_batch_id,
    deleted_at
FROM contributors;