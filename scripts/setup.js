#!/usr/bin/env node

import { mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Configurando AFIP Monitor MCP...');

// Directorios a crear
const directories = [
    'src/client/components',
    'src/client/hooks',
    'src/client/services',
    'src/client/utils',
    'src/server/tools',
    'src/server/services',
    'src/server/models',
    'src/server/utils',
    'src/shared/constants',
    'src/shared/schemas',
    'src/shared/types',
    'data',
    'logs',
    'public/icons',
    'config',
    'tests',
    'docs'
];

// Archivos a crear
const files = [
    {
        path: 'data/.gitkeep',
        content: '# Base de datos SQLite\n'
    },
    {
        path: 'logs/.gitkeep',
        content: '# Logs de la aplicación\n'
    },
    {
        path: 'public/manifest.json',
        content: JSON.stringify({
            name: 'AFIP Monitor MCP',
            short_name: 'AFIP Monitor',
            start_url: '/',
            display: 'standalone',
            theme_color: '#0066cc',
            background_color: '#ffffff',
            icons: [
                {
                    src: 'icons/icon-192.png',
                    sizes: '192x192',
                    type: 'image/png'
                },
                {
                    src: 'icons/icon-512.png',
                    sizes: '512x512',
                    type: 'image/png'
                }
            ]
        }, null, 2)
    },
    {
        path: 'public/robots.txt',
        content: 'User-agent: *\nDisallow: /api/\nAllow: /\n\nSitemap: /sitemap.xml\n'
    },
    {
        path: 'postcss.config.js',
        content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};`
    },
    {
        path: '.gitignore',
        content: `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
coverage/

# Database
*.db
*.sqlite*
data/
!data/.gitkeep

# Logs
logs/
*.log
!logs/.gitkeep

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Certificates
certs/
*.pem
*.crt
*.key

# Temporary
tmp/
temp/
.cache/
`
    }
];

async function createDirectory(dirPath) {
    try {
        await mkdir(join(rootDir, dirPath), { recursive: true });
        console.log(`✅ Directorio creado: ${dirPath}`);
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error(`❌ Error creando directorio ${dirPath}:`, error.message);
        }
    }
}

async function createFile(filePath, content) {
    try {
        const fullPath = join(rootDir, filePath);

        // Verificar si el archivo ya existe
        try {
            await access(fullPath);
            console.log(`⚠️  Archivo ya existe: ${filePath}`);
            return;
        } catch {
            // El archivo no existe, continuar con la creación
        }

        await writeFile(fullPath, content);
        console.log(`✅ Archivo creado: ${filePath}`);
    } catch (error) {
        console.error(`❌ Error creando archivo ${filePath}:`, error.message);
    }
}

async function main() {
    try {
        // Crear directorios
        console.log('\n📁 Creando estructura de directorios...');
        for (const dir of directories) {
            await createDirectory(dir);
        }

        // Crear archivos
        console.log('\n📄 Creando archivos de configuración...');
        for (const file of files) {
            await createFile(file.path, file.content);
        }

        // Crear .env si no existe
        try {
            await access(join(rootDir, '.env'));
            console.log('⚠️  .env ya existe');
        } catch {
            try {
                await access(join(rootDir, '.env.example'));
                console.log('📋 Copiando .env.example a .env...');
                const { readFile } = await import('fs/promises');
                const envContent = await readFile(join(rootDir, '.env.example'), 'utf8');
                await writeFile(join(rootDir, '.env'), envContent);
                console.log('✅ .env creado desde .env.example');
            } catch {
                console.log('⚠️  .env.example no encontrado, creando .env básico...');
                await createFile('.env', `NODE_ENV=development
PORT=8080
HOST=0.0.0.0
LOG_LEVEL=info
DATABASE_URL=./data/afip_monitor.db
AFIP_MOCK_MODE=true
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
CORS_ORIGIN=http://localhost:3000
`);
            }
        }

        console.log('\n🎉 Setup completado exitosamente!');
        console.log('\n📋 Próximos pasos:');
        console.log('  1. 📦 Instalar dependencias: npm install');
        console.log('  2. 🚀 Iniciar en desarrollo: npm run dev');
        console.log('  3. 🌐 Abrir en navegador: http://localhost:3000');
        console.log('\n🔗 URLs importantes:');
        console.log('  • Cliente: http://localhost:3000');
        console.log('  • Servidor: http://localhost:8080');
        console.log('  • Health: http://localhost:8080/health');
        console.log('  • API Status: http://localhost:8080/api/status');

    } catch (error) {
        console.error('❌ Error durante el setup:', error);
        process.exit(1);
    }
}

main();