import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    Upload,
    FileText,
    Camera,
    Bot,
    Calculator,
    TrendingUp,
    PieChart,
    BarChart3,
    MessageSquare,
    Users,
    Settings,
    Eye,
    Download,
    RefreshCw,
    ChevronRight,
    Zap,
    Database,
    Wifi,
    WifiOff,
    Search,
    Bell,
    Menu,
    X,
    Plus,
    Trash2,
    Edit,
    Filter
} from 'lucide-react';

// Importar hooks y servicios existentes
import { useAlerts } from '../hooks/useAlerts.js';
import { useCompliance } from '../hooks/useCompliance.js';
import { useMonitoring } from '../hooks/useMonitoring.js';
import { getMCPClient } from '../services/mcp-client.js';

import { searchService } from '../services/search-service.js';

// Nuevos hooks para OCR
import { useOCR } from '../hooks/useOCR.js';
import { useBankReconciliation } from '../hooks/useBankReconciliation.js';
import { useTransactionCategorization } from '../hooks/useTransactionCategorization.js';

// Componentes existentes
import ComplianceDetails from './ComplianceDetails.jsx';
import SystemMetrics from './SystemMetrics.jsx';
import AlertsPanel from './AlertsPanel.jsx';
import TaxpayerInfo from './TaxpayerInfo.jsx';
import GroqChatComponent from './GroqChatComponent.jsx';
import { Header } from './common/Header.jsx';

// Nuevos componentes OCR
import OCRProcessingPanel from './ocr/OCRProcessingPanel.jsx';
import BankReconciliationPanel from './ocr/BankReconciliationPanel.jsx';
import TransactionCategorizationPanel from './ocr/TransactionCategorizationPanel.jsx';
import OCRMetricsPanel from './ocr/OCRMetricsPanel.jsx';
import DocumentUploadModal from './ocr/DocumentUploadModal.jsx';

const VIEWS = {
    DASHBOARD: "dashboard",
    TAXPAYER: "taxpayer",
    COMPLIANCE: "compliance",
    ALERTS: "alerts",
    METRICS: "metrics",
    GROQ_CHAT: "groq_chat",
    // Nuevas vistas OCR
    OCR_PROCESSING: "ocr_processing",
    BANK_RECONCILIATION: "bank_reconciliation",
    TRANSACTION_CATEGORIZATION: "transaction_categorization",
    OCR_METRICS: "ocr_metrics"
};

