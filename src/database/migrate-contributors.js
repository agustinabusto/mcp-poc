#!/usr/bin/env node

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
const SCHEMA_PATH = path.join(__dirname, 'schemas', 'contributors-tables.sql');

console.log('🚀 Iniciando migración de tablas de Contribuyentes...');
console.log(`📂 Base de datos: ${DB_PATH}`);
console.log(`📄 Schema: ${SCHEMA_PATH}`);

async function runMigration() {
    try {
        // Verificar que existe el archivo de schema
        if (!fs.existsSync(SCHEMA_PATH)) {
            console.error('❌ Error: No se encontró el archivo de schema de Contribuyentes');
            console.error(`   Ubicación esperada: ${SCHEMA_PATH}`);
            console.error(`   Crea el archivo primero con el contenido del schema SQLite`);
            process.exit(1);
        }

        // Crear directorio de la base de datos si no existe
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`📁 Directorio creado: ${dbDir}`);
        }

        // Verificar si sqlite3 está disponible
        let sqliteCommand = null;
        try {
            await execAsync('sqlite3 --version');
            sqliteCommand = 'sqlite3';
            console.log('✅ sqlite3 encontrado en el sistema');
        } catch (error) {
            // Intentar con sqlite
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

        // Verificar que la base de datos existe o crearla
        if (!fs.existsSync(DB_PATH)) {
            console.log('📂 Creando nueva base de datos...');
            await execAsync(`${sqliteCommand} "${DB_PATH}" "SELECT 1;"`);
        }

        // Ejecutar el script SQL
        console.log('📊 Ejecutando script de migración de Contribuyentes...');

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
        console.log('\n📋 Verificando tablas de Contribuyentes creadas...');

        const verifyCommand = `${sqliteCommand} "${DB_PATH}" "SELECT name, type FROM sqlite_master WHERE type = 'table' AND (name LIKE '%contributor%' OR name LIKE '%client_%' OR name LIKE '%import_%') ORDER BY name;"`;

        const { stdout: tablesOutput } = await execAsync(verifyCommand);

        if (tablesOutput && tablesOutput.trim()) {
            console.log('✅ Tablas de Contribuyentes creadas:');
            const tables = tablesOutput.trim().split('\n');
            tables.forEach(table => {
                if (table.trim()) {
                    const [name, type] = table.split('|');
                    console.log(`  - ${name} (${type})`);
                }
            });
        } else {
            console.log('⚠️  No se encontraron tablas de Contribuyentes. Verifica el script SQL.');
        }

        // Verificar vistas
        console.log('\n👁️  Verificando vistas creadas...');
        const viewsCommand = `${sqliteCommand} "${DB_PATH}" "SELECT name FROM sqlite_master WHERE type = 'view' AND name LIKE 'v_%contributor%' ORDER BY name;"`;

        try {
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
        } catch (error) {
            // Ignorar errores en vistas
        }

        // Verificar triggers
        console.log('\n⚡ Verificando triggers creados...');
        const triggersCommand = `${sqliteCommand} "${DB_PATH}" "SELECT name FROM sqlite_master WHERE type = 'trigger' AND (name LIKE '%contributor%' OR name LIKE '%compliance%') ORDER BY name;"`;

        try {
            const { stdout: triggersOutput } = await execAsync(triggersCommand);
            if (triggersOutput && triggersOutput.trim()) {
                console.log('✅ Triggers creados:');
                const triggers = triggersOutput.trim().split('\n');
                triggers.forEach(trigger => {
                    if (trigger.trim()) {
                        console.log(`  - ${trigger}`);
                    }
                });
            }
        } catch (error) {
            // Ignorar errores en triggers
        }

        // Verificar configuración inicial
        const configCommand = `${sqliteCommand} "${DB_PATH}" "SELECT COUNT(*) FROM contributor_metrics WHERE date = date('now');"`;

        try {
            const { stdout: configOutput } = await execAsync(configCommand);
            if (configOutput && configOutput.trim() && configOutput.trim() !== '0') {
                console.log('\n⚙️  Configuración inicial instalada ✅');
            }
        } catch (error) {
            console.warn('\n⚠️  No se pudo verificar la configuración inicial');
        }

        // Insertar datos de prueba si está en modo desarrollo
        if (process.env.NODE_ENV === 'development') {
            console.log('\n🧪 Insertando datos de prueba...');

            const testDataCommand = `${sqliteCommand} "${DB_PATH}" "
            INSERT OR IGNORE INTO contributors (cuit, business_name, email, phone, address, category, arca_status, compliance_status, compliance_score) VALUES
            ('20-12345678-9', 'Empresa Ejemplo SRL', 'contacto@ejemplo.com', '11-1234-5678', 'Av. Corrientes 1234, CABA', 'Servicios', 'green', 'compliant', 95.5),
            ('27-87654321-3', 'Consultora ABC SA', 'info@consultoraabc.com', '11-8765-4321', 'Av. Santa Fe 5678, CABA', 'Servicios', 'yellow', 'partial', 75.2),
            ('30-55555555-5', 'Servicios Integrales SRL', 'admin@servicios.com', '11-5555-5555', 'Av. Rivadavia 9876, CABA', 'Comercio', 'red', 'non_compliant', 45.8);
            "`;

            try {
                await execAsync(testDataCommand);
                console.log('✅ Datos de prueba insertados');
            } catch (error) {
                console.warn('⚠️  Error insertando datos de prueba:', error.message);
            }
        }

        console.log('\n🎉 Migración de Contribuyentes completada exitosamente!');
        console.log('\n📋 Próximos pasos:');
        console.log('1. Copiar los componentes React proporcionados a src/client/components/contributors/');
        console.log('2. Copiar el hook useContributors.js a src/client/hooks/');
        console.log('3. Copiar el servicio contributors-service.js a src/client/services/');
        console.log('4. Actualizar AfipMonitorEnhanced.jsx con la nueva vista de Contribuyentes');
        console.log('5. Configurar las variables de entorno para ARCA API');
        console.log('6. Reiniciar el servidor para cargar las nuevas funcionalidades');
        console.log('\n🔗 Funcionalidades disponibles:');
        console.log('- ✅ Gestión de contribuyentes/clientes');
        console.log('- ✅ Importación individual y en lote');
        console.log('- ✅ Monitoreo de compliance y ARCA');
        console.log('- ✅ Gestión de facturas por cliente');
        console.log('- ✅ Alertas automáticas');
        console.log('- ✅ Métricas y reportes');

    } catch (error) {
        console.error('\n❌ Error durante la migración:', error.message);

        if (error.message.includes('command not found') || error.message.includes('sqlite3')) {
            console.error('\n💡 Solución alternativa:');
            console.error('1. Instala sqlite3 en tu sistema');
            console.error('2. O ejecuta manualmente:');
            console.error(`   sqlite3 ${DB_PATH} < ${SCHEMA_PATH}`);
        }

        process.exit(1);
    }
}

