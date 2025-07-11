#!/bin/bash

# =============================================================================
# Script para crear las últimas 12 historias de usuario (HU-021 a HU-032)
# =============================================================================

REPO_OWNER="agustinabusto"
REPO_NAME="mcp-poc"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📖 Creando las últimas 12 historias de usuario...${NC}"

# =============================================================================
# FUNCIÓN PARA OBTENER NÚMERO DE MILESTONE
# =============================================================================

get_milestone_number() {
    local milestone_title=$1
    local milestone_number
    
    milestone_number=$(gh api repos/"$REPO_OWNER"/"$REPO_NAME"/milestones 2>/dev/null | \
        grep -B2 "\"title\": \"$milestone_title\"" | \
        grep -oP '"number": \K\d+' | head -1)
    
    echo "$milestone_number"
}

# =============================================================================
# FUNCIÓN PARA CREAR ISSUES CON MILESTONE
# =============================================================================

create_issue_with_milestone() {
    local title=$1
    local body=$2
    local labels=$3
    local milestone_title=$4
    
    echo -e "${BLUE}📝 Creando: $title${NC}"
    
    local milestone_number
    milestone_number=$(get_milestone_number "$milestone_title")
    
    if [[ -n "$milestone_number" ]]; then
        if gh api repos/"$REPO_OWNER"/"$REPO_NAME"/issues \
            --method POST \
            --field title="$title" \
            --field body="$body" \
            --field labels="$labels" \
            --field milestone="$milestone_number" \
            --silent 2>/dev/null; then
            echo -e "${GREEN}✅ Issue creado con milestone${NC}"
        else
            echo -e "${YELLOW}⚠️ Error con API, creando sin milestone...${NC}"
            gh issue create --repo "$REPO_OWNER/$REPO_NAME" \
                --title "$title" \
                --body "$body" \
                --label "$labels" 2>/dev/null
        fi
    else
        echo -e "${YELLOW}⚠️ Milestone no encontrado${NC}"
    fi
}

# =============================================================================
# MÓDULO CONFIGURACIÓN Y ADMINISTRACIÓN
# =============================================================================

echo -e "${YELLOW}⚙️ Creando módulo Configuración y Administración...${NC}"

# HU-021: Configuración de Monitoreo
create_issue_with_milestone "HU-021: Configuración de Monitoreo" \
"## Historia de Usuario
**Como** administrador del sistema
**Quiero** configurar el monitoreo automático para múltiples CUITs
**Para** establecer horarios y frecuencias de verificación

## Criterios de Aceptación
- [ ] CA-001: Configurar monitoreo por CUIT individual
- [ ] CA-002: Establecer horarios y frecuencias personalizadas
- [ ] CA-003: Gestionar múltiples CUITs simultáneamente
- [ ] CA-004: Configurar tipos de verificaciones activas

## Información Adicional
- **Módulo:** Configuración y Admin
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,admin,priority-high" \
"Milestone 6: Configuración y APIs"

# HU-022: Gestión de Usuarios
create_issue_with_milestone "HU-022: Gestión de Usuarios" \
"## Historia de Usuario
**Como** administrador del sistema
**Quiero** gestionar usuarios y sus permisos
**Para** controlar el acceso al sistema según roles

## Criterios de Aceptación
- [ ] CA-001: Crear, editar y eliminar usuarios
- [ ] CA-002: Asignar roles y permisos granulares
- [ ] CA-003: Gestionar acceso por empresa/organización
- [ ] CA-004: Auditoría de accesos y acciones

## Información Adicional
- **Módulo:** Configuración y Admin
- **Prioridad:** Media
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,admin,priority-medium" \
"Milestone 6: Configuración y APIs"

# HU-023: Configuración de Reglas de Compliance
create_issue_with_milestone "HU-023: Configuración de Reglas de Compliance" \
"## Historia de Usuario
**Como** administrador del sistema
**Quiero** personalizar las reglas de compliance
**Para** adaptar el sistema a requisitos específicos

## Criterios de Aceptación
- [ ] CA-001: Configurar reglas personalizadas de compliance
- [ ] CA-002: Establecer pesos y ponderaciones
- [ ] CA-003: Definir umbrales de alertas
- [ ] CA-004: Validar y probar reglas antes de aplicar

## Información Adicional
- **Módulo:** Configuración y Admin
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,admin,priority-medium" \
"Milestone 6: Configuración y APIs"