const AfipMonitorWithOCR = () => {
    // Estados principales
    const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
    const [taxpayerData, setTaxpayerData] = useState(null);
    const [complianceData, setComplianceData] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [initError, setInitError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState('test-client');

    // Hooks existentes
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

    const handleComplianceCheck = async (cuit) => {
        try {
            const complianceResult = await checkCompliance(cuit);
            setComplianceData(complianceResult);
            setCurrentView(VIEWS.COMPLIANCE);

            addAlert({
                type: 'success',
                title: 'Compliance Check',
                message: `Análisis completado para CUIT ${cuit}`
            });
        } catch (error) {
            console.error("Error en compliance check:", error);
            addAlert({
                type: 'error',
                title: 'Error en Compliance',
                message: `No se pudo realizar el análisis: ${error.message}`
            });
        }
    };

    // Nuevos hooks OCR
    const {
        processingQueue,
        recentExtractions,
        uploadDocument,
        extractInvoiceData,
        extractBankStatementData,
        getOCRHistory,
        getOCRStats,
        loading: ocrLoading
    } = useOCR();

    const {
        reconciliations,
        performReconciliation,
        getReconciliationStatus,
        loading: reconciliationLoading
    } = useBankReconciliation();

    const {
        categorizations,
        categorizeTransactions,
        getCategorizations,
        loading: categorizationLoading
    } = useTransactionCategorization();

    // Cliente MCP
    const [mcpClient, setMcpClient] = useState(null);

    // Estadísticas OCR
    const [ocrStats, setOcrStats] = useState({
        documentsProcessed: 0,
        successRate: 0,
        averageProcessingTime: 0,
        totalInQueue: 0
    });

    // Inicialización
    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        console.log("🚀 Iniciando aplicación AFIP Monitor con OCR...");
        setLoading(true);
        setInitError(null);

        try {
            // Inicializar cliente MCP
            const client = await getMCPClient();
            setMcpClient(client);

            // Cargar datos iniciales
            await Promise.all([
                loadOCRStats(),
                getSystemStatus(),
                refreshAlerts()
            ]);

            setIsInitialized(true);
            console.log("✅ Aplicación inicializada correctamente");
        } catch (error) {
            console.error("❌ Error inicializando aplicación:", error);
            setInitError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const loadOCRStats = async () => {
        try {
            const stats = await getOCRStats(selectedClient);
            setOcrStats(stats);
        } catch (error) {
            console.error("Error loading OCR stats:", error);
        }
    };

    const handleTaxpayerQuery = async (cuit) => {
        if (!cuit) return;

        setLoading(true);
        try {
            const taxpayerInfo = await searchService.searchTaxpayer(cuit);
            setTaxpayerData(taxpayerInfo);
            setCurrentView(VIEWS.TAXPAYER);
        } catch (error) {
            console.error("Error searching taxpayer:", error);
            addAlert({
                type: 'error',
                title: 'Error de búsqueda',
                message: `No se pudo buscar el CUIT ${cuit}: ${error.message}`
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDocumentUpload = async (file, documentType) => {
        try {
            const result = await uploadDocument(file, documentType, selectedClient);
            addAlert({
                type: 'success',
                title: 'Documento subido',
                message: `Documento ${file.name} procesado exitosamente`
            });
            setShowUploadModal(false);
            loadOCRStats();
        } catch (error) {
            addAlert({
                type: 'error',
                title: 'Error de carga',
                message: error.message
            });
        }
    };

    const renderQuickActions = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
            >
                <Upload className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                    <div className="font-medium text-blue-900">Subir Documento</div>
                    <div className="text-sm text-blue-700">Procesar con OCR</div>
                </div>
            </button>

            <button
                onClick={() => setCurrentView(VIEWS.BANK_RECONCILIATION)}
                className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
            >
                <Calculator className="w-6 h-6 text-green-600" />
                <div className="text-left">
                    <div className="font-medium text-green-900">Conciliación</div>
                    <div className="text-sm text-green-700">Bancaria automática</div>
                </div>
            </button>

            <button
                onClick={() => setCurrentView(VIEWS.TRANSACTION_CATEGORIZATION)}
                className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
            >
                <Bot className="w-6 h-6 text-purple-600" />
                <div className="text-left">
                    <div className="font-medium text-purple-900">Categorización</div>
                    <div className="text-sm text-purple-700">IA automática</div>
                </div>
            </button>

            <button
                onClick={() => setCurrentView(VIEWS.OCR_METRICS)}
                className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
            >
                <BarChart3 className="w-6 h-6 text-orange-600" />
                <div className="text-left">
                    <div className="font-medium text-orange-900">Métricas OCR</div>
                    <div className="text-sm text-orange-700">Estadísticas</div>
                </div>
            </button>
        </div>
    );

    const renderOCRStats = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Documentos Procesados</p>
                        <p className="text-2xl font-bold text-gray-900">{ocrStats.documentsProcessed}</p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100">
                        <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Tasa de Éxito</p>
                        <p className="text-2xl font-bold text-gray-900">{(ocrStats.successRate * 100).toFixed(1)}%</p>
                    </div>
                    <div className="p-3 rounded-full bg-green-100">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
                        <p className="text-2xl font-bold text-gray-900">{(ocrStats.averageProcessingTime / 1000).toFixed(1)}s</p>
                    </div>
                    <div className="p-3 rounded-full bg-purple-100">
                        <Clock className="w-6 h-6 text-purple-600" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">En Cola</p>
                        <p className="text-2xl font-bold text-gray-900">{ocrStats.totalInQueue}</p>
                    </div>
                    <div className="p-3 rounded-full bg-orange-100">
                        <Activity className="w-6 h-6 text-orange-600" />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDashboardContent = () => (
        <div className="space-y-6">
            {renderQuickActions()}
            {renderOCRStats()}

            {/* Pipeline de Procesamiento IA */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline de Procesamiento IA</h3>
                <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                    <div className="flex-1 p-4 bg-blue-50 rounded-lg text-center">
                        <Camera className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <h4 className="font-medium text-blue-900">1. Captura OCR</h4>
                        <p className="text-sm text-blue-700">Extracción automática de datos</p>
                        <p className="text-xs text-blue-600 mt-1">{ocrStats.documentsProcessed} procesados</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 hidden md:block" />
                    <div className="flex-1 p-4 bg-purple-50 rounded-lg text-center">
                        <Bot className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <h4 className="font-medium text-purple-900">2. Categorización IA</h4>
                        <p className="text-sm text-purple-700">Clasificación inteligente</p>
                        <p className="text-xs text-purple-600 mt-1">{categorizations.length} categorizaciones</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 hidden md:block" />
                    <div className="flex-1 p-4 bg-green-50 rounded-lg text-center">
                        <Calculator className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <h4 className="font-medium text-green-900">3. Conciliación</h4>
                        <p className="text-sm text-green-700">Automatización completa</p>
                        <p className="text-xs text-green-600 mt-1">{reconciliations.length} conciliaciones</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 hidden md:block" />
                    <div className="flex-1 p-4 bg-orange-50 rounded-lg text-center">
                        <CheckCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <h4 className="font-medium text-orange-900">4. Compliance</h4>
                        <p className="text-sm text-orange-700">Verificación AFIP</p>
                        <p className="text-xs text-orange-600 mt-1">Automático</p>
                    </div>
                </div>
            </div>

            {/* Actividad Reciente */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Procesamiento OCR Reciente</h3>
                    <div className="space-y-3">
                        {recentExtractions.slice(0, 5).map((extraction, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{extraction.documentType}</p>
                                    <p className="text-xs text-gray-500">{extraction.confidence}% confianza</p>
                                </div>
                                <span className="text-xs text-gray-500">{extraction.timeAgo}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas del Sistema</h3>
                    <div className="space-y-3">
                        {alerts.slice(0, 5).map((alert) => (
                            <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <div className={`w-2 h-2 rounded-full mt-2 ${alert.type === 'error' ? 'bg-red-500' :
                                    alert.type === 'warning' ? 'bg-yellow-500' :
                                        alert.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                                    }`}></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                                    <p className="text-xs text-gray-500">{alert.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMainContent = () => {
        if (!isInitialized) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <Activity className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-600">Inicializando AFIP Monitor con OCR...</p>
                    </div>
                </div>
            );
        }

        if (initError) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <p className="text-red-600 mb-2">Error de inicialización</p>
                        <p className="text-gray-600 text-sm">{initError}</p>
                        <button
                            onClick={initializeApp}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            );
        }

        switch (currentView) {
            case VIEWS.DASHBOARD:
                return renderDashboardContent();
            case VIEWS.TAXPAYER:
                return (
                    <TaxpayerInfo
                        data={taxpayerData}
                        onComplianceCheck={handleComplianceCheck}
                        loading={loading}
                    />
                );
            case VIEWS.COMPLIANCE:
                return <ComplianceDetails complianceData={complianceData} />;
            case VIEWS.ALERTS:
                return <AlertsPanel alerts={alerts} onClearAll={clearAllAlerts} />;
            case VIEWS.METRICS:
                return <SystemMetrics monitoringData={monitoringData} />;
            case VIEWS.GROQ_CHAT:
                return <GroqChatComponent />;
            case VIEWS.OCR_PROCESSING:
                return <OCRProcessingPanel />;
            case VIEWS.BANK_RECONCILIATION:
                return <BankReconciliationPanel />;
            case VIEWS.TRANSACTION_CATEGORIZATION:
                return <TransactionCategorizationPanel />;
            case VIEWS.OCR_METRICS:
                return <OCRMetricsPanel />;
            default:
                return renderDashboardContent();
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

            {/* Modal de subida de documentos */}
            {showUploadModal && (
                <DocumentUploadModal
                    onClose={() => setShowUploadModal(false)}
                    onUpload={handleDocumentUpload}
                    loading={ocrLoading}
                />
            )}
        </div>
    );
};

export default AfipMonitorWithOCR;