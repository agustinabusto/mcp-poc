# AFIP Monitor MCP Brownfield Enhancement PRD

**Fecha:** 2025-08-13  
**Versión:** 1.0  
**Estado:** En Desarrollo

## Intro Project Analysis and Context

### Existing Project Overview

**Analysis Source:** IDE-based fresh analysis

**Current Project State:**
AFIP Monitor MCP es una plataforma proof-of-concept para compliance fiscal predictivo que previene problemas tributarios antes de que ocurran. Está diseñado para reducir la carga de trabajo de compliance en un 80% mientras conecta empresas con un ecosistema creciente de empresas cumplidoras. El sistema usa automatización inteligente y análisis de riesgo impulsado por IA para transformar el compliance de AFIP de una carga reactiva en una ventaja competitiva proactiva.

### Available Documentation Analysis

**Available Documentation:**
- ✓ Tech Stack Documentation (package.json, ARCHITECTURE.md)
- ✓ Source Tree/Architecture (ARCHITECTURE.md with mermaid diagrams)
- ✓ API Documentation (API.md available)
- ✓ External API Documentation (AFIP-INTEGRATION.md)
- ✓ Technical Documentation (Multiple docs available)
- ✓ POC Implementation Guide (poc-implementacion.md)
- ✓ Brief/Requirements (brief.md with business context)

### Enhancement Scope Definition

**Enhancement Type:** ✓ New Feature Addition - Sistema de gestión avanzada de usuarios

**Enhancement Description:** Transformar el sistema básico de gestión de usuarios existente en una plataforma completa con roles jerárquicos, permisos granulares, auditoría completa y perfiles fiscales específicos para compliance AFIP.

**Impact Assessment:** ✓ Moderate Impact - Algunos cambios en código existente requeridos

### Goals and Background Context

**Goals:**
- Implementar sistema de roles jerárquico (Admin, Contador, Cliente, ReadOnly)
- Agregar autenticación segura con 2FA y refresh tokens
- Crear perfiles de usuario con información fiscal específica (CUIT, tipo contribuyente)
- Implementar auditoría completa para compliance fiscal
- Desarrollar configuración granular de notificaciones

**Background Context:**
El sistema actual tiene una implementación básica de gestión de usuarios que requiere expansión para soportar las necesidades de compliance fiscal de diferentes tipos de usuarios. Los commits recientes muestran trabajo en UserManagement, RoleConfiguration y componentes relacionados que necesitan completarse para una funcionalidad robusta.

## Requirements

### Functional Requirements

**FR1:** El sistema de gestión de usuarios existente debe expandirse para incluir perfiles completos de usuario con información fiscal específica (CUIT, razón social, tipo de contribuyente).

**FR2:** El sistema debe implementar un sistema de roles jerárquico que permita Admin, Contador, Cliente, y Usuario de Solo Lectura con permisos granulares.

**FR3:** La autenticación actual debe mejorarse con autenticación de dos factores (2FA) y sesiones seguras con JWT refresh tokens.

**FR4:** El sistema debe mantener un registro de auditoría completo de todas las acciones de usuarios en el sistema de compliance AFIP.

**FR5:** Los usuarios deben poder configurar preferencias de notificación personalizables para diferentes tipos de alertas fiscales.

### Non Functional Requirements

**NFR1:** El enhancement debe mantener las características de rendimiento existentes y no exceder el uso actual de memoria en más del 20%.

**NFR2:** La autenticación debe responder en menos de 200ms y soportar hasta 1000 usuarios concurrentes.

**NFR3:** El sistema de auditoría debe ser capaz de almacenar y consultar al menos 1 millón de eventos sin degradación del rendimiento.

### Compatibility Requirements

**CR1:** Mantener compatibilidad completa con la API REST existente - todos los endpoints actuales deben seguir funcionando.

**CR2:** Preservar la compatibilidad del esquema de base de datos SQLite existente con migración automática.

**CR3:** Mantener consistencia con los patrones UI/UX existentes usando Tailwind CSS y componentes React.

**CR4:** Conservar la integración WebSocket existente para notificaciones en tiempo real.

## User Interface Enhancement Goals

### Integration with Existing UI

Los nuevos elementos de UI para gestión de usuarios avanzada se integrarán con los patrones de diseño existentes:
- Usar los componentes React existentes como base (LoadingSpinner, Toast)
- Mantener la paleta de colores y tipografía de Tailwind CSS actual
- Seguir el patrón de navegación y layout establecido
- Reutilizar iconos de Lucide React para consistencia visual

### Modified/New Screens and Views

