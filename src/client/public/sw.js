// src/client/public/sw.js - Service Worker Inteligente AFIP Monitor MCP
// Importar versión automática
importScripts('./sw-version.js');

// Obtener versión desde build
const APP_VERSION = self.__APP_VERSION__ || '1.0.0';
const CACHE_NAME = `afip-monitor-${APP_VERSION}`;
const STATIC_CACHE_NAME = `afip-monitor-static-${APP_VERSION}`;

// Configuración inteligente de TTL por tipo de contenido
const CACHE_STRATEGIES = {
    // Datos críticos: siempre fresh
    '/api/afip/': { strategy: 'network_first', ttl: 0 },
    '/api/compliance/': { strategy: 'network_first', ttl: 60000 }, // 1 min
    
    // Auth siempre network_first sin cache para tokens frescos
    '/api/auth/': { strategy: 'network_first', ttl: 0 },
    
    // Datos de usuario: stale-while-revalidate
    '/api/users/': { strategy: 'stale_while_revalidate', ttl: 300000 }, // 5 min
    '/api/groq/': { strategy: 'network_first', ttl: 0 }, // AI requests always fresh
    
    // Assets estáticos: cache first con long TTL
    '/assets/': { strategy: 'cache_first', ttl: 86400000 }, // 24 horas
    
    // API de contribuyentes: medium TTL
    '/api/contributors/': { strategy: 'stale_while_revalidate', ttl: 600000 }, // 10 min
    '/api/alerts/': { strategy: 'stale_while_revalidate', ttl: 60000 }, // 1 min
    '/api/metrics/': { strategy: 'stale_while_revalidate', ttl: 120000 } // 2 min
};

// Archivos estáticos a cachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/main.jsx',
  '/manifest.json',
  '/favicon.svg'
];

// Función para obtener estrategia basada en URL
function getStrategyForUrl(pathname) {
    for (const [pattern, config] of Object.entries(CACHE_STRATEGIES)) {
        if (pathname.startsWith(pattern)) {
            return config;
        }
    }
    // Default strategy para rutas no configuradas
    return { strategy: 'network_first', ttl: 300000 };
}

// Función para verificar si un item del caché está expirado
function isExpired(timestamp, ttl) {
    if (ttl === 0) return true; // Nunca cachear
    return Date.now() - timestamp > ttl;
}

// Función para manejar estrategia network_first
async function networkFirst(request, ttl) {
    try {
        const response = await fetch(request);
        if (response.ok && ttl > 0) {
            const cache = await caches.open(CACHE_NAME);
            const responseClone = response.clone();
            await cache.put(request, responseClone);
        }
        return response;
    } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Función para manejar estrategia cache_first
async function cacheFirst(request, ttl) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Verificar si está expirado
        const dateHeader = cachedResponse.headers.get('sw-cached-date');
        if (dateHeader && !isExpired(parseInt(dateHeader), ttl)) {
            return cachedResponse;
        }
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            const responseClone = response.clone();
            // Agregar timestamp
            const responseWithTimestamp = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: {
                    ...Object.fromEntries(responseClone.headers.entries()),
                    'sw-cached-date': Date.now().toString()
                }
            });
            await cache.put(request, responseWithTimestamp);
        }
        return response;
    } catch (error) {
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Función para manejar estrategia stale_while_revalidate
async function staleWhileRevalidate(request, ttl) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Revalidar en background si existe caché
    if (cachedResponse) {
        const dateHeader = cachedResponse.headers.get('sw-cached-date');
        const shouldRevalidate = !dateHeader || isExpired(parseInt(dateHeader), ttl);
        
        if (shouldRevalidate) {
            // Actualizar en background
            fetch(request).then(response => {
                if (response.ok) {
                    const responseClone = response.clone();
                    const responseWithTimestamp = new Response(responseClone.body, {
                        status: responseClone.status,
                        statusText: responseClone.statusText,
                        headers: {
                            ...Object.fromEntries(responseClone.headers.entries()),
                            'sw-cached-date': Date.now().toString()
                        }
                    });
                    cache.put(request, responseWithTimestamp);
                }
            }).catch(console.error);
        }
        
        return cachedResponse;
    }
    
    // Si no hay caché, hacer network first
    return networkFirst(request, ttl);
}

