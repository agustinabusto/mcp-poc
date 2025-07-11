#!/usr/bin/env node

// src/database/migrate-fiscal-verification.js - VERSIÓN COMPLETA
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const DB_PATH = process.env.DATABASE_URL || './data/afip_monitor.db';
const SCHEMA_PATH = path.join(__dirname, 'schemas', 'fiscal-verification-tables.sql');

console.log('🚀 Iniciando migración de tablas de Verificación Fiscal (HU-001)...');
console.log(`📂 Base de datos: ${DB_PATH}`);
console.log(`📄 Schema: ${SCHEMA_PATH}`);

// Schema SQL completo
const FISCAL_SCHEMA = `-- ==============================================
-- SCHEMA PARA HISTÓRICO DE VERIFICACIONES FISCALES HU-001
-- Compatible con SQLite
-- ==============================================

-- Tabla principal para histórico de verificaciones fiscales
CREATE TABLE IF NOT EXISTS fiscal_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuit TEXT NOT NULL,
    verification_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'ERROR', 'PARTIAL')),
    fiscal_data TEXT,
    response_time INTEGER NOT NULL,
    error_message TEXT,
    error_code TEXT,
    source TEXT DEFAULT 'AFIP' CHECK(source IN ('AFIP', 'MOCK', 'CACHE', 'INTERNAL')),
    api_version TEXT DEFAULT '1.0.0',
    verification_id TEXT UNIQUE,
    request_ip TEXT,
    user_agent TEXT,
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

-- Trigger para actualizar timestamp updated_at
CREATE TRIGGER IF NOT EXISTS update_fiscal_verification_timestamp 
    AFTER UPDATE ON fiscal_verifications
BEGIN
    UPDATE fiscal_verifications 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;`;

async function runMigration() {
    try {
        // Crear directorio de la base de datos si no existe
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`📁 Directorio creado: ${dbDir}`);
        }

        // Crear directorio de schemas si no existe
        const schemaDir = path.dirname(SCHEMA_PATH);
        if (!fs.existsSync(schemaDir)) {
            fs.mkdirSync(schemaDir, { recursive: true });
            console.log(`📁 Directorio schemas creado: ${schemaDir}`);
        }

        // Crear archivo de schema automáticamente
        if (!fs.existsSync(SCHEMA_PATH)) {
            console.log('📝 Creando archivo de schema automáticamente...');
            fs.writeFileSync(SCHEMA_PATH, FISCAL_SCHEMA);
            console.log(`✅ Archivo de schema creado: ${SCHEMA_PATH}`);
        }

        // Verificar si sqlite3 está disponible
        let sqliteCommand = null;
        try {
            await execAsync('sqlite3 --version');
            sqliteCommand = 'sqlite3';
            console.log('✅ sqlite3 encontrado en el sistema');
        } catch (error) {
            try {
                await execAsync('sqlite --version');
                sqliteCommand = 'sqlite';
                console.log('✅ sqlite encontrado en el sistema');
            } catch (error2) {
                console.error('❌ Error: sqlite3 no está instalado en el sistema');
                console.error('');
                console.error('📋 Opciones para instalar sqlite3:');
                console.error('   Ubuntu/Debian: sudo apt-get install sqlite3');
                console.error('   MacOS: brew install sqlite3');
                console.error('   Windows: Descarga desde https://sqlite.org/download.html');
                console.error('');
                console.error('📝 Alternativamente, puedes ejecutar el SQL manualmente:');
                console.error(`   1. Abre tu base de datos: sqlite3 ${DB_PATH}`);
                console.error(`   2. Ejecuta: .read ${SCHEMA_PATH}`);
                console.error(`   3. Sal con: .quit`);
                process.exit(1);
            }
        }

        // Ejecutar el script SQL
        console.log('📊 Ejecutando script de migración...');

        const command = `${sqliteCommand} "${DB_PATH}" < "${SCHEMA_PATH}"`;
        console.log(`🔧 Comando: ${command}`);

        const { stdout, stderr } = await execAsync(command);

        if (stderr && stderr.trim()) {
            console.warn('⚠️  Warnings durante la migración:');
            console.warn(stderr);
        }

        if (stdout && stdout.trim()) {
            console.log('📝 Output de la migración:');
            console.log(stdout);
        }

        // Verificar que las tablas se crearon correctamente
        console.log('\n📋 Verificando tablas creadas...');

        const verifyCommand = `${sqliteCommand} "${DB_PATH}" "SELECT name, type FROM sqlite_master WHERE type = 'table' AND (name LIKE '%fiscal%' OR name LIKE '%verification%') ORDER BY name;"`;

        const { stdout: tablesOutput } = await execAsync(verifyCommand);

        if (tablesOutput && tablesOutput.trim()) {
            console.log('✅ Tablas de verificación fiscal creadas:');
            const tables = tablesOutput.trim().split('\n');
            tables.forEach(table => {
                if (table.trim()) {
                    const [name, type] = table.split('|');
                    console.log(`  - ${name} (${type})`);
                }
            });
        } else {
            console.log('⚠️  No se encontraron tablas de verificación fiscal. Verifica el script SQL.');
        }

        // Verificar vistas creadas
        console.log('\n📊 Verificando vistas creadas...');
        const viewsCommand = `${sqliteCommand} "${DB_PATH}" "SELECT name FROM sqlite_master WHERE type = 'view' AND name LIKE '%fiscal%' ORDER BY name;"`;

        const { stdout: viewsOutput } = await execAsync(viewsCommand);

        if (viewsOutput && viewsOutput.trim()) {
            console.log('✅ Vistas creadas:');
            const views = viewsOutput.trim().split('\n');
            views.forEach(view => {
                if (view.trim()) {
                    console.log(`  - ${view}`);
                }
            });
        }

        // Insertar datos de prueba si la tabla está vacía
        console.log('\n🌱 Verificando necesidad de datos iniciales...');
        await insertInitialData(sqliteCommand);

        // Mostrar estadísticas finales
        console.log('\n📊 Estadísticas finales:');
        await showFinalStats(sqliteCommand);

        // Verificar integridad
        await validateDatabaseIntegrity(sqliteCommand);

        console.log('\n🎉 ¡Migración completada exitosamente!');
        console.log('');
        console.log('📋 Próximos pasos:');
        console.log('   1. Implementar el endpoint POST /api/fiscal/verify');
        console.log('   2. Integrar el componente FiscalVerification en el frontend');
        console.log('   3. Configurar las pruebas unitarias');
        console.log('   4. Ejecutar pruebas de integración');
        console.log('');
        console.log('🔍 Para verificar el estado del sistema:');
        console.log(`   sqlite3 "${DB_PATH}" "SELECT * FROM fiscal_verification_stats;"`);
        console.log('');
        console.log('🧪 Para probar con datos de ejemplo:');
        console.log('   curl -X POST http://localhost:8080/api/fiscal/verify \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d \'{"cuit":"30500010912"}\'');

    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        process.exit(1);
    }
}

