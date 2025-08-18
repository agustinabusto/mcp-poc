# Guía Paso a Paso: Uso de Certificados ARCA/AFIP

## 📋 Índice

1. [Obtención del Certificado ARCA](#1-obtención-del-certificado-arca)
2. [Configuración en el Sistema](#2-configuración-en-el-sistema)
3. [Implementación Técnica](#3-implementación-técnica)
4. [Proceso de Autenticación WSAA](#4-proceso-de-autenticación-wsaa)
5. [Uso en Servicios ARCA](#5-uso-en-servicios-arca)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Obtención del Certificado ARCA

### 📋 **Paso 1.1: Generar Clave Privada**

```bash
# Crear directorio para certificados
mkdir -p certs
cd certs

# Generar clave privada RSA de 2048 bits
openssl genrsa -out arca-private.key 2048

# Verificar la clave generada
openssl rsa -in arca-private.key -text -noout
```

### 📋 **Paso 1.2: Crear Certificate Signing Request (CSR)**

```bash
# Generar CSR
openssl req -new -key arca-private.key -out arca-request.csr -subj "/C=AR/ST=Buenos Aires/L=CABA/O=TU_EMPRESA/CN=TU_CUIT"

# Verificar el CSR
openssl req -in arca-request.csr -text -noout
```

### 📋 **Paso 1.3: Solicitar Certificado en ARCA**

1. **Ingresar a ARCA** con Clave Fiscal Nivel 3
2. **Navegar a**: `Administrador de Relaciones de Clave Fiscal` > `Certificados Digitales`
3. **Seleccionar**: "Web Services"
4. **Subir el CSR**: `arca-request.csr`
5. **Descargar certificado**: Guardarlo como `arca-cert.pem`

### 📋 **Paso 1.4: Verificar Certificado**

```bash
# Verificar el certificado descargado
openssl x509 -in arca-cert.pem -text -noout

# Verificar que la clave privada coincida con el certificado
openssl x509 -noout -modulus -in arca-cert.pem | openssl md5
openssl rsa -noout -modulus -in arca-private.key | openssl md5
# Los hashes deben ser idénticos
```

---

## 2. Configuración en el Sistema

### 📋 **Paso 2.1: Estructura de Archivos**

```
proyecto/
├── certs/
│   ├── arca-cert.pem       # Certificado público
│   ├── arca-private.key    # Clave privada
│   └── .gitignore          # Excluir certs del repositorio
├── .env
└── .env.example
```

### 📋 **Paso 2.2: Configuración de Variables de Entorno**

**Opción A: Archivos (Recomendado para desarrollo)**

```bash
# .env
ARCA_ENVIRONMENT=homologacion  # o 'produccion'
ARCA_CUIT=20123456789

# Rutas a certificados
ARCA_CERT_PATH=./certs/arca-cert.pem
ARCA_KEY_PATH=./certs/arca-private.key

# Cache y timeouts
ARCA_CACHE_TTL_SECONDS=3600
TOKEN_EXPIRY_BUFFER_HOURS=1
REQUEST_TIMEOUT_MS=30000
```

**Opción B: Variables de entorno (Recomendado para producción)**

```bash
# .env
ARCA_ENVIRONMENT=produccion
ARCA_CUIT=20123456789

# Certificados como variables de entorno (más seguro)
ARCA_CERT_CONTENT="-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvD...
-----END CERTIFICATE-----"

ARCA_KEY_CONTENT="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcw...
-----END PRIVATE KEY-----"
```

### 📋 **Paso 2.3: Seguridad de Certificados**

```bash
# Configurar permisos restrictivos
chmod 600 certs/arca-private.key
chmod 644 certs/arca-cert.pem

# Agregar a .gitignore
echo "certs/" >> .gitignore

# Para producción: usar variables de entorno o secrets manager
```

---

## 3. Implementación Técnica

### 📋 **Paso 3.1: Carga de Certificados en el Código**

El sistema automáticamente carga los certificados según esta prioridad:

```javascript
// src/server/services/arca-service.js - loadCertificates()

// 1. Prioridad: Variables de entorno (PROD)
if (this.config.ARCA_CERT_CONTENT && this.config.ARCA_KEY_CONTENT) {
    this.certificateContent = this.config.ARCA_CERT_CONTENT;
    this.privateKeyContent = this.config.ARCA_KEY_CONTENT;
}
// 2. Alternativa: Archivos (DEV)
else if (this.config.ARCA_CERT_PATH && this.config.ARCA_KEY_PATH) {
    this.certificateContent = await readFile(this.config.ARCA_CERT_PATH, 'utf8');
    this.privateKeyContent = await readFile(this.config.ARCA_KEY_PATH, 'utf8');
}
```

### 📋 **Paso 3.2: Inicialización del Servicio**

```javascript
// Ejemplo de inicialización
import { ARCAService } from './services/arca-service.js';
import { CacheService } from './services/cache-service.js';

const config = {
    ARCA_ENVIRONMENT: process.env.ARCA_ENVIRONMENT,
    ARCA_CUIT: process.env.ARCA_CUIT,
    ARCA_CERT_PATH: process.env.ARCA_CERT_PATH,
    ARCA_KEY_PATH: process.env.ARCA_KEY_PATH,
    // ... más configuración
};

const cacheService = new CacheService();
const arcaService = new ARCAService(config, cacheService);

// Inicializar (carga certificados)
await arcaService.initialize();
```

---

## 4. Proceso de Autenticación WSAA

### 📋 **Paso 4.1: Flujo de Autenticación**

```mermaid
sequenceDiagram
    participant App as Aplicación
    participant WSAA as WSAA ARCA
    participant WS as Servicio ARCA

    App->>App: 1. Crear Login Ticket Request (TRA)
    App->>App: 2. Firmar TRA con certificado
    App->>WSAA: 3. Enviar LoginCms(TRA firmado)
    WSAA->>App: 4. Devolver Token + Sign
    App->>WS: 5. Usar Token/Sign para servicios
    WS->>App: 6. Respuesta del servicio
```

### 📋 **Paso 4.2: Creación del Login Ticket Request (TRA)**

```javascript
// El sistema automáticamente crea el TRA
createLoginTicketRequest(service) {
    const now = new Date();
    const expiry = new Date(now.getTime() + (12 * 60 * 60 * 1000)); // 12 horas
    
    return `<?xml version="1.0" encoding="UTF-8"?>
    <loginTicketRequest version="1.0">
        <header>
            <uniqueId>${Date.now()}</uniqueId>
            <generationTime>${now.toISOString().replace('Z', '-03:00')}</generationTime>
            <expirationTime>${expiry.toISOString().replace('Z', '-03:00')}</expirationTime>
        </header>
        <service>${service}</service>
    </loginTicketRequest>`;
}
```

### 📋 **Paso 4.3: Firma Criptográfica del TRA**

```javascript
// NOTA: La implementación actual es simplificada
// En producción debe usar firma CMS/PKCS#7 real

async signLoginTicketRequest(loginTicketRequest) {
    // TODO: Implementar firma CMS real con certificado
    // Debe usar: certificateContent + privateKeyContent
    
    // Implementación temporal para desarrollo:
    return Buffer.from(loginTicketRequest).toString('base64');
}
```

⚠️ **IMPORTANTE**: La firma actual es una implementación simplificada. Para producción, necesitas implementar firma CMS/PKCS#7 real.

### 📋 **Paso 4.4: Obtención y Cache de Tokens**

```javascript
// Uso automático en el código
const token = await arcaService.authenticateWSAA('wsfe');

// El sistema automáticamente:
// 1. Verifica si hay token en cache válido
// 2. Si no, genera nuevo TRA
// 3. Firma el TRA con certificado
// 4. Solicita token a WSAA
// 5. Cachea token con TTL
// 6. Retorna token válido
```

---

## 5. Uso en Servicios ARCA

### 📋 **Paso 5.1: Facturación Electrónica (WSFEV1)**

```javascript
// Ejemplo: Solicitar CAE
const request = {
    FeCAEReq: {
        FeCabReq: {
            CantReg: 1,
            PtoVta: 1,
            CbteTipo: 1
        },
        FeDetReq: [{
            Concepto: 1,
            DocTipo: 80,
            DocNro: "20123456789",
            CbteDesde: 1,
            CbteHasta: 1,
            CbteFch: "20241225",
            ImpTotal: 121.00,
            ImpNeto: 100.00,
            ImpIVA: 21.00,
            MonId: "PES",
            MonCotiz: 1,
            Iva: [{
                Id: 5,
                BaseImp: 100.00,
                Importe: 21.00
            }]
        }]
    }
};

// El certificado se usa automáticamente
const response = await arcaService.solicitarCAE(request);
```

### 📋 **Paso 5.2: Consulta de Parámetros**

```javascript
// Obtener tipos de comprobantes
const tiposComprobante = await arcaService.getParametros('FEParamGetTiposCbte');

// Obtener alícuotas de IVA
const tiposIVA = await arcaService.getParametros('FEParamGetTiposIva');

// Obtener cotización de moneda
const cotizacion = await arcaService.getParametros('FEParamGetCotizacion', { MonId: 'USD' });
```

### 📋 **Paso 5.3: Consulta de Estado de Contribuyentes**

```javascript
// Para implementar (servicio recomendado)
// WS_SR_CONSTANCIA_INSCRIPCION
const estadoContribuyente = await arcaService.consultarEstadoCUIT('20123456789');
```

---

## 6. Troubleshooting

### 🔍 **Error: "No certificate configuration found"**

```javascript
// Verificar variables de entorno
console.log('ARCA_CERT_PATH:', process.env.ARCA_CERT_PATH);
console.log('ARCA_KEY_PATH:', process.env.ARCA_KEY_PATH);
console.log('ARCA_CERT_CONTENT:', process.env.ARCA_CERT_CONTENT ? 'SET' : 'NOT SET');

// Verificar archivos existen
const fs = require('fs');
if (fs.existsSync(process.env.ARCA_CERT_PATH)) {
    console.log('Certificate file exists');
} else {
    console.log('Certificate file NOT found');
}
```

### 🔍 **Error: "WSAA authentication failed"**

1. **Verificar certificado válido**:
```bash
openssl x509 -in certs/arca-cert.pem -noout -dates
```

2. **Verificar conectividad**:
```bash
curl -I https://wsaahomo.afip.gov.ar/ws/services/LoginService
```

3. **Verificar CUIT habilitado**:
   - Ingresar a ARCA con Clave Fiscal
   - Verificar habilitación para Web Services

### 🔍 **Error: "Token expired"**

```javascript
// Verificar estado del token
const authStatus = await arcaService.checkAuthStatus();
console.log('Token válido:', authStatus.valid);
console.log('Tiempo restante:', authStatus.timeLeft, 'segundos');

// Limpiar cache si necesario
// (Se renueva automáticamente)
```

### 🔍 **Error de Firma CMS**

⚠️ **Limitación actual**: La implementación de firma está simplificada

**Para producción necesitas**:
1. Implementar firma CMS/PKCS#7 real
2. Usar librerías como `node-forge` o `crypto`
3. Seguir especificaciones ARCA exactas

### 🔍 **Verificación de Configuración Completa**

```javascript
// Verificar servicio completamente configurado
const healthCheck = await arcaService.healthCheck();
console.log('Estado ARCA:', healthCheck.status);
console.log('WSAA conectado:', healthCheck.wsaa);
console.log('Token expira:', healthCheck.tokenExpiry);
```

---

## 🎯 Resumen de Comandos Clave

```bash
# 1. Generar certificado
openssl genrsa -out certs/arca-private.key 2048
openssl req -new -key certs/arca-private.key -out certs/arca-request.csr

# 2. Configurar permisos
chmod 600 certs/arca-private.key
chmod 644 certs/arca-cert.pem

# 3. Configurar variables
echo "ARCA_CERT_PATH=./certs/arca-cert.pem" >> .env
echo "ARCA_KEY_PATH=./certs/arca-private.key" >> .env

# 4. Verificar configuración
npm run test:arca-connection
```

## 📚 Referencias Técnicas

- **Código principal**: `src/server/services/arca-service.js`
- **Configuración**: `.env.example` líneas 37-42
- **Documentación ARCA**: https://www.arca.gob.ar/
- **Especificaciones WSAA**: Portal de desarrolladores ARCA