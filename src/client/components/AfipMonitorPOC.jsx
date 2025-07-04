import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dashboard } from './Dashboard.jsx';
import { AlertsView } from './AlertsView.jsx';
import { ComplianceView } from './ComplianceView.jsx';
import { SettingsView } from './SettingsView.jsx';
import GroqChatComponent from './GroqChatComponent.jsx';
import { Header } from './common/Header.jsx';
import { useAlerts } from '../hooks/useAlerts.js';
import { useCompliance } from '../hooks/useCompliance.js';
import { useMonitoring } from '../hooks/useMonitoring.js';
import { MCPClient } from '../services/mcp-client.js';

const VIEWS = {
  DASHBOARD: 'dashboard',
  ALERTS: 'alerts',
  COMPLIANCE: 'compliance',
  GROQ_CHAT: 'groq_chat', // Nueva vista
  SETTINGS: 'settings'
};

const VIEW_TITLES = {
  [VIEWS.DASHBOARD]: 'Dashboard',
  [VIEWS.ALERTS]: 'Alertas',
  [VIEWS.COMPLIANCE]: 'Compliance',
  [VIEWS.GROQ_CHAT]: 'IA Consultant',
  [VIEWS.SETTINGS]: 'Configuración'
};

const VIEW_ICONS = {
  [VIEWS.DASHBOARD]: '📊',
  [VIEWS.ALERTS]: '🚨',
  [VIEWS.COMPLIANCE]: '✅',
  [VIEWS.GROQ_CHAT]: '🤖',
  [VIEWS.SETTINGS]: '⚙️'
};

