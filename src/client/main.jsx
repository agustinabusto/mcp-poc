// src/client/main.jsx - Versión actualizada con OCR
import React from 'react';
import ReactDOM from 'react-dom/client';
import AfipMonitorWithOCR from './components/AfipMonitorWithOCR.jsx';
import './index.css';

// Configuración de la aplicación
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',

  // Configuraciones específicas para OCR
  ocr: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    confidenceThreshold: 0.8,
    processingTimeout: 30000 // 30 segundos
  },

  // Configuraciones para funcionalidades avanzadas
  features: {
    ocrEnabled: true,
    bankReconciliationEnabled: true,
    transactionCategorizationEnabled: true,
    aiAssistantEnabled: true,
    realtimeUpdatesEnabled: true
  },

  // Configuración de desarrollo/producción
  debug: import.meta.env.MODE === 'development'
};

// Configuración de logging mejorada
const logConfig = {
  level: config.debug ? 'debug' : 'info',
  prefix: '🚀 AFIP Monitor MCP + OCR'
};

console.log(`${logConfig.prefix} - Iniciando aplicación...`);
console.log('📡 API Base URL:', config.apiBaseUrl);
console.log('🔌 WebSocket URL:', config.wsUrl);
console.log('🎯 Modo:', import.meta.env.MODE);
console.log('⚙️  Características habilitadas:', config.features);

if (config.debug) {
  console.log('🔧 Configuración completa:', config);
}

// Validaciones de configuración
const validateConfig = () => {
  const errors = [];

  if (!config.apiBaseUrl) {
    errors.push('API Base URL no configurada');
  }

  if (!config.wsUrl) {
    errors.push('WebSocket URL no configurada');
  }

  if (config.ocr.maxFileSize <= 0) {
    errors.push('Tamaño máximo de archivo OCR inválido');
  }

  if (errors.length > 0) {
    console.error('❌ Errores de configuración:', errors);
    throw new Error('Configuración inválida: ' + errors.join(', '));
  }

  console.log('✅ Configuración validada correctamente');
};

// Función para verificar compatibilidad del navegador
const checkBrowserCompatibility = () => {
  const features = {
    fetch: typeof fetch !== 'undefined',
    websocket: typeof WebSocket !== 'undefined',
    fileAPI: typeof File !== 'undefined' && typeof FileReader !== 'undefined',
    formData: typeof FormData !== 'undefined',
    dragAndDrop: 'draggable' in document.createElement('div')
  };

  const unsupported = Object.entries(features)
    .filter(([_, supported]) => !supported)
    .map(([feature]) => feature);

  if (unsupported.length > 0) {
    console.warn('⚠️  Características no soportadas por el navegador:', unsupported);

    // Mostrar mensaje de advertencia para características críticas
    const critical = unsupported.filter(f => ['fetch', 'websocket', 'fileAPI'].includes(f));
    if (critical.length > 0) {
      alert(`Tu navegador no soporta características críticas: ${critical.join(', ')}. Por favor actualiza tu navegador.`);
    }
  } else {
    console.log('✅ Navegador compatible con todas las características');
  }

  return features;
};

// Función para configurar interceptores globales de errores
const setupGlobalErrorHandling = () => {
  // Manejar errores no capturados
  window.addEventListener('error', (event) => {
    console.error('❌ Error global:', event.error);

    // En desarrollo, mostrar detalles del error
    if (config.debug) {
      console.error('Detalles del error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    }
  });

  // Manejar promesas rechazadas no capturadas
  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada no capturada:', event.reason);

    if (config.debug) {
      console.error('Detalles de la promesa rechazada:', event);
    }
  });

  console.log('✅ Manejo global de errores configurado');
};

// Función principal de inicialización
const initializeApp = async () => {
  try {
    // Validar configuración
    validateConfig();

    // Verificar compatibilidad del navegador
    const browserFeatures = checkBrowserCompatibility();

    // Configurar manejo de errores
    setupGlobalErrorHandling();

    // Configurar variables globales para debugging (solo en desarrollo)
    if (config.debug) {
      window.__AFIP_MONITOR_CONFIG__ = config;
      window.__BROWSER_FEATURES__ = browserFeatures;
      console.log('🔧 Variables de debug disponibles:', {
        config: '__AFIP_MONITOR_CONFIG__',
        features: '__BROWSER_FEATURES__'
      });
    }

    // Verificar conectividad inicial
    console.log('🔍 Verificando conectividad con el servidor...');

    try {
      const healthResponse = await fetch(`${config.apiBaseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Servidor disponible:', healthData);
      } else {
        console.warn('⚠️  Servidor responde pero con error:', healthResponse.status);
      }
    } catch (healthError) {
      console.warn('⚠️  No se pudo verificar la salud del servidor:', healthError.message);
      console.log('📱 La aplicación funcionará en modo offline hasta que se establezca conexión');
    }

    console.log('🚀 Inicializando componente React...');

    // Renderizar aplicación
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <AfipMonitorWithOCR config={config} />
      </React.StrictMode>
    );

    console.log('✅ Aplicación AFIP Monitor MCP + OCR iniciada exitosamente');

  } catch (error) {
    console.error('❌ Error fatal durante la inicialización:', error);

    // Mostrar mensaje de error en el DOM
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        ">
          <div style="
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 2rem;
            max-width: 500px;
            border: 1px solid rgba(255, 255, 255, 0.2);
          ">
            <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #ff6b6b;">
              ⚠️ Error de Inicialización
            </h1>
            <p style="margin-bottom: 1rem; opacity: 0.9;">
              No se pudo inicializar la aplicación AFIP Monitor MCP + OCR
            </p>
            <p style="
              font-family: monospace;
              background: rgba(0, 0, 0, 0.3);
              padding: 1rem;
              border-radius: 8px;
              margin-bottom: 1rem;
              font-size: 0.9rem;
            ">
              ${error.message}
            </p>
            <button onclick="window.location.reload()" style="
              background: #4dabf7;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 8px;
              cursor: pointer;
              font-size: 1rem;
              transition: background 0.2s;
            " onmouseover="this.style.background='#339af0'" onmouseout="this.style.background='#4dabf7'">
              🔄 Reintentar
            </button>
            ${config.debug ? `
              <details style="margin-top: 1rem; text-align: left;">
                <summary style="cursor: pointer; margin-bottom: 0.5rem;">Detalles técnicos</summary>
                <pre style="
                  background: rgba(0, 0, 0, 0.3);
                  padding: 1rem;
                  border-radius: 8px;
                  font-size: 0.8rem;
                  overflow: auto;
                  max-height: 200px;
                ">${JSON.stringify({
        config,
        error: error.stack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }, null, 2)}</pre>
              </details>
            ` : ''}
          </div>
        </div>
      `;
    }
  }
};

// Esperar a que el DOM esté listo antes de inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Exportar configuración para uso en otros módulos (opcional)
export { config };