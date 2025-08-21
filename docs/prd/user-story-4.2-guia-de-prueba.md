# User Story 4.2: Real-time AFIP Validation - Guía de Prueba

**Epic:** 4 - OCR Intelligence & Automation  
**Fecha:** 2025-08-19  
**Versión:** 1.0  
**Estado:** Ready for Testing  
**Story:** Real-time AFIP Validation & Cross-checking  

---

## 📋 Resumen Ejecutivo

Esta guía documenta todos los casos de prueba, procedimientos y validaciones necesarios para verificar el correcto funcionamiento del sistema de validación AFIP en tiempo real implementado en User Story 4.2.

### Funcionalidades Implementadas

- ✅ **AfipValidationService**: Servicio principal de validación AFIP
- ✅ **ARCA Integration Extension**: Extensión del servicio ARCA para validaciones en tiempo real
- ✅ **API Routes**: Endpoints REST para validaciones AFIP
- ✅ **AfipValidationPanel**: Componente React para mostrar resultados
- ✅ **WebSocket Integration**: Actualizaciones en tiempo real
- ✅ **Database Schema**: Tablas y índices para validaciones AFIP
- ✅ **Retry Logic**: Sistema de reintentos para fallos de conectividad
- ✅ **Performance Optimization**: Cache y optimizaciones

---

## 🎯 Casos de Prueba

### **TC001: Validación CUIT Básica**

**Objetivo**: Verificar que el sistema puede validar un CUIT correctamente

**Prerrequisitos**:
- Servidor iniciado
- Base de datos inicializada
- Documento con CUIT disponible

**Procedimiento**:
1. Procesar documento con CUIT válido (ej: `30500010912`)
2. Abrir panel de validaciones AFIP
3. Hacer clic en "Ejecutar Validaciones"
4. Verificar resultado

**Resultado Esperado**:
- ✅ CUIT marcado como válido
- Nombre del contribuyente mostrado
- Tipo de contribuyente identificado
- Tiempo de respuesta < 2 segundos

**Comando de Prueba**:
```bash
curl -X POST http://localhost:8080/api/afip/validate/cuit \
  -H "Content-Type: application/json" \
  -d '{"cuit": "30500010912"}'
```

---

### **TC002: Validación CAE Válido**

**Objetivo**: Verificar validación de Código de Autorización Electrónico

**Procedimiento**:
1. Usar CAE de ejemplo: `67890123456789`
2. Procesar factura con CAE válido
3. Ejecutar validaciones AFIP

**Resultado Esperado**:
- ✅ CAE marcado como válido
- Fecha de vencimiento mostrada
- Rango autorizado verificado

**Comando de Prueba**:
```bash
curl -X POST http://localhost:8080/api/afip/validate/cae \
  -H "Content-Type: application/json" \
  -d '{
    "cae": "67890123456789",
    "invoiceData": {
      "cuit": "30500010912",
      "invoiceType": "1",
      "invoiceNumber": "0001-00000123",
      "amount": "1000.00",
      "date": "2025-08-19"
    }
  }'
```

---

### **TC003: Detección de Duplicados**

**Objetivo**: Verificar que el sistema detecta facturas duplicadas

**Procedimiento**:
1. Procesar factura con número específico
2. Procesar segunda factura con mismo número, CUIT y fecha
3. Verificar detección de duplicado

**Resultado Esperado**:
- ⚠️ Duplicado detectado
- Lista de facturas existentes
- Severidad: Warning

---

### **TC004: Consistencia Tributaria IVA**

**Objetivo**: Verificar validación de cálculos de IVA

**Datos de Prueba**:
```json
{
  "subtotal": 1000.00,
  "iva": 210.00,
  "total": 1210.00
}
```

**Resultado Esperado**:
- ✅ Cálculo IVA consistente
- Diferencia < 0.01 pesos

---

### **TC005: Validación Completa de Documento**

**Objetivo**: Validar un documento completo con todas las verificaciones

**Procedimiento**:
1. Subir factura PDF con datos completos
2. Esperar procesamiento OCR
3. Ejecutar validaciones AFIP automáticas
4. Verificar panel de validaciones

**Resultado Esperado**:
- Todas las validaciones ejecutadas
- Estado general determinado
- Tiempo total < 5 segundos

