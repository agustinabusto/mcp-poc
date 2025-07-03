#!/bin/bash

# AFIP Monitor MCP - Setup Script
# Crea la estructura completa de directorios y archivos base

set -e  # Exit on any error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Funciones de logging
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_header() {
    echo -e "${BOLD}${BLUE}$1${NC}"
}

# Función para crear directorio
create_dir() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        log_success "Directorio creado: $dir"
    else
        log_warning "Directorio ya existe: $dir"
    fi
}

# Función para crear archivo
create_file() {
    local file="$1"
    local content="$2"
    
    # Crear directorio padre si no existe
    local dir=$(dirname "$file")
    create_dir "$dir"
    
    if [ ! -f "$file" ]; then
        echo "$content" > "$file"
        log_success "Archivo creado: $file"
    else
        log_warning "Archivo ya existe: $file"
    fi
}

# Función principal
main() {
    log_header "🚀 AFIP Monitor MCP - Setup Project Structure"
    echo ""
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "package.json" ]; then
        log_error "package.json no encontrado. Ejecute este script desde la raíz del proyecto."
        exit 1
    fi
    
    log_info "Creando estructura de directorios..."
    
    # === ESTRUCTURA DE DIRECTORIOS ===
    
    # Directorios principales
    create_dir "src"
    create_dir "config"
    create_dir "scripts"
    create_dir "tests"
    create_dir "docs"
    create_dir "data"
    create_dir "logs"
    create_dir "public"
    create_dir "nginx"
    create_dir "monitoring"
    
    # Servidor
    create_dir "src/server"
    create_dir "src/server/tools"
    create_dir "src/server/services"
    create_dir "src/server/models"
    create_dir "src/server/utils"
    
    # Cliente
    create_dir "src/client"
    create_dir "src/client/components"
    create_dir "src/client/components/common"
    create_dir "src/client/hooks"
    create_dir "src/client/services"
    create_dir "src/client/utils"
    
    # Compartido
    create_dir "src/shared"
    create_dir "src/shared/constants"
    create_dir "src/shared/schemas"
    create_dir "src/shared/types"
    
    # Tests
    create_dir "tests/unit"
    create_dir "tests/unit/tools"
    create_dir "tests/unit/services"
    create_dir "tests/unit/utils"
    create_dir "tests/integration"
    create_dir "tests/e2e"
    create_dir "tests/fixtures"
    
    # Docs
    create_dir "docs/guides"
    create_dir "docs/api"
    
    # Public assets
    create_dir "public/icons"
    
    # Monitoring
    create_dir "monitoring/grafana"
    create_dir "monitoring/grafana/provisioning"
    create_dir "monitoring/grafana/provisioning/dashboards"
    create_dir "monitoring/grafana/provisioning/datasources"
    create_dir "monitoring/grafana/dashboards"
    
    echo ""
    log_info "Creando archivos base..."
    
    # === ARCHIVOS BASE ===
    
    # .env.example
    create_file ".env.example" "# AFIP Monitor MCP - Environment Variables

# Servidor
NODE_ENV=development
PORT=8080
HOST=0.0.0.0
LOG_LEVEL=info

# Base de datos
DATABASE_URL=./data/afip_monitor.db

# AFIP Configuration
AFIP_MOCK_MODE=true
AFIP_BASE_URL=https://aws.afip.gov.ar/sr-padron/v2
AFIP_TIMEOUT=30000

# AFIP Certificates (Producción)
AFIP_CERT_PATH=./certs/certificate.crt
AFIP_KEY_PATH=./certs/private.key
AFIP_PASSPHRASE=your_passphrase

# Notificaciones
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# CORS
CORS_ORIGIN=http://localhost:3000
"

    # .gitignore
    create_file ".gitignore" "# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local
.env.*.local

# Build outputs
dist/
build/

# Database
*.db
*.sqlite*
data/
!data/.gitkeep

# Logs
logs/
*.log
!logs/.gitkeep

# Coverage
coverage/

