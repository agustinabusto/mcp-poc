// src/client/components/AfipMonitorEnhanced.jsx - VERSIÓN COMPLETA COMPATIBLE
import React, { useState, useEffect, useCallback } from "react";
import { Activity, AlertTriangle, CheckCircle, Clock, Search as SearchIcon } from "lucide-react";

// Importar componentes existentes
import ComplianceDetails from "./ComplianceDetails.jsx";
import SystemMetrics from "./SystemMetrics.jsx";
import AlertsPanel from "./AlertsPanel.jsx";
import TaxpayerInfo from "./TaxpayerInfo.jsx";
import GroqChatComponent from "./GroqChatComponent.jsx";
import { Header } from "./common/Header.jsx";

// Importar hooks existentes
import { useAlerts } from "../hooks/useAlerts.js";
import { useCompliance } from "../hooks/useCompliance.js";
import { useMonitoring } from "../hooks/useMonitoring.js";
import { useSearch } from "../hooks/useSearch.js";

// Importar servicios existentes
import { searchService } from "../services/search-service.js";
import { getMCPClient } from "../services/mcp-client.js";

// ========================================
// IMPORTAR NUEVOS COMPONENTES DE FACTURAS
// ========================================
import InvoiceIntake from "./invoices/InvoiceIntake.jsx";
import InvoiceProcessing from "./invoices/InvoiceProcessing.jsx";
import InvoiceValidation from "./invoices/InvoiceValidation.jsx";
import InvoiceIntegration from "./invoices/InvoiceIntegration.jsx";

// ========================================
// IMPORTAR COMPONENTES OCR
// ========================================
import {
    OCRProcessingView,
    BankReconciliationView,
    TransactionCategorizationView,
    OCRMetricsView
} from "./ocr/OCRViews.jsx";