**Comando de Prueba**:
```bash
curl -X POST http://localhost:8080/api/afip/validate/123 \
  -H "Content-Type: application/json" \
  -d '{"priority": 1, "options": {"fullValidation": true}}'
```

---

## 🔧 Pruebas de API

### **API001: Health Check de Validaciones**

```bash
curl http://localhost:8080/api/afip/status
```

**Respuesta Esperada**:
```json
{
  "success": true,
  "status": {
    "status": "online",
    "services": {
      "wsaa": "online",
      "wsfev1": "online",
      "wsmtxca": "online"
    },
    "lastCheck": "2025-08-19T15:30:00.000Z"
  }
}
```

### **API002: Estadísticas de Validaciones**

```bash
curl http://localhost:8080/api/afip/validations/stats?period=7days
```

**Respuesta Esperada**:
```json
{
  "success": true,
  "period": "7days",
  "statistics": {
    "overall": {
      "total_validations": 150,
      "unique_documents": 75,
      "avg_response_time": 850.5
    },
    "byType": [
      {
        "validation_type": "cuit",
        "total_validations": 75,
        "valid_count": 72,
        "avg_response_time": 450.2
      }
    ]
  }
}
```

### **API003: Estado de Cola de Reintentos**

```bash
curl http://localhost:8080/api/afip/validations/queue
```

**Respuesta Esperada**:
```json
{
  "success": true,
  "queueStatus": {
    "summary": {
      "total_items": 5,
      "pending_count": 2,
      "processing_count": 1,
      "completed_count": 2,
      "failed_count": 0
    },
    "items": [...]
  }
}
```

---

## 🌐 Pruebas de WebSocket

### **WS001: Conexión WebSocket**

**Procedimiento**:
1. Abrir consola del navegador
2. Conectar a WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:8080');
ws.onopen = () => console.log('WebSocket conectado');
ws.onmessage = (event) => console.log('Mensaje:', JSON.parse(event.data));
```

**Resultado Esperado**:
```json
{
  "type": "welcome",
  "message": "Conexión establecida con AFIP Monitor",
  "timestamp": "2025-08-19T15:30:00.000Z"
}
```

### **WS002: Updates en Tiempo Real**

**Procedimiento**:
1. Mantener conexión WebSocket abierta
2. Ejecutar validación AFIP en otra pestaña
3. Verificar mensaje de actualización

**Resultado Esperado**:
```json
{
  "type": "afip_validation_update",
  "documentId": "123",
  "validationResults": {
    "overall": "valid",
    "cuitValidation": {...},
    "caeValidation": {...}
  },
  "timestamp": "2025-08-19T15:30:00.000Z"
}
```

---

## 🖥️ Pruebas de Frontend

### **FE001: Panel de Validaciones AFIP**

**Ubicación**: Después de procesar un documento en OCR

**Verificaciones**:
- [ ] Panel aparece para documentos tipo "invoice"
- [ ] Panel aparece si el documento tiene CUIT o CAE
- [ ] Botón "Ejecutar Validaciones" visible
- [ ] Estados de carga mostrados correctamente
- [ ] Iconos de estado apropiados (✅ ❌ ⚠️)
- [ ] Tiempos de respuesta mostrados
- [ ] Información del contribuyente visible
- [ ] Fechas de vencimiento formateadas
- [ ] Alertas y errores mostrados

### **FE002: Interacciones del Usuario**

**Verificaciones**:
- [ ] Click en "Ejecutar Validaciones" inicia proceso
- [ ] Botón se deshabilita durante procesamiento
- [ ] Spinner de carga se muestra
- [ ] Contador de reintentos funciona
- [ ] Updates en tiempo real se aplican
- [ ] Panel responsive en mobile
- [ ] Información de ayuda disponible

### **FE003: Estados de Error**

**Verificaciones**:
- [ ] Error de conectividad mostrado
- [ ] Botón de reintentar disponible
- [ ] Mensajes de error claros
- [ ] Información de debugging disponible

---

## 🗄️ Pruebas de Base de Datos

### **DB001: Inserción de Validaciones**

```sql
-- Verificar que las validaciones se guardan
SELECT * FROM afip_validations 
WHERE document_id = 123 
ORDER BY validated_at DESC;
```

**Resultado Esperado**:
- Records para cada tipo de validación
- Timestamps correctos
- JSON válido en validation_result

### **DB002: Cache de Validaciones**

```sql
-- Verificar funcionamiento del cache
SELECT cache_key, cache_type, expires_at 
FROM afip_validation_cache 
WHERE cache_key LIKE 'cuit_validation_%'
ORDER BY created_at DESC;
```

**Resultado Esperado**:
- Entradas de cache con TTL apropiado
- Cache hits registrados

### **DB003: Cola de Reintentos**

```sql
-- Verificar cola de reintentos
SELECT document_id, status, attempts, next_retry_at 
FROM afip_validation_queue 
WHERE status IN ('pending', 'processing');
```

**Resultado Esperado**:
- Items en cola con estado correcto
- Reintentos programados apropiadamente

---

## ⚡ Pruebas de Rendimiento

### **PERF001: Tiempo de Respuesta de Validaciones**

**Objetivo**: Verificar que las validaciones se completan dentro del tiempo objetivo

**Criterios**:
- Validación CUIT: < 2 segundos
- Validación CAE: < 2 segundos
- Validación completa: < 5 segundos

**Comando de Prueba**:
```bash
# Medir tiempo de respuesta
time curl -X POST http://localhost:8080/api/afip/validate/cuit \
  -H "Content-Type: application/json" \
  -d '{"cuit": "30500010912"}'
