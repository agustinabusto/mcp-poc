#!/bin/bash

# =============================================================================
# Script de Automatización para GitHub Projects - AFIP Monitor MCP
# =============================================================================

# Configuración inicial
REPO_OWNER="agustinabusto"
REPO_NAME="mcp-poc"
PROJECT_TITLE="AFIP Monitor MCP - Development Roadmap"
PROJECT_DESCRIPTION="Sistema de monitoreo automático AFIP con alertas proactivas y compliance checker usando MCP"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando configuración del proyecto GitHub...${NC}"

# =============================================================================
# 1. CREAR EL PROYECTO
# =============================================================================

echo -e "${YELLOW}📋 Creando el proyecto...${NC}"

# Crear el proyecto (necesitarás el project number que devuelve este comando)
gh project create --owner "$REPO_OWNER" --title "$PROJECT_TITLE" --body "$PROJECT_DESCRIPTION"

# Nota: Guarda el número del proyecto que devuelve el comando anterior
echo -e "${RED}⚠️  IMPORTANTE: Guarda el número del proyecto que aparece arriba y actualiza PROJECT_NUMBER${NC}"
read -p "Ingresa el número del proyecto: " PROJECT_NUMBER

# =============================================================================
# 2. CONFIGURAR CAMPOS PERSONALIZADOS
# =============================================================================

echo -e "${YELLOW}🔧 Configurando campos personalizados...${NC}"

# Status field (ya viene por defecto, pero configuramos las opciones)
gh project field-create --owner "$REPO_OWNER" --project-number "$PROJECT_NUMBER" \
  --name "Status" --type "single-select" \
  --options "📋 Backlog,🏗️ In Progress,👀 In Review,✅ Done,🚫 Blocked"

# Priority field
gh project field-create --owner "$REPO_OWNER" --project-number "$PROJECT_NUMBER" \
  --name "Priority" --type "single-select" \
  --options "🔴 Critical,🟠 High,🟡 Medium,🔵 Low"

# Module field
gh project field-create --owner "$REPO_OWNER" --project-number "$PROJECT_NUMBER" \
  --name "Module" --type "single-select" \
  --options "🏢 Monitor Automático AFIP,🚨 Sistema de Alertas,✅ Compliance Checker,📊 Dashboard y UI,🔧 Arquitectura MCP,⚙️ Configuración y Admin,🔌 Integración y APIs,🔐 Seguridad y Performance"

# Story Points field
gh project field-create --owner "$REPO_OWNER" --project-number "$PROJECT_NUMBER" \
  --name "Story Points" --type "number"

# Sprint field
gh project field-create --owner "$REPO_OWNER" --project-number "$PROJECT_NUMBER" \
  --name "Sprint" --type "single-select" \
  --options "Sprint 1 (Sem 1-2),Sprint 2 (Sem 3-4),Sprint 3 (Sem 5-6),Sprint 4 (Sem 7-8),Sprint 5 (Sem 9-10),Sprint 6 (Sem 11-12)"

# Epic field
gh project field-create --owner "$REPO_OWNER" --project-number "$PROJECT_NUMBER" \
  --name "Epic" --type "text"

echo -e "${GREEN}✅ Campos personalizados configurados${NC}"

# =============================================================================
# 3. CREAR LABELS
# =============================================================================

echo -e "${YELLOW}🏷️  Creando labels...${NC}"

# Labels por tipo
gh label create --repo "$REPO_OWNER/$REPO_NAME" "user-story" --description "Historia de usuario" --color "0E8A16"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "epic" --description "Epic/Épica" --color "5319E7"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "task" --description "Tarea técnica" --color "1D76DB"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "enhancement" --description "Mejora" --color "A2EEEF"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "documentation" --description "Documentación" --color "0075CA"

# Labels por módulo
gh label create --repo "$REPO_OWNER/$REPO_NAME" "monitor-afip" --description "Monitor Automático AFIP" --color "D93F0B"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "alertas" --description "Sistema de Alertas" --color "FBCA04"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "compliance" --description "Compliance Checker" --color "0E8A16"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "dashboard" --description "Dashboard y UI" --color "1D76DB"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "mcp" --description "Arquitectura MCP" --color "5319E7"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "admin" --description "Configuración y Admin" --color "B60205"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "api" --description "Integración y APIs" --color "0075CA"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "security" --description "Seguridad y Performance" --color "D93F0B"

# Labels por prioridad
gh label create --repo "$REPO_OWNER/$REPO_NAME" "priority-critical" --description "Prioridad Crítica" --color "B60205"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "priority-high" --description "Prioridad Alta" --color "D93F0B"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "priority-medium" --description "Prioridad Media" --color "FBCA04"
gh label create --repo "$REPO_OWNER/$REPO_NAME" "priority-low" --description "Prioridad Baja" --color "0E8A16"

echo -e "${GREEN}✅ Labels creados${NC}"

# =============================================================================
# 4. CREAR MILESTONES
# =============================================================================

