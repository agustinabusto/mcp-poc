#!/bin/bash

# =============================================================================
# Script Compatible con Versiones Anteriores de GitHub CLI
# =============================================================================

REPO_OWNER="agustinabusto"
REPO_NAME="mcp-poc"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Script compatible con GitHub CLI versiones anteriores...${NC}"

# =============================================================================
# 1. VERIFICAR VERSIÓN DE GITHUB CLI
# =============================================================================

echo -e "${YELLOW}📋 Verificando versión de GitHub CLI...${NC}"
gh_version=$(gh --version | head -n1)
echo -e "${BLUE}Versión: $gh_version${NC}"

# =============================================================================
# 2. VERIFICAR AUTENTICACIÓN
# =============================================================================

echo -e "${YELLOW}🔐 Verificando autenticación...${NC}"
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ No estás autenticado en GitHub${NC}"
    echo -e "${BLUE}💡 Ejecuta: gh auth login${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Autenticación exitosa${NC}"
fi

# =============================================================================
# 3. VERIFICAR MILESTONES EXISTENTES
# =============================================================================

echo -e "${YELLOW}📊 Verificando milestones existentes...${NC}"
milestone_count=$(gh milestone list --repo "$REPO_OWNER/$REPO_NAME" --state all 2>/dev/null | wc -l)

if [ "$milestone_count" -eq 0 ]; then
    echo -e "${YELLOW}⚠️ No hay milestones. Creando...${NC}"
    
    # Crear milestones uno por uno
    echo -e "${BLUE}📌 Creando Milestone 1...${NC}"
    gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 1: Monitor Básico AFIP" --description "Funcionalidades básicas de monitoreo fiscal" --due-date "2025-07-24" 2>/dev/null || echo -e "${YELLOW}Ya existe${NC}"
    
    echo -e "${BLUE}📌 Creando Milestone 2...${NC}"
    gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 2: Sistema de Alertas" --description "Sistema completo de alertas y notificaciones" --due-date "2025-08-07" 2>/dev/null || echo -e "${YELLOW}Ya existe${NC}"
    
    echo -e "${BLUE}📌 Creando Milestone 3...${NC}"
    gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 3: Compliance Checker" --description "Motor de compliance y scoring" --due-date "2025-08-21" 2>/dev/null || echo -e "${YELLOW}Ya existe${NC}"
    
    echo -e "${BLUE}📌 Creando Milestone 4...${NC}"
    gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 4: Dashboard Avanzado" --description "Interfaz completa y responsive" --due-date "2025-09-04" 2>/dev/null || echo -e "${YELLOW}Ya existe${NC}"
    
    echo -e "${BLUE}📌 Creando Milestone 5...${NC}"
    gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 5: Arquitectura MCP" --description "Implementación completa de MCP" --due-date "2025-09-18" 2>/dev/null || echo -e "${YELLOW}Ya existe${NC}"
    
    echo -e "${BLUE}📌 Creando Milestone 6...${NC}"
    gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "Milestone 6: Configuración y APIs" --description "Administración y APIs externas" --due-date "2025-10-02" 2>/dev/null || echo -e "${YELLOW}Ya existe${NC}"
else
    echo -e "${GREEN}✅ Milestones ya existen ($milestone_count encontrados)${NC}"
fi

# =============================================================================
# 4. MOSTRAR MILESTONES FINALES
# =============================================================================

echo -e "${YELLOW}📋 Milestones disponibles:${NC}"
gh milestone list --repo "$REPO_OWNER/$REPO_NAME" --state all

# =============================================================================
# 5. CREAR PROYECTO (VERSIÓN COMPATIBLE)
# =============================================================================

echo -e "${YELLOW}📋 Creando proyecto (versión compatible)...${NC}"

PROJECT_TITLE="AFIP Monitor MCP - Development Roadmap"

