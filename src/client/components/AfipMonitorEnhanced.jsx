// src/client/components/AfipMonitorEnhanced.jsx - VERSIÓN CORREGIDA
import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Settings, TrendingUp, MessageSquare } from 'lucide-react';

// Importar los componentes que estaban faltando
import InvoiceIntake from './invoices/InvoiceIntake';
import InvoiceProcessing from './invoices/InvoiceProcessing';
import InvoiceValidation from './invoices/InvoiceValidation';
import InvoiceIntegration from './invoices/InvoiceIntegration';

// Importar los componentes OCR que estaban faltando
import {
    OCRProcessingView,
    BankReconciliationView,
    TransactionCategorizationView,
    OCRMetricsView
} from './ocr/OCRViews';

// Importar componentes existentes
import { Dashboard } from './Dashboard';
import { TaxpayerView } from './taxpayer/TaxpayerView';
import { ComplianceView } from './compliance/ComplianceView';
import { AlertsPanel } from './alerts/AlertsPanel';
import { SystemMetrics } from './metrics/SystemMetrics';
import { GroqChatComponent } from './groq/GroqChatComponent';

// Importar hooks y servicios
import { useAfipData } from '../hooks/useAfipData';
import { useAlerts } from '../hooks/useAlerts';
import { useCompliance } from '../hooks/useCompliance';
import { useSystemMetrics } from '../hooks/useSystemMetrics';
import { McpClient } from '../services/mcp-client';

// Constantes de vistas
const VIEWS = {
    DASHBOARD: "dashboard",
    TAXPAYER: "taxpayer",
    COMPLIANCE: "compliance",
    ALERTS: "alerts",
    METRICS: "metrics",
    GROQ_CHAT: "groq_chat",

    // Vistas de Ingreso de Facturas
    INVOICE_INTAKE: "invoice_intake",
    INVOICE_PROCESSING: "invoice_processing",
    INVOICE_VALIDATION: "invoice_validation",
    INVOICE_INTEGRATION: "invoice_integration",

    // Vistas OCR
    OCR_PROCESSING: "ocr_processing",
    BANK_RECONCILIATION: "bank_reconciliation",
    TRANSACTION_CATEGORIZATION: "transaction_categorization",
    OCR_METRICS: "ocr_metrics"
};