**Screens que serán modificados:**
- UserManagementView.jsx - Expandir con roles y permisos avanzados
- UserForm.jsx - Agregar campos fiscales específicos (CUIT, tipo contribuyente)

**Nuevas pantallas:**
- RoleConfiguration.jsx - Configuración de roles y permisos
- UserProfile.jsx - Perfil completo del usuario con datos fiscales
- AuditLog.jsx - Visualización de logs de auditoría
- NotificationSettings.jsx - Configuración de preferencias de notificación

### UI Consistency Requirements

- Mantener el patrón mobile-first responsive existente
- Usar los mismos componentes de formulario y validación
- Preservar el sistema de notificaciones Toast existente
- Mantener consistencia en el manejo de estados de loading y error

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages:** JavaScript (ES6+)
**Frameworks:** React 18.2.0, Express 4.18.2, Vite 4.5.0
**Database:** SQLite3 5.1.7
**Infrastructure:** Node.js 18+, WebSocket (ws 8.18.3), MCP SDK 0.5.0
**External Dependencies:** Groq SDK, JWT, bcrypt, multer, winston logging

### Integration Approach

**Database Integration Strategy:** Utilizar el sistema de migración de SQLite existente para agregar nuevas tablas (users_profiles, user_roles, audit_logs) sin romper el esquema actual

**API Integration Strategy:** Extender los endpoints REST existentes en `/server/routes/` manteniendo la estructura de respuesta actual y agregando nuevos endpoints para roles y auditoría

**Frontend Integration Strategy:** Expandir el patrón de servicios existente (userService.js) y agregar nuevos componentes siguiendo la estructura de carpetas actual en `/client/components/`

**Testing Integration Strategy:** Usar Jest existente para pruebas unitarias y agregar tests de integración para nuevas funcionalidades

### Code Organization and Standards

**File Structure Approach:** Seguir la estructura actual `/client/components/UserManagement/` para nuevos componentes relacionados con usuarios
**Naming Conventions:** Mantener camelCase para JavaScript, PascalCase para componentes React
**Coding Standards:** Continuar usando ESLint configurado y Prettier para formateo consistente
**Documentation Standards:** Actualizar docs/API.md con nuevos endpoints y mantener comentarios JSDoc en funciones complejas

### Deployment and Operations

**Build Process Integration:** Usar el pipeline Vite existente sin modificaciones
**Deployment Strategy:** Mantener el sistema de contenedores Docker existente
**Monitoring and Logging:** Extender el sistema Winston existente para capturar eventos de auditoría
**Configuration Management:** Usar dotenv existente para nuevas variables de configuración

### Risk Assessment and Mitigation

**Technical Risks:** 
- SQLite puede tener limitaciones de concurrencia con auditoría intensiva
- JWT refresh tokens requieren manejo cuidadoso del estado

**Integration Risks:**
- Cambios en el esquema de base de datos pueden afectar funcionalidad existente
- Nuevos roles pueden romper permisos actuales

**Deployment Risks:**
- Migración de datos existentes requiere backup y rollback plan
- Cambios de autenticación pueden desconectar usuarios activos

**Mitigation Strategies:**
- Implementar migración incremental con rollback automático
- Usar feature flags para activación gradual de nuevas funcionalidades
- Mantener backward compatibility en APIs por al menos 1 versión

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision:** Epic único para gestión de usuarios avanzada con justificación basada en el análisis del proyecto existente. Dado que todas las funcionalidades están estrechamente relacionadas (roles, permisos, auditoría, perfiles) y comparten la misma base de datos y sistema de autenticación, un enfoque de epic único minimiza riesgos de integración y asegura consistencia en la implementación.

## Epic 1: Advanced User Management System

**Epic Goal:** Transformar el sistema básico de gestión de usuarios existente en una plataforma completa de gestión de usuarios con roles, permisos, auditoría y perfiles fiscales específicos para AFIP compliance.

**Integration Requirements:** Mantener 100% de compatibilidad con la autenticación existente, APIs REST actuales y componentes React implementados mientras se expande la funcionalidad.

### Story 1.1: Database Schema Enhancement

Como desarrollador del sistema,
Quiero expandir el esquema de base de datos para soportar roles, permisos y auditoría,
Para que el sistema pueda manejar gestión avanzada de usuarios sin romper funcionalidad existente.

#### Acceptance Criteria
1. Crear migración SQLite que agregue tablas: user_roles, role_permissions, audit_logs, user_profiles
2. Mantener compatibilidad completa con tabla users existente
3. Implementar foreign keys y constraints apropiados
4. Crear índices para consultas de rendimiento en audit_logs

