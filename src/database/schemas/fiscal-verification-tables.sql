-- ==============================================
-- SCHEMA PARA HISTÓRICO DE VERIFICACIONES FISCALES
-- Compatible con SQLite - HU-001
-- ==============================================

-- Tabla principal para histórico de verificaciones fiscales
CREATE TABLE IF NOT EXISTS fiscal_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Información básica de la verificación
    cuit TEXT NOT NULL,
    verification_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'ERROR', 'PARTIAL')),
    
    -- Datos completos de la verificación (JSON)
    fiscal_data TEXT, -- JSON con toda la información fiscal
    
    -- Métricas de performance
    response_time INTEGER NOT NULL, -- Tiempo de respuesta en ms
    
    -- Información de errores
    error_message TEXT,
    error_code TEXT,
    
    -- Metadatos
    source TEXT DEFAULT 'AFIP' CHECK(source IN ('AFIP', 'MOCK', 'CACHE', 'INTERNAL')),
    api_version TEXT DEFAULT '1.0.0',
    verification_id TEXT UNIQUE, -- ID único de la verificación
    
    -- Información del request
    request_ip TEXT,
    user_agent TEXT,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_fiscal_verif_cuit ON fiscal_verifications(cuit);
CREATE INDEX IF NOT EXISTS idx_fiscal_verif_date ON fiscal_verifications(verification_date);
CREATE INDEX IF NOT EXISTS idx_fiscal_verif_status ON fiscal_verifications(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_verif_source ON fiscal_verifications(source);
CREATE INDEX IF NOT EXISTS idx_fiscal_verif_cuit_date ON fiscal_verifications(cuit, verification_date DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_verif_performance ON fiscal_verifications(response_time, status);
CREATE INDEX IF NOT EXISTS idx_fiscal_verif_verification_id ON fiscal_verifications(verification_id);

-- Índice compuesto para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_fiscal_verif_composite ON fiscal_verifications(
    cuit, status, verification_date DESC
);

-- Tabla para métricas agregadas de performance
CREATE TABLE IF NOT EXISTS fiscal_verification_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Periodo de la métrica
    metric_date DATE NOT NULL,
    metric_period TEXT NOT NULL CHECK(metric_period IN ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY')),
    
    -- Métricas de volumen
    total_verifications INTEGER DEFAULT 0,
    successful_verifications INTEGER DEFAULT 0,
    failed_verifications INTEGER DEFAULT 0,
    
    -- Métricas de performance
    avg_response_time REAL DEFAULT 0,
    min_response_time INTEGER DEFAULT 0,
    max_response_time INTEGER DEFAULT 0,
    p95_response_time INTEGER DEFAULT 0, -- Percentil 95
    
    -- Métricas de calidad
    success_rate REAL DEFAULT 0, -- Porcentaje de éxito
    compliance_ca001 REAL DEFAULT 0, -- % verificaciones < 5seg
    
    -- Distribución por fuente
    afip_count INTEGER DEFAULT 0,
    mock_count INTEGER DEFAULT 0,
    cache_count INTEGER DEFAULT 0,
    
    -- Distribución por tipo de error
    timeout_errors INTEGER DEFAULT 0,
    connection_errors INTEGER DEFAULT 0,
    not_found_errors INTEGER DEFAULT 0,
    server_errors INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint para evitar duplicados
    UNIQUE(metric_date, metric_period)
);

-- Índices para métricas
CREATE INDEX IF NOT EXISTS idx_fiscal_metrics_date ON fiscal_verification_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_fiscal_metrics_period ON fiscal_verification_metrics(metric_period);
CREATE INDEX IF NOT EXISTS idx_fiscal_metrics_date_period ON fiscal_verification_metrics(metric_date, metric_period);

-- Tabla para configuración de alertas y umbrales
CREATE TABLE IF NOT EXISTS fiscal_verification_thresholds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Configuración del umbral
    threshold_name TEXT NOT NULL UNIQUE,
    threshold_type TEXT NOT NULL CHECK(threshold_type IN ('RESPONSE_TIME', 'SUCCESS_RATE', 'ERROR_RATE', 'VOLUME')),
    
    -- Valores del umbral
    warning_value REAL NOT NULL,
    critical_value REAL NOT NULL,
    
    -- Configuración de evaluación
    evaluation_period INTEGER DEFAULT 300, -- segundos
    min_samples INTEGER DEFAULT 10, -- mínimo de muestras para evaluar
    
    -- Estado del umbral
    is_active INTEGER DEFAULT 1,
    description TEXT,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar umbrales por defecto
INSERT OR IGNORE INTO fiscal_verification_thresholds (
    threshold_name, threshold_type, warning_value, critical_value, description
) VALUES 
    ('response_time_5sec', 'RESPONSE_TIME', 4000, 5000, 'Tiempo de respuesta según CA-001'),
    ('success_rate_target', 'SUCCESS_RATE', 95.0, 98.0, 'Tasa de éxito objetivo'),
    ('error_rate_limit', 'ERROR_RATE', 5.0, 2.0, 'Límite de tasa de error'),
    ('daily_volume_min', 'VOLUME', 50, 100, 'Volumen mínimo diario esperado');

-- Tabla para log de auditoría de cambios
CREATE TABLE IF NOT EXISTS fiscal_verification_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Referencia a la verificación
    verification_id INTEGER,
    
    -- Información del cambio
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW')),
    old_values TEXT, -- JSON con valores anteriores
    new_values TEXT, -- JSON con valores nuevos
    
    -- Información del usuario/sistema
    user_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    
    -- Contexto
    reason TEXT,
    additional_info TEXT, -- JSON con información adicional
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key (opcional, dependiendo de la estructura)
    FOREIGN KEY (verification_id) REFERENCES fiscal_verifications(id) ON DELETE SET NULL
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_verification ON fiscal_verification_audit(verification_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_action ON fiscal_verification_audit(action);
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_user ON fiscal_verification_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_audit_date ON fiscal_verification_audit(created_at);

-- Vista para estadísticas rápidas de verificaciones
CREATE VIEW IF NOT EXISTS fiscal_verification_stats AS
SELECT 
    COUNT(*) as total_verifications,
    COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful_verifications,
    COUNT(CASE WHEN status = 'ERROR' THEN 1 END) as failed_verifications,
    ROUND(
        (COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) * 100.0 / COUNT(*)), 2
    ) as success_rate,
    ROUND(AVG(CASE WHEN status = 'SUCCESS' THEN response_time END)) as avg_response_time,
    MIN(CASE WHEN status = 'SUCCESS' THEN response_time END) as min_response_time,
    MAX(CASE WHEN status = 'SUCCESS' THEN response_time END) as max_response_time,
    COUNT(CASE WHEN status = 'SUCCESS' AND response_time < 5000 THEN 1 END) as ca001_compliant,
    ROUND(
        (COUNT(CASE WHEN status = 'SUCCESS' AND response_time < 5000 THEN 1 END) * 100.0 / 
         COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END)), 2
    ) as ca001_compliance_rate,
    COUNT(DISTINCT cuit) as unique_cuits,
    COUNT(CASE WHEN DATE(verification_date) = DATE('now') THEN 1 END) as today_verifications
FROM fiscal_verifications;

-- Vista para histórico de un CUIT específico
CREATE VIEW IF NOT EXISTS fiscal_verification_history AS
SELECT 
    fv.id,
    fv.cuit,
    fv.verification_date,
    fv.status,
    fv.response_time,
    fv.source,
    fv.error_message,
    -- Extraer campos específicos del JSON fiscal_data
    json_extract(fv.fiscal_data, '$.razonSocial') as razon_social,
    json_extract(fv.fiscal_data, '$.estado') as estado,
    json_extract(fv.fiscal_data, '$.situacionFiscal.iva') as situacion_iva,
    json_extract(fv.fiscal_data, '$.situacionFiscal.ganancias') as situacion_ganancias,
    json_extract(fv.fiscal_data, '$.situacionFiscal.monotributo') as situacion_monotributo,
    -- Indicadores de compliance
    CASE 
        WHEN fv.status = 'SUCCESS' AND fv.response_time < 5000 THEN 1 
        ELSE 0 
    END as ca001_compliant,
    CASE 
        WHEN fv.status = 'SUCCESS' AND fv.fiscal_data IS NOT NULL THEN 1 
        ELSE 0 
    END as ca002_compliant
FROM fiscal_verifications fv
ORDER BY fv.verification_date DESC;

-- Trigger para actualizar timestamp updated_at
CREATE TRIGGER IF NOT EXISTS update_fiscal_verification_timestamp 
    AFTER UPDATE ON fiscal_verifications
BEGIN
    UPDATE fiscal_verifications 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger para actualizar métricas timestamp
CREATE TRIGGER IF NOT EXISTS update_fiscal_metrics_timestamp 
    AFTER UPDATE ON fiscal_verification_metrics
BEGIN
    UPDATE fiscal_verification_metrics 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- ==============================================
-- FUNCIONES AUXILIARES (Para implementar en la aplicación)
-- ==============================================

-- Comentarios sobre funciones que deberían implementarse en JavaScript:

/*
1. calcularMetricasDiarias()
   - Función para agregar métricas diarias
   - Debe ejecutarse cada noche
   
2. limpiarHistoricoAntiguo(dias)
   - Función para limpiar registros antiguos
   - Mantener solo los últimos X días de histórico detallado
   
3. verificarUmbrales()
   - Función para evaluar umbrales y generar alertas
   - Debe ejecutarse periódicamente
   
4. exportarHistorico(cuit, fechaInicio, fechaFin)
   - Función para exportar histórico en diferentes formatos
   
5. generarReporteCompliance()
   - Función para generar reportes de cumplimiento de CA-001 a CA-004
*/

-- ==============================================
-- CONSULTAS DE EJEMPLO PARA REPORTES
-- ==============================================

-- Verificaciones por día en los últimos 30 días
/*
SELECT 
    DATE(verification_date) as fecha,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as exitosas,
    ROUND(AVG(response_time)) as tiempo_promedio
FROM fiscal_verifications 
WHERE verification_date >= DATE('now', '-30 days')
GROUP BY DATE(verification_date)
ORDER BY fecha DESC;
*/

-- CUITs más consultados
/*
SELECT 
    cuit,
    COUNT(*) as consultas,
    MAX(verification_date) as ultima_consulta,
    AVG(response_time) as tiempo_promedio
FROM fiscal_verifications 
WHERE status = 'SUCCESS'
GROUP BY cuit
ORDER BY consultas DESC
LIMIT 20;
*/

-- Análisis de errores
/*
SELECT 
    error_code,
    COUNT(*) as cantidad,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM fiscal_verifications WHERE status = 'ERROR') as porcentaje
FROM fiscal_verifications 
WHERE status = 'ERROR' AND error_code IS NOT NULL
GROUP BY error_code
ORDER BY cantidad DESC;
*/

-- Compliance con CA-001 (< 5 segundos)
/*
SELECT 
    'CA-001 Compliance' as criterio,
    COUNT(CASE WHEN response_time < 5000 AND status = 'SUCCESS' THEN 1 END) as cumple,
    COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as total,
    ROUND(
        COUNT(CASE WHEN response_time < 5000 AND status = 'SUCCESS' THEN 1 END) * 100.0 / 
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END), 2
    ) as porcentaje_cumplimiento
FROM fiscal_verifications;
*/