#!/bin/bash

# =============================================================================
# Script para crear las 27 historias de usuario restantes
# =============================================================================

REPO_OWNER="agustinabusto"
REPO_NAME="mcp-poc"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📖 Creando historias de usuario restantes...${NC}"

# Función para crear issues
create_issue() {
    local title=$1
    local milestone=$2
    local body=$3
    local labels=$4
    
    echo -e "${BLUE}📝 Creando: $title${NC}"
    
    gh issue create --repo "$REPO_OWNER/$REPO_NAME" \
        --title "$title" \
        --body "$body" \
        --label "$labels" \
        --milestone "$milestone"
}

# HU-006: Múltiples Canales de Notificación
create_issue "HU-006: Múltiples Canales de Notificación" \
    "Milestone 2: Sistema de Alertas" \
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
    "user-story,alertas,priority-high"

# HU-007: Auto-agrupación de Alertas
create_issue "HU-007: Auto-agrupación de Alertas" \
    "Milestone 2: Sistema de Alertas" \
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
    "user-story,alertas,priority-medium"

# HU-008: Escalamiento de Alertas
create_issue "HU-008: Escalamiento de Alertas" \
    "Milestone 2: Sistema de Alertas" \
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
    "user-story,alertas,priority-medium"

# HU-009: Score de Compliance
create_issue "HU-009: Score de Compliance" \
    "Milestone 3: Compliance Checker" \
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
    "user-story,compliance,priority-high"

# HU-010: Verificaciones Múltiples
create_issue "HU-010: Verificaciones Múltiples" \
    "Milestone 3: Compliance Checker" \
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
    "user-story,compliance,priority-high"

# HU-011: Recomendaciones de Mejora
create_issue "HU-011: Recomendaciones de Mejora" \
    "Milestone 3: Compliance Checker" \
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
    "user-story,compliance,priority-medium"

# HU-012: Historial de Compliance
create_issue "HU-012: Historial de Compliance" \
    "Milestone 3: Compliance Checker" \
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
    "user-story,compliance,priority-low"

# HU-013: Dashboard Mobile-First
create_issue "HU-013: Dashboard Mobile-First" \
    "Milestone 4: Dashboard Avanzado" \
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
    "user-story,dashboard,priority-high"

# HU-014: Actualizaciones en Tiempo Real
create_issue "HU-014: Actualizaciones en Tiempo Real" \
    "Milestone 4: Dashboard Avanzado" \
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
    "user-story,dashboard,priority-high"

# HU-015: Interfaz Intuitiva
create_issue "HU-015: Interfaz Intuitiva" \
    "Milestone 4: Dashboard Avanzado" \
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
    "user-story,dashboard,priority-medium"

# HU-016: Tema Claro/Oscuro
create_issue "HU-016: Tema Claro/Oscuro" \
    "Milestone 4: Dashboard Avanzado" \
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
    "user-story,dashboard,priority-low"

# HU-017: Servidor MCP
create_issue "HU-017: Servidor MCP" \
    "Milestone 5: Arquitectura MCP" \
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
    "user-story,mcp,priority-high"

# HU-018: Multi-transporte
create_issue "HU-018: Multi-transporte" \
    "Milestone 5: Arquitectura MCP" \
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
    "user-story,mcp,priority-medium"

# HU-019: Herramientas MCP Especializadas
create_issue "HU-019: Herramientas MCP Especializadas" \
    "Milestone 5: Arquitectura MCP" \
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
    "user-story,mcp,priority-high"

# HU-020: Recursos Dinámicos
create_issue "HU-020: Recursos Dinámicos" \
    "Milestone 5: Arquitectura MCP" \
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
    "user-story,mcp,priority-medium"

# HU-021: Configuración de Monitoreo
create_issue "HU-021: Configuración de Monitoreo" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,admin,priority-high"

# HU-022: Gestión de Usuarios
create_issue "HU-022: Gestión de Usuarios" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,admin,priority-medium"

# HU-023: Configuración de Reglas de Compliance
create_issue "HU-023: Configuración de Reglas de Compliance" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,admin,priority-medium"

# HU-024: Logs y Auditoría
create_issue "HU-024: Logs y Auditoría" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,admin,priority-medium"

# HU-025: API REST
create_issue "HU-025: API REST" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,api,priority-high"

# HU-026: Webhooks
create_issue "HU-026: Webhooks" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,api,priority-medium"

# HU-027: Exportación de Datos
create_issue "HU-027: Exportación de Datos" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,api,priority-medium"

# HU-028: Documentación de API
create_issue "HU-028: Documentación de API" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,api,priority-medium"

# HU-029: Autenticación y Autorización
create_issue "HU-029: Autenticación y Autorización" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,security,priority-high"

# HU-030: Rate Limiting
create_issue "HU-030: Rate Limiting" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,security,priority-medium"

# HU-031: Monitoreo de Performance
create_issue "HU-031: Monitoreo de Performance" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,security,priority-medium"

# HU-032: Backup y Recuperación
create_issue "HU-032: Backup y Recuperación" \
    "Milestone 6: Configuración y APIs" \
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
    "user-story,security,priority-medium"

echo -e "${GREEN}✅ Todas las historias de usuario han sido creadas!${NC}"
echo -e "${BLUE}📊 Resumen final:${NC}"
echo -e "  • Total de historias: 32"
echo -e "  • Módulos cubiertos: 8"
echo -e "  • Sprints planificados: 6"
echo -e "  • Milestones configurados: 6"
echo ""
echo -e "${GREEN}🎉 ¡Proyecto completamente configurado!${NC}"
echo -e "${BLUE}🔗 Accede a tu proyecto en:${NC}"
echo -e "  https://github.com/$REPO_OWNER/$REPO_NAME/projects"