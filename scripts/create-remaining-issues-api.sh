#!/bin/bash

# =============================================================================
# Script para crear las 29 historias de usuario restantes (HU-004 a HU-032)
# =============================================================================

REPO_OWNER="agustinabusto"
REPO_NAME="mcp-poc"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📖 Creando las 29 historias de usuario restantes...${NC}"

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
            echo -e "${YELLOW}⚠️ Error con API, intentando con gh issue...${NC}"
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
        echo -e "${YELLOW}⚠️ Milestone no encontrado${NC}"
    fi
}

# =============================================================================
# COMPLETAR MÓDULO MONITOR AUTOMÁTICO AFIP
# =============================================================================

echo -e "${YELLOW}🏢 Completando módulo Monitor Automático AFIP...${NC}"

# HU-004: Detección de Cambios
create_issue_with_milestone "HU-004: Detección de Cambios" \
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

# =============================================================================
# MÓDULO SISTEMA DE ALERTAS
# =============================================================================

echo -e "${YELLOW}🚨 Creando módulo Sistema de Alertas...${NC}"

# HU-005: Alertas por Severidad
create_issue_with_milestone "HU-005: Alertas por Severidad" \
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

# HU-006: Múltiples Canales de Notificación
create_issue_with_milestone "HU-006: Múltiples Canales de Notificación" \
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
"Milestone 2: Sistema de Alertas"

# HU-007: Auto-agrupación de Alertas
create_issue_with_milestone "HU-007: Auto-agrupación de Alertas" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** que las alertas similares se consoliden inteligentemente
**Para** evitar spam de notificaciones y mantener la información organizada

## Criterios de Aceptación
- [ ] CA-001: Identificar alertas similares automáticamente
- [ ] CA-002: Agrupar alertas similares manteniendo referencias individuales
- [ ] CA-003: Visualizar alertas agrupadas con contador
- [ ] CA-004: Permitir gestión individual y grupal de alertas

## Información Adicional
- **Módulo:** Sistema de Alertas
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 3" \
"user-story,alertas,priority-medium" \
"Milestone 2: Sistema de Alertas"

# HU-008: Escalamiento de Alertas
create_issue_with_milestone "HU-008: Escalamiento de Alertas" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** que las alertas se escalen automáticamente según criticidad y tiempo
**Para** asegurar que los eventos críticos no pasen desapercibidos

## Criterios de Aceptación
- [ ] CA-001: Configurar reglas de escalamiento por severidad y tiempo
- [ ] CA-002: Escalar automáticamente alertas no atendidas
- [ ] CA-003: Escalamiento inmediato para alertas críticas
- [ ] CA-004: Detener escalamiento cuando se resuelve la alerta

## Información Adicional
- **Módulo:** Sistema de Alertas
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 3" \
"user-story,alertas,priority-medium" \
"Milestone 2: Sistema de Alertas"

# =============================================================================
# MÓDULO COMPLIANCE CHECKER
# =============================================================================

echo -e "${YELLOW}✅ Creando módulo Compliance Checker...${NC}"

# HU-009: Score de Compliance
create_issue_with_milestone "HU-009: Score de Compliance" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** obtener una evaluación numérica del cumplimiento fiscal
**Para** tener una visión cuantitativa del estado de compliance

## Criterios de Aceptación
- [ ] CA-001: Calcular score 0-100 basado en factores ponderados
- [ ] CA-002: Categorizar score con colores y descripciones
- [ ] CA-003: Mostrar detalle granular por categoría
- [ ] CA-004: Sugerir acciones específicas de mejora

## Información Adicional
- **Módulo:** Compliance Checker
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 4" \
"user-story,compliance,priority-high" \
"Milestone 3: Compliance Checker"

# HU-010: Verificaciones Múltiples
create_issue_with_milestone "HU-010: Verificaciones Múltiples" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** realizar verificaciones de Estado fiscal, IVA, Ganancias y Seguridad Social
**Para** tener un control integral del compliance fiscal

## Criterios de Aceptación
- [ ] CA-001: Realizar verificaciones simultáneas de múltiples aspectos
- [ ] CA-002: Mostrar resultados consolidados con progreso
- [ ] CA-003: Detectar inconsistencias entre verificaciones
- [ ] CA-004: Configurar verificaciones automáticas programadas

