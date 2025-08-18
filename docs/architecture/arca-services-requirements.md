# Servicios ARCA/AFIP - Certificados Requeridos

## Resumen Ejecutivo

Este documento detalla los servicios web de ARCA (ex AFIP) que requieren certificados digitales según las funcionalidades implementadas en la aplicación AFIP Monitor MCP.

## Servicios por Funcionalidad

### 1. **Autenticación Base (WSAA)**
**Servicio**: Web Service de Autenticación y Autorización
- **Endpoint**: `LoginService`
- **Propósito**: Autenticación inicial y obtención de tokens para otros servicios
- **Certificado**: **REQUERIDO** - Certificado principal de la organización
- **URLs**:
  - Producción: `https://wsaa.afip.gov.ar/ws/services/LoginService`
  - Homologación: `https://wsaahomo.afip.gov.ar/ws/services/LoginService`

### 2. **Facturación Electrónica (WSFEV1)**
**Servicio**: Web Service de Facturación Electrónica v1
- **Funcionalidades implementadas**:
  - `FECAESolicitar` - Autorización de comprobantes CAE
  - `FECompConsultar` - Consulta de comprobantes emitidos
  - `FEParamGet*` - Obtención de parámetros:
    - Tipos de comprobantes
    - Alícuotas de IVA
    - Tipos de documentos
    - Monedas válidas
    - Puntos de venta habilitados
    - Actividades del contribuyente
- **Certificado**: **REQUERIDO** - Mismo certificado principal
- **URLs**:
  - Producción: `https://servicios1.afip.gov.ar/wsfev1/service.asmx`
  - Homologación: `https://wswhomo.afip.gov.ar/wsfev1/service.asmx`

### 3. **Comprobantes Complejos (WSMTXCA)**
**Servicio**: Web Service Multicarga Comprobantes Avanzados
- **Funcionalidades implementadas**:
  - `autorizarComprobante` - Autorización de comprobantes complejos
- **Certificado**: **REQUERIDO** - Mismo certificado principal
- **URLs**:
  - Producción: `https://serviciosjava.afip.gob.ar/wsmtxca/services/MTXCAService`
  - Homologación: `https://fwshomo.afip.gov.ar/wsmtxca/services/MTXCAService`

### 4. **Consulta de Contribuyentes (WS_SR_PADRON_A4)**
**Servicio**: Web Service Padrón A4
- **Funcionalidades implementadas**:
  - Consulta de datos de contribuyentes
  - Obtención de constancias
- **Certificado**: **REQUERIDO** - Mismo certificado principal
- **URLs**:
  - Producción: `https://servicios1.afip.gov.ar/ws_sr_padron_a4/service.asmx`
  - Homologación: `https://wswhomo.afip.gov.ar/ws_sr_padron_a4/service.asmx`

## **🚨 NUEVO SERVICIO RECOMENDADO**

### 5. **Alertas y Estado de Clientes (WS_SR_CONSTANCIA_INSCRIPCION)**
**Servicio**: Web Service Constancia de Inscripción
- **Funcionalidades**:
  - `getPersona_v2` - Consulta estado tributario completo
  - Monitoreo de compliance de clientes CUIT
  - Detección de cambios en estado tributario
- **Datos que proporciona**:
  - Estado del CUIT (Activo/Limitado/Inactivo)
  - Condición ante IVA
  - Estado de Monotributo (categoría/estado)
  - Actividades económicas vigentes
  - Domicilio fiscal
  - Fechas de inscripción/modificación
- **Certificado**: **REQUERIDO** - Certificado específico para servicios de Padrón
- **Integración**: Se conecta con el `ComplianceMonitor` existente
- **Beneficios**:
  - ✅ Alertas tempranas por cambios de estado
  - ✅ Monitoreo proactivo de compliance
  - ✅ Información completa para análisis de riesgo

## Certificados Necesarios

### **Certificado Principal**
- **Para servicios**: WSAA, WSFEV1, WSMTXCA, WS_SR_PADRON_A4
- **Tipo**: Certificado de organización
- **Uso**: Facturación electrónica y consultas generales

### **Certificado de Padrón** (Recomendado)
- **Para servicios**: WS_SR_CONSTANCIA_INSCRIPCION
- **Tipo**: Certificado específico para servicios de padrón
- **Uso**: Consultas de estado tributario y compliance

## Resumen de Certificados

| Funcionalidad | Servicios | Certificado Requerido |
|---------------|-----------|----------------------|
| **Facturación Electrónica** | WSAA + WSFEV1 + WSMTXCA | ✅ Certificado Principal |
| **Consultas Básicas** | WS_SR_PADRON_A4 | ✅ Certificado Principal |
| **Alertas y Compliance** | WS_SR_CONSTANCIA_INSCRIPCION | ✅ Certificado de Padrón |

**Total mínimo**: 1 certificado (Principal)  
**Recomendado**: 2 certificados (Principal + Padrón) para funcionalidad completa

## Próximos Pasos

1. **Solicitar Certificado Principal** para funcionalidades actuales
2. **Evaluar implementación** de WS_SR_CONSTANCIA_INSCRIPCION para alertas
3. **Solicitar Certificado de Padrón** si se decide implementar monitoreo avanzado
4. **Actualizar configuración** de ambiente con nuevos certificados

## Referencias

- [Documentación ARCA Web Services](https://www.arca.gob.ar/)
- [Resolución General ARCA N° 5.616/2024](https://www.arca.gob.ar/) - Últimas actualizaciones
- Código fuente: `src/server/services/arca-service.js`
- Herramientas: `src/server/tools/arca-*.js`