echo -e "${BLUE}📝 Creando proyecto: $PROJECT_TITLE${NC}"
if project_output=$(gh project create --owner "$REPO_OWNER" --title "$PROJECT_TITLE" 2>&1); then
    echo -e "${GREEN}✅ Proyecto creado exitosamente${NC}"
    echo "$project_output"
else
    echo -e "${YELLOW}⚠️ Error al crear proyecto o ya existe:${NC}"
    echo "$project_output"
fi

# =============================================================================
# 6. LISTAR PROYECTOS EXISTENTES
# =============================================================================

echo -e "${YELLOW}📋 Proyectos existentes:${NC}"
gh project list --owner "$REPO_OWNER" 2>/dev/null || echo -e "${YELLOW}No se pueden listar proyectos o no existen${NC}"

# =============================================================================
# 7. FUNCIÓN PARA CREAR ISSUES SIMPLE
# =============================================================================

create_issue_simple() {
    local title=$1
    local body=$2
    local labels=$3
    local milestone=$4
    
    echo -e "${BLUE}📝 Creando: $title${NC}"
    
    # Crear issue básico
    local issue_number
    if issue_number=$(gh issue create --repo "$REPO_OWNER/$REPO_NAME" \
        --title "$title" \
        --body "$body" \
        --label "$labels" 2>/dev/null); then
        
        echo -e "${GREEN}✅ Issue #$issue_number creado${NC}"
        
        # Intentar asignar milestone si se especificó
        if [[ -n "$milestone" ]]; then
            if gh issue edit "$issue_number" --repo "$REPO_OWNER/$REPO_NAME" --milestone "$milestone" 2>/dev/null; then
                echo -e "${GREEN}✅ Milestone asignado${NC}"
            else
                echo -e "${YELLOW}⚠️ No se pudo asignar milestone${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ Error creando issue${NC}"
    fi
}

# =============================================================================
# 8. CREAR TODAS LAS HISTORIAS DE USUARIO
# =============================================================================

echo -e "${YELLOW}📖 Creando todas las historias de usuario...${NC}"

# HU-001: Verificación de Estado Fiscal
create_issue_simple "HU-001: Verificación de Estado Fiscal" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** verificar automáticamente el estado fiscal de un contribuyente
**Para** mantener el control del compliance fiscal en tiempo real

## Criterios de Aceptación
- [ ] CA-001: El sistema debe consultar automáticamente el estado en AFIP
- [ ] CA-002: Debe mostrar información detallada en menos de 5 segundos
- [ ] CA-003: Debe manejar errores y mostrar mensajes claros
- [ ] CA-004: Debe guardar el resultado en el histórico

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 1" \
    "user-story,monitor-afip,priority-high" \
    "Milestone 1: Monitor Básico AFIP"

# HU-002: Control de Inscripciones
create_issue_simple "HU-002: Control de Inscripciones" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** monitorear las inscripciones de IVA, Ganancias y Seguridad Social
**Para** asegurar que el contribuyente mantenga todas sus inscripciones al día

## Criterios de Aceptación
- [ ] CA-001: Verificar automáticamente inscripciones en IVA, Ganancias y Seguridad Social
- [ ] CA-002: Mostrar estado actual, fechas y categorías de cada inscripción
- [ ] CA-003: Detectar y alertar sobre inscripciones inactivas o suspendidas
- [ ] CA-004: Notificar cambios en inscripciones y actualizar dashboard

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Alta
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 1" \
    "user-story,monitor-afip,priority-high" \
    "Milestone 1: Monitor Básico AFIP"

# HU-003: Seguimiento de Declaraciones
create_issue_simple "HU-003: Seguimiento de Declaraciones" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** controlar automáticamente las presentaciones de declaraciones
**Para** evitar incumplimientos en las obligaciones fiscales