const AfipMonitorEnhanced = () => {
    // Estados principales
    const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
    const [isLoading, setIsLoading] = useState(false);
    const [mcpClient, setMcpClient] = useState(null);

    // Hooks personalizados
    const {
        taxpayerData,
        loading: taxpayerLoading,
        error: taxpayerError,
        fetchTaxpayerData,
        queryTaxpayer
    } = useAfipData();

    const {
        alerts,
        loading: alertsLoading,
        createAlert: createAfipAlert,
        clearAlert,
        clearAllAlerts
    } = useAlerts();

    const {
        data: complianceHookData,
        loading: complianceLoading,
        checkCompliance
    } = useCompliance();

    const {
        data: monitoringData,// src/client/components/AfipMonitorEnhanced.jsx - VERSIÓN FINAL CORREGIDA
        import React, { useState, useEffect, useCallback } from "react";
    import { Activity, AlertTriangle, CheckCircle, Clock, Search as SearchIcon, RefreshCw, Settings } from "lucide-react";

    // Importar componentes existentes
    import ComplianceDetails from "./ComplianceDetails.jsx";
    import SystemMetrics from "./SystemMetrics.jsx";
    import AlertsPanel from "./AlertsPanel.jsx";
    import TaxpayerInfo from "./TaxpayerInfo.jsx";
    import GroqChatComponent from "./GroqChatComponent.jsx";
    import { Header } from "./common/Header.jsx";

    // Importar hooks
    import { useAlerts } from "../hooks/useAlerts.js";
    import { useCompliance } from "../hooks/useCompliance.js";
    import { useMonitoring } from "../hooks/useMonitoring.js";
    import { useSearch } from "../hooks/useSearch.js";

    // Importar servicios
    import { searchService } from "../services/search-service.js";
    import { getMCPClient } from "../services/mcp-client.js";

    // IMPORTAR NUEVOS COMPONENTES DE FACTURAS
    import InvoiceIntake from "./invoices/InvoiceIntake.jsx";
    import InvoiceProcessing from "./invoices/InvoiceProcessing.jsx";
    import InvoiceValidation from "./invoices/InvoiceValidation.jsx";
    import InvoiceIntegration from "./invoices/InvoiceIntegration.jsx";

    // IMPORTAR COMPONENTES OCR
    import {
        OCRProcessingView,
        BankReconciliationView,
        TransactionCategorizationView,
        OCRMetricsView
    } from "./ocr/OCRViews.jsx";

    // CONSTANTES DE VISTAS - CRÍTICO: ESTAS DEBEN COINCIDIR CON LOS VALORES DEL HEADER
    const VIEWS = {
        DASHBOARD: "dashboard",
        TAXPAYER: "taxpayer",
        COMPLIANCE: "compliance",
        ALERTS: "alerts",
        METRICS: "metrics",
        GROQ_CHAT: "groq_chat",

        // Vistas de Ingreso de Facturas - DEBEN COINCIDIR EXACTAMENTE
        INVOICE_INTAKE: "invoice_intake",
        INVOICE_PROCESSING: "invoice_processing",
        INVOICE_VALIDATION: "invoice_validation",
        INVOICE_INTEGRATION: "invoice_integration",

        // Vistas OCR - DEBEN COINCIDIR EXACTAMENTE
        OCR_PROCESSING: "ocr_processing",
        BANK_RECONCILIATION: "bank_reconciliation",
        TRANSACTION_CATEGORIZATION: "transaction_categorization",
        OCR_METRICS: "ocr_metrics"
    };

    const AfipMonitorEnhanced = () => {
        // Estados principales
        const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
        const [taxpayerData, setTaxpayerData] = useState(null);
        const [complianceData, setComplianceData] = useState(null);
        const [isInitialized, setIsInitialized] = useState(false);
        const [loading, setLoading] = useState(false);
        const [initError, setInitError] = useState(null);
        const [mcpClient, setMcpClient] = useState(null);
        const [isConnected, setIsConnected] = useState(false);
        const [isSearching, setIsSearching] = useState(false);
        const [invoiceStats, setInvoiceStats] = useState({
            intakeCount: 0,
            processingCount: 0,
            validationCount: 0,
            arcaCount: 0
        });

        // Hooks personalizados
        const { alerts, loading: alertsLoading, clearAllAlerts } = useAlerts();
        const { data: complianceHookData, loading: complianceLoading, checkCompliance } = useCompliance();
        const { data: monitoringData, loading: monitoringLoading, getMetrics } = useMonitoring();

        // Inicialización de la aplicación
        const initializeApp = useCallback(async () => {
            try {
                setLoading(true);
                setInitError(null);

                // Inicializar cliente MCP
                const client = await getMCPClient();
                setMcpClient(client);
                setIsConnected(true);

                // Cargar datos iniciales
                await Promise.all([
                    getMetrics(),
                    checkCompliance(),
                    loadInvoiceStats()
                ]);

                setIsInitialized(true);
            } catch (error) {
                console.error('Error inicializando aplicación:', error);
                setInitError(error.message);
                setIsConnected(false);
            } finally {
                setLoading(false);
            }
        }, [getMetrics, checkCompliance]);

        // Cargar estadísticas de facturas
        const loadInvoiceStats = useCallback(async () => {
            try {
                // Simular carga de estadísticas
                setInvoiceStats({
                    intakeCount: Math.floor(Math.random() * 20) + 5,
                    processingCount: Math.floor(Math.random() * 15) + 2,
                    validationCount: Math.floor(Math.random() * 10) + 1,
                    arcaCount: Math.floor(Math.random() * 25) + 10
                });
            } catch (error) {
                console.error('Error cargando estadísticas de facturas:', error);
            }
        }, []);

        // Manejar consulta de contribuyente
        const handleTaxpayerQuery = useCallback(async (cuit) => {
            try {
                setIsSearching(true);
                setTaxpayerData(null);

                const result = await searchService.searchTaxpayer(cuit);
                setTaxpayerData(result);

                // Cambiar automáticamente a la vista de contribuyente
                setCurrentView(VIEWS.TAXPAYER);
            } catch (error) {
                console.error('Error en consulta de contribuyente:', error);
                // Manejar error sin cambiar vista
            } finally {
                setIsSearching(false);
            }
        }, []);

        // Manejar cambio de vista - FUNCIÓN CRÍTICA
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
            if (newView.startsWith('invoice_')) {
                loadInvoiceStats();
            }
        }, [currentView, loadInvoiceStats]);

        // FUNCIÓN DE RENDERIZADO PRINCIPAL - CRÍTICA
        const renderCurrentView = () => {
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
                                />
                                <AlertsPanel
                                    alerts={alerts}
                                    onClearAll={clearAllAlerts}
                                    loading={alertsLoading}
                                />
                            </div>
                        </div>
                    );

                case VIEWS.TAXPAYER:
                    return (
                        <TaxpayerInfo
                            data={taxpayerData}
                            loading={loading}
                            onSearch={handleTaxpayerQuery}
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
                                monitoringData
                            }}
                        />
                    );

                // ========================================
                // VISTAS DE INGRESO DE FACTURAS - CRÍTICO
                // ========================================
                case VIEWS.INVOICE_INTAKE:
                    console.log('✅ Renderizando InvoiceIntake');
                    return <InvoiceIntake />;

                case VIEWS.INVOICE_PROCESSING:
                    console.log('✅ Renderizando InvoiceProcessing');
                    return <InvoiceProcessing />;

                case VIEWS.INVOICE_VALIDATION:
                    console.log('✅ Renderizando InvoiceValidation');
                    return <InvoiceValidation />;

                case VIEWS.INVOICE_INTEGRATION:
                    console.log('✅ Renderizando InvoiceIntegration');
                    return <InvoiceIntegration />;

                // ========================================
                // VISTAS OCR - CRÍTICO
                // ========================================
                case VIEWS.OCR_PROCESSING:
                    console.log('✅ Renderizando OCRProcessingView');
                    return <OCRProcessingView />;

                case VIEWS.BANK_RECONCILIATION:
                    console.log('✅ Renderizando BankReconciliationView');
                    return <BankReconciliationView />;

                case VIEWS.TRANSACTION_CATEGORIZATION:
                    console.log('✅ Renderizando TransactionCategorizationView');
                    return <TransactionCategorizationView />;

                case VIEWS.OCR_METRICS:
                    console.log('✅ Renderizando OCRMetricsView');
                    return <OCRMetricsView />;

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
                                        onClick={() => setCurrentView(VIEWS.DASHBOARD)}
                                        className="block mx-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                    >
                                        Volver al Dashboard
                                    </button>
                                    <p className="text-xs text-gray-400">
                                        Vistas disponibles: {Object.keys(VIEWS).join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
            }
        };

        // Inicialización al montar el componente
        useEffect(() => {
            initializeApp();
        }, [initializeApp]);

        // Actualizar estadísticas periódicamente
        useEffect(() => {
            if (isInitialized && mcpClient) {
                const interval = setInterval(() => {
                    loadInvoiceStats();
                }, 30000); // Actualizar cada 30 segundos

                return () => clearInterval(interval);
            }
        }, [isInitialized, mcpClient, loadInvoiceStats]);

        // Estados de carga
        if (loading && !isInitialized) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
                        <h2 className="mt-4 text-xl font-semibold text-gray-900">Inicializando AFIP Monitor</h2>
                        <p className="mt-2 text-gray-600">Conectando con servicios ARCA...</p>
                    </div>
                </div>
            );
        }

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
                    </div>
                </div>
            );
        }

        // Renderizado principal
        return (
            <div className="min-h-screen bg-gray-50">
                {/* Header con navegación */}
                <Header
                    currentView={currentView}
                    onViewChange={handleViewChange}
                    onTaxpayerQuery={handleTaxpayerQuery}
                    views={VIEWS}
                    loading={loading}
                    isConnected={isConnected}
                    alertCount={alerts.length}
                    ocrStats={{
                        pendingOcr: 2,
                        processingOcr: 5
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
                {process.env.NODE_ENV === 'development' && (
                    <div className="fixed bottom-4 left-4 z-50 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
                        Vista actual: {currentView}
                    </div>
                )}
            </div>
        );
    };

    export default AfipMonitorEnhanced;
    loading: monitoringLoading,
        fetchMetrics: getMetrics
} = useSystemMetrics();

