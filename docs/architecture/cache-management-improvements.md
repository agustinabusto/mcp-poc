# Arquitectura de Mejoras para Gestión de Caché del Navegador - AFIP Monitor MCP

## Resumen Ejecutivo

Este documento analiza la implementación actual de caché en el sistema AFIP Monitor MCP (React + Vite + Node.js) y propone mejoras específicas para optimizar la limpieza de caché del navegador, resolver problemas de datos obsoletos y mejorar la performance de la aplicación.

## Estado Actual del Sistema

### Stack Tecnológico Identificado
- **Frontend**: React 18.2.0 + Vite 4.5.0 + JavaScript ES2020
- **Backend**: Node.js + Express con servicios de caché en memoria
- **Service Worker**: PWA con estrategias Cache First/Network First
- **Storage**: localStorage para autenticación y datos de sesión

### Implementación Actual de Caché

#### 1. Caché del Servidor (`src/server/services/cache-service.js`)
```javascript
// Implementación actual en memoria
static cache = new Map();
static ttlMap = new Map();
// Limpieza automática cada 5 minutos
setInterval(() => { CacheService.cleanupExpired(); }, 5 * 60 * 1000);
```

#### 2. Service Worker (`src/client/public/sw.js`)
```javascript
// Estrategias actuales
const CACHE_NAME = 'afip-monitor-v1.0.0';
const STATIC_CACHE_NAME = 'afip-monitor-static-v1.0.0';
// Cache First para estáticos, Network First para APIs críticas
```

#### 3. Cliente React
- **API calls**: Fetch nativo con proxy Vite
- **State management**: React hooks sin memoización
- **Auth storage**: localStorage para tokens

### Problemas Identificados

1. **Performance de Hooks React**
   - `useCompliance.js`: Re-renders innecesarios por falta de memoización
   - Fetch calls sin caché en múltiples hooks personalizados
   - Estado local no optimizado en componentes

2. **Inconsistencia de Caché Cross-Layer**
   - Service Worker y server cache operan independientemente
   - No hay invalidación coordinada entre capas
   - localStorage no se limpia automáticamente

3. **Service Worker Manual**
   - Versionado manual de caché (`v1.0.0`)
   - No hay cache busting automático
   - Cleanup de versiones anteriores manual

4. **API Caching**
   - Datos críticos de AFIP no tienen TTL diferenciado
   - Falta de estrategia para datos en tiempo real vs estáticos

## Arquitectura de Mejoras Propuesta

### 1. Optimización de React Hooks con Caché Inteligente

#### A. Hook de Caché Unificado
```javascript
// src/client/hooks/useSmartCache.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export const useSmartCache = (key, fetcher, options = {}) => {
    const {
        ttl = 300000, // 5 minutos default
        staleWhileRevalidate = true,
        dependsOn = [],
        cacheLevel = 'memory' // 'memory', 'session', 'local'
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const cacheRef = useRef(new Map());

    // Memoizar la función de caché basada en dependencias
    const cachedFetcher = useCallback(async (...args) => {
        const cacheKey = `${key}_${JSON.stringify(args)}`;
        const cached = getCachedData(cacheKey);
        
        if (cached && !isExpired(cached, ttl)) {
            if (staleWhileRevalidate) {
                // Devolver caché y actualizar en background
                setData(cached.data);
                fetchAndCache(cacheKey, fetcher, args).catch(console.error);
                return cached.data;
            } else {
                return cached.data;
            }
        }
        
        return fetchAndCache(cacheKey, fetcher, args);
    }, [key, fetcher, ttl, staleWhileRevalidate, ...dependsOn]);

    return { data, loading, error, refetch: cachedFetcher, clearCache };
};
```

#### B. Optimización de useCompliance
```javascript
// src/client/hooks/useCompliance.js - Versión optimizada
export const useCompliance = () => {
    // Usar caché inteligente para datos de compliance
    const { 
        data: complianceData, 
        loading, 
        error, 
        refetch: refreshCompliance 
    } = useSmartCache(
        'compliance_dashboard',
        () => complianceService.getDashboardData(),
        { 
            ttl: 120000, // 2 minutos para datos críticos
            staleWhileRevalidate: true,
            dependsOn: [] 
        }
    );

    // Memoizar funciones complejas
    const memoizedCalculations = useMemo(() => ({
        calculateComplianceScore: (checks) => { /* implementación */ },
        getComplianceStatus: (score) => { /* implementación */ },
        generateRecommendations: (checks) => { /* implementación */ }
    }), []);

    // Callback memoizado para check de compliance
    const checkCompliance = useCallback(async (cuit) => {
        const cacheKey = `compliance_check_${cuit}`;
        return smartCacheService.getOrFetch(cacheKey, 
            () => complianceService.runComplianceCheck(cuit),
            { ttl: 300000 } // 5 minutos
        );
    }, []);

    return {
        complianceData,
        loading,
        error,
        checkCompliance: checkCompliance,
        refreshCompliance,
        ...memoizedCalculations
    };
};
```

