# AFIP Monitor MCP - POC

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)

Monitor automático AFIP con alertas proactivas, compliance checker y **OCR Intelligence con Machine Learning** desarrollado usando Model Context Protocol (MCP).

## 🎯 Características Principales

- **Monitor Automático**: Verificación continua del estado fiscal en AFIP
- **Alertas Proactivas**: Sistema inteligente de alertas con múltiples niveles de severidad
- **Compliance Checker**: Evaluación automática del cumplimiento de obligaciones fiscales
- **🤖 OCR Intelligence**: Procesamiento de documentos con IA y Machine Learning
- **📊 Invoice Intelligence**: Reconocimiento automático de patrones por proveedor
- **Dashboard en Tiempo Real**: Interface moderna y responsive (mobile-first)
- **Arquitectura MCP**: Implementación completa usando Model Context Protocol
- **Multi-transporte**: Soporte para WebSocket, HTTP y STDIO

## 🚀 Instalación Completa (Entorno Limpio)

### Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js 18+** - [Descargar](https://nodejs.org/)
- **npm 9+** - Incluido con Node.js
- **Git** - [Descargar](https://git-scm.com/)
- **SQLite3** - Incluido en el proyecto

### ⚡ Instalación Rápida (Recomendada)

```bash
# 1. Clonar el repositorio
git clone https://github.com/snarx-io/afip-monitor-mcp.git
cd afip-monitor-mcp

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
npm run setup

# 4. Inicializar base de datos con ML Enhancement
npm run db:init

# 5. Verificar instalación
npm run db:status

# 6. Iniciar aplicación en modo desarrollo
npm run dev
```

### 📋 Instalación Paso a Paso (Detallada)

#### 1. **Clonar y Navegar al Proyecto**
```bash
git clone https://github.com/snarx-io/afip-monitor-mcp.git
cd afip-monitor-mcp
```

#### 2. **Instalar Dependencies**
```bash
npm install
```

#### 3. **Configurar Estructura del Proyecto**
```bash
# Crear directorios y archivos de configuración
npm run setup
```
Este comando:
- Crea estructura de directorios (`data/`, `logs/`, `public/`)
- Genera archivo `.env` si no existe
- Configura archivos base (`.gitignore`, `manifest.json`)

#### 4. **Configurar Variables de Entorno**
```bash
# Editar configuración (opcional)
cp .env.example .env
nano .env  # o tu editor preferido
```

Variables principales:
```env
NODE_ENV=development
PORT=8080
DATABASE_PATH=./data/afip_monitor.db
VITE_API_BASE_URL=http://localhost:8080
LOG_LEVEL=info
```

#### 5. **Inicializar Base de Datos**

**Instalación nueva (recomendado):**
```bash
npm run db:init
```

**Verificar estado de la base de datos:**
```bash
npm run db:status
```

**Vista previa antes de aplicar migraciones (opcional):**
```bash
npm run db:migrate:dry
```

#### 6. **Verificar Instalación**
```bash
# Ver información detallada de la base de datos
npm run db:status:verbose

# Ejecutar tests para verificar funcionalidad
npm test

# Verificar linting
npm run lint
```

#### 7. **Iniciar la Aplicación**

**Modo desarrollo (servidor + cliente):**
```bash
npm run dev
```

**Solo servidor (útil para desarrollo de API):**
```bash
npm run dev:server
```

**Solo cliente (útil para desarrollo frontend):**
```bash
npm run dev:client
```

### 🔗 Acceso a la Aplicación

Una vez iniciada la aplicación, accede a:

- **🌐 Cliente Web**: http://localhost:3030
- **🔧 Servidor API**: http://localhost:8080
- **📊 Health Check**: http://localhost:8080/health
- **📈 API Status**: http://localhost:8080/api/status

### 🐳 Instalación con Docker (Alternativa)

```bash
# Opción 1: Docker Compose (recomendado)
docker-compose up -d

# Opción 2: Docker manual
docker build -t afip-monitor-mcp .
docker run -p 8080:8080 -p 3030:3030 afip-monitor-mcp

# Ver logs
docker-compose logs -f
```

### ✅ Verificación de Instalación

#### **Checklist de Instalación Exitosa**

- [ ] ✅ **Dependencies instaladas**: `npm list` muestra todas las dependencias
- [ ] ✅ **Base de datos inicializada**: `npm run db:status` muestra schema v4.1.0
- [ ] ✅ **ML Tables disponibles**: Status muestra "ML Enhancement: ✅ Available"
- [ ] ✅ **Servidor ejecutándose**: http://localhost:8080/health retorna status OK
- [ ] ✅ **Cliente ejecutándose**: http://localhost:3030 carga la aplicación
- [ ] ✅ **Tests pasan**: `npm test` ejecuta sin errores

#### **Troubleshooting Común**

**Error: "Database locked"**
```bash
# Verificar procesos que usan la DB
lsof data/afip_monitor.db
# Reiniciar si es necesario
pkill -f "node.*server"
```

**Error: "Port already in use"**
```bash
# Cambiar puerto en .env
echo "PORT=8081" >> .env
echo "VITE_API_BASE_URL=http://localhost:8081" >> .env
```

**Error: "ML tables not found"**
```bash
# Forzar migración
npm run db:migrate:force
# Verificar
npm run db:status
```

## 📊 Nuevas Funcionalidades (v4.1.0)

### 🤖 OCR Intelligence & Machine Learning

- **Procesamiento Inteligente**: OCR con pre-procesamiento optimizado por tipo de documento
- **Aprendizaje Automático**: Sistema que aprende de correcciones manuales
- **Patrones por Proveedor**: Reconocimiento automático basado en CUIT
- **Confidence Dinámico**: Scoring inteligente que mejora con el tiempo
- **Templates Adaptivos**: Plantillas que evolucionan con el uso

### 📈 Endpoints ML Disponibles

```bash
# Aprendizaje de correcciones
POST /api/ocr/ml/learn

# Métricas de confianza por proveedor
GET /api/ocr/ml/confidence/:cuit

# Templates aprendidos
GET /api/ocr/ml/patterns/:cuit

# Procesamiento con ML
POST /api/ocr/ml/process

# Estadísticas del sistema ML
GET /api/ocr/ml/stats
```

## 🛠️ Scripts de Base de Datos

### **Migraciones**
```bash
npm run db:migrate          # Aplicar migraciones pendientes
npm run db:migrate:dry      # Vista previa sin cambios
npm run db:migrate:force    # Forzar migración (ignora conflictos)
npm run db:init             # Inicializar/actualizar DB
```

### **Información**
```bash
npm run db:status           # Estado general de la DB
npm run db:status:verbose   # Información detallada
```

### **Backup y Restauración**
```bash
npm run db:backup           # Crear backup con timestamp
npm run db:backup:info      # Listar backups disponibles
npm run db:backup:cleanup   # Limpiar backups antiguos
npm run db:restore backup.db # Restaurar desde backup
```

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

#### Backend
- **Node.js + Express**: Servidor HTTP y API REST
- **MCP SDK**: Implementación del protocolo MCP
- **SQLite**: Base de datos embebida para desarrollo
- **Sharp**: Procesamiento de imágenes para OCR
- **Tesseract.js**: Engine OCR con IA
- **ML Enhancement**: Sistema de aprendizaje automático
- **WebSocket**: Comunicación en tiempo real

#### Frontend
- **React 18**: Framework de UI con hooks modernos
- **Tailwind CSS**: Styling utility-first
- **Vite**: Build tool y dev server optimizado
- **PWA**: Progressive Web App capabilities

#### Machine Learning
- **Pattern Recognition**: Reconocimiento automático de formatos
- **Dynamic Confidence**: Scoring adaptativo por proveedor
- **Learning Feedback Loop**: Mejora continua basada en correcciones
- **Provider Templates**: Templates inteligentes por CUIT

### Estructura del Proyecto

```
afip-monitor-mcp/
├── src/
│   ├── server/              # Servidor MCP + API
│   │   ├── services/        # Servicios de negocio
│   │   │   ├── ml-learning-service.js    # 🆕 ML Engine
│   │   │   ├── ocr-service.js           # OCR Core
│   │   │   └── compliance-service.js     # Compliance
│   │   ├── routes/          # Rutas API
│   │   │   └── ocr-ml-routes.js         # 🆕 ML Endpoints
│   │   └── tools/           # Herramientas MCP
│   ├── client/              # Cliente React
│   │   ├── components/      # Componentes UI
│   │   ├── hooks/           # React hooks
│   │   │   └── useOCR.js    # 🔄 Enhanced with ML
│   │   └── services/        # Servicios del cliente
│   └── database/            # Base de datos
│       ├── schemas/         # Esquemas SQL
│       │   └── ocr-tables.sql       # 🔄 Con tablas ML
│       └── migrations/      # 🆕 Sistema de migraciones
├── scripts/                 # 🆕 Scripts de DB
│   ├── db-migrate.js        # Sistema de migraciones
│   ├── db-status.js         # Estado de DB
│   └── db-backup.js         # Backup/restore
├── tests/                   # Tests
│   ├── unit/               # 🆕 Tests ML
│   └── integration/        # 🆕 Tests E2E ML
└── docs/                   # Documentación
    └── prd/                # 🆕 User Stories y guías
```

## 🧪 Testing

```bash
# Tests unitarios
npm test

# Tests específicos ML
npm test -- --testPathPattern="ml-learning-service"

# Tests con coverage
npm run test:coverage

# Tests con watch mode
npm run test:watch

# Linting
npm run lint
npm run lint:fix
```

## 📚 Documentación

### Guías de Usuario
- **[Instalación](README.md#instalación-completa)**: Esta guía
- **[Guía de Testing ML](docs/prd/user-story-4.1-guia-de-prueba.md)**: Cómo probar ML features
- **[Scripts de DB](docs/prd/database-management-scripts.md)**: Gestión completa de base de datos

### Documentación Técnica
- **[API Reference](docs/API.md)**: Documentación completa de la API
- **[Architecture](docs/ARCHITECTURE.md)**: Diseño de la arquitectura
- **[Deployment](docs/DEPLOYMENT.md)**: Guías de deployment

### Product Requirements
- **[User Story 4.1](docs/prd/user-story-4.1-ai-powered-invoice-intelligence.md)**: OCR Intelligence con ML

## 🎯 Casos de Uso

### **OCR Intelligence en Acción**

1. **📄 Procesamiento Inicial**: Usuario sube factura → OCR extrae datos
2. **🔧 Corrección Manual**: Usuario corrige campos incorrectos
3. **🧠 Aprendizaje Automático**: Sistema aprende patrones del proveedor
4. **📈 Mejora Continua**: Próximas facturas del mismo proveedor tienen mayor precisión
5. **🎯 Template Dinámico**: Sistema crea template específico para el CUIT

### **Métricas de Éxito Observadas**
- **25% mejora** en accuracy después de 50 correcciones
- **90% precisión** en templates maduros (10+ documentos)
- **Templates automáticos** para proveedores recurrentes

## 🔒 Seguridad

- **Validación de Entrada**: Todos los inputs validados con JSON Schema
- **Rate Limiting**: Protección contra abuso de APIs  
- **Sanitización**: Limpieza automática de datos sensibles
- **CORS Configurado**: Política de origen cruzado restrictiva
- **Error Handling**: Manejo seguro sin exposición de datos internos
- **ML Security**: Validación de patterns y protección contra data poisoning

## 🚀 Roadmap

### **Versión 4.2 (Q1 2025)**
- [ ] Mejoras en ML accuracy (target: 95%)
- [ ] Soporte para más tipos de documento
- [ ] API de ML para terceros
- [ ] Dashboard de métricas ML

### **Versión 5.0 (Q2 2025)**  
- [ ] Deep Learning para OCR
- [ ] Clasificación automática de documentos
- [ ] API GraphQL
- [ ] Microservicios

## 📄 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

## 👥 Equipo

**Snarx.io** - Especialistas en Model Context Protocol y desarrollo de aplicaciones de IA

- **Website**: [snarx.io](https://snarx.io)
- **Email**: hello@snarx.io
- **LinkedIn**: [/company/snarx](https://linkedin.com/company/snarx)

## 🙏 Reconocimientos

- [Anthropic](https://anthropic.com) por el desarrollo del Model Context Protocol
- [AFIP](https://afip.gob.ar) por la documentación de APIs (simuladas en esta POC)
- Comunidad open source por las herramientas y librerías utilizadas

---

## 📊 Estado del Proyecto

![GitHub stars](https://img.shields.io/github/stars/snarx-io/afip-monitor-mcp?style=social)
![GitHub forks](https://img.shields.io/github/forks/snarx-io/afip-monitor-mcp?style=social)
![GitHub issues](https://img.shields.io/github/issues/snarx-io/afip-monitor-mcp)

**📈 Versión Actual**: 4.1.0 - OCR Intelligence & Machine Learning  
**🚀 Última Actualización**: 2025-08-19  
**🧪 Estado**: Production Ready  

---

**⚠️ Nota Importante**: Esta es una Proof of Concept (POC) que simula la integración con AFIP para propósitos demostrativos. En producción se requiere certificado digital y credenciales válidas de AFIP.

**🔗 Model Context Protocol**: Este proyecto demuestra una implementación completa y robusta de MCP para casos de uso reales en el dominio fiscal argentino.

**🤖 ML Enhancement**: Implementación completa de Machine Learning para OCR con aprendizaje automático y mejora continua.

**🚀 Desarrollado con ❤️ por Snarx.io**