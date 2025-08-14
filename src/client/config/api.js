// Configuración centralizada de API con manejo robusto de CORS

// Detectar si estamos usando el proxy de Vite o llamadas directas
const isDevelopment = import.meta.env.DEV;
const isViteProxy = isDevelopment && window.location.port === '3030';

// Configuración de URLs base
export const API_CONFIG = {
    // Si estamos en desarrollo con Vite proxy, usar rutas relativas
    // Si no, usar URL completa del servidor backend
    baseURL: isViteProxy ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'),
    timeout: 30000,
    withCredentials: true
};

// Función helper para construir URLs de API
export function getApiUrl(endpoint) {
    // Asegurar que el endpoint empiece con /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Si usamos proxy de Vite, retornar solo el endpoint
    if (isViteProxy) {
        return cleanEndpoint;
    }
    
    // Si no, construir URL completa
    const baseURL = API_CONFIG.baseURL.replace(/\/$/, ''); // Remover trailing slash
    return `${baseURL}${cleanEndpoint}`;
}

// Configuración de headers por defecto
export const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
};

// Función para hacer fetch con configuración CORS apropiada
export async function apiFetch(endpoint, options = {}) {
    const url = getApiUrl(endpoint);
    
    const config = {
        ...options,
        headers: {
            ...DEFAULT_HEADERS,
            ...options.headers
        },
        credentials: API_CONFIG.withCredentials ? 'include' : 'same-origin',
        mode: 'cors'
    };

    try {
        console.log(`[API] ${config.method || 'GET'} ${url}`);
        
        const response = await fetch(url, config);
        
        // Log de respuesta para debugging
        if (isDevelopment) {
            console.log(`[API Response] ${response.status} ${response.statusText}`);
        }
        
        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        
        // Parsear respuesta
        const data = isJson ? await response.json() : await response.text();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
        
    } catch (error) {
        // Mejorar mensajes de error
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            console.error('[API Error] Network error - posible problema de CORS o servidor no disponible');
            throw new Error('No se pudo conectar con el servidor. Verifique que el servidor esté corriendo en puerto 8080.');
        }
        
        console.error('[API Error]', error);
        throw error;
    }
}

// Funciones helper para métodos HTTP comunes
export const api = {
    get: (endpoint, options = {}) => 
        apiFetch(endpoint, { ...options, method: 'GET' }),
    
    post: (endpoint, data, options = {}) => 
        apiFetch(endpoint, { 
            ...options, 
            method: 'POST',
            body: JSON.stringify(data)
        }),
    
    put: (endpoint, data, options = {}) => 
        apiFetch(endpoint, { 
            ...options, 
            method: 'PUT',
            body: JSON.stringify(data)
        }),
    
    delete: (endpoint, options = {}) => 
        apiFetch(endpoint, { ...options, method: 'DELETE' }),
    
    patch: (endpoint, data, options = {}) => 
        apiFetch(endpoint, { 
            ...options, 
            method: 'PATCH',
            body: JSON.stringify(data)
        })
};

// Test de conexión con el servidor
export async function testServerConnection() {
    try {
        const response = await api.get('/api/cors-test');
        console.log('[CORS Test]', response);
        return response;
    } catch (error) {
        console.error('[CORS Test Failed]', error);
        throw error;
    }
}

// Exportar configuración para debugging
if (isDevelopment) {
    window.__API_CONFIG = {
        isDevelopment,
        isViteProxy,
        apiConfig: API_CONFIG,
        testConnection: testServerConnection
    };
    
    console.log('[API Config]', {
        isDevelopment,
        isViteProxy,
        baseURL: API_CONFIG.baseURL,
        currentOrigin: window.location.origin
    });
}

export default api;