### 2. Service Worker Inteligente con Cache Busting Automático

#### A. SW con Versionado Dinámico
```javascript
// src/client/public/sw.js - Mejoras propuestas
// Obtener versión desde build
const APP_VERSION = self.__APP_VERSION__ || '1.0.0';
const CACHE_NAME = `afip-monitor-${APP_VERSION}`;
const STATIC_CACHE_NAME = `afip-monitor-static-${APP_VERSION}`;

// Configuración inteligente de TTL por tipo de contenido
const CACHE_STRATEGIES = {
    // Datos críticos: sempre fresh
    '/api/afip/': { strategy: 'network_first', ttl: 0 },
    '/api/compliance/': { strategy: 'network_first', ttl: 60000 }, // 1 min
    
    // Datos de usuario: stale-while-revalidate
    '/api/users/': { strategy: 'stale_while_revalidate', ttl: 300000 }, // 5 min
    
    // Assets estáticos: cache first con long TTL
    '/assets/': { strategy: 'cache_first', ttl: 86400000 }, // 24 horas
    
    // API de contribuyentes: medium TTL
    '/api/contributors/': { strategy: 'stale_while_revalidate', ttl: 600000 } // 10 min
};

// Event listener mejorado para fetch
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const strategy = getStrategyForUrl(url.pathname);
    
    event.respondWith(handleRequestWithStrategy(event.request, strategy));
});

// Cleanup automático de versiones anteriores
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.startsWith('afip-monitor-') && name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});
```

#### B. Integración con Build Process
```javascript
// vite.config.js - Inyección automática de versión
export default defineConfig({
    plugins: [
        react(),
        {
            name: 'inject-version',
            generateBundle() {
                // Inyectar versión en service worker
                this.emitFile({
                    type: 'asset',
                    fileName: 'sw-version.js',
                    source: `self.__APP_VERSION__ = "${process.env.npm_package_version}";`
                });
            }
        }
    ],
    // ... resto de configuración
});
```

### 3. Sistema de Invalidación de Caché Coordinado

#### A. Cache Manager Central
```javascript
// src/client/services/cache-manager.js
class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.subscribers = new Set();
    }

    // Invalidar caché por patrón
    async invalidatePattern(pattern) {
        // 1. Limpiar memory cache
        this.clearMemoryPattern(pattern);
        
        // 2. Enviar mensaje al Service Worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'INVALIDATE_PATTERN',
                pattern: pattern
            });
        }
        
        // 3. Limpiar localStorage selectivamente
        this.clearStoragePattern(pattern);
        
        // 4. Notificar a suscriptores (componentes React)
        this.notifySubscribers('invalidate', pattern);
    }

    // Invalidación específica por evento de negocio
    async invalidateByBusinessEvent(event, data) {
        const patterns = this.getInvalidationPatternsForEvent(event, data);
        
        for (const pattern of patterns) {
            await this.invalidatePattern(pattern);
        }
    }

    // Mapeo de eventos de negocio a patrones de caché
    getInvalidationPatternsForEvent(event, data) {
        const patterns = [];
        
        switch (event) {
            case 'compliance_check_completed':
                patterns.push(`compliance_${data.cuit}`, 'compliance_dashboard');
                break;
            case 'contributor_updated':
                patterns.push(`contributor_${data.cuit}`, 'contributors_list');
                break;
            case 'user_logout':
                patterns.push('user_', 'auth_', 'session_');
                break;
            case 'daily_sync':
                patterns.push('compliance_', 'metrics_', 'dashboard_');
                break;
        }
        
        return patterns;
    }
}

export const cacheManager = new CacheManager();
```

#### B. Integración con Hooks
```javascript
// src/client/hooks/useCacheInvalidation.js
export const useCacheInvalidation = () => {
    const navigate = useNavigate();
    
    // Hook para invalidar caché en eventos específicos
    const invalidateOnEvent = useCallback((event, data) => {
        cacheManager.invalidateByBusinessEvent(event, data);
    }, []);

    // Hook para logout con limpieza completa
    const logoutWithCacheCleanup = useCallback(async () => {
        await cacheManager.invalidateByBusinessEvent('user_logout');
        localStorage.clear();
        sessionStorage.clear();
        navigate('/login');
    }, [navigate]);

    return {
        invalidateOnEvent,
        logoutWithCacheCleanup,
        invalidatePattern: cacheManager.invalidatePattern.bind(cacheManager)
    };
};
```

