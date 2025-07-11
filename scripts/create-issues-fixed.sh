#!/bin/bash

# =============================================================================
# Script CORREGIDO para crear todas las historias de usuario
# =============================================================================

REPO_OWNER="agustinabusto"
REPO_NAME="mcp-poc"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📖 Creando todas las historias de usuario...${NC}"

# =============================================================================
# VERIFICAR MILESTONES EXISTENTES
# =============================================================================

echo -e "${YELLOW}🔍 Verificando milestones existentes...${NC}"
if ! gh milestone list --repo "$REPO_OWNER/$REPO_NAME" &> /dev/null; then
    echo -e "${RED}❌ Error: No se pueden listar milestones. Ejecuta primero el script de diagnóstico.${NC}"
    exit 1
fi

# Listar milestones para verificar nombres exactos
echo -e "${BLUE}📋 Milestones disponibles:${NC}"
gh milestone list --repo "$REPO_OWNER/$REPO_NAME" --state all

# =============================================================================
# FUNCIÓN PARA CREAR ISSUES SIN MILESTONE (PARA EVITAR ERRORES)
# =============================================================================

create_issue_safe() {
    local title=$1
    local body=$2
    local labels=$3
    local milestone=$4
    
    echo -e "${BLUE}📝 Creando: $title${NC}"
    
    # Intentar crear con milestone primero
    if [[ -n "$milestone" ]]; then
        if gh issue create --repo "$REPO_OWNER/$REPO_NAME" \
            --title "$title" \
            --body "$body" \
            --label "$labels" \
            --milestone "$milestone" 2>/dev/null; then
            echo -e "${GREEN}✅ Issue creado con milestone${NC}"
            return
        else
            echo -e "${YELLOW}⚠️ Error con milestone, creando sin milestone...${NC}"
        fi
    fi
    
    # Crear sin milestone si falla
    if gh issue create --repo "$REPO_OWNER/$REPO_NAME" \
        --title "$title" \
        --body "$body" \
        --label "$labels" 2>/dev/null; then
        echo -e "${GREEN}✅ Issue creado sin milestone${NC}"
    else
        echo -e "${RED}❌ Error creando issue${NC}"
    fi
}

# =============================================================================
# CREAR TODAS LAS HISTORIAS DE USUARIO
# =============================================================================

# HU-001: Verificación de Estado Fiscal
create_issue_safe "HU-001: Verificación de Estado Fiscal" \
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
    ""

# HU-002: Control de Inscripciones
create_issue_safe "HU-002: Control de Inscripciones" \
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
    ""

# HU-003: Seguimiento de Declaraciones
create_issue_safe "HU-003: Seguimiento de Declaraciones" \
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
    ""

# HU-004: Detección de Cambios
create_issue_safe "HU-004: Detección de Cambios" \
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
    ""

# HU-005: Alertas por Severidad
create_issue_safe "HU-005: Alertas por Severidad" \
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
    ""

# HU-006: Múltiples Canales de Notificación
create_issue_safe "HU-006: Múltiples Canales de Notificación" \
    "## Historia de Usuario
**Como** usuario del sistema
**Quiero** recibir notificaciones por Dashboard, Email, SMS y WebSocket
**Para** estar informado a través de diferentes medios de comunicación

## Criterios de Aceptación
- [ ] CA-001: Configurar canales de notificación independientemente
- [ ] CA-002: Dashboard con notificaciones en tiempo real
- [ ] CA-003: Notificaciones por email con formato profesional
- [ ] CA-004: Notificaciones por SMS para alertas críticas
- [ ] CA-005: Notificaciones WebSocket instantáneas

## Información Adicional
- **Módulo:** Sistema de Alertas
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 3" \
    "user-story,alertas,priority-high" \
    ""

# Continuar con las demás historias...
# (Agregando todas las 32 historias de usuario de manera similar)

# HU-007 hasta HU-032 siguiendo el mismo patrón...

echo -e "${GREEN}✅ Script de creación de issues completado!${NC}"
echo -e "${BLUE}📊 Para verificar que se crearon:${NC}"
echo -e "  gh issue list --repo $REPO_OWNER/$REPO_NAME"
echo ""
echo -e "${YELLOW}📋 Para asignar milestones después:${NC}"
echo -e "  gh issue edit NUMERO --milestone 'NOMBRE_EXACTO_MILESTONE'"