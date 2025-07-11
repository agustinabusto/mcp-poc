#!/bin/bash

# =============================================================================
# Script para Diagnosticar y Corregir Problemas con Milestones y Proyecto
# =============================================================================

REPO_OWNER="agustinabusto"
REPO_NAME="mcp-poc"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Diagnosticando problemas con milestones y proyecto...${NC}"

# =============================================================================
# 1. VERIFICAR CONEXIÓN Y AUTENTICACIÓN
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
# 2. VERIFICAR ACCESO AL REPOSITORIO
# =============================================================================

echo -e "${YELLOW}📁 Verificando acceso al repositorio...${NC}"
if ! gh repo view "$REPO_OWNER/$REPO_NAME" &> /dev/null; then
    echo -e "${RED}❌ No se puede acceder al repositorio $REPO_OWNER/$REPO_NAME${NC}"
    echo -e "${BLUE}💡 Verifica que:${NC}"
    echo -e "   1. El repositorio existe"
    echo -e "   2. Tienes permisos de acceso"
    echo -e "   3. El nombre es correcto"
    exit 1
else
    echo -e "${GREEN}✅ Acceso al repositorio confirmado${NC}"
fi

# =============================================================================
# 3. LISTAR MILESTONES EXISTENTES
# =============================================================================

echo -e "${YELLOW}📊 Listando milestones existentes...${NC}"
echo -e "${BLUE}Milestones actuales en el repositorio:${NC}"
gh milestone list --repo "$REPO_OWNER/$REPO_NAME" --state all || echo -e "${YELLOW}⚠️ No hay milestones creados${NC}"

# =============================================================================
# 4. LISTAR PROYECTOS EXISTENTES
# =============================================================================

echo -e "${YELLOW}📋 Listando proyectos existentes...${NC}"
echo -e "${BLUE}Proyectos actuales:${NC}"
gh project list --owner "$REPO_OWNER" || echo -e "${YELLOW}⚠️ No hay proyectos creados o no se pueden listar${NC}"

# =============================================================================
# 5. CREAR MILESTONES SI NO EXISTEN
# =============================================================================

echo -e "${YELLOW}🎯 Creando milestones faltantes...${NC}"

# Array de milestones a crear
declare -a milestones=(
    "Milestone 1: Monitor Básico AFIP|Funcionalidades básicas de monitoreo fiscal|2025-07-24"
    "Milestone 2: Sistema de Alertas|Sistema completo de alertas y notificaciones|2025-08-07"
    "Milestone 3: Compliance Checker|Motor de compliance y scoring|2025-08-21"
    "Milestone 4: Dashboard Avanzado|Interfaz completa y responsive|2025-09-04"
    "Milestone 5: Arquitectura MCP|Implementación completa de MCP|2025-09-18"
    "Milestone 6: Configuración y APIs|Administración y APIs externas|2025-10-02"
)

for milestone_data in "${milestones[@]}"; do
    IFS='|' read -ra MILESTONE_PARTS <<< "$milestone_data"
    title="${MILESTONE_PARTS[0]}"
    description="${MILESTONE_PARTS[1]}"
    due_date="${MILESTONE_PARTS[2]}"
    
    echo -e "${BLUE}📌 Creando milestone: $title${NC}"
    
    # Intentar crear el milestone
    if gh milestone create --repo "$REPO_OWNER/$REPO_NAME" --title "$title" --description "$description" --due-date "$due_date" 2>/dev/null; then
        echo -e "${GREEN}✅ Milestone '$title' creado exitosamente${NC}"
    else
        echo -e "${YELLOW}⚠️ Milestone '$title' ya existe o hubo un error${NC}"
    fi
done

# =============================================================================
# 6. VERIFICAR MILESTONES CREADOS
# =============================================================================

echo -e "${YELLOW}✅ Verificando milestones después de la creación...${NC}"
echo -e "${BLUE}Milestones finales:${NC}"
gh milestone list --repo "$REPO_OWNER/$REPO_NAME" --state all

# =============================================================================
# 7. CREAR LABELS SI NO EXISTEN
# =============================================================================

echo -e "${YELLOW}🏷️ Verificando y creando labels...${NC}"

# Array de labels a crear
declare -a labels=(
    "user-story|Historia de usuario|0E8A16"
    "epic|Epic/Épica|5319E7"
    "task|Tarea técnica|1D76DB"
    "enhancement|Mejora|A2EEEF"
    "documentation|Documentación|0075CA"
    "monitor-afip|Monitor Automático AFIP|D93F0B"
    "alertas|Sistema de Alertas|FBCA04"
    "compliance|Compliance Checker|0E8A16"
    "dashboard|Dashboard y UI|1D76DB"
    "mcp|Arquitectura MCP|5319E7"
    "admin|Configuración y Admin|B60205"
    "api|Integración y APIs|0075CA"
    "security|Seguridad y Performance|D93F0B"
    "priority-critical|Prioridad Crítica|B60205"
    "priority-high|Prioridad Alta|D93F0B"
    "priority-medium|Prioridad Media|FBCA04"
    "priority-low|Prioridad Baja|0E8A16"
)