export const AfipMonitorPOC = ({ config }) => {
  // Estado principal de la aplicación
  const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [mcpClient, setMcpClient] = useState(null);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [mcpToolSuggestions, setMcpToolSuggestions] = useState([]);

  // Estados de configuración
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: config.refreshInterval,
    enableNotifications: config.enableNotifications,
    darkMode: false,
    compactView: false,
    selectedCuit: localStorage.getItem('selectedCuit') || '',
    alertFilters: {
      severity: ['high', 'medium', 'low'],
      status: ['active'],
      dateRange: 7
    },
    groqEnabled: true, // Nueva configuración
    groqModel: 'llama-3.1-70b-versatile',
    autoMcpSuggestions: true
  });

  // Hooks personalizados existentes
  const {
    alerts,
    alertStats,
    isLoading: isLoadingAlerts,
    error: alertsError,
    refreshAlerts,
    acknowledgeAlert,
    resolveAlert
  } = useAlerts(config.apiBaseUrl, settings.alertFilters);

  const {
    complianceData,
    complianceHistory,
    isLoading: isLoadingCompliance,
    error: complianceError,
    refreshCompliance,
    runComplianceCheck
  } = useCompliance(config.apiBaseUrl, settings.selectedCuit);

  const {
    monitoringData,
    systemHealth,
    isLoading: isLoadingMonitoring,
    error: monitoringError,
    refreshMonitoring
  } = useMonitoring(config.apiBaseUrl);

  // Inicialización de servicios
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);

        // Inicializar MCP Client
        const client = new MCPClient(config);
        await client.connect();
        setMcpClient(client);
        setConnectionStatus('connected');

        // Cargar datos iniciales
        await Promise.all([
          refreshAlerts(),
          refreshCompliance(),
          refreshMonitoring()
        ]);

        setError(null);
      } catch (error) {
        console.error('Error inicializando aplicación:', error);
        setError(error.message);
        setConnectionStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [config, refreshAlerts, refreshCompliance, refreshMonitoring]);

  // Manejar sugerencias de herramientas MCP desde Groq
  const handleMCPToolSuggestion = useCallback((suggestions) => {
    if (!settings.autoMcpSuggestions) return;

    setMcpToolSuggestions(prev => {
      const newSuggestions = suggestions.filter(s => !prev.includes(s));
      if (newSuggestions.length > 0) {
        addNotification(
          `🤖 IA sugiere usar: ${newSuggestions.join(', ')}`,
          'info'
        );
      }
      return [...new Set([...prev, ...suggestions])];
    });
  }, [settings.autoMcpSuggestions]);

  // Función para agregar notificaciones
  const addNotification = useCallback((message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date(),
      autoHide: type !== 'error'
    };

    setNotifications(prev => [...prev, notification]);

    if (notification.autoHide) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    }

    // Notification API si está habilitada
    if (settings.enableNotifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('AFIP Monitor', {
          body: message,
          icon: '/icons/icon-192.png',
          tag: 'afip-monitor'
        });
      }
    }
  }, [settings.enableNotifications]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Funciones de actualización de datos
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        refreshAlerts(),
        refreshCompliance(),
        refreshMonitoring()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
      addNotification('Error actualizando datos', 'error');
    }
  }, [refreshAlerts, refreshCompliance, refreshMonitoring, addNotification]);

  // Manejo de cambios de configuración
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };

      // Guardar configuración en localStorage
      localStorage.setItem('afipMonitorSettings', JSON.stringify(updated));

      // Guardar CUIT seleccionado
      if (updated.selectedCuit !== prev.selectedCuit) {
        localStorage.setItem('selectedCuit', updated.selectedCuit);
      }

      return updated;
    });
  }, []);

  // Cargar configuración desde localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('afipMonitorSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('Error cargando configuración:', error);
    }
  }, []);

  // Aplicar tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-compact', settings.compactView ? 'true' : 'false');
  }, [settings.darkMode, settings.compactView]);

  // Funciones de acción
  const handleAlertAction = useCallback(async (alertId, action, data = {}) => {
    try {
      switch (action) {
        case 'acknowledge':
          await acknowledgeAlert(alertId);
          addNotification('Alerta confirmada', 'success');
          break;
        case 'resolve':
          await resolveAlert(alertId, data.reason);
          addNotification('Alerta resuelta', 'success');
          break;
        default:
          throw new Error(`Acción desconocida: ${action}`);
      }
    } catch (error) {
      console.error('Error en acción de alerta:', error);
      addNotification(`Error: ${error.message}`, 'error');
    }
  }, [acknowledgeAlert, resolveAlert, addNotification]);

  const handleComplianceCheck = useCallback(async (cuit, options = {}) => {
    try {
      if (!cuit) {
        throw new Error('CUIT es requerido');
      }

      addNotification('Iniciando verificación de compliance...', 'info');
      const result = await runComplianceCheck(cuit, options);

      if (result.success) {
        addNotification(`Compliance verificado - Score: ${result.data.score}%`, 'success');
      } else {
        addNotification(`Error en verificación: ${result.error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error en verificación de compliance:', error);
      addNotification(`Error: ${error.message}`, 'error');
    }
  }, [runComplianceCheck, addNotification]);

  // Datos computados
  const dashboardData = useMemo(() => ({
    alerts: {
      active: alerts.filter(a => a.status === 'active').length,
      high: alerts.filter(a => a.severity === 'high').length,
      today: alerts.filter(a => {
        const today = new Date().toDateString();
        return new Date(a.created_at).toDateString() === today;
      }).length
    },
    compliance: {
      score: complianceData?.score || 0,
      status: complianceData?.overallStatus || 'unknown',
      lastCheck: complianceData?.timestamp || null
    },
    system: {
      status: systemHealth?.healthy ? 'healthy' : 'degraded',
      uptime: systemHealth?.uptime || 0,
      services: systemHealth?.services || {}
    },
    groq: {
      enabled: settings.groqEnabled,
      suggestions: mcpToolSuggestions.length
    }
  }), [alerts, complianceData, systemHealth, settings.groqEnabled, mcpToolSuggestions]);

  // Renderizado de loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Iniciando AFIP Monitor MCP
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Conectando servicios y cargando datos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Notificaciones */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.slice(-3).map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg border max-w-sm ${notification.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : notification.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm">{notification.message}</p>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        connectionStatus={connectionStatus}
        settings={settings}
        onSettingsChange={updateSettings}
        dashboardData={dashboardData}
        views={VIEWS}
        viewTitles={VIEW_TITLES}
        viewIcons={VIEW_ICONS}
      />

      {/* Main Content */}
      <main className="pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h3 className="text-red-800 dark:text-red-200 font-medium">Error de Conexión</h3>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
              <button
                onClick={refreshData}
                className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* MCP Tool Suggestions */}
          {mcpToolSuggestions.length > 0 && (
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <h3 className="text-purple-800 dark:text-purple-200 font-medium flex items-center gap-2">
                🤖 Sugerencias de IA
              </h3>
              <p className="text-purple-600 dark:text-purple-300 text-sm mt-1">
                La IA sugiere usar estas herramientas MCP: {mcpToolSuggestions.join(', ')}
              </p>
              <button
                onClick={() => setMcpToolSuggestions([])}
                className="mt-2 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
              >
                Entendido
              </button>
            </div>
          )}

          {/* Título de vista actual */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl">{VIEW_ICONS[currentView]}</span>
              {VIEW_TITLES[currentView]}
            </h1>
          </div>

          {/* Renderizado de vistas */}
          {currentView === VIEWS.DASHBOARD && (
            <Dashboard
              data={dashboardData}
              alerts={alerts.slice(0, 5)}
              complianceData={complianceData}
              systemHealth={systemHealth}
              isLoading={isLoadingAlerts || isLoadingCompliance || isLoadingMonitoring}
              onRefresh={refreshData}
              onAlertAction={handleAlertAction}
              onComplianceCheck={handleComplianceCheck}
              settings={settings}
            />
          )}

          {currentView === VIEWS.ALERTS && (
            <AlertsView
              alerts={alerts}
              alertStats={alertStats}
              isLoading={isLoadingAlerts}
              onRefresh={refreshAlerts}
              onAlertAction={handleAlertAction}
              filters={settings.alertFilters}
              onFiltersChange={(filters) => updateSettings({ alertFilters: filters })}
              settings={settings}
            />
          )}

          {currentView === VIEWS.COMPLIANCE && (
            <ComplianceView
              complianceData={complianceData}
              complianceHistory={complianceHistory}
              isLoading={isLoadingCompliance}
              onRefresh={refreshCompliance}
              onRunCheck={handleComplianceCheck}
              selectedCuit={settings.selectedCuit}
              onCuitChange={(cuit) => updateSettings({ selectedCuit: cuit })}
              settings={settings}
            />
          )}

          {/* Nueva vista de Groq Chat */}
          {currentView === VIEWS.GROQ_CHAT && (
            <GroqChatComponent
              config={config}
              selectedCuit={settings.selectedCuit}
              onMCPToolSuggestion={handleMCPToolSuggestion}
            />
          )}

          {currentView === VIEWS.SETTINGS && (
            <SettingsView
              settings={settings}
              onSettingsChange={updateSettings}
              connectionStatus={connectionStatus}
              systemHealth={systemHealth}
              onTestConnection={() => mcpClient?.testConnection()}
              onClearCache={() => {
                localStorage.removeItem('afipMonitorSettings');
                localStorage.removeItem('selectedCuit');
                addNotification('Cache limpiado', 'success');
              }}
              onExportData={() => {
                addNotification('Función en desarrollo', 'info');
              }}
            />
          )}
        </div>
      </main>

      {/* Status bar inferior (solo en mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            <span className="text-gray-600 dark:text-gray-400">
              {connectionStatus === 'connected' ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {settings.groqEnabled && (
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                🤖 Groq AI
              </span>
            )}
            <span className="text-gray-500">
              {alerts.filter(a => a.status === 'active').length} alertas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};