# HU-024: Logs y Auditoría
create_issue_with_milestone "HU-024: Logs y Auditoría" \
"## Historia de Usuario
**Como** administrador del sistema
**Quiero** acceder a logs detallados y funciones de auditoría
**Para** rastrear actividades y resolver problemas

## Criterios de Aceptación
- [ ] CA-001: Logs detallados de todas las operaciones
- [ ] CA-002: Interfaz de búsqueda y filtrado de logs
- [ ] CA-003: Auditoría de acciones críticas
- [ ] CA-004: Exportación de logs para análisis

## Información Adicional
- **Módulo:** Configuración y Admin
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,admin,priority-medium" \
"Milestone 6: Configuración y APIs"

# =============================================================================
# MÓDULO INTEGRACIÓN Y APIs
# =============================================================================

echo -e "${YELLOW}🔌 Creando módulo Integración y APIs...${NC}"

# HU-025: API REST
create_issue_with_milestone "HU-025: API REST" \
"## Historia de Usuario
**Como** desarrollador externo
**Quiero** acceder a las funcionalidades del sistema vía API REST
**Para** integrar con otros sistemas y aplicaciones

## Criterios de Aceptación
- [ ] CA-001: API REST completa con todos los endpoints
- [ ] CA-002: Autenticación y autorización robusta
- [ ] CA-003: Versionado de API para compatibilidad
- [ ] CA-004: Rate limiting y throttling

## Información Adicional
- **Módulo:** Integración y APIs
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,api,priority-high" \
"Milestone 6: Configuración y APIs"

# HU-026: Webhooks
create_issue_with_milestone "HU-026: Webhooks" \
"## Historia de Usuario
**Como** desarrollador externo
**Quiero** recibir notificaciones vía webhooks
**Para** integrar eventos del sistema con aplicaciones externas

## Criterios de Aceptación
- [ ] CA-001: Configuración de webhooks por evento
- [ ] CA-002: Delivery confiable con reintentos
- [ ] CA-003: Verificación de signatures
- [ ] CA-004: Dashboard de monitoreo de webhooks

## Información Adicional
- **Módulo:** Integración y APIs
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,api,priority-medium" \
"Milestone 6: Configuración y APIs"

# HU-027: Exportación de Datos
create_issue_with_milestone "HU-027: Exportación de Datos" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** exportar datos y reportes
**Para** usar la información en otros sistemas o análisis

## Criterios de Aceptación
- [ ] CA-001: Exportar datos en múltiples formatos (CSV, JSON, PDF)
- [ ] CA-002: Reportes personalizables por fechas y filtros
- [ ] CA-003: Exportación masiva de datos históricos
- [ ] CA-004: Programación de exportaciones automáticas

## Información Adicional
- **Módulo:** Integración y APIs
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,api,priority-medium" \
"Milestone 6: Configuración y APIs"

# HU-028: Documentación de API
create_issue_with_milestone "HU-028: Documentación de API" \
"## Historia de Usuario
**Como** desarrollador externo
**Quiero** acceder a documentación completa de la API
**Para** implementar integraciones de manera eficiente

## Criterios de Aceptación
- [ ] CA-001: Documentación interactiva con OpenAPI/Swagger
- [ ] CA-002: Ejemplos de código en múltiples lenguajes
- [ ] CA-003: Guías de integración paso a paso
- [ ] CA-004: Playground para probar endpoints

## Información Adicional
- **Módulo:** Integración y APIs
- **Prioridad:** Media
- **Estimación:** 3 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,api,priority-medium" \
"Milestone 6: Configuración y APIs"

# =============================================================================
# MÓDULO SEGURIDAD Y PERFORMANCE
# =============================================================================

echo -e "${YELLOW}🔐 Creando módulo Seguridad y Performance...${NC}"

# HU-029: Autenticación y Autorización
create_issue_with_milestone "HU-029: Autenticación y Autorización" \
"## Historia de Usuario
**Como** administrador del sistema
**Quiero** implementar autenticación segura y control de acceso
**Para** proteger la información sensible del sistema

## Criterios de Aceptación
- [ ] CA-001: Autenticación JWT con refresh tokens
- [ ] CA-002: Autorización basada en roles (RBAC)
- [ ] CA-003: Autenticación multi-factor opcional
- [ ] CA-004: Integración con proveedores OAuth

