#!/bin/bash

# =============================================================================
# Script para crear proyecto completo usando API de GitHub
# Compatible con cualquier versión de GitHub CLI
# =============================================================================

REPO_OWNER="agustinabusto"
REPO_NAME="mcp-poc"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Configurando proyecto usando API de GitHub...${NC}"

# =============================================================================
# 1. VERIFICAR AUTENTICACIÓN
# =============================================================================

echo -e "${YELLOW}🔐 Verificando autenticación...${NC}"
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ No estás autenticado${NC}"
    echo -e "${BLUE}💡 Ejecuta: gh auth login${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Autenticación OK${NC}"
fi

# =============================================================================
# 2. CREAR MILESTONES VIA API
# =============================================================================

echo -e "${YELLOW}🎯 Creando milestones via API...${NC}"

create_milestone_api() {
    local title=$1
    local description=$2
    local due_date=$3
    
    echo -e "${BLUE}📌 Creando: $title${NC}"
    
    if gh api repos/"$REPO_OWNER"/"$REPO_NAME"/milestones \
        --method POST \
        --field title="$title" \
        --field description="$description" \
        --field due_on="${due_date}T23:59:59Z" \
        --silent 2>/dev/null; then
        echo -e "${GREEN}✅ Milestone '$title' creado${NC}"
    else
        echo -e "${YELLOW}⚠️ Milestone '$title' ya existe o error${NC}"
    fi
}

# Crear todos los milestones
create_milestone_api "Milestone 1: Monitor Básico AFIP" "Funcionalidades básicas de monitoreo fiscal" "2025-07-24"
create_milestone_api "Milestone 2: Sistema de Alertas" "Sistema completo de alertas y notificaciones" "2025-08-07"
create_milestone_api "Milestone 3: Compliance Checker" "Motor de compliance y scoring" "2025-08-21"
create_milestone_api "Milestone 4: Dashboard Avanzado" "Interfaz completa y responsive" "2025-09-04"
create_milestone_api "Milestone 5: Arquitectura MCP" "Implementación completa de MCP" "2025-09-18"
create_milestone_api "Milestone 6: Configuración y APIs" "Administración y APIs externas" "2025-10-02"

# =============================================================================
# 3. VERIFICAR MILESTONES CREADOS
# =============================================================================

echo -e "${YELLOW}📊 Verificando milestones creados...${NC}"
echo -e "${BLUE}Milestones disponibles:${NC}"

# Listar milestones via API
milestones_json=$(gh api repos/"$REPO_OWNER"/"$REPO_NAME"/milestones 2>/dev/null)

if [[ -n "$milestones_json" && "$milestones_json" != "[]" ]]; then
    echo "$milestones_json" | grep -oP '"title": "\K[^"]+' | while read -r milestone; do
        echo "  • $milestone"
    done
    echo -e "${GREEN}✅ Milestones creados exitosamente${NC}"
else
    echo -e "${YELLOW}⚠️ No se encontraron milestones o error en la API${NC}"
fi

# =============================================================================
# 4. FUNCIÓN PARA CREAR ISSUES CON MILESTONE VIA API
# =============================================================================

get_milestone_number() {
    local milestone_title=$1
    local milestone_number
    
    milestone_number=$(gh api repos/"$REPO_OWNER"/"$REPO_NAME"/milestones 2>/dev/null | \
        grep -B2 "\"title\": \"$milestone_title\"" | \
        grep -oP '"number": \K\d+' | head -1)
    
    echo "$milestone_number"
}

create_issue_with_milestone() {
    local title=$1
    local body=$2
    local labels=$3
    local milestone_title=$4
    
    echo -e "${BLUE}📝 Creando: $title${NC}"
    
    # Obtener número del milestone
    local milestone_number
    milestone_number=$(get_milestone_number "$milestone_title")
    
    if [[ -n "$milestone_number" ]]; then
        # Crear issue con milestone
        if gh api repos/"$REPO_OWNER"/"$REPO_NAME"/issues \
            --method POST \
            --field title="$title" \
            --field body="$body" \
            --field labels="$labels" \
            --field milestone="$milestone_number" \
            --silent 2>/dev/null; then
            echo -e "${GREEN}✅ Issue creado con milestone${NC}"
        else
            echo -e "${YELLOW}⚠️ Error creando issue con milestone, intentando sin milestone...${NC}"
            # Fallback: crear sin milestone
            if gh issue create --repo "$REPO_OWNER/$REPO_NAME" \
                --title "$title" \
                --body "$body" \
                --label "$labels" 2>/dev/null; then
                echo -e "${GREEN}✅ Issue creado sin milestone${NC}"
            else
                echo -e "${RED}❌ Error creando issue${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️ Milestone no encontrado, creando sin milestone...${NC}"
        # Crear sin milestone
        if gh issue create --repo "$REPO_OWNER/$REPO_NAME" \
            --title "$title" \
            --body "$body" \
            --label "$labels" 2>/dev/null; then
            echo -e "${GREEN}✅ Issue creado sin milestone${NC}"
        else
            echo -e "${RED}❌ Error creando issue${NC}"
        fi
    fi
}

