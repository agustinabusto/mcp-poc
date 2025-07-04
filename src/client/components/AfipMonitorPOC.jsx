// src/client/components/AfipMonitorPOC.jsx - Versión corregida

import React, { useState, useEffect } from "react";
import { Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import ComplianceDetails from "./ComplianceDetails.jsx";
import SystemMetrics from "./SystemMetrics.jsx";
import AlertsPanel from "./AlertsPanel.jsx";
import TaxpayerInfo from "./TaxpayerInfo.jsx";
import GroqChatComponent from "./GroqChatComponent.jsx";
import { Header } from "./common/Header.jsx";
import { useAlerts } from "../hooks/useAlerts.js";
import { useCompliance } from "../hooks/useCompliance.js";
import { useMonitoring } from "../hooks/useMonitoring.js";
import { getMCPClient } from "../services/mcp-client.js";

const VIEWS = {
  DASHBOARD: "dashboard",
  TAXPAYER: "taxpayer",
  COMPLIANCE: "compliance",
  ALERTS: "alerts",
  METRICS: "metrics",
  GROQ_CHAT: "groq_chat",
};

const AfipMonitorPOC = () => {
  // Estados principales
  const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
  const [taxpayerData, setTaxpayerData] = useState(null);
  const [complianceData, setComplianceData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hooks personalizados
  const {
    alerts,
    addAlert,
    createAfipAlert,
    clearAll: clearAllAlerts,
    loading: alertsLoading
  } = useAlerts();

  const {
    complianceData: complianceHookData,
    checkCompliance,
    loading: complianceLoading
  } = useCompliance();

  const {
    monitoringData,
    isConnected,
    getMetrics,
    getSystemStatus,
    refreshAlerts, // ✅ Ahora está disponible
    clearErrors,
    loading: monitoringLoading
  } = useMonitoring();

  // Cliente MCP
  const [mcpClient, setMcpClient] = useState(null);

  // Inicialización de la aplicación
  const initializeApp = async () => {
    console.log("🚀 Iniciando aplicación AFIP Monitor...");
    setLoading(true);
    setInitError(null);

    try {
      // Inicializar cliente MCP
      const client = getMCPClient();
      await client.connect();
      setMcpClient(client);
      console.log("✅ Cliente MCP inicializado");

      // Obtener métricas iniciales del sistema
      try {
        await getMetrics();
        console.log("✅ Métricas iniciales obtenidas");
      } catch (metricsError) {
        console.warn("⚠️ Error obteniendo métricas:", metricsError.message);
      }

      // Refrescar alertas si la función está disponible
      if (refreshAlerts && typeof refreshAlerts === 'function') {
        try {
          await refreshAlerts();
          console.log("✅ Alertas iniciales cargadas");
        } catch (alertsError) {
          console.warn("⚠️ Error cargando alertas:", alertsError.message);
        }
      } else {
        console.warn("⚠️ refreshAlerts no está disponible aún");
      }

      // Crear alerta de bienvenida
      if (addAlert) {
        addAlert({
          type: 'success',
          title: 'Sistema Iniciado',
          message: 'AFIP Monitor MCP iniciado correctamente',
          category: 'system',
          priority: 'low'
        });
      }

      setIsInitialized(true);
      console.log("🎉 Aplicación inicializada exitosamente");

    } catch (error) {
      console.error("❌ Error inicializando aplicación:", error);
      setInitError(error);

      // Crear alerta de error
      if (addAlert) {
        addAlert({
          type: 'error',
          title: 'Error de Inicialización',
          message: `Error: ${error.message}`,
          category: 'system',
          priority: 'high'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para consultar contribuyente
  const handleTaxpayerQuery = async (cuit) => {
    if (!mcpClient) {
      console.error("Cliente MCP no disponible");
      return;
    }

    setLoading(true);
    try {
      console.log(`🔍 Consultando contribuyente: ${cuit}`);

      const result = await mcpClient.callTool('afip_get_taxpayer_info', { cuit });

      if (result && result.content && result.content[0]) {
        const data = JSON.parse(result.content[0].text);
        setTaxpayerData(data.data || data);

        // Crear alerta de consulta exitosa
        createAfipAlert('system_update', {
          message: `Información de ${cuit} obtenida exitosamente`
        });

        setCurrentView(VIEWS.TAXPAYER);
      }
    } catch (error) {
      console.error("Error consultando contribuyente:", error);
      createAfipAlert('compliance_issue', {
        description: `Error consultando CUIT ${cuit}: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para verificar compliance
  const handleComplianceCheck = async (cuit, period) => {
    if (!mcpClient) {
      console.error("Cliente MCP no disponible");
      return;
    }

    setLoading(true);
    try {
      console.log(`🔍 Verificando compliance: ${cuit}`);

      const result = await mcpClient.callTool('afip_compliance_check', {
        cuit,
        period: period || new Date().getFullYear().toString(),
        sendNotification: false
      });

      if (result && result.content && result.content[0]) {
        const data = JSON.parse(result.content[0].text);
        setComplianceData(data.data || data);

        // Crear alerta basada en el score
        const score = data.data?.score || data.score || 0;
        if (score < 60) {
          createAfipAlert('compliance_issue', {
            description: `Score de compliance bajo (${score}) para ${cuit}`
          });
        } else {
          createAfipAlert('system_update', {
            message: `Compliance verificado para ${cuit}: ${score} puntos`
          });
        }

        setCurrentView(VIEWS.COMPLIANCE);
      }
    } catch (error) {
      console.error("Error verificando compliance:", error);
      createAfipAlert('compliance_issue', {
        description: `Error verificando compliance para ${cuit}: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar actualizaciones de alertas
  const handleRefreshAlerts = async () => {
    if (refreshAlerts && typeof refreshAlerts === 'function') {
      try {
        setLoading(true);
        await refreshAlerts();
        console.log("🔄 Alertas actualizadas");
      } catch (error) {
        console.error("Error actualizando alertas:", error);
        addAlert({
          type: 'error',
          title: 'Error actualizando alertas',
          message: error.message,
          category: 'system',
          priority: 'medium'
        });
      } finally {
        setLoading(false);
      }
    } else {
      console.warn("refreshAlerts no está disponible");
    }
  };

  // Efecto de inicialización
  useEffect(() => {
    // Esperar un poco para que los hooks se monten completamente
    const timer = setTimeout(() => {
      initializeApp();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Efecto para manejar cambios en el estado de conexión
  useEffect(() => {
    if (isConnected && !alertsLoading) {
      console.log("🔌 WebSocket conectado, actualizando datos...");
      // Opcional: refrescar datos cuando se reconecte
    }
  }, [isConnected, alertsLoading]);

  // Estado de carga inicial
  if (loading && !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Inicializando AFIP Monitor...</h2>
          <p className="text-gray-500 mt-2">Conectando servicios MCP</p>
        </div>
      </div>
    );
  }

  // Estado de error de inicialización
  if (initError && !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error de Inicialización</h2>
          <p className="text-red-600 mb-4">{initError.message}</p>
          <button
            onClick={initializeApp}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Renderizar contenido principal
  const renderMainContent = () => {
    switch (currentView) {
      case VIEWS.TAXPAYER:
        return (
          <TaxpayerInfo
            data={taxpayerData}
            onComplianceCheck={handleComplianceCheck}
            loading={loading}
          />
        );

      case VIEWS.COMPLIANCE:
        return (
          <ComplianceDetails
            data={complianceData}
            loading={complianceLoading}
          />
        );

      case VIEWS.ALERTS:
        return (
          <AlertsPanel
            alerts={alerts}
            onRefresh={handleRefreshAlerts}
            onClear={clearAllAlerts}
            loading={alertsLoading}
          />
        );

      case VIEWS.METRICS:
        return (
          <SystemMetrics
            data={monitoringData}
            isConnected={isConnected}
            onRefresh={getMetrics}
            loading={monitoringLoading}
          />
        );

      case VIEWS.GROQ_CHAT:
        return <GroqChatComponent />;

      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Panel de estado del sistema */}
            <div className="lg:col-span-2 xl:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Estado del Sistema</h3>
                  <div className={`flex items-center gap-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}></div>
                    <span className="text-sm font-medium">
                      {isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                </div>

                {/* Métricas rápidas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {monitoringData.alerts?.length || 0}
                    </div>
                    <div className="text-sm text-gray-500">Alertas Activas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {monitoringData.status === 'connected' ? 'OK' : 'ERR'}
                    </div>
                    <div className="text-sm text-gray-500">Estado MCP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {monitoringData.metrics?.afip_mode || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">Modo AFIP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {monitoringData.metrics?.groq_enabled ? 'ON' : 'OFF'}
                    </div>
                    <div className="text-sm text-gray-500">IA Groq</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de alertas recientes */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Alertas Recientes</h3>
                  <button
                    onClick={handleRefreshAlerts}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? 'Actualizando...' : 'Actualizar'}
                  </button>
                </div>

                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${alert.type === 'error' ? 'bg-red-500' :
                          alert.type === 'warning' ? 'bg-yellow-500' :
                            alert.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                        }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {alert.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  ))}

                  {alerts.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">No hay alertas activas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onTaxpayerQuery={handleTaxpayerQuery}
        views={VIEWS}
        loading={loading}
        isConnected={isConnected}
        alertCount={alerts.length}
      />

      <main className="container mx-auto px-4 py-8">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default AfipMonitorPOC;