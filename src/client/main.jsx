import React from 'react';
import ReactDOM from 'react-dom/client';
import { AfipMonitorPOC } from './components/AfipMonitorPOC.jsx';
import './index.css';

// Configuración de la aplicación
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8080'
};

console.log('🚀 Iniciando AFIP Monitor MCP Client...');
console.log('📡 API Base URL:', config.apiBaseUrl);
console.log('🔌 WebSocket URL:', config.wsUrl);

// Renderizar aplicación
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AfipMonitorPOC config={config} />
  </React.StrictMode>
);