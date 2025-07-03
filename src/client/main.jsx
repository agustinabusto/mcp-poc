import React from 'react';
import ReactDOM from 'react-dom/client';
import { AfipMonitorPOC } from './components/AfipMonitorPOC.jsx';
import './index.css';

// Configuración global de la aplicación
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
  refreshInterval: parseInt(import.meta.env.VITE_REFRESH_INTERVAL) || 30000,
  enableNotifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS !== 'false',
  environment: import.meta.env.NODE_ENV || 'development'
};

// Configurar error handling global
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);

  // En producción, enviar error a sistema de logging
  if (config.environment === 'production') {
    // Implementar logging de errores
  }
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);

  // En producción, enviar error a sistema de logging
  if (config.environment === 'production') {
    // Implementar logging de errores
  }
});

// Verificar soporte de características necesarias
const checkBrowserSupport = () => {
  const features = {
    fetch: typeof fetch !== 'undefined',
    websocket: typeof WebSocket !== 'undefined',
    localStorage: typeof localStorage !== 'undefined',
    notifications: 'Notification' in window,
    serviceWorker: 'serviceWorker' in navigator
  };

  const unsupported = Object.entries(features)
    .filter(([_, supported]) => !supported)
    .map(([feature]) => feature);

  if (unsupported.length > 0) {
    console.warn('Características no soportadas:', unsupported);

    // Mostrar mensaje de advertencia para características críticas
    const critical = ['fetch', 'websocket'];
    const criticalUnsupported = unsupported.filter(f => critical.includes(f));

    if (criticalUnsupported.length > 0) {
      alert('Su navegador no soporta características necesarias para esta aplicación. Por favor actualice su navegador.');
      return false;
    }
  }

  return true;
};

// Función para inicializar la aplicación
const initializeApp = async () => {
  try {
    // Verificar soporte del navegador
    if (!checkBrowserSupport()) {
      return;
    }

    // Solicitar permisos de notificación si están habilitadas
    if (config.enableNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }

    // Registrar Service Worker para PWA (si está disponible)
    if ('serviceWorker' in navigator && config.environment === 'production') {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registrado:', registration);
      } catch (error) {
        console.warn('Error registrando Service Worker:', error);
      }
    }

    // Renderizar aplicación principal
    const root = ReactDOM.createRoot(document.getElementById('root'));

    root.render(
      <React.StrictMode>
        <AfipMonitorPOC config={config} />
      </React.StrictMode>
    );

    console.log('AFIP Monitor POC inicializado correctamente');

  } catch (error) {
    console.error('Error inicializando aplicación:', error);

    // Mostrar mensaje de error de fallback
    const errorContainer = document.getElementById('root');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div style="
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 2rem;
          font-family: system-ui, -apple-system, sans-serif;
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        ">
          <div style="
            background: rgba(255, 255, 255, 0.1);
            padding: 3rem;
            border-radius: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            max-width: 500px;
          ">
            <h1 style="margin-bottom: 1rem; font-size: 2rem;">⚠️ Error de Inicialización</h1>
            <p style="margin-bottom: 1.5rem; opacity: 0.9;">
              No se pudo inicializar la aplicación AFIP Monitor.
            </p>
            <p style="margin-bottom: 2rem; font-size: 0.9rem; opacity: 0.8;">
              Error: ${error.message}
            </p>
            <button 
              onclick="window.location.reload()" 
              style="
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                transition: background-color 0.2s;
              "
              onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
              onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'"
            >
              🔄 Recargar Página
            </button>
          </div>
        </div>
      `;
    }
  }
};

// Agregar metadatos para PWA
const addPWAMetadata = () => {
  const meta = [
    { name: 'theme-color', content: '#667eea' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'AFIP Monitor' },
    { name: 'application-name', content: 'AFIP Monitor' },
    { name: 'mobile-web-app-capable', content: 'yes' }
  ];

  meta.forEach(({ name, content }) => {
    const element = document.createElement('meta');
    element.name = name;
    element.content = content;
    document.head.appendChild(element);
  });

  // Agregar link para manifest
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = '/manifest.json';
  document.head.appendChild(manifestLink);

  // Agregar favicon
  const faviconLink = document.createElement('link');
  faviconLink.rel = 'icon';
  faviconLink.type = 'image/svg+xml';
  faviconLink.href = '/favicon.svg';
  document.head.appendChild(faviconLink);
};

// Configurar viewport para mobile-first
const configureViewport = () => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  }
};

// Detectar modo de visualización (PWA/Browser)
const detectDisplayMode = () => {
  const displayModes = {
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    fullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
    minimal: window.matchMedia('(display-mode: minimal-ui)').matches,
    browser: window.matchMedia('(display-mode: browser)').matches
  };

  const currentMode = Object.entries(displayModes)
    .find(([_, matches]) => matches)?.[0] || 'browser';

  document.documentElement.setAttribute('data-display-mode', currentMode);

  return currentMode;
};

// Manejar cambios de conectividad
const setupConnectivityHandling = () => {
  const updateOnlineStatus = () => {
    document.documentElement.setAttribute('data-online', navigator.onLine);

    if (!navigator.onLine) {
      console.warn('Aplicación en modo offline');
      // Mostrar mensaje de estado offline
    } else {
      console.info('Aplicación reconectada');
      // Ocultar mensaje de estado offline y sincronizar datos
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Estado inicial
  updateOnlineStatus();
};

// Performance monitoring básico
const setupPerformanceMonitoring = () => {
  if ('performance' in window) {
    // Medir tiempo de carga
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;

        console.log(`Tiempo de carga: ${loadTime.toFixed(2)}ms`);

        // En producción, enviar métricas a sistema de análisis
        if (config.environment === 'production') {
          // Implementar envío de métricas
        }
      }, 0);
    });

    // Observar Web Vitals básicos
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            console.log(`${entry.entryType}:`, entry);
          });
        });

        observer.observe({ entryTypes: ['measure', 'mark'] });
      } catch (error) {
        console.warn('Error configurando PerformanceObserver:', error);
      }
    }
  }
};

// Inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    addPWAMetadata();
    configureViewport();
    detectDisplayMode();
    setupConnectivityHandling();
    setupPerformanceMonitoring();
    initializeApp();
  });
} else {
  // DOM ya está listo
  addPWAMetadata();
  configureViewport();
  detectDisplayMode();
  setupConnectivityHandling();
  setupPerformanceMonitoring();
  initializeApp();
}

// Exportar configuración global para uso en otros módulos
window.AFIP_MONITOR_CONFIG = config;