echo -e "${YELLOW}🎯 Creando milestones...${NC}"

gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 1: Monitor Básico AFIP" --description "Funcionalidades básicas de monitoreo fiscal" --due-date "2025-07-24"
gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 2: Sistema de Alertas" --description "Sistema completo de alertas y notificaciones" --due-date "2025-08-07"
gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 3: Compliance Checker" --description "Motor de compliance y scoring" --due-date "2025-08-21"
gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 4: Dashboard Avanzado" --description "Interfaz completa y responsive" --due-date "2025-09-04"
gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 5: Arquitectura MCP" --description "Implementación completa de MCP" --due-date "2025-09-18"
gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 6: Configuración y APIs" --description "Administración y APIs externas" --due-date "2025-10-02"

echo -e "${GREEN}✅ Milestones creados${NC}"

# =============================================================================
# 5. FUNCIÓN PARA CREAR ISSUES
# =============================================================================

create_issue() {
    local issue_id=$1
    local title=$2
    local module=$3
    local priority=$4
    local story_points=$5
    local sprint=$6
    local milestone=$7
    local body=$8
    local labels=$9
    
    echo -e "${BLUE}📝 Creando issue: $title${NC}"
    
    gh issue create --repo "$REPO_OWNER/$REPO_NAME" \
        --title "$title" \
        --body "$body" \
        --label "$labels" \
        --milestone "$milestone"
}

# =============================================================================
# 6. CREAR HISTORIAS DE USUARIO
# =============================================================================

echo -e "${YELLOW}📖 Creando historias de usuario...${NC}"

# HU-001: Verificación de Estado Fiscal
create_issue "HU-001" \
    "HU-001: Verificación de Estado Fiscal" \
    "Monitor Automático AFIP" \
    "Alta" \
    "8" \
    "Sprint 1" \
    "Milestone 1: Monitor Básico AFIP" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** verificar automáticamente el estado fiscal de un contribuyente
**Para** mantener el control del compliance fiscal en tiempo real

## Criterios de Aceptación
- [ ] CA-001: El sistema debe consultar automáticamente el estado en AFIP para un CUIT válido
- [ ] CA-002: Debe mostrar información detallada del estado fiscal en menos de 5 segundos
- [ ] CA-003: Debe manejar errores y mostrar mensajes claros al usuario
- [ ] CA-004: Debe guardar el resultado en el histórico de verificaciones

## Definición de Terminado
- [ ] Funcionalidad implementada y probada
- [ ] Integración con API de AFIP (simulada en POC)
- [ ] Manejo de errores implementado
- [ ] Logs de auditoría configurados
- [ ] Documentación de API actualizada
- [ ] Pruebas unitarias cubren 90%+ del código
- [ ] Revisión de código completada
- [ ] Diseño responsivo implementado

## Tareas Técnicas
- [ ] Diseño de API - endpoint POST /api/fiscal/verify
- [ ] Implementación del servicio de verificación fiscal
- [ ] Integración con cliente AFIP simulado
- [ ] Implementación del frontend - componente de verificación
- [ ] Pruebas unitarias y de integración

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 1" \
    "user-story,monitor-afip,priority-high"

# HU-002: Control de Inscripciones
create_issue "HU-002" \
    "HU-002: Control de Inscripciones" \
    "Monitor Automático AFIP" \
    "Alta" \
    "5" \
    "Sprint 1" \
    "Milestone 1: Monitor Básico AFIP" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** monitorear las inscripciones de IVA, Ganancias y Seguridad Social
**Para** asegurar que el contribuyente mantenga todas sus inscripciones al día

## Criterios de Aceptación
- [ ] CA-001: Verificar automáticamente inscripciones en IVA, Ganancias y Seguridad Social
- [ ] CA-002: Mostrar estado actual, fechas y categorías de cada inscripción
- [ ] CA-003: Detectar y alertar sobre inscripciones inactivas o suspendidas
- [ ] CA-004: Notificar cambios en inscripciones y actualizar dashboard

## Definición de Terminado
- [ ] Funcionalidad implementada y probada
- [ ] Integración con APIs de AFIP para los 3 tipos de inscripción
- [ ] Sistema de alertas configurado
- [ ] Dashboard actualizado
- [ ] Documentación actualizada
- [ ] Pruebas unitarias y de integración
- [ ] Revisión de código completada

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Alta
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 1" \
    "user-story,monitor-afip,priority-high"

# HU-003: Seguimiento de Declaraciones
create_issue "HU-003" \
    "HU-003: Seguimiento de Declaraciones" \
    "Monitor Automático AFIP" \
    "Alta" \
    "8" \
    "Sprint 2" \
    "Milestone 1: Monitor Básico AFIP" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** controlar automáticamente las presentaciones de declaraciones
**Para** evitar incumplimientos en las obligaciones fiscales

