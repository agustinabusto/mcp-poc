// sw.js - Service Worker para AFIP Monitor PWA
const CACHE_NAME = 'afip-monitor-v1.0.0';
const CACHE_VERSION = '1.0.0';

// Recursos para cachear
const STATIC_CACHE_URLS = [
    '/',
    '/manifest.json',
    '/main.jsx',
    '/index.css'
];

// URLs de la API que deben ser cacheadas
const API_CACHE_URLS = [
    '/api/status',
    '/api/health'
];

// URLs que no deben ser cacheadas
const NO_CACHE_URLS = [
    '/api/afip/taxpayer',
    '/api/compliance/check',
    '/api/alerts/refresh'
];

// Estrategias de caché
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
    NETWORK_ONLY: 'network-only',
    CACHE_ONLY: 'cache-only'
};

// Configuración de timeouts
const NETWORK_TIMEOUT = 5000;
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas

// ================================
// EVENTOS DEL SERVICE WORKER
// ================================

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Service Worker: Caching static resources');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                console.log('✅ Service Worker: Installation completed');
                // Activar inmediatamente el nuevo Service Worker
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Service Worker: Installation failed', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activating...');

    event.waitUntil(
        Promise.all([
            // Limpiar cachés antiguos
            cleanOldCaches(),
            // Reclamar control de todos los clientes
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker: Activation completed');
        })
    );
});

// Interceptar requests de red
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo manejar requests HTTP/HTTPS
    if (!request.url.startsWith('http')) return;

    // Determinar estrategia de caché
    const strategy = getCacheStrategy(url, request);

    event.respondWith(
        handleRequest(request, strategy)
            .catch((error) => {
                console.error('❌ Service Worker: Request failed', error);
                return createErrorResponse(request, error);
            })
    );
});

// Manejo de mensajes desde el cliente
self.addEventListener('message', (event) => {
    const { data } = event;

    switch (data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'GET_VERSION':
            event.ports[0].postMessage({
                type: 'VERSION',
                version: CACHE_VERSION
            });
            break;

        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({
                    type: 'CACHE_CLEARED',
                    success: true
                });
            });
            break;

        case 'FORCE_UPDATE':
            forceUpdate().then(() => {
                event.ports[0].postMessage({
                    type: 'UPDATE_COMPLETED',
                    success: true
                });
            });
            break;

        default:
            console.log('📨 Service Worker: Unknown message type', data.type);
    }
});

// ================================
// FUNCIONES DE CACHÉ
// ================================

// Determinar estrategia de caché basada en la URL
function getCacheStrategy(url, request) {
    // No cachear URLs específicas
    if (NO_CACHE_URLS.some(pattern => url.pathname.includes(pattern))) {
        return CACHE_STRATEGIES.NETWORK_ONLY;
    }

    // APIs de estado pueden usar stale-while-revalidate
    if (API_CACHE_URLS.some(pattern => url.pathname.includes(pattern))) {
        return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
    }

    // Recursos estáticos usan cache-first
    if (isStaticResource(url)) {
        return CACHE_STRATEGIES.CACHE_FIRST;
    }

    // APIs en tiempo real usan network-first
    if (url.pathname.startsWith('/api/')) {
        return CACHE_STRATEGIES.NETWORK_FIRST;
    }

    // Por defecto, network-first para navegación
    return CACHE_STRATEGIES.NETWORK_FIRST;
}

// Verificar si es un recurso estático
function isStaticResource(url) {
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Manejar request según la estrategia
async function handleRequest(request, strategy) {
    switch (strategy) {
        case CACHE_STRATEGIES.CACHE_FIRST:
            return cacheFirst(request);

        case CACHE_STRATEGIES.NETWORK_FIRST:
            return networkFirst(request);

        case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
            return staleWhileRevalidate(request);

        case CACHE_STRATEGIES.NETWORK_ONLY:
            return networkOnly(request);

        case CACHE_STRATEGIES.CACHE_ONLY:
            return cacheOnly(request);

        default:
            return networkFirst(request);
    }
}

// Estrategia: Cache First
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        // Verificar si el caché no está obsoleto
        if (!isCacheExpired(cachedResponse)) {
            return cachedResponse;
        }
    }

    try {
        const networkResponse = await fetchWithTimeout(request);
        await updateCache(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        if (cachedResponse) {
            console.warn('🔄 Service Worker: Using stale cache due to network error');
            return cachedResponse;
        }
        throw error;
    }
}