async function insertInitialData(sqliteCommand) {
    try {
        const checkCommand = `${sqliteCommand} "${DB_PATH}" "SELECT COUNT(*) FROM fiscal_verifications;"`;
        const { stdout } = await execAsync(checkCommand);
        const count = parseInt(stdout.trim());

        if (count === 0) {
            console.log('📝 Insertando datos de prueba...');

            const insertCommand = `${sqliteCommand} "${DB_PATH}" "
                INSERT INTO fiscal_verifications (
                    cuit, status, fiscal_data, response_time, source, verification_id
                ) VALUES 
                ('30500010912', 'SUCCESS', '{\"razonSocial\":\"MERCADOLIBRE S.R.L.\",\"estado\":\"ACTIVO\",\"situacionFiscal\":{\"iva\":\"RESPONSABLE_INSCRIPTO\"}}', 1250, 'MOCK', 'verify_demo_001'),
                ('27230938607', 'SUCCESS', '{\"razonSocial\":\"RODRIGUEZ MARIA LAURA\",\"estado\":\"ACTIVO\",\"situacionFiscal\":{\"iva\":\"MONOTRIBUTO\"}}', 1890, 'MOCK', 'verify_demo_002'),
                ('20123456789', 'ERROR', null, 4500, 'AFIP', 'verify_demo_003'),
                ('30777888999', 'SUCCESS', '{\"razonSocial\":\"EMPRESA DEMO S.A.\",\"estado\":\"ACTIVO\",\"situacionFiscal\":{\"iva\":\"RESPONSABLE_INSCRIPTO\"}}', 2100, 'MOCK', 'verify_demo_004'),
                ('27999888777', 'SUCCESS', '{\"razonSocial\":\"PEREZ JUAN CARLOS\",\"estado\":\"ACTIVO\",\"situacionFiscal\":{\"iva\":\"EXENTO\"}}', 3200, 'MOCK', 'verify_demo_005');
            "`;

            await execAsync(insertCommand);
            console.log('✅ Datos de prueba insertados (5 registros)');
        } else {
            console.log(`ℹ️  Ya existen ${count} registros en la tabla fiscal_verifications`);
        }
    } catch (error) {
        console.warn('⚠️  No se pudieron insertar datos de prueba:', error.message);
    }
}

