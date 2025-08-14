# AFIP Monitor MCP - Development Tasks

**Fecha:** 2025-08-13  
**Versión:** 1.0  
**Fuente:** Plan Kanban Board.csv + Documentación del Proyecto  
**Contexto:** Sistema de compliance fiscal predictivo con arquitectura MCP

## Contexto del Proyecto

### Visión General
AFIP Monitor MCP es una plataforma de compliance fiscal predictiva que previene problemas tributarios antes de que ocurran, reduciendo la carga de trabajo de compliance en un 80% mediante automatización inteligente y análisis de riesgo impulsado por IA.

### Stack Tecnológico
- **Frontend:** React 18.2.0, Vite 4.5.0, Tailwind CSS
- **Backend:** Node.js 18+, Express 4.18.2, WebSocket
- **Base de Datos:** SQLite3 5.1.7 (desarrollo)
- **Infraestructura:** MCP SDK 0.5.0, Docker

### Estado Actual
El proyecto tiene una base funcional con:
- Sistema básico de autenticación y autorización (COMPLETADO)
- Dashboard principal responsive (COMPLETADO)  
- Integración básica con servicios AFIP (COMPLETADO)
- Infraestructura base y CI/CD (COMPLETADO)

---

## TAREAS DE DESARROLLO ORDENADAS POR PRIORIDAD

### 🔥 SPRINT 1 - FOUNDATION (Críticas - Completar Primero)

#### AFIP-001: Obtención de Certificados Digitales
**Estado:** ❌ Bloqueado  
**Prioridad:** 🔥 Crítica  
**Estimación:** L (3-5 días)  
**Responsable:** Adrian  

**Contexto del Proyecto:**
Según la documentación de AFIP-INTEGRATION.md, este es un prerequisito absoluto para cualquier integración real con AFIP. Sin certificados válidos, todas las operaciones con servicios AFIP reales fallarán.

**Descripción Técnica:**
- Registrarse en AFIP como desarrollador siguiendo proceso oficial
- Generar certificado X.509 para WebServices según especificaciones AFIP
- Configurar clave fiscal para el cliente en ambiente de testing
- Descargar y configurar certificado (.crt) y clave privada (.key)
- Validar certificado en ambiente de testing AFIP
- Documentar proceso completo para replicación con otros clientes

**Archivos Involucrados:**
- `src/server/services/afip-client.js`
- `docs/AFIP-INTEGRATION.md`
- Configuración de certificados en `/certificates/`

**Criterios de Aceptación:**
1. Certificados X.509 válidos obtenidos y configurados
2. Validación exitosa en ambiente de testing AFIP
3. Documentación completa del proceso
4. Scripts de configuración automatizada

---

#### AFIP-002: Configuración WSAA (Web Service de Autenticación)  
**Estado:** To DO  
**Prioridad:** 🔥 Crítica  
**Estimación:** M (1-3 días)  
**Dependencias:** AFIP-001  

**Contexto del Proyecto:**
Base fundamental para todas las integraciones AFIP. El WSAA genera los Tickets de Acceso (TA) necesarios para autenticar todas las consultas a servicios AFIP.

**Descripción Técnica:**
- Implementar cliente WSAA en Node.js usando certificados de AFIP-001
- Generar automáticamente Ticket de Acceso (TA) con renovación automática
- Implementar sistema de cache de tokens válidos con verificación de expiración
- Crear manejo robusto de errores para certificados expirados/inválidos
- Testing completo en ambiente AFIP Testing
- Integrar con sistema de logging Winston existente

**Archivos Involucrados:**
- `src/server/services/afip-client.js` (expandir)
- `src/server/services/wsaa-client.js` (crear)
- `src/server/utils/certificate-manager.js` (crear)

**Criterios de Aceptación:**
1. Cliente WSAA funcional con renovación automática de TA
2. Cache de tokens con gestión de expiración
3. Error handling completo y logging
4. Tests unitarios e integración > 80% coverage

---

#### AFIP-003: Integración WSSEG (Validación Contribuyentes)
**Estado:** To DO  
**Prioridad:** ⚡ Alta  
**Estimación:** L (3-5 días)  
**Dependencias:** AFIP-002  

**Contexto del Proyecto:**
Servicio core para validación de contribuyentes en tiempo real. Fundamental para el dashboard de compliance y alertas predictivas.