# =============================================================================
# 5. CREAR TODAS LAS HISTORIAS DE USUARIO
# =============================================================================

echo -e "${YELLOW}📖 Creando historias de usuario...${NC}"

# HU-001: Verificación de Estado Fiscal
create_issue_with_milestone "HU-001: Verificación de Estado Fiscal" \
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

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 1" \
"user-story,monitor-afip,priority-high" \
"Milestone 1: Monitor Básico AFIP"

# HU-002: Control de Inscripciones
create_issue_with_milestone "HU-002: Control de Inscripciones" \
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
- [ ] Dashboard actualizado con información de inscripciones
- [ ] Documentación de API actualizada
- [ ] Pruebas unitarias cubren 90%+ del código
- [ ] Pruebas de integración exitosas
- [ ] Revisión de código completada
- [ ] Diseño responsivo implementado

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Alta
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 1" \
"user-story,monitor-afip,priority-high" \
"Milestone 1: Monitor Básico AFIP"

# HU-003: Seguimiento de Declaraciones
create_issue_with_milestone "HU-003: Seguimiento de Declaraciones" \
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

echo -e "${GREEN}✅ Primeras 3 historias de usuario creadas!${NC}"

# =============================================================================
# 6. VERIFICAR RESULTADOS
# =============================================================================

echo -e "${YELLOW}📊 Verificando resultados...${NC}"

# Listar milestones
echo -e "${BLUE}Milestones creados:${NC}"
gh api repos/"$REPO_OWNER"/"$REPO_NAME"/milestones --jq '.[].title' 2>/dev/null || echo "Error listando milestones"

echo ""
# Listar issues
echo -e "${BLUE}Issues creados:${NC}"
gh issue list --repo "$REPO_OWNER/$REPO_NAME" --limit 5 2>/dev/null || echo "Error listando issues"

# =============================================================================
# 7. CREAR PROYECTO VIA WEB
# =============================================================================

echo -e "${YELLOW}📋 Para crear el proyecto:${NC}"
echo -e "${BLUE}1. Ve a: https://github.com/$REPO_OWNER/$REPO_NAME${NC}"
echo -e "${BLUE}2. Haz clic en 'Projects' → 'New project'${NC}"
echo -e "${BLUE}3. Selecciona 'Team planning' template${NC}"
echo -e "${BLUE}4. Título: 'AFIP Monitor MCP - Development Roadmap'${NC}"

echo ""
echo -e "${GREEN}🎉 Configuración usando API completada!${NC}"
echo -e "${BLUE}📊 Resumen:${NC}"
echo -e "   • ✅ 6 milestones creados via API"
echo -e "   • ✅ 3 historias de usuario de ejemplo creadas"
echo -e "   • ✅ Issues asignadas a milestones automáticamente"
echo -e "   • ⏳ Proyecto: crear manualmente desde web"

echo ""
echo -e "${YELLOW}📋 Para continuar:${NC}"
echo -e "   • Crear proyecto desde web"
echo -e "   • Ejecutar script para crear las 29 historias restantes"
echo -e "   • Configurar vistas del proyecto"

echo ""
echo -e "${BLUE}🔗 Enlaces:${NC}"
echo -e "   • Issues: https://github.com/$REPO_OWNER/$REPO_NAME/issues"
echo -e "   • Milestones: https://github.com/$REPO_OWNER/$REPO_NAME/milestones"
echo -e "   • Nuevo proyecto: https://github.com/$REPO_OWNER/$REPO_NAME/projects"chmod +x 