// Estrategia: Network First
async function networkFirst(request) {
    try {
        const networkResponse = await fetchWithTimeout(request);

        // Cachear response exitosa
        if (networkResponse.ok && request.method === 'GET') {
            await updateCache(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.warn('🔄 Service Worker: Network failed, trying cache');
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

// Estrategia: Stale While Revalidate
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);

    // Hacer fetch en background para actualizar caché
    const networkResponsePromise = fetchWithTimeout(request)
        .then(response => {
            if (response.ok) {
                updateCache(request, response.clone());
            }
            return response;
        })
        .catch(error => {
            console.warn('🔄 Service Worker: Background update failed', error);
        });

    // Retornar caché inmediatamente si existe
    if (cachedResponse && !isCacheExpired(cachedResponse)) {
        return cachedResponse;
    }

    // Si no hay caché, esperar por la red
    return networkResponsePromise;
}

// Estrategia: Network Only
async function networkOnly(request) {
    return fetchWithTimeout(request);
}

// Estrategia: Cache Only
async function cacheOnly(request) {
    const cachedResponse = await caches.match(request);
    if (!cachedResponse) {
        throw new Error('No cached response available');
    }
    return cachedResponse;
}

// ================================
// FUNCIONES UTILITARIAS
// ================================

// Fetch con timeout
function fetchWithTimeout(request, timeout = NETWORK_TIMEOUT) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Network timeout'));
        }, timeout);

        fetch(request)
            .then(response => {
                clearTimeout(timeoutId);
                resolve(response);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

// Actualizar caché
async function updateCache(request, response) {
    if (response.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response);
    }
}

// Verificar si el caché está expirado
function isCacheExpired(response) {
    const cacheDate = response.headers.get('sw-cache-date');
    if (!cacheDate) return false;

    const cacheTime = new Date(cacheDate).getTime();
    const now = Date.now();

    return (now - cacheTime) > CACHE_MAX_AGE;
}

// Limpiar cachés antiguos
async function cleanOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name =>
        name.startsWith('afip-monitor-') && name !== CACHE_NAME
    );

    await Promise.all(
        oldCaches.map(cache => {
            console.log('🧹 Service Worker: Deleting old cache', cache);
            return caches.delete(cache);
        })
    );
}

// Limpiar todos los cachés
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(cache => caches.delete(cache))
    );
    console.log('🧹 Service Worker: All caches cleared');
}

// Forzar actualización
async function forceUpdate() {
    await clearAllCaches();
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_CACHE_URLS);
    console.log('🔄 Service Worker: Force update completed');
}

// Crear respuesta de error
function createErrorResponse(request, error) {
    const isNavigationRequest = request.mode === 'navigate';

    if (isNavigationRequest) {
        // Para requests de navegación, intentar retornar la página principal cacheada
        return caches.match('/').then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // Crear respuesta de error HTML
            return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AFIP Monitor - Sin Conexión</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center; 
              padding: 2rem;
              background: #f8f9fa;
            }
            .container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            h1 { color: #0066cc; margin-bottom: 1rem; }
            p { color: #666; margin-bottom: 1.5rem; }
            button {
              background: #0066cc;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📱</div>
            <h1>AFIP Monitor</h1>
            <p>No se pudo conectar al servidor. Verifica tu conexión a internet.</p>
            <button onclick="window.location.reload()">Reintentar</button>
          </div>
        </body>
        </html>
      `, {
                status: 200,
                statusText: 'OK',
                headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                }
            });
        });
    }

    // Para otros requests, retornar error JSON
    return new Response(JSON.stringify({
        error: 'Service Worker: Network request failed',
        message: error.message,
        offline: !navigator.onLine
    }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

// ================================
// LOGS Y DEBUGGING
// ================================

console.log('🚀 Service Worker: Loaded successfully');
console.log('📋 Service Worker: Cache name:', CACHE_NAME);
console.log('🔧 Service Worker: Version:', CACHE_VERSION);