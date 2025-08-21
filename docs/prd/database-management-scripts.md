# 🗄️ Database Management Scripts

Sistema completo de gestión de base de datos para AFIP Monitor MCP con soporte para migraciones seguras, backups automáticos y preservación de datos.

## 📋 Scripts Disponibles

### 🔄 Migraciones

| Script | Comando | Descripción |
|--------|---------|-------------|
| **Migración Principal** | `npm run db:migrate` | Aplica todas las migraciones pendientes con backup automático |
| **Vista Previa** | `npm run db:migrate:dry` | Muestra qué cambios se aplicarían SIN ejecutarlos |
| **Forzar Migración** | `npm run db:migrate:force` | Aplica migraciones ignorando conflictos potenciales |
| **Inicialización** | `npm run db:init` | Alias para `db:migrate` - inicializa o actualiza DB |

### 📊 Estado y Monitoreo

| Script | Comando | Descripción |
|--------|---------|-------------|
| **Estado Básico** | `npm run db:status` | Información general de la base de datos |
| **Estado Detallado** | `npm run db:status:verbose` | Información completa incluyendo estructura de tablas |

### 💾 Backup y Restauración

| Script | Comando | Descripción |
|--------|---------|-------------|
| **Crear Backup** | `npm run db:backup` | Crea backup con timestamp y limpia backups antiguos |
| **Info Backups** | `npm run db:backup:info` | Lista todos los backups disponibles |
| **Limpiar Backups** | `npm run db:backup:cleanup` | Elimina backups antiguos (mantiene últimos 10) |
| **Restaurar** | `npm run db:restore backup-file.db` | Restaura desde un backup específico |

## 🚀 Uso Básico

### Inicialización de Base de Datos Nueva
```bash
# Inicializar base de datos con todos los schemas
npm run db:init

# Verificar que se aplicó correctamente
npm run db:status
```

### Aplicar Nuevas Migraciones
```bash
# Ver qué cambios se aplicarían (recomendado)
npm run db:migrate:dry

# Aplicar las migraciones
npm run db:migrate

# Verificar el resultado
npm run db:status
```

### Manejo de Backups
```bash
# Crear backup manual
npm run db:backup

# Ver backups disponibles
npm run db:backup:info

# Restaurar desde backup específico
npm run db:restore afip_monitor_backup_2025-08-19T10-30-00-000Z.db
```

## 🔍 Ejemplos de Uso

### Escenario 1: Primera Instalación
```bash
# 1. Configurar proyecto
npm run setup

# 2. Inicializar base de datos
npm run db:init

# 3. Verificar instalación
npm run db:status
```

**Salida esperada:**
```
📊 Database Status: ✅ Healthy
📋 Schema Version: 4.1.0 
📊 Tables: 15 total
🤖 ML Enhancement: ✅ Available
```

### Escenario 2: Actualización de Schema
```bash
# 1. Ver estado actual
npm run db:status

# 2. Vista previa de cambios
npm run db:migrate:dry

# 3. Aplicar migración
npm run db:migrate

# 4. Verificar actualización
npm run db:status:verbose
```

### Escenario 3: Backup Antes de Cambios Importantes
```bash
# 1. Crear backup de seguridad
npm run db:backup

# 2. Aplicar cambios
npm run db:migrate

# 3. Si algo sale mal, restaurar
npm run db:restore backup-file.db
```

## 🛡️ Características de Seguridad

### ✅ Preservación de Datos
- **Backup Automático**: Se crea backup antes de cada migración
- **Detección de Conflictos**: Advierte sobre posible pérdida de datos
- **Verificación de Integridad**: Valida la base de datos después de cada operación

### ✅ Versionado Inteligente
- **Tracking de Versión**: Tabla `schema_version` rastrea todas las migraciones aplicadas
- **Migración Incremental**: Solo aplica cambios nuevos
- **Idempotencia**: Seguro ejecutar múltiples veces

### ✅ Modo Seguro
- **Dry-run**: Previsualizar cambios sin aplicarlos
- **Rollback**: Restaurar desde backups automáticos
- **Validación**: Verifica integridad antes y después de operaciones

## 📊 Información Técnica

### Estructura de Archivos
```
scripts/
├── db-migrate.js      # Sistema principal de migraciones
├── db-status.js       # Herramienta de información
├── db-backup.js       # Sistema de backup/restore
└── migrate.js         # Wrapper legacy

src/database/
├── schemas/           # Schemas SQL principales
│   ├── contributors-tables.sql
│   ├── compliance-monitoring-tables.sql
│   └── ocr-tables.sql (incluye tablas ML v4.1)
└── migrations/        # Migraciones incrementales futuras
    └── YYYY-MM-DD-HHmm-description.sql

data/
├── afip_monitor.db    # Base de datos principal
└── backups/          # Backups automáticos
    └── afip_monitor_backup_*.db
```

### Esquemas Incluidos (v4.1.0)

1. **Contributors Module**
   - Gestión de contribuyentes/clientes
   - Estados ARCA y compliance
   - Información de contacto y categorización

2. **Compliance Monitoring**
   - Monitoreo de compliance fiscal
   - Sistema de alertas predictivas
   - Configuración de polling inteligente

3. **OCR + ML Enhancement** ⭐ 
   - Procesamiento OCR de documentos
   - **Machine Learning**: Patrones aprendidos por proveedor
   - **Intelligence**: Correcciones y mejora automática
   - **Performance**: Métricas y optimización

### Tabla de Versiones
| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 4.1.0 | 2025-08-19 | ML Enhancement - AI-Powered Invoice Intelligence |
| 4.0.0 | 2025-08-15 | OCR Intelligence & Automation (Epic 4) |
| 3.0.0 | 2025-08-10 | Compliance Monitoring & Predictive Alerts |
| 2.0.0 | 2025-08-05 | Contributors Module |
| 1.0.0 | 2025-08-01 | Base System |

## 🚨 Solución de Problemas

### Error: "Database locked"
```bash
# Verificar procesos que usan la DB
lsof data/afip_monitor.db

# Reiniciar servidor si es necesario
pkill -f "node.*server"
```

### Error: "Migration conflicts detected"
```bash
# Ver conflictos específicos
npm run db:migrate:dry

# Forzar si estás seguro
npm run db:migrate:force

# O restaurar desde backup
npm run db:backup:info
npm run db:restore backup-file.db
```

### Error: "Backup verification failed"
```bash
# Verificar espacio en disco
df -h

# Verificar permisos
ls -la data/backups/

# Crear directorio si no existe
mkdir -p data/backups
```

## 💡 Mejores Prácticas

### ✅ Desarrollo
1. **Siempre usar dry-run primero**: `npm run db:migrate:dry`
2. **Backup antes de cambios grandes**: `npm run db:backup`
3. **Verificar después de migraciones**: `npm run db:status`

### ✅ Producción
1. **Backup automático antes de deploy**
2. **Migración durante ventana de mantenimiento**
3. **Monitoreo post-migración**
4. **Plan de rollback preparado**

### ✅ Testing
1. **Copiar DB de producción para testing**
2. **Probar migraciones en entorno idéntico**
3. **Validar integridad después de cambios**

---

## 🔗 Referencias

- **User Story 4.1**: AI-Powered Invoice Intelligence
- **Epic 4**: OCR Intelligence & Automation  
- **Guía de Testing**: `user-story-4.1-guia-de-prueba.md`

---

*Documentación actualizada: 2025-08-19*  
*Sistema de migración versión: 4.1.0*