```

### **PERF002: Concurrencia**

**Objetivo**: Verificar manejo de múltiples validaciones simultáneas

**Procedimiento**:
```bash
# Ejecutar 10 validaciones en paralelo
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/afip/validate/cuit \
    -H "Content-Type: application/json" \
    -d "{\"cuit\": \"3050001091${i}\"}" &
done
wait
```

**Criterios**:
- Todas las validaciones completan exitosamente
- No hay bloqueos o timeouts
- Tiempo promedio < 3 segundos

### **PERF003: Cache Performance**

**Objetivo**: Verificar mejora de rendimiento con cache

**Procedimiento**:
1. Primera validación CUIT (cache miss)
2. Segunda validación mismo CUIT (cache hit)
3. Comparar tiempos

**Resultado Esperado**:
- Primera validación: ~1-2 segundos
- Segunda validación: < 100 ms

---

## 🛠️ Pruebas de Fallos

### **FAIL001: AFIP No Disponible**

**Simulación**: Desconectar Internet o bloquear IPs AFIP

**Verificaciones**:
- [ ] Error de conectividad detectado
- [ ] Documento agregado a cola de reintentos
- [ ] Usuario notificado del problema
- [ ] Reintento automático cuando se restaura conexión

### **FAIL002: CUIT Inválido**

**Datos de Prueba**: `12345678901` (CUIT con formato inválido)

**Resultado Esperado**:
- ❌ Validación fallida
- Mensaje claro sobre formato inválido
- Severidad: Error

### **FAIL003: CAE Vencido**

**Simulación**: CAE con fecha de vencimiento pasada

**Resultado Esperado**:
- ⚠️ CAE marcado como vencido
- Fecha de vencimiento mostrada
- Severidad: Warning

### **FAIL004: Base de Datos No Disponible**

**Simulación**: Parar base de datos SQLite

**Verificaciones**:
- [ ] Error manejado gracefully
- [ ] Usuario notificado
- [ ] No crash de la aplicación
- [ ] Recuperación automática al restaurar DB

---

## 📊 Métricas de Éxito

### Métricas Cuantitativas

1. **Validation Success Rate**
   - Target: >98% validaciones AFIP exitosas
   - Medición: `(validaciones_exitosas / total_validaciones) * 100`

2. **Response Time Performance**
   - Target: <2s para CUIT/CAE validation
   - Target: <5s para validación completa
   - Medición: Average response time por endpoint

3. **Error Detection Effectiveness**
   - Target: 100% detección de CUITs inválidos
   - Target: 95%+ detección de CAEs vencidos
   - Target: 90%+ detección de duplicados

4. **Cache Hit Rate**
   - Target: >60% para validaciones CUIT
   - Target: >40% para validaciones CAE
   - Medición: `(cache_hits / total_requests) * 100`

### Métricas Cualitativas

1. **User Experience**
   - Panel de validación intuitivo
   - Estados de error claros
   - Feedback en tiempo real

2. **System Reliability**
   - Recovery graceful de errores
   - No memory leaks
   - Stable WebSocket connections

---

## 🔍 Debugging y Troubleshooting

### Log Files

Verificar logs del servidor para errores:
```bash
# Ver logs en tiempo real
tail -f logs/afip_monitor.log | grep -i "afip\|validation"