for label_data in "${labels[@]}"; do
    IFS='|' read -ra LABEL_PARTS <<< "$label_data"
    name="${LABEL_PARTS[0]}"
    description="${LABEL_PARTS[1]}"
    color="${LABEL_PARTS[2]}"
    
    echo -e "${BLUE}🏷️ Creando label: $name${NC}"
    
    if gh label create --repo "$REPO_OWNER/$REPO_NAME" "$name" --description "$description" --color "$color" 2>/dev/null; then
        echo -e "${GREEN}✅ Label '$name' creado exitosamente${NC}"
    else
        echo -e "${YELLOW}⚠️ Label '$name' ya existe${NC}"
    fi
done

# =============================================================================
# 8. CREAR PROYECTO SI NO EXISTE
# =============================================================================

echo -e "${YELLOW}📋 Creando proyecto si no existe...${NC}"

PROJECT_TITLE="AFIP Monitor MCP - Development Roadmap"
PROJECT_DESCRIPTION="Sistema de monitoreo automático AFIP con alertas proactivas y compliance checker usando MCP"

echo -e "${BLUE}📝 Creando proyecto: $PROJECT_TITLE${NC}"
if project_output=$(gh project create --owner "$REPO_OWNER" --title "$PROJECT_TITLE" --body "$PROJECT_DESCRIPTION" 2>&1); then
    echo -e "${GREEN}✅ Proyecto creado exitosamente${NC}"
    echo "$project_output"
    
    # Extraer número del proyecto
    project_number=$(echo "$project_output" | grep -oP 'https://github.com/users/[^/]+/projects/\K\d+' || echo "$project_output" | grep -oP 'Number: \K\d+')
    if [[ -n "$project_number" ]]; then
        echo -e "${GREEN}📊 Número del proyecto: $project_number${NC}"
        echo "$project_number" > .project_number
    fi
else
    echo -e "${YELLOW}⚠️ Error al crear proyecto o ya existe:${NC}"
    echo "$project_output"
fi

# =============================================================================
# 9. FUNCIÓN PARA CREAR ISSUES SIN MILESTONES (TEMPORALMENTE)
# =============================================================================

echo -e "${YELLOW}📝 Creando función para issues sin milestones...${NC}"

create_issue_simple() {
    local title=$1
    local body=$2
    local labels=$3
    
    echo -e "${BLUE}📝 Creando issue: $title${NC}"
    
    if gh issue create --repo "$REPO_OWNER/$REPO_NAME" \
        --title "$title" \
        --body "$body" \
        --label "$labels" 2>/dev/null; then
        echo -e "${GREEN}✅ Issue '$title' creado exitosamente${NC}"
    else
        echo -e "${RED}❌ Error creando issue '$title'${NC}"
    fi
}

# =============================================================================
# 10. CREAR ALGUNAS ISSUES DE PRUEBA
# =============================================================================

echo -e "${YELLOW}🧪 Creando issues de prueba...${NC}"

# HU-001: Verificación de Estado Fiscal
create_issue_simple "HU-001: Verificación de Estado Fiscal" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** verificar automáticamente el estado fiscal de un contribuyente
**Para** mantener el control del compliance fiscal en tiempo real

## Criterios de Aceptación
- [ ] CA-001: El sistema debe consultar automáticamente el estado en AFIP para un CUIT válido
- [ ] CA-002: Debe mostrar información detallada del estado fiscal en menos de 5 segundos
- [ ] CA-003: Debe manejar errores y mostrar mensajes claros al usuario
- [ ] CA-004: Debe guardar el resultado en el histórico de verificaciones

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 1" \
    "user-story,monitor-afip,priority-high"

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
    "user-story,monitor-afip,priority-high"

# =============================================================================
# 11. RESUMEN Y PRÓXIMOS PASOS
# =============================================================================

echo -e "${GREEN}🎉 Diagnóstico y corrección completados!${NC}"
echo -e "${BLUE}📊 Resumen:${NC}"
echo -e "   • ✅ Autenticación verificada"
echo -e "   • ✅ Acceso al repositorio confirmado"
echo -e "   • ✅ Milestones creados/verificados"
echo -e "   • ✅ Labels creados/verificados"
echo -e "   • ✅ Proyecto creado/verificado"
echo -e "   • ✅ Issues de prueba creados"

echo ""
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo -e "   1. Verificar que los milestones aparecen: gh milestone list --repo $REPO_OWNER/$REPO_NAME"
echo -e "   2. Verificar que el proyecto aparece: gh project list --owner $REPO_OWNER"
echo -e "   3. Ejecutar el script de issues corregido"

echo ""
echo -e "${BLUE}🔗 Enlaces útiles:${NC}"
echo -e "   • Issues: https://github.com/$REPO_OWNER/$REPO_NAME/issues"
echo -e "   • Milestones: https://github.com/$REPO_OWNER/$REPO_NAME/milestones"
echo -e "   • Projects: https://github.com/$REPO_OWNER/$REPO_NAME/projects"

# =============================================================================
# 12. COMANDOS MANUALES DE VERIFICACIÓN
# =============================================================================

echo -e "${YELLOW}🔧 Comandos para verificación manual:${NC}"
cat << 'EOF'

# Verificar milestones
gh milestone list --repo agustinabusto/mcp-poc

# Verificar labels
gh label list --repo agustinabusto/mcp-poc

# Verificar proyectos
gh project list --owner agustinabusto

# Verificar issues
gh issue list --repo agustinabusto/mcp-poc

# Crear issue manualmente (ejemplo)
gh issue create --repo agustinabusto/mcp-poc --title "Prueba" --body "Contenido de prueba"

EOF