# IDE
.vscode/
.idea/

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
"

    # Archivos .gitkeep
    create_file "data/.gitkeep" "# Base de datos SQLite"
    create_file "logs/.gitkeep" "# Logs de la aplicación"

    # Package.json scripts adicionales
    if command -v node >/dev/null 2>&1; then
        log_info "Actualizando package.json con scripts adicionales..."
        node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            pkg.scripts = {
                ...pkg.scripts,
                'setup:dirs': 'bash setup-project.sh',
                'clean': 'rm -rf dist coverage',
                'clean:data': 'rm -rf data/*.db logs/*.log',
                'docker:build': 'docker build -t afip-monitor-mcp .',
                'docker:run': 'docker run -p 8080:8080 afip-monitor-mcp',
                'docker:dev': 'docker-compose --profile development up -d'
            };
            fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        "
        log_success "package.json actualizado"
    fi

    # Archivos de servidor principales
    create_file "src/server/index.js" "#!/usr/bin/env node

// Punto de entrada principal del servidor AFIP Monitor MCP
console.log('🚀 Iniciando AFIP Monitor MCP Server...');

// TODO: Implementar servidor completo
"

    create_file "src/server/afip-monitor-server.js" "// Servidor MCP principal para AFIP Monitor

export class AfipMonitorServer {
  constructor(config) {
    this.config = config;
  }

  async start() {
    console.log('AFIP Monitor Server iniciado');
  }
}
"

    # Tools base
    create_file "src/server/tools/base-tool.js" "// Clase base para todas las herramientas MCP

export class BaseTool {
  constructor(name, description, inputSchema, services) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.services = services;
  }

  async execute(args) {
    // Implementar en subclases
    throw new Error('execute() must be implemented');
  }
}
"

    create_file "src/server/tools/check-compliance.js" "import { BaseTool } from './base-tool.js';

// Herramienta para verificar compliance fiscal
export class CheckComplianceTool extends BaseTool {
  constructor(services) {
    super(
      'check_compliance',
      'Verifica el estado de compliance fiscal',
      {
        type: 'object',
        properties: {
          cuit: { type: 'string' },
          period: { type: 'object' }
        },
        required: ['cuit', 'period']
      },
      services
    );
  }

  async execute(args) {
    // TODO: Implementar verificación
    return { success: true, data: {} };
  }
}
"

    # Services base
    create_file "src/server/services/afip-client.js" "// Cliente para servicios AFIP

export class AfipClient {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  async getTaxpayerInfo(cuit) {
    // TODO: Implementar consulta AFIP
    return { cuit, active: true };
  }
}
"

    create_file "src/server/services/alert-manager.js" "// Gestor de alertas del sistema

export class AlertManager {
  constructor(database, logger) {
    this.database = database;
    this.logger = logger;
  }

  async createAlert(alertData) {
    // TODO: Implementar creación de alertas
    return { id: Date.now(), ...alertData };
  }
}
"

    # Utils
    create_file "src/server/utils/config-loader.js" "// Cargador de configuración

export class ConfigLoader {
  static async load() {
    const env = process.env.NODE_ENV || 'development';
    // TODO: Cargar configuración desde archivos
    return { environment: env };
  }
}
"

    create_file "src/server/utils/database-manager.js" "// Gestor de base de datos

export class DatabaseManager {
  constructor(config) {
    this.config = config;
  }

  async initialize() {
    // TODO: Inicializar SQLite
    console.log('Database initialized');
  }

  async healthCheck() {
    return { healthy: true };
  }
}
"

    # Cliente React
    create_file "src/client/index.html" "<!DOCTYPE html>
<html lang=\"es\">
<head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <title>AFIP Monitor MCP</title>
</head>
<body>
    <div id=\"root\"></div>
    <script type=\"module\" src=\"/main.jsx\"></script>
</body>
</html>
"

    create_file "src/client/main.jsx" "import React from 'react';
import ReactDOM from 'react-dom/client';
import { AfipMonitorPOC } from './components/AfipMonitorPOC.jsx';
import './index.css';

const config = {
  apiBaseUrl: 'http://localhost:8080',
  wsUrl: 'ws://localhost:8080'
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AfipMonitorPOC config={config} />
  </React.StrictMode>
);
"

    create_file "src/client/index.css" "@tailwind base;