// Inicialización del cliente MCP
useEffect(() => {
    const initMcpClient = async () => {
        try {
            const client = new McpClient();
            await client.connect();
            setMcpClient(client);
        } catch (error) {
            console.error('Error inicializando MCP client:', error);
            createAfipAlert({
                type: 'system_error',
                message: 'Error conectando con servicios MCP',
                priority: 'high'
            });
        }
    };

    initMcpClient();

    return () => {
        if (mcpClient) {
            mcpClient.disconnect();
        }
    };
}, []);

// Manejo del cambio de vista
const handleViewChange = useCallback((view) => {
    setCurrentView(view);
}, []);

// Función para renderizar el contenido principal según la vista actual
const renderMainContent = () => {
    switch (currentView) {
        case VIEWS.DASHBOARD:
            return (
                <Dashboard
                    data={{
                        alerts: { active: alerts.filter(a => a.status === 'active').length },
                        compliance: { score: complianceHookData?.score || 0 },
                        system: { status: 'Operational' },
                        groq: { enabled: !!mcpClient }
                    }}
                    alerts={alerts}
                    complianceData={complianceHookData}
                    systemHealth={monitoringData}
                    isLoading={taxpayerLoading || alertsLoading || complianceLoading}
                    onRefresh={() => {
                        fetchTaxpayerData();
                        getMetrics();
                        checkCompliance();
                    }}
                    onAlertAction={clearAlert}
                    onComplianceCheck={checkCompliance}
                    settings={{}}
                />
            );

        case VIEWS.TAXPAYER:
            return (
                <TaxpayerView
                    data={taxpayerData}
                    loading={taxpayerLoading}
                    error={taxpayerError}
                    onQuery={queryTaxpayer}
                    onRefresh={fetchTaxpayerData}
                />
            );

        case VIEWS.COMPLIANCE:
            return (
                <ComplianceView
                    data={complianceHookData}
                    loading={complianceLoading}
                    onCheck={checkCompliance}
                    onRefresh={checkCompliance}
                />
            );

        case VIEWS.ALERTS:
            return (
                <AlertsPanel
                    alerts={alerts}
                    onClearAll={clearAllAlerts}
                    onCreateAfipAlert={createAfipAlert}
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
                        monitoringData
                    }}
                />
            );

        // ========================================
        // VISTAS DE INGRESO DE FACTURAS (CORREGIDAS)
        // ========================================
        case VIEWS.INVOICE_INTAKE:
            return <InvoiceIntake />;

        case VIEWS.INVOICE_PROCESSING:
            return <InvoiceProcessing />;

        case VIEWS.INVOICE_VALIDATION:
            return <InvoiceValidation />;

        case VIEWS.INVOICE_INTEGRATION:
            return <InvoiceIntegration />;

        // ========================================
        // VISTAS OCR (CORREGIDAS)
        // ========================================
        case VIEWS.OCR_PROCESSING:
            return <OCRProcessingView />;

        case VIEWS.BANK_RECONCILIATION:
            return <BankReconciliationView />;

        case VIEWS.TRANSACTION_CATEGORIZATION:
            return <TransactionCategorizationView />;

        case VIEWS.OCR_METRICS:
            return <OCRMetricsView />;

        default:
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Vista no encontrada</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            La vista '{currentView}' no está implementada.
                        </p>
                        <button
                            onClick={() => setCurrentView(VIEWS.DASHBOARD)}
                            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                        >
                            Volver al Dashboard
                        </button>
                    </div>
                </div>
            );
    }
};

