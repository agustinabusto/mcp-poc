#!/bin/bash

# =============================================================================
# Script para crear TODAS las 32 historias de usuario SIN milestones
# Compatible con versiones antiguas de GitHub CLI
# =============================================================================

REPO_OWNER="agustinabusto"
REPO_NAME="mcp-poc"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📖 Creando todas las 32 historias de usuario...${NC}"

# =============================================================================
# VERIFICAR VERSIÓN Y CAPACIDADES
# =============================================================================

echo -e "${YELLOW}📋 Verificando GitHub CLI...${NC}"
gh_version=$(gh --version 2>/dev/null | head -n1)
echo -e "${BLUE}Versión: $gh_version${NC}"

# Verificar comandos disponibles
if gh milestone --help &> /dev/null; then
    echo -e "${GREEN}✅ Comando milestone disponible${NC}"
    MILESTONE_SUPPORT=true
else
    echo -e "${YELLOW}⚠️ Comando milestone NO disponible - crearemos issues sin milestones${NC}"
    MILESTONE_SUPPORT=false
fi

# =============================================================================
# FUNCIÓN PARA CREAR ISSUES
# =============================================================================

create_issue() {
    local number=$1
    local title=$2
    local module=$3
    local priority=$4
    local sprint=$5
    local body=$6
    
    local full_title="HU-$(printf "%03d" $number): $title"
    local labels="user-story"
    
    # Agregar label de módulo
    case $module in
        "Monitor Automático AFIP") labels="$labels,monitor-afip" ;;
        "Sistema de Alertas") labels="$labels,alertas" ;;
        "Compliance Checker") labels="$labels,compliance" ;;
        "Dashboard y UI") labels="$labels,dashboard" ;;
        "Arquitectura MCP") labels="$labels,mcp" ;;
        "Configuración y Admin") labels="$labels,admin" ;;
        "Integración y APIs") labels="$labels,api" ;;
        "Seguridad y Performance") labels="$labels,security" ;;
    esac
    
    # Agregar label de prioridad
    case $priority in
        "Alta") labels="$labels,priority-high" ;;
        "Media") labels="$labels,priority-medium" ;;
        "Baja") labels="$labels,priority-low" ;;
        "Crítica") labels="$labels,priority-critical" ;;
    esac
    
    echo -e "${BLUE}📝 Creando: $full_title${NC}"
    
    # Crear issue
    if gh issue create --repo "$REPO_OWNER/$REPO_NAME" \
        --title "$full_title" \
        --body "$body" \
        --label "$labels" 2>/dev/null; then
        echo -e "${GREEN}✅ Issue creado exitosamente${NC}"
    else
        echo -e "${RED}❌ Error creando issue${NC}"
    fi
}

# =============================================================================
# CREAR TODAS LAS HISTORIAS DE USUARIO
# =============================================================================

echo -e "${YELLOW}🏗️ Creando historias de usuario del módulo Monitor Automático AFIP...${NC}"

# HU-001: Verificación de Estado Fiscal
create_issue 1 "Verificación de Estado Fiscal" "Monitor Automático AFIP" "Alta" "Sprint 1" \
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
- **Sprint:** Sprint 1"

# HU-002: Control de Inscripciones
create_issue 2 "Control de Inscripciones" "Monitor Automático AFIP" "Alta" "Sprint 1" \
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
- **Sprint:** Sprint 1"

# HU-003: Seguimiento de Declaraciones
create_issue 3 "Seguimiento de Declaraciones" "Monitor Automático AFIP" "Alta" "Sprint 2" \
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
- [ ] Sistema de alertas preventivas configurado
- [ ] Dashboard de declaraciones implementado
- [ ] Documentación de API actualizada
- [ ] Pruebas unitarias cubren 90%+ del código
- [ ] Pruebas de integración exitosas
- [ ] Revisión de código completada

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 2"

