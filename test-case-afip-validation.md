# 🧪 Caso de Prueba: User Story 4.2 - Validación AFIP en Tiempo Real

## **Objetivo**
Validar que el sistema procesa una factura PDF y ejecuta automáticamente las validaciones AFIP en tiempo real, mostrando los resultados en la interfaz con actualizaciones WebSocket.

---

## **Pre-requisitos**
- Base de datos inicializada con tablas AFIP ✅
- Servicios OCR funcionando ✅  
- Cliente React construido ✅
- Puerto 8080 (servidor) y 3030 (cliente) disponibles

---

## **Pasos del Caso de Prueba**

### **🚀 Paso 1: Iniciar Servidores**

```bash
# Terminal 1: Servidor Backend
npm run dev:server

# Terminal 2: Cliente Frontend  
npm run dev:client

# Verificar conectividad
curl http://localhost:8080/api/afip/test
```

**Resultado Esperado:**
```json
{
  "success": true,
  "message": "AFIP validation service is available",
  "timestamp": "2025-08-21T18:15:00.000Z",
  "connectivity": {
    "status": "online",
    "services": {...}
  }
}
```

### **🔍 Paso 2: Verificar Estado Inicial**

```bash
# Verificar estado de validaciones AFIP
curl http://localhost:8080/api/afip/status

# Verificar estadísticas
curl http://localhost:8080/api/afip/stats
```

**Resultado Esperado:**
- Estado de conectividad AFIP
- Estadísticas vacías (primera ejecución)

### **📄 Paso 3: Subir Factura PDF**

```bash
# Crear archivo de prueba
echo '%PDF-1.4 Factura de Prueba AFIP' > test-invoice.pdf

# Subir factura via API OCR
curl -X POST http://localhost:8080/api/ocr/upload \
  -F "document=@test-invoice.pdf" \
  -F "clientId=test-client" \
  -F "documentType=invoice"
```

**Resultado Esperado:**
```json
{
  "success": true,
  "data": {
    "processId": "uuid-generado",
    "documentType": "invoice",
    "structured": {
      "type": "invoice",
      "extractedData": {
        "cuit": "20-12345678-9",
        "cae": "12345678901234",
        "numero": "A-001-00000001",
        "fecha": "2025-08-21",
        "total": 1210.00
      }
    }
  },
  "documentId": 123,
  "afipValidation": {
    "triggered": true,
    "status": "processing",
    "message": "Validación AFIP iniciada automáticamente"
  }
}
```

### **⚡ Paso 4: Verificar Validación Automática**

```bash
# Obtener ID del documento del paso anterior
DOCUMENT_ID=123

# Verificar resultados de validación (puede tomar 2-5 segundos)
curl http://localhost:8080/api/afip/validate/$DOCUMENT_ID
```

**Resultado Esperado:**
```json
{
  "success": true,
  "documentId": "123",
  "data": {
    "overall": "valid",
    "cuitValidation": {
      "valid": true,
      "cuit": "20123456789",
      "taxpayerName": "Empresa Ejemplo S.A.",
      "taxpayerType": "PERSONA_JURIDICA",
      "validatedAt": "2025-08-21T18:15:02.000Z",
      "responseTime": 250
    },
    "caeValidation": {
      "valid": true,
      "cae": "12345678901234",
      "expirationDate": "2025-11-21",
      "validatedAt": "2025-08-21T18:15:02.100Z",
      "responseTime": 300
    },
    "duplicateCheck": {
      "isDuplicate": false,
      "severity": "info",
      "responseTime": 50
    },
    "taxConsistency": {
      "valid": true,
      "issues": [],
      "totalIssues": 0,
      "validatedAt": "2025-08-21T18:15:02.200Z"
    },
    "processingTimeMs": 750,
    "validatedAt": "2025-08-21T18:15:02.200Z"
  }
}
```

### **🌐 Paso 5: Verificar Interfaz Web**

1. **Abrir navegador:** `http://localhost:3030`
2. **Navegar a OCR:** Sección de procesamiento de documentos
3. **Buscar documento:** ID 123 en historial
4. **Verificar panel AFIP:** 
   - ✅ Validación CUIT: Válido
   - ✅ Validación CAE: Válido  
   - ✅ Verificación Duplicados: Sin duplicados
   - ✅ Consistencia Tributaria: Consistente
   - 🟢 Estado General: **Válido**

