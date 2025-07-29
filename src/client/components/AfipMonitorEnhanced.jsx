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

// ========================================
// IMPORTAR NUEVO COMPONENTE DE CONTRIBUYENTES
// ========================================
import ContribuyentesView from "./contributors/ContribuyentesView.jsx";

// Importar hooks existentes
import { useAlerts } from "../hooks/useAlerts.js";
import { useCompliance } from "../hooks/useCompliance.js";
import { useMonitoring } from "../hooks/useMonitoring.js";
import { useSearch } from "../hooks/useSearch.js";

// Importar servicios existentes
import { searchService } from "../services/search-service.js";
import { getMCPClient } from "../services/mcp-client.js";

// ========================================
// IMPORTAR COMPONENTES DE FACTURAS
// ========================================
import InvoiceIntake from "./invoices/InvoiceIntake.jsx";
import InvoiceProcessing from "./invoices/InvoiceProcessing.jsx";
import InvoiceValidation from "./invoices/InvoiceValidation.jsx";
import InvoiceIntegration from "./invoices/InvoiceIntegration.jsx";

import { UserManagement } from './UserManagement';

// ========================================
// IMPORTAR COMPONENTES OCR
// ========================================
import {
    OCRProcessingView,
    BankReconciliationView,
    TransactionCategorizationView,
    OCRMetricsView
} from "./ocr/OCRViews.jsx";

