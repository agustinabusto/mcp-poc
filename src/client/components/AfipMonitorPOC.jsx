import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dashboard } from './Dashboard.jsx';
import { AlertsView } from './AlertsView.jsx';
import { ComplianceView } from './ComplianceView.jsx';
import { SettingsView } from './SettingsView.jsx';
import { Header } from './common/Header.jsx';
import { useAlerts } from '../hooks/useAlerts.js';
import { useCompliance } from '../hooks/useCompliance.js';
import { useMonitoring } from '../hooks/useMonitoring.js';
import { MCPClient } from '../services/mcp-client.js';

const VIEWS = {
  DASHBOARD: 'dashboard',
  ALERTS: 'alerts',
  COMPLIANCE: 'compliance',
  SETTINGS: 'settings'
};

const VIEW_TITLES = {
  [VIEWS.DASHBOARD]: 'Dashboard',
  [VIEWS.ALERTS]: 'Alertas',
  [VIEWS.COMPLIANCE]: 'Compliance',
  [VIEWS.SETTINGS]: 'Configuración'
};

export const AfipMonitorPOC = ({ config }) => {
  // Estado principal de la aplicación
  const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [mcpClient, setMcpClient] = useState(null);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

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
      types: []
    }
  });

  // Hooks personalizados para gestión de datos
  const {
    alerts,
    alertStats,
    isLoadingAlerts,
    refreshAlerts,
    acknowledgeAlert,
    resolveAlert,
    createAlert
  } = useAlerts(mcpClient, settings.alertFilters);

  const {
    complianceData,
    complianceHistory,
    isLoadingCompliance,
    refreshCompliance,
    runComplianceCheck
  } = useCompliance(mcpClient, settings.selectedCuit);

  const {
    monitoringStatus,
    systemHealth,
    isLoadingMonitoring,
    refreshMonitoring
  } = useMonitoring(mcpClient);

  // Inicialización del cliente MCP
  useEffect(() => {
    const initializeMCPClient = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const client = new MCPClient({
          apiBaseUrl: config.apiBaseUrl,
          wsUrl: config.wsUrl,
          onConnectionChange: (status) => {
            setConnectionStatus(status);
            if (status === 'connected') {
              addNotification('Conectado al servidor AFIP Monitor', 'success');
            } else if (status === 'disconnected') {
              addNotification('Desconectado del servidor', 'warning');
            }
          },
          onError: (error) => {
            console.error('MCP Client error:', error);
            setError(error);
            addNotification(`Error de conexión: ${error.message}`, 'error');
          },
          onAlert: (alert) => {
            addNotification(`Nueva alerta: ${alert.title}`, 'info');
            // El hook useAlerts se encargará de actualizar la lista
          }
        });

        await client.connect();
        setMcpClient(client);
        setConnectionStatus('connected');

      } catch (error) {
        console.error('Error inicializando MCP Client:', error);
        setError(error);
        addNotification('Error conectando con el servidor', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeMCPClient();

    return () => {
      if (mcpClient) {
        mcpClient.disconnect();
      }
    };
  }, [config.apiBaseUrl, config.wsUrl]);

  // Auto-refresh cuando esté habilitado
  useEffect(() => {
    if (!settings.autoRefresh || !mcpClient || connectionStatus !== 'connected') {
      return;
    }

    const interval = setInterval(() => {
      refreshData();
    }, settings.refreshInterval);

    return () => clearInterval(interval);
  }, [settings.autoRefresh, settings.refreshInterval, mcpClient, connectionStatus]);

  // Gestión de notificaciones
  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date(),
      duration
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove notification
    setTimeout(() => {
      removeNotification(notification.id);
    }, duration);

    // Notificación del navegador si está habilitada
    if (settings.enableNotifications && type === 'error' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('AFIP Monitor', {
        body: message,
        icon: '/favicon.svg',
        tag: 'afip-monitor'
      });
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
      uptime: monitoringStatus?.server?.uptime || 0,
      connected: connectionStatus === 'connected'
    }
  }), [alerts, complianceData, systemHealth, monitoringStatus, connectionStatus]);

  // Renderizado condicional basado en estado
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center text-white max-w-md">
          <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Inicializando AFIP Monitor</h2>
          <p className="text-white/80">Conectando con el servidor...</p>
        </div>
      </div>
    );
  }

  if (error && !mcpClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 via-red-600 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center text-white max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Error de Conexión</h2>
          <p className="text-white/80 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Renderizado principal
  return (
    <div className={`min-h-screen bg-gray-50 transition-colors duration-200 ${settings.darkMode ? 'dark bg-gray-900' : ''
      }`}>
      {/* Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        connectionStatus={connectionStatus}
        alertCount={dashboardData.alerts.active}
        complianceScore={dashboardData.compliance.score}
        onRefresh={refreshData}
        isRefreshing={isLoadingAlerts || isLoadingCompliance || isLoadingMonitoring}
        settings={settings}
        onSettingsChange={updateSettings}
      />

      {/* Notificaciones */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`
              max-w-sm p-4 rounded-lg shadow-lg backdrop-blur-sm border
              transition-all duration-300 transform
              ${notification.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : ''}
              ${notification.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' : ''}
              ${notification.type === 'warning' ? 'bg-yellow-500/90 border-yellow-400 text-white' : ''}
              ${notification.type === 'info' ? 'bg-blue-500/90 border-blue-400 text-white' : ''}
            `}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium flex-1">{notification.message}</p>
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-2 text-white/80 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="text-xs opacity-75 mt-1">
              {notification.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Contenido principal */}
      <main className="pt-16">
        <div className="container mx-auto px-4 py-6">
          {/* Título de la vista */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              {currentView === VIEWS.DASHBOARD && '📊'}
              {currentView === VIEWS.ALERTS && '🚨'}
              {currentView === VIEWS.COMPLIANCE && '✅'}
              {currentView === VIEWS.SETTINGS && '⚙️'}
              {VIEW_TITLES[currentView]}
            </h1>

            {/* Breadcrumb de navegación */}
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              AFIP Monitor POC &gt; {VIEW_TITLES[currentView]}
            </div>
          </div>

          {/* Renderizado de vistas */}
          {currentView === VIEWS.DASHBOARD && (
            <Dashboard
              data={dashboardData}
              alerts={alerts.slice(0, 5)} // Últimas 5 alertas
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
                // Implementar exportación de datos
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

          <div className="text-gray-600 dark:text-gray-400">
            {dashboardData.alerts.active} alertas activas
          </div>

          <div className="text-gray-600 dark:text-gray-400">
            Score: {dashboardData.compliance.score}%
          </div>
        </div>
      </div>

      {/* Espaciado inferior para mobile status bar */}
      <div className="md:hidden h-12"></div>
    </div>
  );
};