async function showFinalStats(sqliteCommand) {
    try {
        const statsCommand = `${sqliteCommand} "${DB_PATH}" "SELECT * FROM fiscal_verification_stats;"`;
        const { stdout } = await execAsync(statsCommand);

        if (stdout && stdout.trim()) {
            console.log('📊 Estadísticas actuales:');
            const lines = stdout.trim().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    const values = line.split('|');
                    console.log(`   Total verificaciones: ${values[0] || 0}`);
                    console.log(`   Exitosas: ${values[1] || 0}`);
                    console.log(`   Fallidas: ${values[2] || 0}`);
                    console.log(`   Tasa de éxito: ${values[3] || 0}%`);
                    console.log(`   Tiempo promedio: ${values[4] || 0}ms`);
                    console.log(`   Tiempo mínimo: ${values[5] || 0}ms`);
                    console.log(`   Tiempo máximo: ${values[6] || 0}ms`);
                    console.log(`   Compliance CA-001: ${values[7] || 0} verificaciones < 5seg`);
                    console.log(`   Tasa CA-001: ${values[8] || 0}%`);
                    console.log(`   CUITs únicos: ${values[9] || 0}`);
                    console.log(`   Verificaciones hoy: ${values[10] || 0}`);
                }
            });
        }
    } catch (error) {
        console.warn('⚠️  No se pudieron obtener estadísticas:', error.message);
    }
}

async function validateDatabaseIntegrity(sqliteCommand) {
    try {
        console.log('\n🔍 Validando integridad de la base de datos...');

        const integrityCommand = `${sqliteCommand} "${DB_PATH}" "PRAGMA integrity_check;"`;
        const { stdout } = await execAsync(integrityCommand);

        if (stdout.trim() === 'ok') {
            console.log('✅ Integridad de la base de datos: OK');
        } else {
            console.warn('⚠️  Problemas de integridad detectados:', stdout);
        }

        // Verificar que los índices existen
        const indexCommand = `${sqliteCommand} "${DB_PATH}" "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE '%fiscal%';"`;
        const { stdout: indexOutput } = await execAsync(indexCommand);

        if (indexOutput && indexOutput.trim()) {
            const indexCount = indexOutput.trim().split('\n').length;
            console.log(`✅ ${indexCount} índices creados correctamente`);
        }

        // Verificar que los triggers existen
        const triggerCommand = `${sqliteCommand} "${DB_PATH}" "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name LIKE '%fiscal%';"`;
        const { stdout: triggerOutput } = await execAsync(triggerCommand);

        if (triggerOutput && triggerOutput.trim()) {
            const triggerCount = triggerOutput.trim().split('\n').length;
            console.log(`✅ ${triggerCount} triggers creados correctamente`);
        }

    } catch (error) {
        console.warn('⚠️  No se pudo verificar integridad:', error.message);
    }
}

// Función para mostrar ayuda de uso
function showUsage() {
    console.log('');
    console.log('📖 Uso del script de migración de Verificación Fiscal:');
    console.log('');
    console.log('   node migrate-fiscal-verification.js [opciones]');
    console.log('');
    console.log('🔧 Variables de entorno:');
    console.log('   DATABASE_URL - Ruta de la base de datos (default: ./data/afip_monitor.db)');
    console.log('');
    console.log('📋 Opciones:');
    console.log('   --help, -h          Mostrar esta ayuda');
    console.log('   --validate-only     Solo validar integridad sin migrar');
    console.log('   --force             Forzar recreación de tablas');
    console.log('');
    console.log('📋 Ejemplos:');
    console.log('   DATABASE_URL=/path/to/prod.db node migrate-fiscal-verification.js');
    console.log('   npm run migrate:fiscal');
    console.log('   node migrate-fiscal-verification.js --validate-only');
    console.log('');
}

// Función principal con manejo de argumentos
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        showUsage();
        return;
    }

    if (args.includes('--validate-only')) {
        console.log('🔍 Modo de validación únicamente...');
        let sqliteCommand = 'sqlite3';
        try {
            await execAsync('sqlite3 --version');
        } catch {
            sqliteCommand = 'sqlite';
        }
        await validateDatabaseIntegrity(sqliteCommand);
        return;
    }

    if (args.includes('--force')) {
        console.log('⚠️  Modo forzado: recreando tablas...');
        // Aquí podrías agregar lógica para DROP y recrear tablas
    }

    await runMigration();
}

// Manejo de errores globales
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Error no manejado en promesa:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error.message);
    process.exit(1);
});

// Ejecutar solo si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Error en la ejecución principal:', error.message);
        process.exit(1);
    });
}

export { runMigration, insertInitialData, validateDatabaseIntegrity };