// Función principal para manejar requests con estrategia
async function handleRequestWithStrategy(request, strategy) {
    const { strategy: strategyName, ttl } = strategy;
    
    switch (strategyName) {
        case 'network_first':
            return networkFirst(request, ttl);
        case 'cache_first':
            return cacheFirst(request, ttl);
        case 'stale_while_revalidate':
            return staleWhileRevalidate(request, ttl);
        case 'network_only':
            return fetch(request);
        default:
            return networkFirst(request, ttl);
    }
}

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log(`[SW] Instalando Service Worker v${APP_VERSION}`);
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando archivos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Instalación completada');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error durante la instalación:', error);
      })
  );
});

// Activación del Service Worker con cleanup automático
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activando Service Worker v${APP_VERSION}`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('afip-monitor-') && name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map(name => {
            console.log(`[SW] Eliminando caché obsoleto: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log(`[SW] Activación completada v${APP_VERSION}`);
      return self.clients.claim();
    })
  );
});

// Event listener mejorado para fetch con estrategias inteligentes
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const strategy = getStrategyForUrl(url.pathname);
    
    // Manejar archivos estáticos con cache_first
    if (event.request.destination === 'document' || 
        event.request.destination === 'script' || 
        event.request.destination === 'style' ||
        event.request.destination === 'image') {
        
        event.respondWith(
            cacheFirst(event.request, 86400000) // 24 horas para estáticos
                .catch(() => {
                    // Fallback para documentos
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html') || new Response('Offline', { status: 503 });
                    }
                    return new Response('Recurso no disponible offline', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                })
        );
        return;
    }
    
    // Para todas las demás requests, usar la estrategia configurada
    event.respondWith(
        handleRequestWithStrategy(event.request, strategy)
            .catch((error) => {
                console.error('[SW] Error handling request:', error);
                
                // Respuesta de fallback para APIs
                if (url.pathname.startsWith('/api/')) {
                    return new Response(JSON.stringify({
                        error: 'Sin conexión',
                        message: 'Funcionalidad limitada sin conexión a internet',
                        offline: true,
                        timestamp: Date.now()
                    }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                // Fallback genérico
                return new Response('Servicio no disponible', { status: 503 });
            })
    );
});

// Manejo de mensajes del cliente con invalidación de caché
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Recibido comando SKIP_WAITING');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_CONNECTION') {
    event.ports[0].postMessage({
      type: 'CONNECTION_STATUS',
      online: navigator.onLine
    });
  }
  
  // Manejo de invalidación de caché por patrón
  if (event.data && event.data.type === 'INVALIDATE_PATTERN') {
    const pattern = event.data.pattern;
    console.log(`[SW] Invalidando caché con patrón: ${pattern}`);
    
    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      
      for (const request of keys) {
        const url = new URL(request.url);
        if (url.pathname.includes(pattern)) {
          await cache.delete(request);
          console.log(`[SW] Eliminado del caché: ${request.url}`);
        }
      }
      
      // Responder al cliente
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          type: 'PATTERN_INVALIDATED',
          pattern: pattern,
          success: true
        });
      }
    } catch (error) {
      console.error('[SW] Error invalidating cache pattern:', error);
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          type: 'PATTERN_INVALIDATED',
          pattern: pattern,
          success: false,
          error: error.message
        });
      }
    }
  }
});

// Notificaciones Push (para futuras implementaciones)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nueva notificación de AFIP Monitor',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'afip-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'AFIP Monitor MCP',
        options
      )
    );
  }
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log(`[SW] Service Worker Inteligente v${APP_VERSION} cargado correctamente`);