**Descripción Técnica:**
- Implementar consultas de contribuyentes via WSSEG usando TA de WSAA
- Validación de CUIT en tiempo real con feedback instantáneo
- Sistema de cache Redis para optimizar performance (TTL configurable)
- Manejo robusto de errores de conectividad y rate limiting
- Testing con múltiples CUITs reales en ambiente de testing
- Documentar todos los endpoints disponibles y responses

**Archivos Involucrados:**
- `src/server/services/afip-client.js` (expandir WSSEG)
- `src/server/routes/afip.js` (endpoints REST)
- `src/client/services/afipService.js` (cliente frontend)

**Criterios de Aceptación:**
1. Consultas WSSEG funcionando con cache optimizado
2. Validación CUIT tiempo real < 500ms
3. Error handling y rate limiting implementado
4. Documentación completa API endpoints

---

### ⚡ SPRINT 2 - CORE FEATURES (Altas - Funcionalidades Principales)

#### BE-002: API Contribuyentes - CRUD Completo
**Estado:** Done ✅  
**Prioridad:** ⚡ Alta  
**Estimación:** L (3-5 días)  

**Contexto:** COMPLETADO - Base para gestión de contribuyentes ya implementada.

---

#### FE-003: Módulo Contribuyentes - UI Completa
**Estado:** 🔄 En Progreso  
**Prioridad:** ⚡ Alta  
**Estimación:** XL (1-2 semanas)  
**Dependencias:** BE-002, AFIP-003  

**Contexto del Proyecto:**
Interfaz principal para gestión de contribuyentes. Debe integrar con los servicios AFIP para validación en tiempo real y mostrar indicadores de compliance visual.

**Descripción Técnica:**
- Expandir componentes existentes en `/src/client/components/UserManagement/`
- Lista paginada y filtrable con búsqueda avanzada (nombre, CUIT, estado)
- Formularios de creación/edición con validación CUIT en tiempo real
- Importación masiva CSV/Excel con preview y validación
- Indicadores visuales de compliance status usando colores semáforo
- Export functionality (PDF, Excel, CSV)
- Integración completa con APIs backend existentes

**Archivos Involucrados:**
- `src/client/components/UserManagement/UserManagementView.jsx` (expandir)
- `src/client/components/UserManagement/UserForm.jsx` (mejorar)
- `src/client/services/userService.js` (expandir)
- `src/client/components/common/` (componentes reutilizables)

**Criterios de Aceptación:**
1. Lista con filtros y paginación funcionando
2. CRUD completo con validación en tiempo real
3. Import/export masivo operativo
4. Indicadores compliance visuales implementados

---

#### FE-004: Módulo OCR - Interface
**Estado:** 🔄 En Progreso  
**Prioridad:** ⚡ Alta  
**Estimación:** L (3-5 días)  
**Dependencias:** BE-003  

**Contexto del Proyecto:**
Interface para procesamiento OCR de documentos fiscales. Debe manejar drag & drop, preview de documentos y mostrar progreso de procesamiento.

**Descripción Técnica:**
- Componente drag & drop para archivos múltiples (PDF/imágenes)
- Preview inteligente de documentos con zoom y navegación
- Barra de progreso en tiempo real durante procesamiento OCR
- Editor inline para corrección de datos extraídos
- Historial completo de procesamientos con filtros
- Sistema de retry para procesamientos fallidos
- Integración WebSocket para updates en tiempo real

**Archivos Involucrados:**
- `src/client/components/OCR/` (crear módulo completo)
- `src/client/services/ocrService.js` (crear)
- `src/client/hooks/useFileUpload.js` (crear)

**Criterios de Aceptación:**
1. Upload múltiple con drag & drop funcionando
2. Preview documentos con navegación
3. Edición inline de datos extraídos
4. Historial y retry funcionando

---

#### AFIP-004: Monitoreo Compliance en Tiempo Real
**Estado:** 🔄 En Progreso  
**Prioridad:** ⚡ Alta  
**Estimación:** L (3-5 días)  
**Dependencias:** AFIP-003  

**Contexto del Proyecto:**
Sistema core de alertas predictivas. Debe monitorear cambios en tiempo real y generar alertas proactivas basadas en patterns de riesgo.

**Descripción Técnica:**
- Sistema de polling inteligente para cambios en padrón AFIP
- Monitoreo automático de vencimientos fiscales con alertas preventivas
- Dashboard de compliance score con algoritmo de riesgo predictivo
- Sistema de notificaciones automáticas (WebSocket + email)
- Integración con MCP-COMPLIANCE-001 para análisis avanzado
- Reportes históricos de compliance con trends y predictions