// Constantes de vistas - COMPATIBLE CON HEADER
const VIEWS = {
    DASHBOARD: "dashboard",
    TAXPAYER: "taxpayer",
    COMPLIANCE: "compliance",
    ALERTS: "alerts",
    METRICS: "metrics",
    GROQ_CHAT: "groq_chat",

    // Nuevas vistas de Ingreso de Facturas - ARCA
    INVOICE_INTAKE: "invoice_intake",
    INVOICE_PROCESSING: "invoice_processing",
    INVOICE_VALIDATION: "invoice_validation",
    INVOICE_INTEGRATION: "invoice_integration",

    // Vistas OCR existentes
    OCR_PROCESSING: "ocr_processing",
    BANK_RECONCILIATION: "bank_reconciliation",
    TRANSACTION_CATEGORIZATION: "transaction_categorization",
    OCR_METRICS: "ocr_metrics"
};

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
const AfipMonitorEnhanced = ({ config = {} }) => {
    console.log('🚀 AfipMonitorEnhanced iniciando con config:', config);

    // Estados principales
    const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
    const [taxpayerData, setTaxpayerData] = useState(null);
    const [complianceData, setComplianceData] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [initError, setInitError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Estados específicos para ARCA y facturas
    const [invoiceStats, setInvoiceStats] = useState({
        intakeCount: 0,
        processingCount: 0,
        validationCount: 0,
        arcaCount: 0,
        totalPending: 0
    });

    // Estados para OCR (existentes)
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState('test-client');
    const [processedDocuments, setProcessedDocuments] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState(null);

    // ========================================
    // HOOKS PERSONALIZADOS (EXISTENTES)
    // ========================================
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

    const {
        searchResults,
        performSearch,
        clearResults,
        isSearching
    } = useSearch();

    // Cliente MCP
    const [mcpClient, setMcpClient] = useState(null);

    // ========================================
    // FUNCIONES DE INICIALIZACIÓN
    // ========================================
    const initializeApp = useCallback(async () => {
        console.log("🚀 Iniciando aplicación AFIP Monitor Enhanced...");
        setLoading(true);
        setInitError(null);

        try {
            // Inicializar cliente MCP
            console.log("📡 Conectando con servicios MCP...");
            const client = await getMCPClient();
            setMcpClient(client);
            console.log("✅ Cliente MCP inicializado");

            // Cargar estadísticas iniciales de facturas
            await loadInvoiceStats();
            console.log("✅ Estadísticas de facturas cargadas");

            // Obtener métricas del sistema
            await getMetrics();
            console.log("✅ Métricas del sistema obtenidas");

            setIsInitialized(true);
            console.log("✅ Aplicación inicializada correctamente");

            // Crear alerta de éxito
            addAlert({
                type: 'success',
                title: 'Sistema Iniciado',
                message: 'AFIP Monitor Enhanced está funcionando correctamente',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error("❌ Error en inicialización:", error);
            setInitError(error.message);

            // Crear alerta de error
            addAlert({
                type: 'error',
                title: 'Error de Inicialización',
                message: `No se pudo inicializar la aplicación: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        } finally {
            setLoading(false);
        }
    }, [addAlert, getMetrics]);

    // ========================================
    // FUNCIONES DE ESTADÍSTICAS ARCA
    // ========================================
    const loadInvoiceStats = useCallback(async () => {
        try {
            console.log("📊 Cargando estadísticas de facturas...");

            // Simular carga de estadísticas reales de ARCA
            // En producción, aquí harías llamadas reales a las APIs de ARCA
            const mockStats = {
                intakeCount: Math.floor(Math.random() * 15) + 5,
                processingCount: Math.floor(Math.random() * 8) + 2,
                validationCount: Math.floor(Math.random() * 12) + 3,
                arcaCount: Math.floor(Math.random() * 20) + 10,
                totalPending: 0
            };

            mockStats.totalPending = mockStats.intakeCount + mockStats.processingCount + mockStats.validationCount;

            setInvoiceStats(mockStats);
            console.log("✅ Estadísticas de facturas actualizadas:", mockStats);

        } catch (error) {
            console.error("❌ Error cargando estadísticas de facturas:", error);

            // Usar estadísticas por defecto en caso de error
            setInvoiceStats({
                intakeCount: 0,
                processingCount: 0,
                validationCount: 0,
                arcaCount: 0,
                totalPending: 0
            });
        }
    }, []);

    // ========================================
    // FUNCIONES DE MANEJO DE VISTAS
    // ========================================
    const handleViewChange = useCallback((newView) => {
        console.log(`🔄 Cambiando vista de "${currentView}" a "${newView}"`);

        // Validar que la vista existe
        const validViews = Object.values(VIEWS);
        if (!validViews.includes(newView)) {
            console.error(`❌ Vista inválida: ${newView}. Vistas válidas:`, validViews);
            return;
        }

        setCurrentView(newView);

        // Limpiar datos específicos según la vista
        if (newView !== VIEWS.TAXPAYER) {
            setTaxpayerData(null);
        }
        if (newView !== VIEWS.COMPLIANCE) {
            setComplianceData(null);
        }

        // Actualizar estadísticas si es necesario
        if (newView.startsWith('invoice_') || newView.includes('arca')) {
            console.log("🔄 Actualizando estadísticas de facturas...");
            loadInvoiceStats();
        }

        // Crear log de navegación
        if (config?.debug) {
            console.log(`📍 Navegación: ${currentView} → ${newView}`);
        }
    }, [currentView, loadInvoiceStats, config?.debug]);

    // ========================================
    // FUNCIONES DE BÚSQUEDA (EXISTENTES)
    // ========================================
    const handleTaxpayerQuery = useCallback(async (cuit) => {
        try {
            console.log(`🔍 Consultando contribuyente: ${cuit}`);
            setTaxpayerData(null);

            // Usar el servicio de búsqueda existente
            const result = await searchService.searchTaxpayer(cuit);
            setTaxpayerData(result);

            // Cambiar automáticamente a la vista de contribuyente
            setCurrentView(VIEWS.TAXPAYER);

            // Crear alerta de éxito
            addAlert({
                type: 'success',
                title: 'Consulta Exitosa',
                message: `Información obtenida para CUIT ${cuit}`,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error en consulta de contribuyente:', error);
            addAlert({
                type: 'error',
                title: 'Error en Consulta',
                message: `No se pudo obtener información del CUIT ${cuit}: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
    }, [addAlert]);

    // ========================================
    // FUNCIONES DE COMPLIANCE (EXISTENTES)
    // ========================================
    const handleComplianceCheck = useCallback(async (cuit) => {
        try {
            console.log(`⚖️ Verificando compliance para: ${cuit}`);
            const complianceResult = await checkCompliance(cuit);
            setComplianceData(complianceResult);
            setCurrentView(VIEWS.COMPLIANCE);

            addAlert({
                type: 'success',
                title: 'Compliance Check',
                message: `Análisis completado para CUIT ${cuit}`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error en compliance check:', error);
            addAlert({
                type: 'error',
                title: 'Error en Compliance',
                message: `Error verificando compliance para ${cuit}: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
    }, [checkCompliance, addAlert]);

    // ========================================
    // FUNCIÓN DE RENDERIZADO PRINCIPAL
    // ========================================
    const renderCurrentView = useCallback(() => {
        console.log(`🎨 Renderizando vista: ${currentView}`);

        switch (currentView) {
            case VIEWS.DASHBOARD:
                return (
                    <div className="space-y-6 p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <SystemMetrics
                                monitoringData={monitoringData}
                                onRefresh={getMetrics}
                                loading={monitoringLoading}
                                isConnected={isConnected}
                            />
                            <AlertsPanel
                                alerts={alerts}
                                onClearAll={clearAllAlerts}
                                onRefresh={refreshAlerts}
                                loading={alertsLoading}
                            />
                        </div>

                        {/* Estadísticas rápidas de ARCA */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Estado ARCA</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{invoiceStats.intakeCount}</div>
                                    <div className="text-sm text-gray-500">Ingreso</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-600">{invoiceStats.processingCount}</div>
                                    <div className="text-sm text-gray-500">Procesando</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600">{invoiceStats.validationCount}</div>
                                    <div className="text-sm text-gray-500">Validación</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">{invoiceStats.arcaCount}</div>
                                    <div className="text-sm text-gray-500">ARCA</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case VIEWS.TAXPAYER:
                return (
                    <TaxpayerInfo
                        data={taxpayerData}
                        loading={loading}
                        onSearch={handleTaxpayerQuery}
                        onComplianceCheck={handleComplianceCheck}
                    />
                );

            case VIEWS.COMPLIANCE:
                return (
                    <ComplianceDetails
                        data={complianceHookData || complianceData}
                        onCheck={checkCompliance}
                        loading={complianceLoading}
                    />
                );

            case VIEWS.ALERTS:
                return (
                    <AlertsPanel
                        alerts={alerts}
                        onClearAll={clearAllAlerts}
                        onRefresh={refreshAlerts}
                        onClear={clearAllAlerts}
                        loading={alertsLoading}
                        expanded={true}
                    />
                );

            case VIEWS.METRICS:
                return (
                    <SystemMetrics
                        monitoringData={monitoringData}
                        onRefresh={getMetrics}
                        loading={monitoringLoading}
                        isConnected={isConnected}
                        detailed={true}
                    />
                );

            case VIEWS.GROQ_CHAT:
                return (
                    <GroqChatComponent
                        mcpClient={mcpClient}
                        systemContext={{
                            alerts: alerts.slice(0, 5),
                            taxpayerData,
                            complianceData: complianceHookData,
                            monitoringData,
                            invoiceStats
                        }}
                    />
                );

            // ========================================
            // VISTAS DE INGRESO DE FACTURAS - ARCA
            // ========================================
            case VIEWS.INVOICE_INTAKE:
                console.log('✅ Renderizando InvoiceIntake');
                return <InvoiceIntake config={config} />;

            case VIEWS.INVOICE_PROCESSING:
                console.log('✅ Renderizando InvoiceProcessing');
                return <InvoiceProcessing config={config} />;

            case VIEWS.INVOICE_VALIDATION:
                console.log('✅ Renderizando InvoiceValidation');
                return <InvoiceValidation config={config} />;

            case VIEWS.INVOICE_INTEGRATION:
                console.log('✅ Renderizando InvoiceIntegration');
                return <InvoiceIntegration config={config} stats={invoiceStats} />;

            // ========================================
            // VISTAS OCR (EXISTENTES)
            // ========================================
            case VIEWS.OCR_PROCESSING:
                console.log('✅ Renderizando OCRProcessingView');
                return <OCRProcessingView config={config} />;

            case VIEWS.BANK_RECONCILIATION:
                console.log('✅ Renderizando BankReconciliationView');
                return <BankReconciliationView config={config} />;

            case VIEWS.TRANSACTION_CATEGORIZATION:
                console.log('✅ Renderizando TransactionCategorizationView');
                return <TransactionCategorizationView config={config} />;

            case VIEWS.OCR_METRICS:
                console.log('✅ Renderizando OCRMetricsView');
                return <OCRMetricsView config={config} />;

            default:
                console.error(`❌ Vista no implementada: ${currentView}`);
                return (
                    <div className="flex items-center justify-center h-64 p-6">
                        <div className="text-center">
                            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Vista no encontrada</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                La vista '{currentView}' no está implementada.
                            </p>
                            <div className="mt-4 space-y-2">
                                <button
                                    onClick={() => handleViewChange(VIEWS.DASHBOARD)}
                                    className="block mx-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    Volver al Dashboard
                                </button>
                                {config?.debug && (
                                    <div className="text-xs text-gray-400 mt-2">
                                        <p>Vistas disponibles:</p>
                                        <code className="text-xs">{Object.keys(VIEWS).join(', ')}</code>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
        }
    }, [
        currentView,
        monitoringData,
        getMetrics,
        monitoringLoading,
        isConnected,
        alerts,
        clearAllAlerts,
        refreshAlerts,
        alertsLoading,
        taxpayerData,
        loading,
        handleTaxpayerQuery,
        handleComplianceCheck,
        complianceHookData,
        complianceData,
        checkCompliance,
        complianceLoading,
        mcpClient,
        invoiceStats,
        config,
        handleViewChange
    ]);

    // ========================================
    // EFECTOS DE INICIALIZACIÓN
    // ========================================
    useEffect(() => {
        console.log('🔄 Efecto de inicialización disparado');
        initializeApp();
    }, [initializeApp]);

    // Actualizar estadísticas periódicamente
    useEffect(() => {
        if (isInitialized && mcpClient) {
            console.log('⏰ Configurando actualización periódica de estadísticas');
            const interval = setInterval(() => {
                loadInvoiceStats();
            }, 30000); // Actualizar cada 30 segundos

            return () => {
                console.log('🧹 Limpiando interval de estadísticas');
                clearInterval(interval);
            };
        }
    }, [isInitialized, mcpClient, loadInvoiceStats]);

    // ========================================
    // RENDERIZADO CONDICIONAL
    // ========================================

    // Estado de carga inicial
    if (loading && !isInitialized) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
                    <h2 className="mt-4 text-xl font-semibold text-gray-900">Inicializando AFIP Monitor Enhanced</h2>
                    <p className="mt-2 text-gray-600">Conectando con servicios ARCA...</p>
                    {config?.debug && (
                        <div className="mt-4 text-xs text-gray-500">
                            <p>Config: {JSON.stringify(config, null, 2)}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Estado de error
    if (initError && !isInitialized) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
                    <h2 className="mt-4 text-xl font-semibold text-gray-900">Error de Inicialización</h2>
                    <p className="mt-2 text-gray-600 mb-4">{initError}</p>
                    <button
                        onClick={initializeApp}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                        Reintentar
                    </button>
                    {config?.debug && (
                        <details className="mt-4 text-xs text-left">
                            <summary className="cursor-pointer text-gray-500">Debug Info</summary>
                            <pre className="mt-2 text-gray-400 bg-gray-100 p-2 rounded">
                                {JSON.stringify({ config, initError }, null, 2)}
                            </pre>
                        </details>
                    )}
                </div>
            </div>
        );
    }

    // ========================================
    // RENDERIZADO PRINCIPAL
    // ========================================
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header con navegación - COMPATIBLE */}
            <Header
                currentView={currentView}
                onViewChange={handleViewChange}
                onTaxpayerQuery={handleTaxpayerQuery}
                views={VIEWS}
                loading={loading}
                isConnected={isConnected}
                alertCount={alerts.length}
                ocrStats={{
                    pendingOcr: processedDocuments.filter(d => d.status === 'processing').length || 2,
                    processingOcr: processedDocuments.filter(d => d.status === 'completed').length || 5
                }}
                invoiceStats={invoiceStats}
            />

            {/* Contenido principal */}
            <main className="pb-8">
                {renderCurrentView()}
            </main>

            {/* Indicador de estado MCP */}
            {mcpClient && (
                <div className="fixed bottom-4 right-4 z-50">
                    <div className={`flex items-center px-3 py-2 rounded-full text-sm shadow-lg ${isConnected
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        MCP {isConnected ? 'Conectado' : 'Desconectado'}
                    </div>
                </div>
            )}

            {/* Indicador de búsqueda activa */}
            {isSearching && (
                <div className="fixed top-20 right-4 z-50">
                    <div className="flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg shadow-lg border border-blue-200">
                        <SearchIcon className="w-4 h-4 mr-2 animate-pulse" />
                        Buscando...
                    </div>
                </div>
            )}

            {/* Debug info en desarrollo */}
            {config?.debug && (
                <div className="fixed bottom-4 left-4 z-50 bg-black bg-opacity-75 text-white p-2 rounded text-xs max-w-xs">
                    <div>Vista: {currentView}</div>
                    <div>Estado: {isInitialized ? 'Inicializado' : 'Inicializando'}</div>
                    <div>MCP: {mcpClient ? 'Conectado' : 'Desconectado'}</div>
                    <div>Alertas: {alerts.length}</div>
                </div>
            )}
        </div>
    );
};

// Export por defecto - COMPATIBLE con main.jsx
export default AfipMonitorEnhanced;