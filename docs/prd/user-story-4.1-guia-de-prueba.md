# 🧪 Guía para Probar User Story 4.1: AI-Powered Invoice Intelligence

## 📋 Preparación del Entorno

### 1. Inicializar la Base de Datos
```bash
# Aplicar el nuevo schema con las tablas ML
npm run db:init

# O ejecutar manualmente las migraciones
node -e "
const sqlite3 = require('sqlite3');
const fs = require('fs');
const db = new sqlite3.Database('./data/afip_monitor.db');
const schema = fs.readFileSync('./src/database/schemas/ocr-tables.sql', 'utf8');
db.exec(schema, (err) => {
  if (err) console.error(err);
  else console.log('✅ Schema ML aplicado');
  db.close();
});
"
```

### 2. Verificar Servicios
```bash
# Ejecutar tests unitarios
npm test -- --testPathPattern="ml-learning-service"

# Ejecutar tests de integración
npm test -- --testPathPattern="ml-ocr-workflow"

# Iniciar servidor
npm run dev:server
```

## 🔄 Flujo de Pruebas Completo

### **Paso 1: Verificar APIs ML Disponibles**

```bash
# Health check del sistema
curl http://localhost:8080/health

# Verificar estadísticas ML iniciales (debería estar vacío)
curl http://localhost:8080/api/ocr/ml/stats
```

**Respuesta esperada:**
```json
{
  "overview": {
    "totalProviders": 0,
    "totalPatterns": 0,
    "averageSuccessRate": 0
  },
  "corrections": {
    "totalCorrections": 0
  }
}
```

### **Paso 2: Simular Procesamiento de Documento**

```bash
# Insertar documento procesado en DB (simula OCR inicial)
node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/afip_monitor.db');

const documentData = {
  process_id: 'test-invoice-001',
  file_path: '/test/factura-proveedor-123.pdf',
  document_type: 'invoice',
  client_id: 'cliente-test',
  status: 'completed',
  result: JSON.stringify({
    structured: {
      emisor: { 
        cuit: '30712345678', 
        razonSocial: 'Proveedor Test SA' // Nombre incompleto 
      },
      total: 1500.50,
      fecha: '2025-08-19'
    },
    confidence: 0.75 // Baja confianza inicial
  })
};

db.run(\`
  INSERT INTO ocr_processing_log 
  (process_id, file_path, document_type, client_id, status, result)
  VALUES (?, ?, ?, ?, ?, ?)
\`, Object.values(documentData), function(err) {
  if (err) console.error(err);
  else console.log('✅ Documento simulado insertado, ID:', this.lastID);
  db.close();
});
"
```

### **Paso 3: Enviar Corrección para Aprendizaje**

```bash
# Simular corrección manual del usuario
curl -X POST http://localhost:8080/api/ocr/ml/learn \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": 1,
    "corrections": {
      "type": "invoice",
      "structured": {
        "emisor": {
          "cuit": "30712345678",
          "razonSocial": "Proveedor Test Sociedad Anónima"
        },
        "total": 1500.50,
        "fecha": "2025-08-19",
        "numeroFactura": "A001-00012345"
      }
    },
    "originalData": {
      "type": "invoice", 
      "structured": {
        "emisor": {
          "cuit": "30712345678",
          "razonSocial": "Proveedor Test SA"
        },
        "total": 1500.50,
        "fecha": "2025-08-19"
      },
      "confidence": 0.75
    }
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "learningResult": {
    "correctionCount": 2,
    "patternId": 1,
    "cuit": "30712345678",
    "documentType": "invoice"
  },
  "message": "Learning completed: 2 corrections processed"
}
```

### **Paso 4: Verificar Patrón Creado**

```bash
# Consultar métricas de confianza para el proveedor
curl http://localhost:8080/api/ocr/ml/confidence/30712345678
```

**Respuesta esperada:**
```json
{
  "cuit": "30712345678",
  "hasPattern": true,
  "usageCount": 1,
  "successRate": 1.05,
  "maturityLevel": "initial",
  "improvementFactor": 0.3,
  "lastUpdated": "2025-08-19T..."
}
```

```bash
# Obtener template del proveedor
curl http://localhost:8080/api/ocr/ml/patterns/30712345678
```

### **Paso 5: Simular Más Correcciones**

```bash
# Agregar más documentos del mismo proveedor para mejorar el patrón
for i in {2..5}; do
  # Insertar documento
  node -e "
    const sqlite3 = require('sqlite3');
    const db = new sqlite3.Database('./data/afip_monitor.db');
    db.run(\`
      INSERT INTO ocr_processing_log (process_id, file_path, document_type, status)
      VALUES ('test-doc-$i', '/test/doc$i.pdf', 'invoice', 'completed')
    \`, function(err) {
      if (err) console.error(err);
      console.log('Doc $i inserted, ID:', this.lastID);
      db.close();
    });
  "
  
  # Enviar corrección
  curl -s -X POST http://localhost:8080/api/ocr/ml/learn \
    -H "Content-Type: application/json" \
    -d "{
      \"documentId\": $i,
      \"corrections\": {
        \"structured\": {
          \"emisor\": {\"cuit\": \"30712345678\", \"razonSocial\": \"Proveedor Test Sociedad Anónima\"},
          \"total\": $((1000 + i * 100)),
          \"numeroFactura\": \"A001-0001234$i\"
        }
      },
      \"originalData\": {
        \"structured\": {
          \"emisor\": {\"cuit\": \"30712345678\", \"razonSocial\": \"Proveedor Test SA\"},
          \"total\": $((1000 + i * 100))
        },
        \"confidence\": 0.8
      }
    }" > /dev/null
done
```