**Archivos Involucrados:**
- `src/server/services/compliance-monitor.js` (crear)
- `src/server/services/alert-manager.js` (expandir)
- `src/client/components/ComplianceDashboard.jsx` (crear)

**Criterios de Aceptación:**
1. Monitoreo tiempo real operativo
2. Sistema de alertas funcionando
3. Compliance score calculándose correctamente
4. Dashboard interactivo funcionando

---

#### HU-022: Gestión de Usuarios y Roles
**Estado:** Done ✅  
**Prioridad:** 🔥 Crítica  

**Contexto:** COMPLETADO - Sistema completo implementado con CRUD, roles granulares y autenticación JWT.

---

### 📊 SPRINT 3 - INTEGRATION (Medias - Integraciones Avanzadas)

#### FE-005: Chat IA Integrado
**Estado:** 🔄 En Progreso  
**Prioridad:** 📊 Media  
**Estimación:** M (1-3 días)  
**Dependencias:** AI-001  

**Contexto del Proyecto:**
Integración del chat IA con Groq API para asistencia contextual. Debe proporcionar respuestas especializadas sobre compliance fiscal.

**Descripción Técnica:**
- Widget de chat flotante con posicionamiento inteligente
- Integración con Groq API existente en `/src/server/routes/groq-chat.js`
- Contexto de sesión persistente con historial completo
- Templates de consultas frecuentes sobre AFIP
- Historial de conversaciones con búsqueda
- Rendering de markdown para respuestas formateadas
- Sistema de feedback para mejorar respuestas

**Archivos Involucrados:**
- `src/client/components/Chat/` (crear módulo completo)
- `src/server/routes/groq-chat.js` (expandir existente)
- `src/server/services/groq-client.js` (expandir existente)

**Criterios de Aceptación:**
1. Widget chat funcionando con Groq API
2. Contexto de sesión persistente
3. Templates y historial operativos
4. Markdown rendering correcto

---

#### HU-017: Servidor MCP Completo
**Estado:** Done ✅  
**Prioridad:** 🔥 Crítica  

**Contexto:** COMPLETADO - Servidor MCP implementado con soporte WebSocket, HTTP y STDIO.

---

#### AFIP-005: Integración con Facturación Electrónica
**Estado:** 🔄 En Progreso  
**Prioridad:** 📊 Media  
**Estimación:** XL (1-2 semanas)  
**Dependencias:** AFIP-003  

**Descripción Técnica:**
- Implementar WSFE (Web Service Facturación Electrónica)
- Generación automática de CAE (Código de Autorización Electrónica)
- Validación completa de comprobantes según normativa AFIP
- Manejo de múltiples puntos de venta
- Testing con facturas reales en ambiente homologación
- Integración con sistema contable externo vía APIs

**Archivos Involucrados:**
- `src/server/services/wsfe-client.js` (crear)
- `src/server/routes/facturacion.js` (crear)
- `src/client/components/Facturacion/` (crear)

**Criterios de Aceptación:**
1. WSFE funcionando con generación CAE
2. Validación comprobantes completa
3. Testing en homologación exitoso
4. Integración contable operativa

---

### 🚀 SPRINT 4 - PRODUCTION (Preparación para Producción)

#### DOC-001: Documentación Técnica Completa
**Estado:** 🔄 En Progreso  
**Prioridad:** 📝 Baja  
**Estimación:** L (3-5 días)  

**Contexto del Proyecto:**
Documentación completa para deployment y mantenimiento. Debe incluir guías de integración para terceros.

**Descripción Técnica:**
- API documentation completa con OpenAPI/Swagger
- Architecture documentation actualizada con diagramas
- Deployment guides para diferentes entornos
- Troubleshooting manual completo con casos comunes
- Code documentation con JSDoc
- Integration guides para desarrolladores terceros
- Video tutorials para usuarios finales

**Archivos Involucrados:**
- `docs/` (expandir toda la documentación existente)
- `swagger.yaml` (crear)
- `docs/guides/` (crear guías detalladas)

---

#### DEPLOY-001: Configuración Producción
**Estado:** To DO  
**Prioridad:** ⚡ Alta  
**Estimación:** L (3-5 días)  

**Descripción Técnica:**
- Setup servidor producción con alta disponibilidad
- Configuración SSL/TLS con certificados automáticos
- Monitoring y alertas con Prometheus/Grafana
- Backup automatizado con estrategia de recovery
- Logs centralizados con ELK stack
- Security hardening completo del servidor

---