#### Integration Verification
- IV1: Verificar que todos los usuarios existentes pueden autenticarse después de la migración
- IV2: Confirmar que los endpoints de autenticación actuales funcionan sin cambios
- IV3: Validar que el rendimiento de consultas no se degrada más del 10%

### Story 1.2: Role-Based Access Control (RBAC) Backend

Como administrador del sistema,
Quiero definir roles jerárquicos con permisos granulares,
Para que pueda controlar el acceso a diferentes funcionalidades según el tipo de usuario.

#### Acceptance Criteria
1. Implementar middleware de autorización que valide permisos por endpoint
2. Crear roles predefinidos: Admin, Contador, Cliente, ReadOnly
3. Desarrollar API endpoints para gestión de roles (/api/roles)
4. Integrar validación de permisos en rutas existentes sin romperlas

#### Integration Verification
- IV1: Usuarios existentes mantienen acceso completo durante transición
- IV2: Endpoints actuales responden correctamente con nuevos headers de permisos
- IV3: WebSocket connections mantienen funcionalidad con validación de roles

### Story 1.3: Enhanced Authentication & Security

Como usuario del sistema,
Quiero autenticación segura con refresh tokens y 2FA opcional,
Para que mi cuenta esté protegida mientras mantengo una experiencia fluida.

#### Acceptance Criteria
1. Implementar JWT refresh token rotation automática
2. Agregar soporte opcional para 2FA con TOTP
3. Mejorar validación de contraseñas con políticas configurables
4. Mantener backward compatibility con tokens JWT existentes

#### Integration Verification
- IV1: Usuarios con sesiones activas no son desconectados durante el despliegue
- IV2: APIs existentes continúan funcionando con tokens legacy hasta expiración
- IV3: WebSocket connections se mantienen estables con nuevo sistema de tokens

### Story 1.4: User Profile Management Frontend

Como usuario del sistema,
Quiero gestionar mi perfil completo incluyendo información fiscal específica,
Para que pueda configurar correctamente mis datos de compliance AFIP.

#### Acceptance Criteria
1. Extender UserForm.jsx para incluir campos fiscales (CUIT, tipo contribuyente)
2. Crear componente UserProfile.jsx para visualización completa
3. Implementar validación de CUIT en tiempo real
4. Integrar con el patrón de servicios existente (userService.js)

#### Integration Verification
- IV1: Formularios existentes de usuario mantienen funcionalidad completa
- IV2: Navegación y routing existente no se afecta
- IV3: Estados de loading y error siguen el patrón establecido con Toast

### Story 1.5: Role Configuration Interface

Como administrador,
Quiero una interfaz intuitiva para configurar roles y permisos,
Para que pueda gestionar el acceso sin necesidad de modificar código.

#### Acceptance Criteria
1. Completar componente RoleConfiguration.jsx iniciado
2. Crear interfaz drag-and-drop para asignación de permisos
3. Implementar vista de matriz roles/permisos
4. Agregar validación de conflictos de permisos

#### Integration Verification
- IV1: Componente se integra seamlessly con UserManagementView existente
- IV2: Estilos y patrones UI mantienen consistencia con Tailwind actual
- IV3: Navegación y breadcrumbs funcionan correctamente

### Story 1.6: Audit Logging System

Como administrador de compliance,
Quiero un registro completo de todas las acciones de usuarios,
Para que pueda rastrear cambios y mantener compliance fiscal requerido.

#### Acceptance Criteria
1. Implementar logging automático de todas las operaciones CRUD
2. Crear componente AuditLog.jsx para visualización de eventos
3. Desarrollar API de consulta con filtros y paginación
4. Integrar con sistema de logging Winston existente

#### Integration Verification
- IV1: Performance de operaciones existentes no se degrada más del 5%
- IV2: Logs existentes de Winston se mantienen sin conflictos
- IV3: Base de datos SQLite maneja volumen de audit logs sin problemas

### Story 1.7: Notification Preferences System

Como usuario del sistema,
Quiero configurar mis preferencias de notificación personalizadas,
Para que reciba alertas relevantes sin ser abrumado por notificaciones irrelevantes.

#### Acceptance Criteria
1. Crear NotificationSettings.jsx para configuración granular
2. Extender sistema WebSocket para respetar preferencias
3. Implementar templates de notificación configurables
4. Integrar con sistema Toast existente

#### Integration Verification
- IV1: Sistema de notificaciones actual continúa funcionando durante transición
- IV2: WebSocket connections existentes no se interrumpen
- IV3: Preferencias por defecto mantienen comportamiento actual del sistema