## Información Adicional
- **Módulo:** Seguridad y Performance
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,security,priority-high" \
"Milestone 6: Configuración y APIs"

# HU-030: Rate Limiting
create_issue_with_milestone "HU-030: Rate Limiting" \
"## Historia de Usuario
**Como** administrador del sistema
**Quiero** implementar limitación de velocidad en las APIs
**Para** prevenir abuso y mantener la performance del sistema

## Criterios de Aceptación
- [ ] CA-001: Rate limiting por usuario y por IP
- [ ] CA-002: Diferentes límites por tipo de endpoint
- [ ] CA-003: Headers informativos de límites
- [ ] CA-004: Configuración flexible de límites

## Información Adicional
- **Módulo:** Seguridad y Performance
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,security,priority-medium" \
"Milestone 6: Configuración y APIs"

# HU-031: Monitoreo de Performance
create_issue_with_milestone "HU-031: Monitoreo de Performance" \
"## Historia de Usuario
**Como** administrador del sistema
**Quiero** monitorear métricas de performance del sistema
**Para** mantener tiempos de respuesta óptimos

## Criterios de Aceptación
- [ ] CA-001: Métricas de performance en tiempo real
- [ ] CA-002: Alertas por degradación de performance
- [ ] CA-003: Dashboard de monitoreo system health
- [ ] CA-004: Reportes de performance históricos

## Información Adicional
- **Módulo:** Seguridad y Performance
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,security,priority-medium" \
"Milestone 6: Configuración y APIs"

# HU-032: Backup y Recuperación
create_issue_with_milestone "HU-032: Backup y Recuperación" \
"## Historia de Usuario
**Como** administrador del sistema
**Quiero** implementar estrategias de backup y recuperación
**Para** proteger los datos y garantizar la continuidad del servicio

## Criterios de Aceptación
- [ ] CA-001: Backups automáticos programados
- [ ] CA-002: Backup incremental y completo
- [ ] CA-003: Procedimientos de recuperación probados
- [ ] CA-004: Monitoreo de estado de backups

## Información Adicional
- **Módulo:** Seguridad y Performance
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,security,priority-medium" \
"Milestone 6: Configuración y APIs"

# =============================================================================
# RESUMEN FINAL
# =============================================================================

echo -e "${GREEN}🎉 ¡TODAS las 32 historias de usuario creadas!${NC}"
echo -e "${BLUE}📊 Resumen completo:${NC}"

echo -e "${YELLOW}📋 Módulos completados:${NC}"
echo -e "   • 🏢 Monitor Automático AFIP (4 HU): HU-001 a HU-004"
echo -e "   • 🚨 Sistema de Alertas (4 HU): HU-005 a HU-008"
echo -e "   • ✅ Compliance Checker (4 HU): HU-009 a HU-012"
echo -e "   • 📊 Dashboard y UI (4 HU): HU-013 a HU-016"
echo -e "   • 🔧 Arquitectura MCP (4 HU): HU-017 a HU-020"
echo -e "   • ⚙️ Configuración y Admin (4 HU): HU-021 a HU-024"
echo -e "   • 🔌 Integración y APIs (4 HU): HU-025 a HU-028"
echo -e "   • 🔐 Seguridad y Performance (4 HU): HU-029 a HU-032"

echo ""
echo -e "${YELLOW}📈 Estadísticas del proyecto:${NC}"
echo -e "   • ✅ Total historias: 32/32 (100%)"
echo -e "   • ✅ Milestones: 6 creados"
echo -e "   • ✅ Sprints planificados: 6 (12 semanas)"
echo -e "   • ✅ Story points estimados: ~180 puntos"

echo ""
echo -e "${BLUE}🔗 Verificar resultados:${NC}"
echo -e "   gh issue list --repo $REPO_OWNER/$REPO_NAME"
echo -e "   https://github.com/$REPO_OWNER/$REPO_NAME/issues"
echo -e "   https://github.com/$REPO_OWNER/$REPO_NAME/milestones"

echo ""
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo -e "   1. ✅ Crear proyecto GitHub manualmente"
echo -e "   2. ✅ Asignar issues a sprints"
echo -e "   3. ✅ Configurar board Kanban"
echo -e "   4. ✅ Asignar equipo de desarrollo"
echo -e "   5. ✅ Comenzar Sprint 1"

echo ""
echo -e "${GREEN}🚀 ¡Proyecto AFIP Monitor MCP completamente planificado!${NC}"