#### SECURITY-001: Auditoría de Seguridad
**Estado:** To DO  
**Prioridad:** 🔥 Crítica  
**Estimación:** XL (1-2 semanas)  

**Descripción Técnica:**
- Penetration testing completo por terceros
- Vulnerability scanning automatizado
- OWASP compliance check completo
- Security headers configuration
- SSL renewal automation
- Data encryption validation
- Access control audit

---

## TAREAS DE TESTING Y QA

#### QA-001: Framework de Testing Automatizado
**Estado:** 📋 Backlog  
**Prioridad:** ⚡ Alta  
**Estimación:** M (1-3 días)  

**Descripción Técnica:**
- Setup Jest + React Testing Library para frontend
- Configurar Cypress para E2E testing
- Tests unitarios para componentes críticos
- Coverage reporting automatizado > 80%
- Setup test environments (dev, staging, prod)
- CI/CD integration con GitHub Actions

---

#### QA-002: Testing de Integración AFIP
**Estado:** To DO  
**Prioridad:** ⚡ Alta  
**Estimación:** L (3-5 días)  
**Dependencias:** AFIP-003  

**Descripción Técnica:**
- Test suites completas para APIs AFIP
- Mock services para testing sin dependencias
- Validación de certificados en testing
- Testing de timeout y error handling
- Automated regression testing
- Performance testing bajo carga

---

## TAREAS DE MOBILE Y PWA

#### MOBILE-001: Optimización Mobile-First
**Estado:** To DO  
**Prioridad:** 📊 Media  
**Estimación:** L (3-5 días)  

**Descripción Técnica:**
- Responsive design optimization completa
- Touch-friendly interfaces con gestures
- Mobile navigation patterns optimizados
- Performance optimization para mobile
- Cross-device testing automatizado
- PWA features básicas (offline, install)

---

## CATEGORIZACIÓN DE SERVICIOS MCP

### 🤖 Servicios de IA/ML
- **MCP-OCR-001:** Procesamiento OCR especializado
- **MCP-ASSISTANT-001:** Chat IA contextual
- **MCP-CATEGORIZATION-001:** Categorización automática
- **MCP-ANALYTICS-001:** Analytics predictivo
- **MCP-COMPLIANCE-001:** Análisis de compliance

### ⚙️ Servicios Core
- **AUTH-SERVICE-001:** Autenticación y autorización
- **AFIP-SERVICE-001:** Integraciones AFIP
- **CONTRIBUTORS-SERVICE-001:** Gestión contribuyentes
- **UI-COMPONENTS-SERVICE-001:** Componentes reutilizables
- **NOTIFICATION-SERVICE-001:** Sistema notificaciones

### 🏗️ Servicios de Infraestructura
- **DATABASE-SERVICE-001:** Gestión base de datos
- **MONITORING-SERVICE-001:** Monitoreo y observabilidad
- **PWA-SERVICE-001:** Progressive Web App

---

## NOTAS PARA EL DEV AGENT

### Prioridades de Implementación
1. **Completar AFIP-001, AFIP-002, AFIP-003 primero** - Sin estos, las integraciones reales no funcionan
2. **Focus en FE-003 y FE-004** - UIs críticas para usuarios finales
3. **Implementar sistema de testing** - QA-001 y QA-002 son críticos para calidad
4. **Preparar para producción** - DEPLOY-001 y SECURITY-001 antes del go-live

### Contexto Técnico Importante
- **Base de datos:** Migrar de SQLite a PostgreSQL para producción
- **Cache:** Implementar Redis para performance AFIP queries
- **WebSockets:** Ya implementado para tiempo real, expandir para notificaciones
- **MCP Architecture:** Usar para todas las integraciones de IA/ML

### Patrones de Código Existentes
- **Componentes React:** PascalCase, hooks pattern
- **Servicios:** camelCase con async/await
- **APIs:** REST con estructura `/api/module/action`
- **Error Handling:** Try-catch con logging Winston
- **Styling:** Tailwind CSS classes, mobile-first

### Archivos de Configuración Clave
- `package.json` - Dependencies y scripts
- `vite.config.js` - Build configuration
- `src/server/index.js` - Server entry point
- `src/client/main.jsx` - Client entry point

### Testing Strategy
- **Unit Tests:** Jest para lógica de negocio
- **Integration Tests:** Supertest para APIs
- **E2E Tests:** Cypress para flujos completos
- **Performance:** Artillery para load testing

---

*Este documento debe actualizarse conforme avance el desarrollo. Cada tarea completada debe marcarse y documentar cualquier cambio en requirements o implementación.*