// Constantes de vistas - COMPATIBLE CON HEADER - ACTUALIZADA
const VIEWS = {
    DASHBOARD: "dashboard",
    TAXPAYER: "taxpayer",
    COMPLIANCE: "compliance",
    ALERTS: "alerts",
    METRICS: "metrics",
    GROQ_CHAT: "groq_chat",

    // ========================================
    // NUEVA VISTA DE CONTRIBUYENTES
    // ========================================
    CONTRIBUTORS: "contributors",

    // Vistas de Ingreso de Facturas - ARCA
    INVOICE_INTAKE: "invoice_intake",
    INVOICE_PROCESSING: "invoice_processing",
    INVOICE_VALIDATION: "invoice_validation",
    INVOICE_INTEGRATION: "invoice_integration",

    // Vistas OCR existentes
    OCR_PROCESSING: "ocr_processing",
    BANK_RECONCILIATION: "bank_reconciliation",
    TRANSACTION_CATEGORIZATION: "transaction_categorization",
    OCR_METRICS: "ocr_metrics",
    USERS: "users"
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

    // Estados para búsqueda
    const [isSearching, setIsSearching] = useState(false);

    // Estado del cliente MCP
    const [mcpClient, setMcpClient] = useState(null);

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
        loading: monitoringLoading
    } = useMonitoring();

    const {
        searchResults,
        performSearch,
        clearResults,
        loading: searchLoading
    } = useSearch();

    // ========================================
    // INICIALIZACIÓN DEL COMPONENTE
    // ========================================
    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = useCallback(async () => {
        console.log('🔄 Inicializando AfipMonitorEnhanced...');
        setLoading(true);
        setInitError(null);

        try {
            // Inicializar cliente MCP
            console.log('🔌 Inicializando MCP Client...');
            const client = await getMCPClient();
            setMcpClient(client);

            // Cargar datos iniciales si hay conexión
            if (client && isConnected) {
                console.log('📊 Cargando datos iniciales...');
                await Promise.allSettled([
                    getMetrics(),
                    // Aquí podrías cargar otros datos iniciales
                ]);
            }

            setIsInitialized(true);
            console.log('✅ AfipMonitorEnhanced inicializado correctamente');

        } catch (error) {
            console.error('❌ Error inicializando AfipMonitorEnhanced:', error);
            setInitError(error);

            // Crear alerta de error
            addAlert({
                type: 'error',
                title: 'Error de Inicialización',
                message: `No se pudo inicializar el sistema: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        } finally {
            setLoading(false);
        }
    }, [addAlert, getMetrics, isConnected]);

    // ========================================
    // MANEJADORES DE EVENTOS (EXISTENTES)
    // ========================================
    const handleViewChange = useCallback((newView) => {
        console.log(`🎯 Cambiando vista a: ${newView}`);
        setCurrentView(newView);
    }, []);

    const handleTaxpayerQuery = useCallback(async (query) => {
        console.log(`🔍 Búsqueda de contribuyente: ${query}`);
        setIsSearching(true);

        try {
            const results = await performSearch(query);
            setTaxpayerData(results);
            setCurrentView(VIEWS.TAXPAYER);

            addAlert({
                type: 'info',
                title: 'Búsqueda Completada',
                message: `Búsqueda realizada para: ${query}`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error en búsqueda:', error);
            addAlert({
                type: 'error',
                title: 'Error de Búsqueda',
                message: `No se pudo realizar la búsqueda: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        } finally {
            setIsSearching(false);
        }
    }, [performSearch, addAlert]);

    const handleRefreshAlerts = useCallback(async () => {
        console.log('🔄 Refrescando alertas...');
        // Implementar lógica de refresh de alertas
        try {
            // Aquí iría la lógica para recargar alertas
            addAlert({
                type: 'success',
                title: 'Alertas Actualizadas',
                message: 'Las alertas han sido actualizadas correctamente',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error refrescando alertas:', error);
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
                                onRefresh={handleRefreshAlerts}
                                loading={alertsLoading}
                            />
                        </div>
                    </div>
                );

            case VIEWS.TAXPAYER:
                console.log('✅ Renderizando TaxpayerInfo');
                return (
                    <TaxpayerInfo
                        data={taxpayerData}
                        searchResults={searchResults}
                        onComplianceCheck={handleComplianceCheck}
                        loading={searchLoading || loading}
                        config={config}
                    />
                );


            case VIEWS.CONTRIBUTORS:
                console.log('✅ Renderizando ContribuyentesView');
                return <ContribuyentesView />;

            case VIEWS.COMPLIANCE:
                console.log('✅ Renderizando ComplianceDetails');
                return (
                    <ComplianceDetails
                        data={complianceData || complianceHookData}
                        loading={complianceLoading}
                        config={config}
                    />
                );

            case VIEWS.ALERTS:
                console.log('✅ Renderizando AlertsPanel');
                return (
                    <AlertsPanel
                        alerts={alerts}
                        onClearAll={clearAllAlerts}
                        onRefresh={handleRefreshAlerts}
                        loading={alertsLoading}
                        config={config}
                    />
                );

            case VIEWS.METRICS:
                console.log('✅ Renderizando SystemMetrics');
                return (
                    <SystemMetrics
                        monitoringData={monitoringData}
                        onRefresh={getMetrics}
                        loading={monitoringLoading}
                        isConnected={isConnected}
                        config={config}
                    />
                );

            case VIEWS.GROQ_CHAT:
                console.log('✅ Renderizando GroqChatComponent');
                return (
                    <GroqChatComponent
                        config={config}
                        selectedCuit={taxpayerData?.cuit}
                        onMCPToolSuggestion={(suggestion) => {
                            addAlert({
                                type: 'info',
                                title: 'Sugerencia IA',
                                message: suggestion,
                                timestamp: new Date().toISOString()
                            });
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

            case VIEWS.USERS:
                return <UserManagement />;

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
        handleRefreshAlerts,
        alertsLoading,
        taxpayerData,
        searchResults,
        handleComplianceCheck,
        searchLoading,
        loading,
        config,
        complianceData,
        complianceHookData,
        complianceLoading,
        invoiceStats,
        addAlert
    ]);

    // ========================================
    // ESTADO DE ERROR DE INICIALIZACIÓN
    // ========================================
    if (initError) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-red-700 mb-2">Error de Inicialización</h2>
                    <p className="text-red-600 mb-4">{initError.message}</p>
                    <button
                        onClick={initializeApp}
                        className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700"
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