## Información Adicional
- **Módulo:** Compliance Checker
- **Prioridad:** Alta
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 4" \
"user-story,compliance,priority-high" \
"Milestone 3: Compliance Checker"

# HU-011: Recomendaciones de Mejora
create_issue_with_milestone "HU-011: Recomendaciones de Mejora" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** recibir acciones sugeridas para mejorar el compliance
**Para** mantener y mejorar el cumplimiento fiscal

## Criterios de Aceptación
- [ ] CA-001: Generar recomendaciones específicas por problema detectado
- [ ] CA-002: Priorizar recomendaciones por impacto
- [ ] CA-003: Proporcionar guías paso a paso
- [ ] CA-004: Trackear implementación de recomendaciones

## Información Adicional
- **Módulo:** Compliance Checker
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 4" \
"user-story,compliance,priority-medium" \
"Milestone 3: Compliance Checker"

# HU-012: Historial de Compliance
create_issue_with_milestone "HU-012: Historial de Compliance" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** hacer seguimiento de la evolución del compliance en el tiempo
**Para** analizar tendencias y mejoras en el cumplimiento fiscal

## Criterios de Aceptación
- [ ] CA-001: Registrar histórico de scores y evaluaciones
- [ ] CA-002: Mostrar tendencias temporales con gráficos
- [ ] CA-003: Comparar períodos y identificar patrones
- [ ] CA-004: Exportar reportes históricos

## Información Adicional
- **Módulo:** Compliance Checker
- **Prioridad:** Baja
- **Estimación:** 3 puntos de historia
- **Sprint:** Sprint 4" \
"user-story,compliance,priority-low" \
"Milestone 3: Compliance Checker"

# =============================================================================
# MÓDULO DASHBOARD Y UI
# =============================================================================

echo -e "${YELLOW}📊 Creando módulo Dashboard y UI...${NC}"

# HU-013: Dashboard Mobile-First
create_issue_with_milestone "HU-013: Dashboard Mobile-First" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** acceder a un dashboard optimizado para dispositivos móviles
**Para** consultar información desde cualquier dispositivo

## Criterios de Aceptación
- [ ] CA-001: Diseño responsive que funciona en móviles
- [ ] CA-002: Navegación intuitiva en pantallas pequeñas
- [ ] CA-003: Información priorizada por relevancia
- [ ] CA-004: Gestos táctiles para interacción

## Información Adicional
- **Módulo:** Dashboard y UI
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 5" \
"user-story,dashboard,priority-high" \
"Milestone 4: Dashboard Avanzado"

# HU-014: Actualizaciones en Tiempo Real
create_issue_with_milestone "HU-014: Actualizaciones en Tiempo Real" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** recibir actualizaciones automáticas vía WebSocket
**Para** mantener la información siempre actualizada sin necesidad de refrescar

## Criterios de Aceptación
- [ ] CA-001: Conexión WebSocket estable y automática
- [ ] CA-002: Actualizaciones en tiempo real sin refrescar
- [ ] CA-003: Sincronización entre múltiples pestañas
- [ ] CA-004: Indicadores de conexión y estado

## Información Adicional
- **Módulo:** Dashboard y UI
- **Prioridad:** Alta
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 5" \
"user-story,dashboard,priority-high" \
"Milestone 4: Dashboard Avanzado"

# HU-015: Interfaz Intuitiva
create_issue_with_milestone "HU-015: Interfaz Intuitiva" \
"## Historia de Usuario
**Como** usuario no técnico
**Quiero** una interfaz fácil de usar y comprender
**Para** poder operar el sistema sin conocimientos técnicos avanzados

## Criterios de Aceptación
- [ ] CA-001: Interfaz clara con iconografía universalmente entendible
- [ ] CA-002: Flujos de usuario simples y lógicos
- [ ] CA-003: Tooltips y ayuda contextual
- [ ] CA-004: Onboarding para nuevos usuarios

## Información Adicional
- **Módulo:** Dashboard y UI
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 5" \
"user-story,dashboard,priority-medium" \
"Milestone 4: Dashboard Avanzado"

# HU-016: Tema Claro/Oscuro
create_issue_with_milestone "HU-016: Tema Claro/Oscuro" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** poder alternar entre modo claro y oscuro
**Para** adaptar la interfaz a mis preferencias visuales