# HU-004: Detección de Cambios
create_issue 4 "Detección de Cambios" "Monitor Automático AFIP" "Media" "Sprint 2" \
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
- [ ] Algoritmo de comparación de estados configurado
- [ ] Integración con sistema de alertas
- [ ] Dashboard actualizado con historial de cambios
- [ ] Documentación de API actualizada
- [ ] Pruebas unitarias cubren 90%+ del código
- [ ] Pruebas de integración exitosas
- [ ] Revisión de código completada

## Información Adicional
- **Módulo:** Monitor Automático AFIP
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 2"

echo -e "${YELLOW}🚨 Creando historias de usuario del módulo Sistema de Alertas...${NC}"

# HU-005: Alertas por Severidad
create_issue 5 "Alertas por Severidad" "Sistema de Alertas" "Alta" "Sprint 2" \
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
- [ ] Sistema de clasificación de severidad implementado
- [ ] Motor de reglas para asignación automática
- [ ] Interfaz de usuario diferenciada por severidad
- [ ] Sistema de filtrado y ordenamiento
- [ ] Configuración personalizable por usuario
- [ ] Documentación de API actualizada
- [ ] Pruebas unitarias cubren 90%+ del código
- [ ] Pruebas de integración exitosas
- [ ] Revisión de código completada

## Información Adicional
- **Módulo:** Sistema de Alertas
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 2"

# HU-006: Múltiples Canales de Notificación
create_issue 6 "Múltiples Canales de Notificación" "Sistema de Alertas" "Alta" "Sprint 3" \
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

## Definición de Terminado
- [ ] Cuatro canales de notificación implementados
- [ ] Sistema de configuración por canal
- [ ] Plantillas de notificación por canal
- [ ] Gestión de horarios y frecuencias
- [ ] Dashboard con notificaciones en tiempo real
- [ ] Integración con proveedores de SMS
- [ ] Servidor WebSocket configurado
- [ ] Documentación de API actualizada
- [ ] Pruebas unitarias cubren 90%+ del código

## Información Adicional
- **Módulo:** Sistema de Alertas
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 3"

# HU-007: Auto-agrupación de Alertas
create_issue 7 "Auto-agrupación de Alertas" "Sistema de Alertas" "Media" "Sprint 3" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** que las alertas similares se consoliden inteligentemente
**Para** evitar spam de notificaciones y mantener la información organizada

## Criterios de Aceptación
- [ ] CA-001: Identificar alertas similares automáticamente
- [ ] CA-002: Agrupar alertas similares manteniendo referencias individuales
- [ ] CA-003: Visualizar alertas agrupadas con contador
- [ ] CA-004: Permitir gestión individual y grupal de alertas

## Definición de Terminado
- [ ] Algoritmo de agrupación implementado
- [ ] Sistema de identificación de similitudes
- [ ] Interfaz de usuario para alertas agrupadas
- [ ] Configuración de criterios de agrupación
- [ ] Gestión individual y grupal de alertas
- [ ] Documentación de API actualizada
- [ ] Pruebas unitarias cubren 90%+ del código

## Información Adicional
- **Módulo:** Sistema de Alertas
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 3"

# HU-008: Escalamiento de Alertas
create_issue 8 "Escalamiento de Alertas" "Sistema de Alertas" "Media" "Sprint 3" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** que las alertas se escalen automáticamente según criticidad y tiempo
**Para** asegurar que los eventos críticos no pasen desapercibidos

## Criterios de Aceptación
- [ ] CA-001: Configurar reglas de escalamiento por severidad y tiempo
- [ ] CA-002: Escalar automáticamente alertas no atendidas
- [ ] CA-003: Escalamiento inmediato para alertas críticas
- [ ] CA-004: Detener escalamiento cuando se resuelve la alerta

