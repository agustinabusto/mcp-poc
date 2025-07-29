// src/client/public/sw.js - Service Worker para AFIP Monitor MCP
const CACHE_NAME = 'afip-monitor-v1.0.0';
const STATIC_CACHE_NAME = 'afip-monitor-static-v1.0.0';

// Archivos estáticos a cachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/main.jsx',
  '/manifest.json',
  '/favicon.svg'
];

// URLs de la API que NO deben cachearse
const NO_CACHE_PATTERNS = [
  /\/api\/afip\//,
  /\/api\/compliance\//,
  /\/api\/groq\//,
  /\/api\/alerts\//,
  /\/api\/metrics\//
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v1.0.0');
  
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

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Eliminar cachés antiguos
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('[SW] Eliminando caché antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activación completada');
        return self.clients.claim();
      })
  );
});

// Intercepción de requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // No cachear APIs críticas de AFIP
  const shouldNotCache = NO_CACHE_PATTERNS.some(pattern => 
    pattern.test(url.pathname)
  );
  
  if (shouldNotCache) {
    // Para APIs críticas, siempre ir a la red
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // En caso de error de red, devolver respuesta offline
          return new Response(JSON.stringify({
            error: 'Sin conexión',
            message: 'Funcionalidad limitada sin conexión a internet',
            offline: true
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Cache First Strategy para archivos estáticos
  if (event.request.destination === 'document' || 
      event.request.destination === 'script' || 
      event.request.destination === 'style' ||
      event.request.destination === 'image') {
    
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            console.log('[SW] Sirviendo desde caché:', event.request.url);
            return response;
          }
          
          return fetch(event.request)
            .then((response) => {
              // Solo cachear respuestas exitosas
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseClone);
                  });
              }
              return response;
            });
        })
        .catch(() => {
          // Fallback para documentos
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
          
          return new Response('Recurso no disponible offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
    return;
  }

  // Network First Strategy para otras requests
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Manejo de mensajes del cliente
self.addEventListener('message', (event) => {
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

console.log('[SW] Service Worker cargado correctamente');