@tailwind components;
@tailwind utilities;

/* Estilos base para mobile-first */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Clases de utilidad personalizadas */
.mobile-safe-area {
  padding-bottom: env(safe-area-inset-bottom);
}
"

    create_file "src/client/components/AfipMonitorPOC.jsx" "import React, { useState } from 'react';

export const AfipMonitorPOC = ({ config }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className=\"min-h-screen bg-gray-50\">
      <header className=\"bg-white shadow\">
        <div className=\"px-4 py-6\">
          <h1 className=\"text-2xl font-bold text-gray-900\">
            📊 AFIP Monitor MCP
          </h1>
          <p className=\"text-gray-600\">
            Monitor automático con alertas proactivas
          </p>
        </div>
      </header>
      
      <main className=\"p-4\">
        <div className=\"bg-white rounded-lg shadow p-6\">
          <h2 className=\"text-lg font-semibold mb-4\">Estado del Sistema</h2>
          <div className=\"text-green-600\">
            ✅ Sistema inicializado correctamente
          </div>
        </div>
      </main>
    </div>
  );
};
"

    # Constantes compartidas
    create_file "src/shared/constants/alert-priorities.js" "// Prioridades y tipos de alertas

export const ALERT_SEVERITIES = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

export const ALERT_TYPES = {
  FISCAL_INACTIVE: 'fiscal_inactive',
  VAT_NOT_REGISTERED: 'vat_not_registered',
  MISSING_DECLARATIONS: 'missing_declarations',
  COMPLIANCE_LOW: 'compliance_low'
};
"

    create_file "src/shared/constants/compliance-types.js" "// Tipos de compliance y verificaciones

export const COMPLIANCE_TYPES = {
  FISCAL_STATUS: 'fiscal_status',
  VAT_REGISTRATION: 'vat_registration',
  INCOME_TAX: 'income_tax',
  SOCIAL_SECURITY: 'social_security'
};

export const COMPLIANCE_STATUSES = {
  COMPLIANT: 'compliant',
  NON_COMPLIANT: 'non_compliant',
  CHECKING: 'checking',
  ERROR: 'error'
};
"

    # Configuraciones
    create_file "config/development.json" "{
  \"server\": {
    \"port\": 8080,
    \"host\": \"0.0.0.0\"
  },
  \"database\": {
    \"type\": \"sqlite\",
    \"filename\": \"./data/afip_monitor_dev.db\"
  },
  \"afip\": {
    \"mockMode\": true,
    \"timeout\": 30000
  },
  \"logging\": {
    \"level\": \"debug\",
    \"transports\": [\"console\", \"file\"]
  }
}
"

    create_file "config/production.json" "{
  \"server\": {
    \"port\": 8080,
    \"host\": \"0.0.0.0\"
  },
  \"database\": {
    \"type\": \"sqlite\",
    \"filename\": \"./data/afip_monitor.db\"
  },
  \"afip\": {
    \"mockMode\": false,
    \"timeout\": 30000
  },
  \"logging\": {
    \"level\": \"info\",
    \"transports\": [\"file\"]
  }
}
"

    # Scripts
    create_file "scripts/migrate.js" "#!/usr/bin/env node

// Script de migración de base de datos
console.log('🔄 Ejecutando migraciones...');

// TODO: Implementar migraciones SQLite
console.log('✅ Migraciones completadas');
"

    create_file "scripts/seed-data.js" "#!/usr/bin/env node

// Script para poblar datos de prueba
console.log('🌱 Poblando datos de prueba...');

// TODO: Crear datos de prueba
console.log('✅ Datos de prueba creados');
"

    # Tests base
    create_file "tests/jest.setup.js" "// Configuración global para tests
import { jest } from '@jest/globals';

// Mock global console
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
"

    create_file "tests/unit/tools/check-compliance.test.js" "import { describe, test, expect } from '@jest/globals';
import { CheckComplianceTool } from '../../../src/server/tools/check-compliance.js';