// Función para mostrar estadísticas de la base de datos
async function showDatabaseStats() {
    try {
        const sqliteCommand = 'sqlite3';

        console.log('\n📊 Estadísticas de la base de datos:');

        // Contar tablas totales
        const tablesCommand = `${sqliteCommand} "${DB_PATH}" "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table';"`;
        const { stdout: tablesCount } = await execAsync(tablesCommand);
        console.log(`   - Tablas totales: ${tablesCount.trim()}`);

        // Contar vistas
        const viewsCommand = `${sqliteCommand} "${DB_PATH}" "SELECT COUNT(*) FROM sqlite_master WHERE type = 'view';"`;
        const { stdout: viewsCount } = await execAsync(viewsCommand);
        console.log(`   - Vistas: ${viewsCount.trim()}`);

        // Contar triggers
        const triggersCommand = `${sqliteCommand} "${DB_PATH}" "SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger';"`;
        const { stdout: triggersCount } = await execAsync(triggersCommand);
        console.log(`   - Triggers: ${triggersCount.trim()}`);

        // Tamaño de la base de datos
        const stats = fs.statSync(DB_PATH);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`   - Tamaño: ${sizeInMB} MB`);

        // Contar contribuyentes si existe la tabla
        try {
            const contributorsCommand = `${sqliteCommand} "${DB_PATH}" "SELECT COUNT(*) FROM contributors WHERE deleted_at IS NULL;"`;
            const { stdout: contributorsCount } = await execAsync(contributorsCommand);
            console.log(`   - Contribuyentes activos: ${contributorsCount.trim()}`);
        } catch (error) {
            // Tabla no existe aún
        }

    } catch (error) {
        console.warn('⚠️  No se pudieron obtener estadísticas de la base de datos');
    }
}

// Función para verificar integridad de la base de datos
async function checkDatabaseIntegrity() {
    try {
        const sqliteCommand = 'sqlite3';
        console.log('\n🔍 Verificando integridad de la base de datos...');

        const integrityCommand = `${sqliteCommand} "${DB_PATH}" "PRAGMA integrity_check;"`;
        const { stdout: integrityResult } = await execAsync(integrityCommand);

        if (integrityResult.trim() === 'ok') {
            console.log('✅ Integridad de la base de datos: OK');
        } else {
            console.warn('⚠️  Problemas de integridad encontrados:');
            console.warn(integrityResult);
        }

    } catch (error) {
        console.warn('⚠️  No se pudo verificar la integridad de la base de datos');
    }
}

// Función para hacer backup de la base de datos
async function backupDatabase() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${DB_PATH}.backup-${timestamp}`;

        console.log('\n💾 Creando backup de la base de datos...');

        fs.copyFileSync(DB_PATH, backupPath);
        console.log(`✅ Backup creado: ${backupPath}`);

        return backupPath;

    } catch (error) {
        console.warn('⚠️  No se pudo crear backup de la base de datos');
        return null;
    }
}

// Función principal con opciones
async function main() {
    const args = process.argv.slice(2);

    // Crear backup antes de la migración si la base de datos existe
    if (fs.existsSync(DB_PATH) && !args.includes('--no-backup')) {
        await backupDatabase();
    }

    // Ejecutar migración
    await runMigration();

    // Mostrar estadísticas si se solicita
    if (args.includes('--stats')) {
        await showDatabaseStats();
    }

    // Verificar integridad si se solicita
    if (args.includes('--check')) {
        await checkDatabaseIntegrity();
    }
}

// Ejecutar script principal
main().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
}); 