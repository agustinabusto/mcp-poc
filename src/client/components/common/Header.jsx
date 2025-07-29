// src/client/components/common/Header.jsx - Versión actualizada con Ingreso de Facturas
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePermissions } from '../../hooks/usePermissions.js';
import UserProfileModal from '../auth/UserProfileModal.jsx';
import {
    Search,
    Bell,
    Settings,
    Activity,
    BarChart3,
    AlertTriangle,
    MessageSquare,
    Menu,
    X,
    Wifi,
    WifiOff,
    History,
    User,
    AlertCircle,
    CheckCircle,
    // Nuevos iconos para Ingreso de Facturas
    Camera,
    Calculator,
    Bot,
    FileText,
    Upload,
    TrendingUp,
    PieChart,
    Database,
    Receipt,
    Scan,
    Users,
    Mail,
    Smartphone,
    Package
} from 'lucide-react';

export const Header = ({
    currentView,
    onViewChange,
    onTaxpayerQuery,
    views = {},
    loading = false,
    isConnected = false,
    alertCount = 0,
    ocrStats = {},
    invoiceStats = {} // Nuevas estadísticas de facturas
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchCuit, setSearchCuit] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [searchError, setSearchError] = useState(null);
    const [activeSection, setActiveSection] = useState('main'); // 'main', 'ocr', 'invoices'
    const [showProfileModal, setShowProfileModal] = useState(false);
    const { user, logout } = useAuth();
    const { hasPermission } = usePermissions();

    const searchRef = useRef(null);
    const dropdownRef = useRef(null);

    // Navegación por defecto si no se proporciona views
    const defaultViews = {
        DASHBOARD: "dashboard",
        TAXPAYER: "taxpayer",
        COMPLIANCE: "compliance",
        ALERTS: "alerts",
        METRICS: "metrics",
        GROQ_CHAT: "groq_chat",
        CONTRIBUTORS: "contributors",
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

    const navigationViews = views && Object.keys(views).length > 0 ? views : defaultViews;

    // Configuración de navegación principal
    const mainNavigation = [
        {
            key: navigationViews.DASHBOARD || 'dashboard',
            label: 'Dashboard',
            icon: <BarChart3 className="h-5 w-5" />,
            description: 'Vista general del sistema',
            section: 'main'
        },
        {
            key: navigationViews.ALERTS || 'alerts',
            label: 'Alertas',
            icon: <AlertTriangle className="h-5 w-5" />,
            description: 'Panel de alertas activas',
            badge: alertCount > 0 ? alertCount : null,
            badgeColor: 'bg-red-500',
            section: 'main'
        },
        {
            key: navigationViews.TAXPAYER || 'taxpayer',
            label: 'Contribuyentes',
            icon: <User className="h-5 w-5" />,
            description: 'Información de contribuyentes',
            section: 'main'
        },
        {
            key: navigationViews.CONTRIBUTORS || 'contributors',
            label: 'Gestión Clientes',
            icon: <Users className="h-5 w-5" />,
            description: 'Gestión de cartera de clientes',
            section: 'main'
        },
        {
            key: navigationViews.COMPLIANCE || 'compliance',
            label: 'Compliance',
            icon: <CheckCircle className="h-5 w-5" />,
            description: 'Estado de cumplimiento',
            section: 'main'
        },
        {
            key: navigationViews.METRICS || 'metrics',
            label: 'Métricas',
            icon: <TrendingUp className="h-5 w-5" />,
            description: 'Métricas del sistema',
            section: 'main'
        },
        {
            key: navigationViews.GROQ_CHAT || 'groq_chat',
            label: 'AI Assistant',
            icon: <Bot className="h-5 w-5" />,
            description: 'Asistente de inteligencia artificial',
            section: 'main'
        }
    ];

    // Nueva navegación para Ingreso de Facturas
    const invoiceNavigation = [
        {
            key: navigationViews.INVOICE_INTAKE || 'invoice_intake',
            label: 'Ingreso de Facturas',
            icon: <Receipt className="h-5 w-5" />,
            description: 'Sistema de ingreso de facturas',
            badge: invoiceStats.pendingCount || null,
            badgeColor: 'bg-blue-500',
            section: 'invoices'
        },
        {
            key: navigationViews.INVOICE_PROCESSING || 'invoice_processing',
            label: 'Procesamiento',
            icon: <Scan className="h-5 w-5" />,
            description: 'Estado del procesamiento OCR',
            badge: invoiceStats.processingCount || null,
            badgeColor: 'bg-yellow-500',
            section: 'invoices'
        },
        {
            key: navigationViews.INVOICE_VALIDATION || 'invoice_validation',
            label: 'Validación',
            icon: <CheckCircle className="h-5 w-5" />,
            description: 'Validación de facturas procesadas',
            badge: invoiceStats.validationCount || null,
            badgeColor: 'bg-orange-500',
            section: 'invoices'
        },
        {
            key: navigationViews.INVOICE_INTEGRATION || 'invoice_integration',
            label: 'Integración ARCA',
            icon: <Database className="h-5 w-5" />,
            description: 'Envío a sistema ARCA',
            badge: invoiceStats.arcaCount || null,
            badgeColor: 'bg-green-500',
            section: 'invoices'
        }
    ];

    // Navegación OCR existente
    const ocrNavigation = [
        {
            key: navigationViews.OCR_PROCESSING || 'ocr_processing',
            label: 'OCR Processing',
            icon: <Camera className="h-5 w-5" />,
            description: 'Procesamiento OCR de documentos',
            badge: ocrStats.pendingOcr || null,
            badgeColor: 'bg-purple-500',
            section: 'ocr'
        },
        {
            key: navigationViews.BANK_RECONCILIATION || 'bank_reconciliation',
            label: 'Conciliación Bancaria',
            icon: <Calculator className="h-5 w-5" />,
            description: 'Conciliación de extractos bancarios',
            section: 'ocr'
        },
        {
            key: navigationViews.TRANSACTION_CATEGORIZATION || 'transaction_categorization',
            label: 'Categorización',
            icon: <PieChart className="h-5 w-5" />,
            description: 'Categorización automática de transacciones',
            section: 'ocr'
        },
        {
            key: navigationViews.OCR_METRICS || 'ocr_metrics',
            label: 'Métricas OCR',
            icon: <TrendingUp className="h-5 w-5" />,
            description: 'Estadísticas de procesamiento OCR',
            section: 'ocr'
        }
    ];

    // Resto del código existente del componente Header...
    // (mantengo la funcionalidad existente)

    // Función para renderizar elementos de navegación
    const renderNavigationItems = (items) => {
        return items.map((item) => (
            <button
                key={item.key}
                onClick={() => {
                    onViewChange(item.key);
                    setIsMenuOpen(false);
                }}
                className={`flex items-center w-full p-3 rounded-lg text-left transition-colors ${currentView === item.key
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
            >
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                        {item.icon}
                        <div className="ml-3">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                    </div>
                    {item.badge && (
                        <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white rounded-full ${item.badgeColor}`}>
                            {item.badge}
                        </span>
                    )}
                </div>
            </button>
        ));
    };

    {/* User Profile Modal */ }
    <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
    />

    return (
        <header className="bg-white shadow-sm border-b">
            {/* Header principal con búsqueda y controles */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo y título */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Activity className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="hidden md:block ml-4">
                            <h1 className="text-xl font-semibold text-gray-900">BookKepper Monitor</h1>
                            <p className="text-sm text-gray-500">Sistema de Monitoreo y Gestión</p>
                        </div>
                    </div>

                    {/* Controles del header */}
                    <div className="flex items-center space-x-4">
                        {/* Estado de conexión */}
                        <div className="hidden sm:flex items-center">
                            {isConnected ? (
                                <div className="flex items-center text-green-600">
                                    <Wifi className="h-4 w-4 mr-1" />
                                    <span className="text-sm">Conectado</span>
                                </div>
                            ) : (
                                <div className="flex items-center text-red-600">
                                    <WifiOff className="h-4 w-4 mr-1" />
                                    <span className="text-sm">Desconectado</span>
                                </div>
                            )}
                        </div>

                        {/* Botón de menú móvil */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        {user && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowProfileModal(true)}
                                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                    title={`Usuario: ${user.name}`}
                                >
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                        <User className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-32 truncate">
                                        {user.name}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Menú móvil */}
            {isMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
                    <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">Navegación</h2>
                                <button
                                    onClick={() => setIsMenuOpen(false)}
                                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-6 overflow-y-auto max-h-screen">
                            {/* Sección principal */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                                    Sistema Principal
                                </h3>
                                <div className="space-y-2">
                                    {renderNavigationItems(mainNavigation)}
                                </div>
                            </div>

                            {/* Sección Ingreso de Facturas */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                                    📋 Ingreso de Facturas
                                </h3>
                                <div className="space-y-2">
                                    {renderNavigationItems(invoiceNavigation)}
                                </div>
                            </div>

                            {/* Sección OCR */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                                    🤖 AI Bookkeeper Assistant
                                </h3>
                                <div className="space-y-2">
                                    {renderNavigationItems(ocrNavigation)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navegación de escritorio */}
            <div className="hidden lg:block border-t">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        {/* Tabs de sección */}
                        <div className="flex">
                            <button
                                onClick={() => setActiveSection('main')}
                                className={`px-4 py-3 text-sm font-medium border-b-2 ${activeSection === 'main'
                                    ? 'text-blue-600 border-blue-600'
                                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Principal
                            </button>
                            <button
                                onClick={() => setActiveSection('invoices')}
                                className={`px-4 py-3 text-sm font-medium border-b-2 ${activeSection === 'invoices'
                                    ? 'text-blue-600 border-blue-600'
                                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                📋 Facturas
                                {invoiceStats.totalPending > 0 && (
                                    <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                        {invoiceStats.totalPending}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveSection('ocr')}
                                className={`px-4 py-3 text-sm font-medium border-b-2 ${activeSection === 'ocr'
                                    ? 'text-blue-600 border-blue-600'
                                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                🤖 AI Assistant
                            </button>
                        </div>
                    </div>

                    {/* Navegación de sección activa */}
                    <div className="py-4">
                        <div className="flex space-x-8 overflow-x-auto">
                            {activeSection === 'main' &&
                                mainNavigation.map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => onViewChange(item.key)}
                                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${currentView === item.key
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {item.icon}
                                        <span className="ml-2">{item.label}</span>
                                        {item.badge && (
                                            <span className={`ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white rounded-full ${item.badgeColor}`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </button>
                                ))
                            }
                            {activeSection === 'invoices' &&
                                invoiceNavigation.map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => onViewChange(item.key)}
                                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${currentView === item.key
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {item.icon}
                                        <span className="ml-2">{item.label}</span>
                                        {item.badge && (
                                            <span className={`ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white rounded-full ${item.badgeColor}`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </button>
                                ))
                            }
                            {activeSection === 'ocr' &&
                                ocrNavigation.map((item) => (
                                    <button
                                        key={item.key}
                                        onClick={() => onViewChange(item.key)}
                                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${currentView === item.key
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {item.icon}
                                        <span className="ml-2">{item.label}</span>
                                        {item.badge && (
                                            <span className={`ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white rounded-full ${item.badgeColor}`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </button>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};