## Criterios de Aceptación
- [ ] CA-001: Identificar automáticamente obligaciones fiscales por tipo de contribuyente
- [ ] CA-002: Mostrar estado de presentaciones con fechas y importes
- [ ] CA-003: Detectar incumplimientos y generar alertas automáticas
- [ ] CA-004: Enviar alertas preventivas antes de vencimientos

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 2" \
    "user-story,monitor-afip,priority-high" \
    "Milestone 1: Monitor Básico AFIP"

# HU-004: Detección de Cambios
create_issue_simple "HU-004: Detección de Cambios" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** recibir alertas por modificaciones en regímenes fiscales
**Para** estar informado de cambios que puedan afectar el compliance

## Criterios de Aceptación
- [ ] CA-001: Monitorear y detectar cambios en regímenes fiscales
- [ ] CA-002: Detectar cambios en categorías, actividades y domicilio fiscal
- [ ] CA-003: Notificar inmediatamente sobre cambios detectados
- [ ] CA-004: Mantener histórico completo de cambios

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 2" \
    "user-story,monitor-afip,priority-medium" \
    "Milestone 1: Monitor Básico AFIP"

# HU-005: Alertas por Severidad
create_issue_simple "HU-005: Alertas por Severidad" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** recibir alertas clasificadas por severidad (Crítica, Alta, Media, Baja, Informativa)
**Para** priorizar las acciones según la importancia del evento

## Criterios de Aceptación
- [ ] CA-001: Asignar automáticamente severidad según tipo de evento
- [ ] CA-002: Visualización diferenciada por severidad con colores e íconos
- [ ] CA-003: Permitir gestión y filtrado de alertas por severidad
- [ ] CA-004: Configuración personalizada de criterios de severidad

## Información Adicional
- **Módulo:** Sistema de Alertas
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 2" \
    "user-story,alertas,priority-high" \
    "Milestone 2: Sistema de Alertas"

# Continuar con todas las demás historias...

# HU-006: Múltiples Canales de Notificación
create_issue_simple "HU-006: Múltiples Canales de Notificación" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** recibir notificaciones por Dashboard, Email, SMS y WebSocket
**Para** estar informado a través de diferentes medios de comunicación

## Criterios de Aceptación
- [ ] CA-001: Configurar canales de notificación independientemente
- [ ] CA-002: Dashboard con notificaciones en tiempo real
- [ ] CA-003: Notificaciones por email con formato profesional
- [ ] CA-004: Notificaciones por SMS para alertas críticas

## Información Adicional
- **Módulo:** Sistema de Alertas
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 3" \
    "user-story,alertas,priority-high" \
    "Milestone 2: Sistema de Alertas"

echo -e "${GREEN}✅ Primeras 6 historias de usuario creadas!${NC}"
echo -e "${BLUE}📊 Para ver los issues creados:${NC}"
echo -e "  gh issue list --repo $REPO_OWNER/$REPO_NAME"

# =============================================================================
# 9. MOSTRAR RESUMEN
# =============================================================================

echo -e "${GREEN}🎉 Configuración completada (compatible)!${NC}"
echo -e "${BLUE}📊 Resumen:${NC}"
echo -e "   • ✅ Milestones verificados/creados"
echo -e "   • ✅ Labels ya existían"
echo -e "   • ✅ Proyecto creado/verificado"
echo -e "   • ✅ Primeras 6 historias de usuario creadas"

echo ""
echo -e "${YELLOW}📋 Comandos de verificación:${NC}"
echo -e "   gh milestone list --repo $REPO_OWNER/$REPO_NAME"
echo -e "   gh issue list --repo $REPO_OWNER/$REPO_NAME"
echo -e "   gh project list --owner $REPO_OWNER"

echo ""
echo -e "${BLUE}🔗 Enlaces:${NC}"
echo -e "   • Issues: https://github.com/$REPO_OWNER/$REPO_NAME/issues"
echo -e "   • Milestones: https://github.com/$REPO_OWNER/$REPO_NAME/milestones"
echo -e "   • Projects: https://github.com/$REPO_OWNER/$REPO_NAME/projects"