### **Paso 6: Verificar Mejora del Patrón**

```bash
# Verificar evolución del patrón
curl http://localhost:8080/api/ocr/ml/confidence/30712345678
```

**Debería mostrar:**
- `usageCount: 5`
- `maturityLevel: "developing"`
- `successRate > 1.0`

### **Paso 7: Probar Procesamiento ML-Enhanced**

```bash
# Procesar nuevo documento usando ML
curl -X POST http://localhost:8080/api/ocr/ml/process \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/test/nuevo-documento.pdf",
    "documentType": "invoice", 
    "cuit": "30712345678"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "result": {
    "confidence": 0.92,
    "originalConfidence": 0.75,
    "mlEnhanced": true,
    "providerTemplate": {
      "id": 1,
      "confidence": 1.05
    }
  },
  "mlEnhanced": true
}
```

### **Paso 8: Verificar Estadísticas Globales**

```bash
# Estadísticas completas del sistema ML
curl http://localhost:8080/api/ocr/ml/stats
```

**Debería mostrar:**
```json
{
  "overview": {
    "totalProviders": 1,
    "totalPatterns": 1,
    "averageSuccessRate": 1.05,
    "totalUsage": 5
  },
  "corrections": {
    "totalCorrections": 10,
    "documentsCorrected": 5
  },
  "byDocumentType": [
    {
      "document_type": "invoice",
      "pattern_count": 1,
      "avg_success_rate": 1.05
    }
  ],
  "systemHealth": {
    "status": "active",
    "initialized": true
  }
}
```

## 🧪 Pruebas Frontend (Opcional)

### Usando React DevTools:

```javascript
// En el browser console, probar hooks
const ocr = useOCR();

// Simular corrección desde frontend  
await ocr.submitMLCorrection('doc-123', correctedData, originalData);

// Obtener métricas
const metrics = await ocr.getConfidenceMetrics('30712345678');

// Verificar template
const template = await ocr.getProviderTemplate('30712345678');
```

## 🎯 Criterios de Aceptación - Checklist

### AC1: Machine Learning Layer ✅
- [ ] Correcciones capturadas automáticamente
- [ ] Patrones almacenados en DB
- [ ] Mejora visible en métricas
- [ ] Aprendizaje aplicado en procesamientos futuros

### AC2: Pattern Recognition ✅  
- [ ] Templates creados tras 3+ documentos del mismo CUIT
- [ ] Cache inteligente funcionando
- [ ] Detección automática de formatos
- [ ] Optimización de regiones de extracción

### AC3: Dynamic Confidence Scoring ✅
- [ ] Confidence score considera historial
- [ ] Thresholds automáticos por proveedor  
- [ ] Scoring diferenciado por campo
- [ ] Métricas trending disponibles

### AC4: Performance Optimization ✅
- [ ] Procesamiento paralelo implementado
- [ ] Pre-processing inteligente activo
- [ ] Sin degradación de performance
- [ ] Fallbacks funcionando correctamente

## 🚨 Solución de Problemas

### Error: Tablas no encontradas
```bash
# Verificar schema aplicado
sqlite3 ./data/afip_monitor.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ml_%';"
```

### Error: Servicio ML no inicializado
```bash
# Verificar logs del servidor
tail -f logs/server.log | grep ML
```

### Error: Tests fallando
```bash
# Ejecutar con más detalle
npm test -- --testPathPattern="ml" --verbose --detectOpenHandles
```

## 🔍 Endpoints para Testing Manual

### Endpoints Principales ML:
- `POST /api/ocr/ml/learn` - Aprendizaje de correcciones
- `GET /api/ocr/ml/confidence/{cuit}` - Métricas de confianza
- `GET /api/ocr/ml/patterns/{cuit}` - Template del proveedor
- `POST /api/ocr/ml/process` - Procesamiento ML-enhanced
- `GET /api/ocr/ml/stats` - Estadísticas globales ML
- `DELETE /api/ocr/ml/patterns/{cuit}` - Eliminar patrones

### Endpoints de Verificación:
- `GET /health` - Estado general del sistema
- `GET /debug/services` - Estado de servicios individuales

## 📊 Métricas de Éxito

### Métricas Cuantitativas:
1. **Mejora de Accuracy**: Target 25% después de 50 correcciones
2. **Creación de Templates**: >90% éxito tras 3+ documentos
3. **Tiempo de Estabilización**: <100 documentos por template
4. **Performance**: <10% aumento en tiempo de procesamiento

### Métricas Cualitativas:
1. **Experiencia de Usuario**: Feedback positivo en correcciones
2. **Confiabilidad del Sistema**: Sin degradación de funcionalidad
3. **Facilidad de Uso**: Interface intuitiva para correcciones

## 📝 Notas para QA

- **Base de datos**: Usar `:memory:` para tests, archivo real para demos
- **Cache**: Limpiar entre tests para resultados consistentes  
- **Concurrencia**: Probar múltiples correcciones simultáneas
- **Fallbacks**: Verificar comportamiento cuando ML falla
- **Performance**: Monitorear memoria y CPU durante pruebas

---

**Documento creado**: 2025-08-19  
**Versión**: 1.0  
**Autor**: James (Development Agent)  
**Estado**: Ready for QA Testing

¡El sistema está listo para comenzar a aprender y mejorar la precisión del OCR automáticamente! 🎉