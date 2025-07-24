// src/client/components/AfipMonitorEnhanced.jsx - Versión actualizada con Ingreso de Facturas
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

// Importar nuevos componentes de facturas
import InvoiceIntake from "./invoices/InvoiceIntake.jsx";
import InvoiceProcessing from "./invoices/InvoiceProcessing.jsx";
import InvoiceValidation from "./invoices/InvoiceValidation.jsx";
import InvoiceIntegration from "./invoices/InvoiceIntegration.jsx";

// Componentes OCR existentes
import OCRProcessingView from "./ocr/OCRProcessingView.jsx";
import BankReconciliationView from "./ocr/BankReconciliationView.jsx";
import TransactionCategorizationView from "./ocr/TransactionCategorizationView.jsx";
import OCRMetricsView from "./ocr/OCRMetricsView.jsx";

const VIEWS = {
    DASHBOARD: "dashboard",
    TAXPAYER: "taxpayer",
    COMPLIANCE: "compliance",
    ALERTS: "alerts",
    METRICS: "metrics",
    GROQ_CHAT: "groq_chat",
    // Nuevas vistas de Ingreso de Facturas
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

const AfipMonitorEnhanced = () => {
    // Estados principales
    const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
    const [taxpayerData, setTaxpayerData] = useState(null);
    const [complianceData, setComplianceData] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [initError, setInitError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Estados específicos para facturas
    const [invoiceStats, setInvoiceStats] = useState({
        pendingCount: 0,
        processingCount: 0,
        validationCount: 0,
        arcaCount: 0,
        totalPending: 0
    });

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

    const {
        searchResults,
        performSearch,
        clearResults,
        isSearching
    } = useSearch();

    // Cliente MCP
    const [mcpClient, setMcpClient] = useState(null);

    // Inicialización de la aplicación
    const initializeApp = async () => {
        console.log("🚀 Iniciando aplicación AFIP Monitor...");
        setLoading(true);
        setInitError(null);

        try {
            // Inicializar cliente MCP
            const client = await getMCPClient();
            setMcpClient(client);
            console.log("✅ Cliente MCP inicializado");

            // Cargar estadísticas iniciales de facturas
            await loadInvoiceStats();

            setIsInitialized(true);
            console.log("✅ Aplicación inicializada correctamente");

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
    };

    // Cargar estadísticas de facturas
    const loadInvoiceStats = async () => {
        try {
            if (mcpClient) {
                // Obtener estadísticas de ARCA si está disponible
                const stats = await mcpClient.callTool('get_arca_stats');
                setInvoiceStats({
                    pendingCount: stats.today?.pending || 0,
                    processingCount: stats.today?.sent - stats.today?.authorized - stats.today?.rejected || 0,
                    validationCount: 0, // Este sería calculado localmente
                    arcaCount: stats.today?.sent || 0,
                    totalPending: stats.today?.pending || 0
                });
            } else {
                // Valores mock para desarrollo
                setInvoiceStats({
                    pendingCount: 3,
                    processingCount: 2,
                    validationCount: 1,
                    arcaCount: 5,
                    totalPending: 6
                });
            }
        } catch (error) {
            console.error('Error cargando estadísticas de facturas:', error);
        }
    };

    // Manejar consulta de contribuyente
    const handleTaxpayerQuery = useCallback(async (cuit) => {
        if (!cuit || cuit.trim().length < 10) {
            addAlert({
                type: 'warning',
                title: 'CUIT Inválido',
                message: 'Por favor ingrese un CUIT válido',
                timestamp: new Date().toISOString()
            });
            return;
        }

        setLoading(true);

        try {
            console.log(`🔍 Consultando contribuyente: ${cuit}`);

            if (mcpClient) {
                const taxpayerInfo = await mcpClient.callTool('afip_get_taxpayer_info', { cuit });
                setTaxpayerData(taxpayerInfo);
                setCurrentView(VIEWS.TAXPAYER);

                addAlert({
                    type: 'success',
                    title: 'Consulta Exitosa',
                    message: `Información de ${cuit} obtenida correctamente`,
                    timestamp: new Date().toISOString()
                });
            } else {
                // Datos mock
                setTaxpayerData({
                    cuit,
                    businessName: 'EMPRESA EJEMPLO SRL',
                    status: 'ACTIVO',
                    category: 'RESPONSABLE_INSCRIPTO',
                    activities: ['620200 - Consultores en informática']
                });
                setCurrentView(VIEWS.TAXPAYER);
            }

        } catch (error) {
            console.error('Error en consulta de contribuyente:', error);
            addAlert({
                type: 'error',
                title: 'Error en Consulta',
                message: `No se pudo obtener información del CUIT ${cuit}: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        } finally {
            setLoading(false);
        }
    }, [mcpClient, addAlert]);

    // Manejar cambio de vista
    const handleViewChange = useCallback((newView) => {
        console.log(`📱 Cambiando vista a: ${newView}`);
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
    }, []);

    // Renderizar contenido según la vista actual
    const renderCurrentView = () => {
        switch (currentView) {
            case VIEWS.DASHBOARD:
                return (
                    <div className="space-y-6">
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

            // Nuevas vistas de Ingreso de Facturas
            case VIEWS.INVOICE_INTAKE:
                return <InvoiceIntake />;

            case VIEWS.INVOICE_PROCESSING:
                return <InvoiceProcessing />;

            case VIEWS.INVOICE_VALIDATION:
                return <InvoiceValidation />;

            case VIEWS.INVOICE_INTEGRATION:
                return <InvoiceIntegration />;

            // Vistas OCR existentes
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
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Volver al Dashboard
                            </button>
                        </div>
                    </div>
                );
        }
    };

    // Efectos
    useEffect(() => {
        initializeApp();
    }, []);

    // Actualizar estadísticas periódicamente
    useEffect(() => {
        if (isInitialized && mcpClient) {
            const interval = setInterval(() => {
                loadInvoiceStats();
            }, 30000); // Actualizar cada 30 segundos

            return () => clearInterval(interval);
        }
    }, [isInitialized, mcpClient]);

    // Renderizado condicional para estados de carga y error
    if (loading && !isInitialized) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <h2 className="mt-4 text-xl font-semibold text-gray-900">Inicializando AFIP Monitor</h2>
                    <p className="mt-2 text-gray-600">Conectando con servicios...</p>
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
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                currentView={currentView}
                onViewChange={handleViewChange}
                onTaxpayerQuery={handleTaxpayerQuery}
                views={VIEWS}
                loading={loading}
                isConnected={isConnected}
                alertCount={alerts.length}
                ocrStats={{
                    pendingOcr: 2
                }}
                invoiceStats={invoiceStats}
            />

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
                        <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'
                            }`} />
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
        </div>
    );
};

export default AfipMonitorEnhanced;