// Loading state general
if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-purple-600 mb-4" />
                <p className="text-gray-600">Cargando sistema ARCA...</p>
            </div>
        </div>
    );
}

return (
    <div className="min-h-screen bg-gray-50">
        {/* Header con navegación */}
        <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Sistema ARCA - AFIP Monitor
                        </h1>
                        {alerts.filter(a => a.status === 'active').length > 0 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {alerts.filter(a => a.status === 'active').length} alertas
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Indicador de conexión MCP */}
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${mcpClient ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-sm text-gray-600">
                                MCP {mcpClient ? 'Conectado' : 'Desconectado'}
                            </span>
                        </div>

                        <button
                            onClick={() => {
                                fetchTaxpayerData();
                                getMetrics();
                                checkCompliance();
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Actualizar datos"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>

                        <button className="p-2 text-gray-400 hover:text-gray-600">
                            <Settings className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </header>

        {/* Navegación principal */}
        <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex space-x-8 overflow-x-auto">
                    {/* Grupo: Sistema Principal */}
                    <div className="flex space-x-4 py-4 border-r pr-4">
                        <button
                            onClick={() => handleViewChange(VIEWS.DASHBOARD)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${currentView === VIEWS.DASHBOARD
                                ? 'bg-purple-100 text-purple-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => handleViewChange(VIEWS.TAXPAYER)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${currentView === VIEWS.TAXPAYER
                                ? 'bg-purple-100 text-purple-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Contribuyente
                        </button>
                        <button
                            onClick={() => handleViewChange(VIEWS.ALERTS)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${currentView === VIEWS.ALERTS
                                ? 'bg-purple-100 text-purple-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Alertas
                        </button>
                    </div>

                    {/* Grupo: Facturas */}
                    <div className="flex space-x-4 py-4 border-r pr-4">
                        <span className="text-xs text-gray-400 self-center">FACTURAS:</span>
                        <button
                            onClick={() => handleViewChange(VIEWS.INVOICE_INTAKE)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${currentView === VIEWS.INVOICE_INTAKE
                                ? 'bg-green-100 text-green-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Ingreso
                        </button>
                        <button
                            onClick={() => handleViewChange(VIEWS.INVOICE_PROCESSING)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${currentView === VIEWS.INVOICE_PROCESSING
                                ? 'bg-green-100 text-green-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Procesamiento
                        </button>
                        <button
                            onClick={() => handleViewChange(VIEWS.INVOICE_VALIDATION)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${currentView === VIEWS.INVOICE_VALIDATION
                                ? 'bg-green-100 text-green-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Validación
                        </button>
                        <button
                            onClick={() => handleViewChange(VIEWS.INVOICE_INTEGRATION)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${currentView === VIEWS.INVOICE_INTEGRATION
                                ? 'bg-green-100 text-green-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            ARCA Integration
                        </button>
                    </div>

                    {/* Grupo: OCR */}
                    <div className="flex space-x-4 py-4">
                        <span className="text-xs text-gray-400 self-center">OCR:</span>
                        <button
                            onClick={() => handleViewChange(VIEWS.OCR_PROCESSING)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${currentView === VIEWS.OCR_PROCESSING
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Processing
                        </button>
                        <button
                            onClick={() => handleViewChange(VIEWS.BANK_RECONCILIATION)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${currentView === VIEWS.BANK_RECONCILIATION
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Conciliación
                        </button>
                        <button
                            onClick={() => handleViewChange(VIEWS.OCR_METRICS)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${currentView === VIEWS.OCR_METRICS
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Métricas
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        {/* Contenido principal */}
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {renderMainContent()}
        </main>
    </div>
);
};

export default AfipMonitorEnhanced;