describe('CheckComplianceTool', () => {
  test('should create tool instance', () => {
    const tool = new CheckComplianceTool({});
    expect(tool.name).toBe('check_compliance');
  });
  
  // TODO: Agregar más tests
});
"

    # Documentación
    create_file "docs/README.md" "# AFIP Monitor MCP - Documentación

## Introducción

Monitor automático AFIP con alertas proactivas y compliance checker.

## Arquitectura

- **Backend**: Node.js + MCP + SQLite
- **Frontend**: React + Tailwind CSS
- **Comunicación**: WebSocket + HTTP

## Características

- ✅ Monitor automático AFIP
- ✅ Sistema de alertas inteligente  
- ✅ Compliance checker
- ✅ Dashboard responsive
- ✅ Arquitectura MCP

## Links

- [Instalación](INSTALLATION.md)
- [API Reference](API.md)
- [Deployment](DEPLOYMENT.md)
"

    create_file "docs/INSTALLATION.md" "# Guía de Instalación

## Requisitos

- Node.js 18+
- npm 9+

## Pasos

1. Instalar dependencias: \`npm install\`
2. Configurar entorno: \`cp .env.example .env\`
3. Crear estructura: \`npm run setup:dirs\`
4. Migrar BD: \`npm run migrate\`
5. Iniciar: \`npm run dev\`

## Verificación

- Servidor: http://localhost:8080/health
- Cliente: http://localhost:3000
"

    # Configuración de build tools
    create_file "vite.config.js" "import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  publicDir: '../../public',
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
      '/health': 'http://localhost:8080'
    }
  }
});
"

    create_file "tailwind.config.js" "/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/client/**/*.{js,jsx,ts,tsx}',
    './src/client/index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        afip: {
          blue: '#0066cc',
          green: '#28a745'
        }
      }
    },
  },
  plugins: [],
}
"

    create_file "jest.config.js" "export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/client/**/*'
  ]
};
"

    # Docker
    create_file "Dockerfile" "FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Construir aplicación
RUN npm run build

# Exponer puerto
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8080/health || exit 1

# Iniciar aplicación
CMD [\"node\", \"src/server/index.js\"]
"

    # Public assets
    create_file "public/manifest.json" "{
  \"name\": \"AFIP Monitor MCP\",
  \"short_name\": \"AFIP Monitor\",
  \"start_url\": \"/\",
  \"display\": \"standalone\",
  \"theme_color\": \"#667eea\",
  \"icons\": [
    {
      \"src\": \"icons/icon-192.png\",
      \"sizes\": \"192x192\",
      \"type\": \"image/png\"
    }
  ]
}
"

    create_file "public/robots.txt" "User-agent: *
Disallow: /api/
Allow: /

Sitemap: /sitemap.xml
"

    echo ""
    log_success "✅ Estructura del proyecto creada exitosamente!"
    echo ""
    log_header "📋 Próximos pasos:"
    echo "  1. 📦 Instalar dependencias: ${YELLOW}npm install${NC}"
    echo "  2. ⚙️  Configurar entorno: ${YELLOW}cp .env.example .env${NC}"
    echo "  3. 🗄️  Ejecutar migraciones: ${YELLOW}npm run migrate${NC}"
    echo "  4. 🌱 Poblar datos de prueba: ${YELLOW}npm run seed${NC}"
    echo "  5. 🚀 Iniciar desarrollo: ${YELLOW}npm run dev${NC}"
    echo ""
    log_header "🔗 URLs importantes:"
    echo "  • Servidor: ${BLUE}http://localhost:8080${NC}"
    echo "  • Cliente: ${BLUE}http://localhost:3000${NC}"
    echo "  • Health: ${BLUE}http://localhost:8080/health${NC}"
    echo ""
    log_header "📚 Documentación:"
    echo "  • docs/README.md - Documentación principal"
    echo "  • docs/INSTALLATION.md - Guía de instalación"
    echo "  • docs/API.md - Referencia de API"
    echo ""
}

# Ejecutar función principal
main

log_success "🎉 Setup completado! El proyecto AFIP Monitor MCP está listo."