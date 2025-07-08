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
const SCHEMA_PATH = path.join(__dirname, 'schemas', 'ocr-tables.sql');

console.log('🚀 Iniciando migración de tablas OCR...');
console.log(`📂 Base de datos: ${DB_PATH}`);
console.log(`📄 Schema: ${SCHEMA_PATH}`);

async function runMigration() {
    try {
        // Verificar que existe el archivo de schema
        if (!fs.existsSync(SCHEMA_PATH)) {
            console.error('❌ Error: No se encontró el archivo de schema OCR');
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

        const verifyCommand = `${sqliteCommand} "${DB_PATH}" "SELECT name, type FROM sqlite_master WHERE type = 'table' AND (name LIKE '%ocr%' OR name LIKE '%reconcil%' OR name LIKE '%categoriz%' OR name LIKE '%document%') ORDER BY name;"`;

        const { stdout: tablesOutput } = await execAsync(verifyCommand);

        if (tablesOutput && tablesOutput.trim()) {
            console.log('✅ Tablas OCR creadas:');
            const tables = tablesOutput.trim().split('\n');
            tables.forEach(table => {
                if (table.trim()) {
                    const [name, type] = table.split('|');
                    console.log(`  - ${name} (${type})`);
                }
            });
        } else {
            console.log('⚠️  No se encontraron tablas OCR. Verifica el script SQL.');
        }

        // Verificar vistas
        const viewsCommand = `${sqliteCommand} "${DB_PATH}" "SELECT name FROM sqlite_master WHERE type = 'view' AND name LIKE 'v_%' ORDER BY name;"`;

        try {
            const { stdout: viewsOutput } = await execAsync(viewsCommand);
            if (viewsOutput && viewsOutput.trim()) {
                console.log('\n👁️  Vistas creadas:');
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

        // Verificar configuración por defecto
        const configCommand = `${sqliteCommand} "${DB_PATH}" "SELECT client_id FROM client_ocr_config WHERE client_id = 'default';"`;

        try {
            const { stdout: configOutput } = await execAsync(configCommand);
            if (configOutput && configOutput.trim()) {
                console.log('\n⚙️  Configuración por defecto instalada ✅');
            }
        } catch (error) {
            console.warn('\n⚠️  No se pudo verificar la configuración por defecto');
        }

        console.log('\n🎉 Migración OCR completada exitosamente!');
        console.log('\n📋 Próximos pasos:');
        console.log('1. Instalar dependencias OCR: npm install tesseract.js sharp openai multer');
        console.log('2. Configurar OPENAI_API_KEY en tu .env.local');
        console.log('3. Activar feature flags de OCR en .env.local');
        console.log('4. Reiniciar el servidor para cargar las nuevas funcionalidades');

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

// Ejecutar migración
runMigration();