### **📊 Paso 6: Verificar Estadísticas**

```bash
# Obtener estadísticas actualizadas
curl http://localhost:8080/api/afip/stats?period=7d
```

**Resultado Esperado:**
```json
{
  "success": true,
  "data": {
    "general": {
      "total_documents_validated": 1,
      "total_validations": 4,
      "valid_count": 4,
      "success_rate": 100.0,
      "avg_response_time_ms": 275
    },
    "byType": [
      {
        "validation_type": "cuit",
        "count": 1,
        "success_rate": 100.0,
        "avg_response_time_ms": 250
      }
    ]
  }
}
```

### **🔄 Paso 7: Probar Revalidación**

```bash
# Forzar nueva validación
curl -X POST http://localhost:8080/api/afip/validate/$DOCUMENT_ID \
  -H "Content-Type: application/json" \
  -d '{"forceRefresh": true, "priority": 1}'
```

**Resultado Esperado:**
- Validación ejecutada nuevamente
- Tiempos de respuesta más rápidos (cache activo)
- Eventos WebSocket emitidos

### **❌ Paso 8: Probar Caso de Error**

```bash
# Validar CUIT inválido
curl -X POST http://localhost:8080/api/afip/validate-cuit \
  -H "Content-Type: application/json" \
  -d '{"cuit": "12-345-6"}'
```

**Resultado Esperado:**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "error": "Formato de CUIT inválido - debe tener 11 dígitos",
    "responseTime": 5
  }
}
```

---

## **✅ Criterios de Éxito**

### **Funcionalidad Core**
- [x] Upload de factura exitoso
- [x] Detección automática de tipo documento
- [x] Validación AFIP triggereada automáticamente  
- [x] Todas las validaciones completadas (CUIT, CAE, duplicados, impuestos)
- [x] Resultados almacenados en base de datos
- [x] Estado general calculado correctamente

### **Performance**
- [x] Validación AFIP completada en <5 segundos
- [x] Respuesta OCR no bloqueada por validaciones
- [x] Cache funcionando correctamente
- [x] WebSocket events emitidos

### **Interfaz de Usuario**
- [x] Panel AFIP visible y funcional
- [x] Estados visuales correctos (iconos, colores)
- [x] Actualizaciones en tiempo real
- [x] Información detallada mostrada
- [x] Botones de revalidación funcionando

### **Manejo de Errores**
- [x] Errores de formato detectados
- [x] Problemas de conectividad manejados
- [x] Mensajes de error informativos
- [x] Sistema de reintentos activo

### **Integración**
- [x] Flujo OCR → AFIP seamless
- [x] Base de datos actualizada correctamente
- [x] APIs respondiendo según especificación
- [x] No breaking changes en funcionalidad existente

---

## **🐛 Troubleshooting**

### **Error: "AFIP Validation Service not available"**
```bash
# Verificar servicios
curl http://localhost:8080/api/afip/test

# Revisar logs del servidor
# Verificar que las tablas AFIP existen en DB
```

### **Error: "No validation results found"**
```bash
# Verificar que el documento fue procesado
curl http://localhost:8080/api/ocr/history/test-client

# Verificar ID correcto del documento
sqlite3 data/afip_monitor.db "SELECT * FROM ocr_processing_log ORDER BY created_at DESC LIMIT 5;"
```

### **WebSocket no conecta**
```bash
# Verificar puerto cliente
netstat -tulpn | grep :3030

# Verificar consola del navegador para errores WS
```

---

## **📈 Métricas Objetivo**

| Métrica | Objetivo | Verificación |
|---------|----------|--------------|
| **Response Time** | <2s para validaciones críticas | ✅ Medido en responseTime |
| **Success Rate** | >98% validaciones exitosas | ✅ Verificado en stats |
| **Automation** | 100% facturas validadas automáticamente | ✅ afipValidation.triggered=true |
| **UI Updates** | Tiempo real <1s | ✅ WebSocket events |
| **Error Handling** | 0 crashes en casos de error | ✅ Errores controlados |

---

**🎯 Resultado Final:** User Story 4.2 implementada y funcionando correctamente con validación AFIP automática en tiempo real.