### 4. Estrategias Específicas por Tipo de Dato

#### A. Datos Críticos de AFIP (TTL Corto)
```javascript
// Configuración para APIs críticas
const AFIP_CACHE_CONFIG = {
    '/api/afip/consulta-padron': { ttl: 0, strategy: 'network_only' },
    '/api/afip/facturas': { ttl: 60000, strategy: 'network_first' }, // 1 min
    '/api/compliance/status': { ttl: 120000, strategy: 'stale_while_revalidate' } // 2 min
};
```

#### B. Datos de UI/UX (TTL Medio)
```javascript
// Configuración para datos de interfaz
const UI_CACHE_CONFIG = {
    '/api/users/preferences': { ttl: 1800000, strategy: 'cache_first' }, // 30 min
    '/api/notifications': { ttl: 300000, strategy: 'stale_while_revalidate' }, // 5 min
    '/api/dashboard/widgets': { ttl: 600000, strategy: 'cache_first' } // 10 min
};
```

#### C. Assets Estáticos (TTL Largo)
```javascript
// Configuración para recursos estáticos
const STATIC_CACHE_CONFIG = {
    '/assets/icons/': { ttl: 2592000000, strategy: 'cache_first' }, // 30 días
    '/assets/images/': { ttl: 86400000, strategy: 'cache_first' }, // 1 día
    'main.js': { ttl: 86400000, strategy: 'cache_first' }, // 1 día con versioning
};
```

## Plan de Implementación

### Fase 1: Optimización de React Hooks (Semana 1-2)
1. **Implementar useSmartCache**
   - Crear hook base con memoización
   - Integrar con memory cache
   - Testing unitario

2. **Optimizar hooks existentes**
   - Refactorizar `useCompliance.js`
   - Aplicar memoización a `useMonitoring.js`
   - Optimizar `useAlerts.js`

### Fase 2: Service Worker Inteligente (Semana 3-4)
1. **Cache Busting Automático**
   - Integrar versioning con build process
   - Implementar cleanup automático
   - Testing de estrategias de caché

2. **Configuración por Tipo de Contenido**
   - Implementar mapeo de URLs a estrategias
   - Configurar TTL diferenciados
   - Validar performance

### Fase 3: Sistema de Invalidación (Semana 5-6)
1. **Cache Manager Central**
   - Implementar clase CacheManager
   - Crear sistema de eventos de negocio
   - Integrar con Service Worker

2. **Hooks de Invalidación**
   - Crear `useCacheInvalidation`
   - Integrar con componentes clave
   - Testing de invalidación

### Fase 4: Monitoreo y Optimización (Semana 7-8)
1. **Métricas de Performance**
   - Implementar analytics de caché
   - Monitor de hit/miss ratios
   - Alertas de performance

2. **Optimización Final**
   - Ajustar TTL basado en métricas
   - Optimizar estrategias de caché
   - Documentación para el equipo

## Beneficios Esperados

### Performance
- **50-70% reducción** en re-renders innecesarios de React
- **30-40% mejora** en tiempo de respuesta de la aplicación
- **60-80% reducción** en llamadas redundantes al servidor

### Experiencia de Usuario
- **Carga instantánea** de datos previamente visitados
- **Sincronización automática** de datos críticos
- **Modo offline mejorado** para funciones básicas

### Mantenibilidad del Código
- **Hooks reutilizables** con caché integrado
- **Invalidación automática** por eventos de negocio
- **Debugging mejorado** con cache analytics

## Consideraciones de Implementación

### Compatibilidad con Stack Actual
- **Sin cambios breaking**: Todas las mejoras son incrementales
- **Compatibilidad con Vite**: Integración nativa con el build process
- **React 18 ready**: Aprovecha las mejoras de concurrent rendering

### Seguridad
- **Datos sensibles**: Never cache authentication tokens en Service Worker
- **GDPR compliance**: Limpieza automática al logout
- **Audit trails**: Logging de operaciones de caché críticas

### Testing
- **Unit tests**: Para todos los hooks de caché
- **Integration tests**: Para Service Worker y invalidación
- **Performance tests**: Antes y después de implementación

## Conclusión

Esta arquitectura aprovecha el stack tecnológico real del proyecto (React + Vite + JavaScript) para implementar un sistema de caché inteligente que:

1. **Optimiza React hooks** con memoización y caché inteligente
2. **Automatiza el Service Worker** con cache busting y estrategias por contenido
3. **Coordina la invalidación** entre todas las capas de caché
4. **Mantiene compatibilidad** con la implementación actual

La implementación gradual permite validar cada mejora sin afectar la estabilidad del sistema productivo.