# Buscar errores específicos
grep -i "error\|fail" logs/afip_monitor.log | grep -i "afip"
```

### Base de Datos Debug

```sql
-- Verificar estado de validaciones
SELECT 
  validation_type,
  COUNT(*) as total,
  SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) as valid_count,
  AVG(response_time_ms) as avg_response_time
FROM afip_validations 
WHERE validated_at > datetime('now', '-1 hour')
GROUP BY validation_type;

-- Verificar conectividad logs
SELECT service_name, status, COUNT(*) as check_count
FROM afip_connectivity_log 
WHERE checked_at > datetime('now', '-1 hour')
GROUP BY service_name, status;
```

### WebSocket Debug

```javascript
// Console del navegador - Debug WebSocket
const ws = new WebSocket('ws://localhost:8080');
ws.onopen = () => console.log('✅ WebSocket conectado');
ws.onmessage = (e) => console.log('📨 Mensaje:', JSON.parse(e.data));
ws.onerror = (e) => console.error('❌ Error:', e);
ws.onclose = (e) => console.log('🔌 Cerrado:', e.code, e.reason);
```

### Common Issues

**Issue**: Validaciones muy lentas
**Solution**: Verificar cache, revisar conectividad AFIP

**Issue**: WebSocket no conecta
**Solution**: Verificar firewall, proxy settings

**Issue**: Duplicados no detectados
**Solution**: Verificar formato de fechas y números de factura

**Issue**: Panel no aparece
**Solution**: Verificar que documento tenga CUIT o CAE

---

## 📝 Checklist de Testing Completo

### Preparación
- [ ] Servidor iniciado en puerto 8080
- [ ] Base de datos inicializada
- [ ] WebSocket funcionando
- [ ] Logs configurados

### Functional Testing
- [ ] TC001: Validación CUIT Básica
- [ ] TC002: Validación CAE Válido
- [ ] TC003: Detección de Duplicados
- [ ] TC004: Consistencia Tributaria
- [ ] TC005: Validación Completa

### API Testing
- [ ] API001: Health Check
- [ ] API002: Estadísticas
- [ ] API003: Cola Reintentos

### Frontend Testing
- [ ] FE001: Panel de Validaciones
- [ ] FE002: Interacciones Usuario
- [ ] FE003: Estados de Error

### Performance Testing
- [ ] PERF001: Tiempo Respuesta
- [ ] PERF002: Concurrencia
- [ ] PERF003: Cache Performance

### Failure Testing
- [ ] FAIL001: AFIP No Disponible
- [ ] FAIL002: CUIT Inválido
- [ ] FAIL003: CAE Vencido
- [ ] FAIL004: Base de Datos No Disponible

### Real-time Testing
- [ ] WS001: Conexión WebSocket
- [ ] WS002: Updates Tiempo Real

### Database Testing
- [ ] DB001: Inserción Validaciones
- [ ] DB002: Cache Validaciones
- [ ] DB003: Cola Reintentos

---

## 🎯 Criterios de Aceptación Final

**✅ Story considerada COMPLETA cuando**:

1. **Todas las pruebas funcionales pasan** (TC001-TC005)
2. **APIs responden correctamente** (API001-API003)
3. **Frontend funciona sin errores** (FE001-FE003)
4. **Performance dentro de targets** (PERF001-PERF003)
5. **Manejo de errores robusto** (FAIL001-FAIL004)
6. **WebSocket updates funcionan** (WS001-WS002)
7. **Base de datos intacta** (DB001-DB003)

**📈 Métricas objetivo alcanzadas**:
- Validation Success Rate >98%
- Response Time <2s (CUIT/CAE), <5s (completa)
- Error Detection >90%
- Cache Hit Rate >60% (CUIT), >40% (CAE)

---

## 📞 Contacto y Soporte

**QA Team**: Responsible for test execution  
**Development Team**: James (development agent)  
**Product Owner**: Sarah  
**Technical Lead**: Winston  

**Para reportar issues durante testing**:
- Usar template de bug report
- Incluir logs relevantes
- Screenshots/videos si aplica
- Pasos para reproducir

---

*Guía de prueba creada el 2025-08-19 para User Story 4.2: Real-time AFIP Validation & Cross-checking*