## Criterios de Aceptación
- [ ] CA-001: Identificar automáticamente obligaciones fiscales por tipo de contribuyente
- [ ] CA-002: Mostrar estado de presentaciones con fechas y importes
- [ ] CA-003: Detectar incumplimientos y generar alertas automáticas
- [ ] CA-004: Enviar alertas preventivas antes de vencimientos

## Definición de Terminado
- [ ] Motor de obligaciones fiscales implementado
- [ ] Integración con APIs de AFIP para declaraciones
- [ ] Sistema de alertas preventivas
- [ ] Dashboard de declaraciones
- [ ] Documentación actualizada
- [ ] Pruebas completas

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 2" \
    "user-story,monitor-afip,priority-high"

# HU-004: Detección de Cambios
create_issue "HU-004" \
    "HU-004: Detección de Cambios" \
    "Monitor Automático AFIP" \
    "Media" \
    "5" \
    "Sprint 2" \
    "Milestone 1: Monitor Básico AFIP" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** recibir alertas por modificaciones en regímenes fiscales
**Para** estar informado de cambios que puedan afectar el compliance

## Criterios de Aceptación
- [ ] CA-001: Monitorear y detectar cambios en regímenes fiscales
- [ ] CA-002: Detectar cambios en categorías, actividades y domicilio fiscal
- [ ] CA-003: Notificar inmediatamente sobre cambios detectados
- [ ] CA-004: Mantener histórico completo de cambios

## Definición de Terminado
- [ ] Sistema de detección de cambios implementado
- [ ] Algoritmo de comparación de estados
- [ ] Integración con sistema de alertas
- [ ] Dashboard de historial de cambios
- [ ] Documentación y pruebas completas

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 2" \
    "user-story,monitor-afip,priority-medium"

# HU-005: Alertas por Severidad
create_issue "HU-005" \
    "HU-005: Alertas por Severidad" \
    "Sistema de Alertas" \
    "Alta" \
    "8" \
    "Sprint 2" \
    "Milestone 2: Sistema de Alertas" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** recibir alertas clasificadas por severidad (Crítica, Alta, Media, Baja, Informativa)
**Para** priorizar las acciones según la importancia del evento

## Criterios de Aceptación
- [ ] CA-001: Asignar automáticamente severidad según tipo de evento
- [ ] CA-002: Visualización diferenciada por severidad con colores e íconos
- [ ] CA-003: Permitir gestión y filtrado de alertas por severidad
- [ ] CA-004: Configuración personalizada de criterios de severidad

## Definición de Terminado
- [ ] Sistema de clasificación implementado
- [ ] Motor de reglas para asignación automática
- [ ] Interfaz diferenciada por severidad
- [ ] Sistema de filtrado y configuración
- [ ] Documentación y pruebas completas

## Información Adicional
- **Módulo:** Sistema de Alertas
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 2" \
    "user-story,alertas,priority-high"

# Continuar con el resto de historias de usuario...
# (Para mantener el script manejable, continúo con una función que puede ser llamada)

echo -e "${GREEN}✅ Primeras 5 historias de usuario creadas${NC}"
echo -e "${YELLOW}📋 Para crear las 27 historias restantes, ejecuta: ./create_remaining_issues.sh${NC}"

# =============================================================================
# 7. CONFIGURAR VISTAS DEL PROYECTO
# =============================================================================

echo -e "${YELLOW}👁️  Configurando vistas del proyecto...${NC}"

# Vista Kanban Board
gh project view create --owner "$REPO_OWNER" --project-number "$PROJECT_NUMBER" \
    --name "Kanban Board" --layout "board" --field "Status"

# Vista Sprint Planning
gh project view create --owner "$REPO_OWNER" --project-number "$PROJECT_NUMBER" \
    --name "Sprint Planning" --layout "board" --field "Sprint"

# Vista Roadmap
gh project view create --owner "$REPO_OWNER" --project-number "$PROJECT_NUMBER" \
    --name "Roadmap" --layout "roadmap" --field "Sprint"

echo -e "${GREEN}✅ Vistas configuradas${NC}"

# =============================================================================
# 8. RESUMEN FINAL
# =============================================================================

echo -e "${GREEN}🎉 ¡Configuración completada!${NC}"
echo -e "${BLUE}📊 Resumen de la configuración:${NC}"
echo -e "  • Proyecto creado: $PROJECT_TITLE"
echo -e "  • Campos personalizados: ✅"
echo -e "  • Labels creados: ✅"
echo -e "  • Milestones creados: ✅"
echo -e "  • Primeras 5 historias creadas: ✅"
echo -e "  • Vistas configuradas: ✅"
echo ""
echo -e "${YELLOW}🔗 Próximos pasos:${NC}"
echo -e "  1. Ejecutar script para crear las 27 historias restantes"
echo -e "  2. Asignar issues a miembros del equipo"
echo -e "  3. Configurar automatizaciones"
echo -e "  4. Comenzar Sprint 1"
echo ""
echo -e "${BLUE}📱 Accede a tu proyecto en:${NC}"
echo -e "  https://github.com/$REPO_OWNER/$REPO_NAME/projects"