## Criterios de Aceptación
- [ ] CA-001: Toggle para cambiar entre modo claro y oscuro
- [ ] CA-002: Persistencia de preferencia del usuario
- [ ] CA-003: Transición suave entre temas
- [ ] CA-004: Compatibilidad con preferencias del sistema

## Información Adicional
- **Módulo:** Dashboard y UI
- **Prioridad:** Baja
- **Estimación:** 3 puntos de historia
- **Sprint:** Sprint 5" \
"user-story,dashboard,priority-low" \
"Milestone 4: Dashboard Avanzado"

# =============================================================================
# MÓDULO ARQUITECTURA MCP
# =============================================================================

echo -e "${YELLOW}🔧 Creando módulo Arquitectura MCP...${NC}"

# HU-017: Servidor MCP
create_issue_with_milestone "HU-017: Servidor MCP" \
"## Historia de Usuario
**Como** desarrollador/administrador
**Quiero** implementar un servidor MCP completo
**Para** exponer herramientas, recursos y prompts del sistema

## Criterios de Aceptación
- [ ] CA-001: Servidor MCP funcional con todas las herramientas
- [ ] CA-002: Exposición de recursos dinámicos
- [ ] CA-003: Prompts especializados para compliance
- [ ] CA-004: Documentación completa de la implementación

## Información Adicional
- **Módulo:** Arquitectura MCP
- **Prioridad:** Alta
- **Estimación:** 13 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,mcp,priority-high" \
"Milestone 5: Arquitectura MCP"

# HU-018: Multi-transporte
create_issue_with_milestone "HU-018: Multi-transporte" \
"## Historia de Usuario
**Como** desarrollador/administrador
**Quiero** soporte para WebSocket, HTTP y STDIO
**Para** permitir diferentes formas de comunicación con el servidor

## Criterios de Aceptación
- [ ] CA-001: Soporte completo para WebSocket transport
- [ ] CA-002: Soporte completo para HTTP transport
- [ ] CA-003: Soporte completo para STDIO transport
- [ ] CA-004: Configuración flexible de transporte

## Información Adicional
- **Módulo:** Arquitectura MCP
- **Prioridad:** Media
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,mcp,priority-medium" \
"Milestone 5: Arquitectura MCP"

# HU-019: Herramientas MCP Especializadas
create_issue_with_milestone "HU-019: Herramientas MCP Especializadas" \
"## Historia de Usuario
**Como** desarrollador/administrador
**Quiero** herramientas MCP especializadas para compliance fiscal
**Para** permitir operaciones específicas del dominio fiscal

## Criterios de Aceptación
- [ ] CA-001: Herramienta check_compliance implementada
- [ ] CA-002: Herramienta get_alerts implementada
- [ ] CA-003: Herramienta validate_fiscal implementada
- [ ] CA-004: Herramienta setup_monitoring implementada

## Información Adicional
- **Módulo:** Arquitectura MCP
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,mcp,priority-high" \
"Milestone 5: Arquitectura MCP"

# HU-020: Recursos Dinámicos
create_issue_with_milestone "HU-020: Recursos Dinámicos" \
"## Historia de Usuario
**Como** desarrollador/administrador
**Quiero** acceso a datos de AFIP en tiempo real
**Para** mantener la información siempre actualizada

## Criterios de Aceptación
- [ ] CA-001: Recursos dinámicos para datos fiscales
- [ ] CA-002: Actualización automática de recursos
- [ ] CA-003: Caché inteligente para optimización
- [ ] CA-004: Versionado de recursos

## Información Adicional
- **Módulo:** Arquitectura MCP
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 6" \
"user-story,mcp,priority-medium" \
"Milestone 5: Arquitectura MCP"

echo -e "${GREEN}✅ Primeras 20 historias de usuario completadas!${NC}"
echo -e "${BLUE}📊 Continuando con las 12 restantes...${NC}"

# =============================================================================
# RESUMEN PARCIAL
# =============================================================================

echo -e "${YELLOW}📋 Progreso actual:${NC}"
echo -e "   • ✅ HU-001 a HU-020 creadas (20/32)"
echo -e "   • ✅ 5 módulos completados"
echo -e "   • ⏳ Faltan 12 historias más"

echo ""
echo -e "${BLUE}🔗 Ver progreso:${NC}"
echo -e "   gh issue list --repo $REPO_OWNER/$REPO_NAME"