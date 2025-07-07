// src/client/components/AfipMonitorEnhanced.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Activity, AlertTriangle, CheckCircle, Clock, Search as SearchIcon } from "lucide-react";
import ComplianceDetails from "./ComplianceDetails.jsx";
import SystemMetrics from "./SystemMetrics.jsx";
import AlertsPanel from "./AlertsPanel.jsx";
import TaxpayerInfo from "./TaxpayerInfo.jsx";
import GroqChatComponent from "./GroqChatComponent.jsx";
import { Header } from "./common/Header.jsx";
import { useAlerts } from "../hooks/useAlerts.js";
import { useCompliance } from "../hooks/useCompliance.js";
import { useMonitoring } from "../hooks/useMonitoring.js";
import { useSearch } from "../hooks/useSearch.js";
import { searchService } from "../services/search-service.js";
import { getMCPClient } from "../services/mcp-client.js";

const VIEWS = {
    DASHBOARD: "dashboard",
    TAXPAYER: "taxpayer",
    COMPLIANCE: "compliance",
    ALERTS: "alerts",
    METRICS: "metrics",
    GROQ_CHAT: "groq_chat",
};

const AfipMonitorEnhanced = () => {
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
        refreshAlerts,
        clearErrors,
        loading: monitoringLoading
    } = useMonitoring();

    // Cliente MCP
    const [mcpClient, setMcpClient] = useState(null);

    // Hook de búsqueda mejorado
    const handleTaxpayerQuery = useCallback(async (cuit) => {
        try {
            setLoading(true);

            // Mostrar loading en la vista de contribuyente
            if (currentView !== VIEWS.TAXPAYER) {
                setCurrentView(VIEWS.TAXPAYER);
            }

            console.log(`🔍 Iniciando búsqueda de CUIT: ${cuit}`);

            // Usar el servicio de búsqueda mejorado
            const result = await searchService.searchTaxpayer(cuit, {
                includeCompliance: true,
                timeout: 15000,
                retries: 2
            });

            // Actualizar estado
            setTaxpayerData(result);

            // Crear alerta de éxito
            addAlert(createAfipAlert(
                'search_success',
                'success',
                `Contribuyente encontrado: ${result.displayName || result.razonSocial}`,
                {
                    cuit: result.cuit,
                    riskLevel: result.riskLevel,
                    timestamp: new Date().toISOString()
                }
            ));

            // Ejecutar compliance check automático si hay datos de compliance
            if (result.compliance) {
                setComplianceData(result.compliance);

                // Si hay problemas de compliance, crear alerta
                if (result.compliance.score < 70) {
                    addAlert(createAfipAlert(
                        'compliance_warning',
                        'warning',
                        `Problemas de compliance detectados (Score: ${result.compliance.score})`,
                        {
                            cuit: result.cuit,
                            score: result.compliance.score,
                            issues: result.compliance.issues || []
                        }
                    ));
                }
            }

            return result;

        } catch (error) {
            console.error('Error en búsqueda:', error);

            // Crear alerta de error
            addAlert(createAfipAlert(
                'search_error',
                'error',
                `Error buscando CUIT ${cuit}: ${error.message}`,
                {
                    cuit,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            ));

            // Limpiar datos anteriores
            setTaxpayerData(null);
            setComplianceData(null);

            throw error;
        } finally {
            setLoading(false);
        }
    }, [currentView, addAlert, createAfipAlert]);

    const {
        searchHistory,
        isSearching,
        searchError,
        knownCuits,
        executeSearch,
        validateCuit,
        getSuggestions,
        clearHistory,
        clearSearchError,
        getSearchStats
    } = useSearch(handleTaxpayerQuery);

    // Inicialización de la aplicación
    const initializeApp = async () => {
        console.log("🚀 Iniciando aplicación AFIP Monitor Enhanced...");
        setLoading(true);
        setInitError(null);

        try {
            // Inicializar cliente MCP
            try {
                const client = await getMCPClient();
                setMcpClient(client);
                console.log("✅ Cliente MCP inicializado");
            } catch (mcpError) {
                console.warn("⚠️ MCP no disponible:", mcpError.message);
            }

            // Verificar estado del sistema
            await getSystemStatus();

            // Cargar métricas iniciales
            await getMetrics();

            // Refrescar alertas
            await refreshAlerts();

            // Cargar CUITs problemáticos para testing
            try {
                const problematicData = await searchService.getProblematicCuits();
                if (problematicData) {
                    console.log("📋 CUITs problemáticos cargados:", problematicData.ejemplos?.length || 0);
                }
            } catch (error) {
                console.warn("⚠️ No se pudieron cargar CUITs problemáticos:", error.message);
            }

            setIsInitialized(true);
            console.log("✅ Aplicación inicializada correctamente");

        } catch (error) {
            console.error("❌ Error en inicialización:", error);
            setInitError(error);
        } finally {
            setLoading(false);
        }
    };

    // Manejar compliance check manual
    const handleComplianceCheck = async (taxpayerData) => {
        if (!taxpayerData?.cuit) return;

        try {
            const result = await checkCompliance(taxpayerData.cuit);
            setComplianceData(result);
            setCurrentView(VIEWS.COMPLIANCE);

            addAlert(createAfipAlert(
                'compliance_check',
                result.score > 70 ? 'success' : 'warning',
                `Compliance check completado (Score: ${result.score})`,
                {
                    cuit: taxpayerData.cuit,
                    score: result.score
                }
            ));

        } catch (error) {
            addAlert(createAfipAlert(
                'compliance_error',
                'error',
                `Error en compliance check: ${error.message}`,
                { cuit: taxpayerData.cuit }
            ));
        }
    };

    // Refrescar alertas
    const handleRefreshAlerts = async () => {
        try {
            await refreshAlerts();
            addAlert({
                id: Date.now(),
                type: 'info',
                severity: 'low',
                message: 'Alertas actualizadas',
                timestamp: new Date().toISOString(),
                resolved: false
            });
        } catch (error) {
            console.error('Error refreshing alerts:', error);
        }
    };

    // Efecto de inicialización
    useEffect(() => {
        initializeApp();
    }, []);

    // Efecto para limpiar errores de búsqueda
    useEffect(() => {
        if (searchError) {
            const timer = setTimeout(() => {
                clearSearchError();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [searchError, clearSearchError]);

    // Mostrar error de inicialización
    if (initError) {
        return (
            <div className="min-h-screen bg-red-50 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
                    <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-red-700 mb-2">Error de Inicialización</h2>
                    <p className="text-red-600 mb-4">{initError.message}</p>
                    <div className="space-y-2">
                        <button
                            onClick={initializeApp}
                            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Reintentar
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Recargar Página
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Mostrar loading de inicialización
    if (!isInitialized) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-lg shadow-lg">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Inicializando AFIP Monitor</h2>
                    <p className="text-gray-600">Configurando servicios y conectando con el backend...</p>
                </div>
            </div>
        );
    }

    // Renderizar contenido principal
    const renderMainContent = () => {
        switch (currentView) {
            case VIEWS.TAXPAYER:
                return (
                    <div className="space-y-6">
                        {/* Información de búsqueda */}
                        {(loading || isSearching) && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    <div>
                                        <h4 className="font-medium text-blue-900">Buscando contribuyente...</h4>
                                        <p className="text-sm text-blue-700">Consultando base de datos AFIP</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Estadísticas de búsqueda */}
                        {searchHistory.length > 0 && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                        <SearchIcon className="h-4 w-4" />
                                        Estadísticas de Búsqueda
                                    </h4>
                                    <button
                                        onClick={clearHistory}
                                        className="text-sm text-red-600 hover:text-red-800"
                                    >
                                        Limpiar historial
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="text-center">
                                        <div className="font-bold text-blue-600">{getSearchStats().totalSearches}</div>
                                        <div className="text-gray-500">Búsquedas</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-green-600">{getSearchStats().categoryCounts.empresa}</div>
                                        <div className="text-gray-500">Empresas</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-purple-600">{getSearchStats().categoryCounts.persona}</div>
                                        <div className="text-gray-500">Personas</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-red-600">{getSearchStats().categoryCounts.problematico}</div>
                                        <div className="text-gray-500">Problemáticos</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Información del contribuyente */}
                        <TaxpayerInfo
                            data={taxpayerData}
                            onComplianceCheck={handleComplianceCheck}
                            loading={loading || isSearching}
                        />
                    </div>
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
                                            {alerts.length || 0}
                                        </div>
                                        <div className="text-sm text-gray-500">Alertas Activas</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">
                                            {isConnected ? '100%' : '0%'}
                                        </div>
                                        <div className="text-sm text-gray-500">Disponibilidad</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {searchHistory.length}
                                        </div>
                                        <div className="text-sm text-gray-500">Búsquedas</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-orange-600">
                                            {mcpClient ? 'MCP' : 'STD'}
                                        </div>
                                        <div className="text-sm text-gray-500">Protocolo</div>
                                    </div>
                                </div>

                                {/* Información del servicio */}
                                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-2">Servicios Activos</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <span>AFIP API</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${mcpClient ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                            <span>MCP Client</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span>Search Service</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span>Compliance Engine</span>
                                        </div>
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
                                        disabled={alertsLoading}
                                        className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                    >
                                        {alertsLoading ? 'Actualizando...' : 'Actualizar'}
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
                                                    {alert.message}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(alert.timestamp).toLocaleTimeString()}
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

                                {alerts.length > 5 && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <button
                                            onClick={() => setCurrentView(VIEWS.ALERTS)}
                                            className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Ver todas las alertas ({alerts.length})
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Panel de acceso rápido */}
                        <div className="lg:col-span-2 xl:col-span-3">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Acceso Rápido</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* CUITs de prueba */}
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-gray-700 text-sm">CUITs de Prueba</h4>
                                        {knownCuits.slice(0, 3).map((item, index) => (
                                            <button
                                                key={index}
                                                onClick={() => executeSearch(item.cuit)}
                                                className="w-full text-left p-2 rounded border border-gray-200 hover:bg-gray-50 text-sm"
                                                disabled={isSearching}
                                            >
                                                <div className="font-medium">{item.cuit}</div>
                                                <div className="text-gray-600 text-xs truncate">{item.name}</div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* CUITs problemáticos */}
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-gray-700 text-sm">Casos Problemáticos</h4>
                                        {knownCuits.filter(item => item.type === 'error').slice(0, 3).map((item, index) => (
                                            <button
                                                key={index}
                                                onClick={() => executeSearch(item.cuit)}
                                                className="w-full text-left p-2 rounded border border-red-200 hover:bg-red-50 text-sm"
                                                disabled={isSearching}
                                            >
                                                <div className="font-medium text-red-700">{item.cuit}</div>
                                                <div className="text-red-600 text-xs truncate">{item.name}</div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Acciones rápidas */}
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-gray-700 text-sm">Acciones</h4>
                                        <button
                                            onClick={() => setCurrentView(VIEWS.METRICS)}
                                            className="w-full text-left p-2 rounded border border-gray-200 hover:bg-gray-50 text-sm"
                                        >
                                            <div className="font-medium">Ver Métricas</div>
                                            <div className="text-gray-600 text-xs">Sistema y performance</div>
                                        </button>
                                        <button
                                            onClick={() => setCurrentView(VIEWS.GROQ_CHAT)}
                                            className="w-full text-left p-2 rounded border border-gray-200 hover:bg-gray-50 text-sm"
                                        >
                                            <div className="font-medium">Chat IA</div>
                                            <div className="text-gray-600 text-xs">Asistente inteligente</div>
                                        </button>
                                        <button
                                            onClick={clearHistory}
                                            className="w-full text-left p-2 rounded border border-gray-200 hover:bg-gray-50 text-sm"
                                        >
                                            <div className="font-medium">Limpiar Historial</div>
                                            <div className="text-gray-600 text-xs">Resetear búsquedas</div>
                                        </button>
                                    </div>

                                    {/* Estadísticas */}
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-gray-700 text-sm">Resumen</h4>
                                        <div className="p-2 rounded bg-blue-50 text-sm">
                                            <div className="font-medium text-blue-900">
                                                {getSearchStats().totalSearches} búsquedas realizadas
                                            </div>
                                            <div className="text-blue-700 text-xs">
                                                Última: {getSearchStats().lastSearch ?
                                                    new Date(getSearchStats().lastSearch).toLocaleString() :
                                                    'Ninguna'
                                                }
                                            </div>
                                        </div>
                                        {searchError && (
                                            <div className="p-2 rounded bg-red-50 text-sm">
                                                <div className="font-medium text-red-900">Error de Búsqueda</div>
                                                <div className="text-red-700 text-xs">{searchError}</div>
                                            </div>
                                        )}
                                    </div>
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
                onTaxpayerQuery={executeSearch}
                views={VIEWS}
                loading={loading || isSearching}
                isConnected={isConnected}
                alertCount={alerts.length}
            />

            <main className="container mx-auto px-4 py-8">
                {renderMainContent()}
            </main>

            {/* Toast de notificaciones */}
            {searchError && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        <div>
                            <div className="font-medium">Error de Búsqueda</div>
                            <div className="text-sm opacity-90">{searchError}</div>
                        </div>
                        <button
                            onClick={clearSearchError}
                            className="ml-2 text-white hover:text-gray-200"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Indicador de búsqueda global */}
            {isSearching && (
                <div className="fixed bottom-4 left-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <div>
                            <div className="font-medium">Buscando...</div>
                            <div className="text-sm opacity-90">Consultando AFIP</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AfipMonitorEnhanced;