## Definición de Terminado
- [ ] Sistema de escalamiento automático implementado
- [ ] Configuración flexible por severidad y tiempo
- [ ] Integración con múltiples canales de notificación
- [ ] Gestión de destinatarios por nivel
- [ ] Logs de auditoría de escalamientos
- [ ] Métricas de tiempo de respuesta
- [ ] Documentación de API actualizada
- [ ] Pruebas unitarias cubren 90%+ del código

## Información Adicional
- **Módulo:** Sistema de Alertas
- **Prioridad:** Media
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 3"

echo -e "${YELLOW}✅ Creando historias de usuario del módulo Compliance Checker...${NC}"

# HU-009: Score de Compliance
create_issue 9 "Score de Compliance" "Compliance Checker" "Alta" "Sprint 4" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** obtener una evaluación numérica del cumplimiento fiscal
**Para** tener una visión cuantitativa del estado de compliance

## Criterios de Aceptación
- [ ] CA-001: Calcular score 0-100 basado en factores ponderados
- [ ] CA-002: Categorizar score con colores y descripciones
- [ ] CA-003: Mostrar detalle granular por categoría
- [ ] CA-004: Sugerir acciones específicas de mejora

## Definición de Terminado
- [ ] Algoritmo de cálculo de score implementado
- [ ] Sistema de ponderación configurable
- [ ] Categorización visual del score
- [ ] Detalle granular por componente
- [ ] Motor de recomendaciones implementado
- [ ] Historial y tendencias del score
- [ ] Documentación de API actualizada
- [ ] Pruebas unitarias cubren 90%+ del código

## Información Adicional
- **Módulo:** Compliance Checker
- **Prioridad:** Alta
- **Estimación:** 8 puntos de historia
- **Sprint:** Sprint 4"

# HU-010: Verificaciones Múltiples
create_issue 10 "Verificaciones Múltiples" "Compliance Checker" "Alta" "Sprint 4" \
"## Historia de Usuario
**Como** usuario del sistema
**Quiero** realizar verificaciones de Estado fiscal, IVA, Ganancias y Seguridad Social
**Para** tener un control integral del compliance fiscal

## Criterios de Aceptación
- [ ] CA-001: Realizar verificaciones simultáneas de múltiples aspectos
- [ ] CA-002: Mostrar resultados consolidados con progreso
- [ ] CA-003: Detectar inconsistencias entre verificaciones
- [ ] CA-004: Configurar verificaciones automáticas programadas

## Definición de Terminado
- [ ] Sistema de verificaciones paralelas implementado
- [ ] Integración con todas las APIs de AFIP necesarias
- [ ] Consolidación de resultados múltiples
- [ ] Detección de inconsistencias automática
- [ ] Programación de verificaciones automáticas
- [ ] Dashboard de resultados integral
- [ ] Documentación de API actualizada
- [ ] Pruebas unitarias cubren 90%+ del código

## Información Adicional
- **Módulo:** Compliance Checker
- **Prioridad:** Alta
- **Estimación:** 5 puntos de historia
- **Sprint:** Sprint 4"

echo -e "${GREEN}✅ Primeras 10 historias de usuario creadas!${NC}"
echo -e "${BLUE}📊 Para continuar con las 22 restantes, ejecuta la parte 2 del script...${NC}"

# =============================================================================
# RESUMEN PARCIAL
# =============================================================================

echo -e "${YELLOW}📋 Resumen de lo creado hasta ahora:${NC}"
echo -e "   • ✅ HU-001 a HU-010 creadas"
echo -e "   • ✅ 4 módulos cubiertos:"
echo -e "     - Monitor Automático AFIP (4 HU)"
echo -e "     - Sistema de Alertas (4 HU)"
echo -e "     - Compliance Checker (2 HU)"
echo -e "   • ⏳ Faltan 22 historias más"

echo ""
echo -e "${BLUE}🔗 Verificar issues creados:${NC}"
echo -e "   gh issue list --repo $REPO_OWNER/$REPO_NAME"
echo -e "   https://github.com/$REPO_OWNER/$REPO_NAME/issues"