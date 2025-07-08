// src/client/components/common/Header.jsx - Versión actualizada con OCR
import React, { useState, useRef, useEffect } from 'react';
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
    // Nuevos iconos para OCR
    Camera,
    Calculator,
    Bot,
    FileText,
    Upload,
    TrendingUp,
    PieChart,
    Database
} from 'lucide-react';

export const Header = ({
    currentView,
    onViewChange,
    onTaxpayerQuery,
    views = {},
    loading = false,
    isConnected = false,
    alertCount = 0,
    ocrStats = {} // Nuevas estadísticas OCR
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchCuit, setSearchCuit] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [searchError, setSearchError] = useState(null);
    const [activeSection, setActiveSection] = useState('main'); // 'main' o 'ocr'

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
        // Nuevas vistas OCR
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
            section: 'main'
        },
        {
            key: navigationViews.METRICS || 'metrics',
            label: 'Métricas',
            icon: <Activity className="h-5 w-5" />,
            description: 'Métricas del sistema',
            section: 'main'
        },
        {
            key: navigationViews.GROQ_CHAT || 'groq_chat',
            label: 'Chat IA',
            icon: <MessageSquare className="h-5 w-5" />,
            description: 'Chat con IA Groq',
            section: 'main'
        }
    ];

    // Configuración de navegación OCR
    const ocrNavigation = [
        {
            key: navigationViews.OCR_PROCESSING || 'ocr_processing',
            label: 'Procesamiento OCR',
            icon: <Camera className="h-5 w-5" />,
            description: 'Procesamiento de documentos',
            badge: ocrStats.totalInQueue > 0 ? ocrStats.totalInQueue : null,
            section: 'ocr'
        },
        {
            key: navigationViews.BANK_RECONCILIATION || 'bank_reconciliation',
            label: 'Conciliación',
            icon: <Calculator className="h-5 w-5" />,
            description: 'Conciliación bancaria automática',
            section: 'ocr'
        },
        {
            key: navigationViews.TRANSACTION_CATEGORIZATION || 'transaction_categorization',
            label: 'Categorización',
            icon: <Bot className="h-5 w-5" />,
            description: 'Categorización de transacciones',
            section: 'ocr'
        },
        {
            key: navigationViews.OCR_METRICS || 'ocr_metrics',
            label: 'Métricas OCR',
            icon: <TrendingUp className="h-5 w-5" />,
            description: 'Estadísticas de OCR',
            section: 'ocr'
        }
    ];

    // Combinar navegación
    const allNavigation = [...mainNavigation, ...ocrNavigation];

    // CUITs de prueba conocidos para autocomplete
    const knownCuits = [
        { cuit: '30500010912', name: 'MERCADOLIBRE S.R.L.', type: 'success' },
        { cuit: '27230938607', name: 'RODRIGUEZ MARIA LAURA', type: 'success' },
        { cuit: '20123456789', name: 'GARCIA CARLOS ALBERTO', type: 'success' },
        { cuit: '20111222333', name: 'LOPEZ JUAN CARLOS - SIN ACTIVIDADES', type: 'warning' },
        { cuit: '27999888777', name: 'GOMEZ CARLOS ALBERTO - MONOTRIBUTO VENCIDO', type: 'warning' },
        { cuit: '30555666777', name: 'SERVICIOS DISCONTINUADOS S.R.L.', type: 'error' }
    ];

    // Manejar búsqueda
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchCuit.trim()) return;

        setIsSearching(true);
        setSearchError(null);

        try {
            await onTaxpayerQuery(searchCuit.trim());

            // Agregar a historial
            const newHistoryItem = {
                cuit: searchCuit.trim(),
                timestamp: new Date().toISOString(),
                id: Date.now()
            };

            setSearchHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]);
            setSearchCuit('');
            setShowSearchDropdown(false);
        } catch (error) {
            setSearchError(error.message);
        } finally {
            setIsSearching(false);
        }
    };

    // Manejar cambio en el campo de búsqueda
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchCuit(value);

        if (value.length > 0) {
            const suggestions = knownCuits.filter(item =>
                item.cuit.includes(value) ||
                item.name.toLowerCase().includes(value.toLowerCase())
            );
            setSearchSuggestions(suggestions);
            setShowSearchDropdown(true);
        } else {
            setShowSearchDropdown(false);
        }
    };

    // Manejar selección de sugerencia
    const handleSuggestionClick = (suggestion) => {
        setSearchCuit(suggestion.cuit);
        setShowSearchDropdown(false);
        onTaxpayerQuery(suggestion.cuit);
    };

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowSearchDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Determinar sección activa basada en la vista actual
    useEffect(() => {
        const currentNavItem = allNavigation.find(item => item.key === currentView);
        if (currentNavItem) {
            setActiveSection(currentNavItem.section);
        }
    }, [currentView]);

    const renderNavigationItems = (items) => {
        return items.map((item) => (
            <button
                key={item.key}
                onClick={() => {
                    onViewChange(item.key);
                    setIsMenuOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors ${currentView === item.key
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                disabled={loading}
            >
                <span className="mr-3">{item.icon}</span>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-2">
                                {item.badge}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">{item.description}</p>
                </div>
            </button>
        ));
    };

    return (
        <header className="bg-white shadow-sm border-b sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo y título */}
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        >
                            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>

                        <div className="flex items-center ml-2 lg:ml-0">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Database className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">
                                        AFIP Monitor MCP
                                    </h1>
                                    <p className="text-xs text-gray-500 hidden sm:block">
                                        Con AI Bookkeeper Assistant
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Barra de búsqueda */}
                    <div className="flex-1 max-w-md mx-8 hidden md:block">
                        <div className="relative" ref={dropdownRef}>
                            <form onSubmit={handleSearch}>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        ref={searchRef}
                                        type="text"
                                        value={searchCuit}
                                        onChange={handleSearchChange}
                                        placeholder="Buscar CUIT (ej: 30500010912)"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        disabled={loading || isSearching}
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                        </div>
                                    )}
                                </div>
                            </form>

                            {/* Dropdown de sugerencias */}
                            {showSearchDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                    {searchSuggestions.length > 0 ? (
                                        <div className="py-2">
                                            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                                Sugerencias
                                            </div>
                                            {searchSuggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion.cuit}
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                                                >
                                                    <div>
                                                        <div className="font-medium text-gray-900">{suggestion.cuit}</div>
                                                        <div className="text-sm text-gray-500">{suggestion.name}</div>
                                                    </div>
                                                    <div className={`w-3 h-3 rounded-full ${suggestion.type === 'success' ? 'bg-green-500' :
                                                            suggestion.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}></div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-4 text-center text-gray-500">
                                            No se encontraron sugerencias
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Indicadores de estado y notificaciones */}
                    <div className="flex items-center space-x-4">
                        {/* Indicador de conexión */}
                        <div className="flex items-center space-x-2">
                            {isConnected ? (
                                <Wifi className="h-5 w-5 text-green-500" />
                            ) : (
                                <WifiOff className="h-5 w-5 text-red-500" />
                            )}
                            <span className="hidden sm:inline text-sm text-gray-600">
                                {isConnected ? 'Conectado' : 'Desconectado'}
                            </span>
                        </div>

                        {/* Estadísticas OCR rápidas */}
                        {ocrStats.documentsProcessed > 0 && (
                            <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-600">
                                <Camera className="h-4 w-4" />
                                <span>{ocrStats.documentsProcessed} docs</span>
                            </div>
                        )}

                        {/* Notificaciones */}
                        <div className="relative">
                            <Bell className="h-6 w-6 text-gray-500 hover:text-gray-700 cursor-pointer" />
                            {alertCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {alertCount}
                                </span>
                            )}
                        </div>

                        {/* Configuración */}
                        <Settings className="h-6 w-6 text-gray-500 hover:text-gray-700 cursor-pointer" />
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

                        <div className="p-4 space-y-6">
                            {/* Sección principal */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                                    Sistema Principal
                                </h3>
                                <div className="space-y-2">
                                    {renderNavigationItems(mainNavigation)}
                                </div>
                            </div>

                            {/* Sección OCR */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                                    AI Bookkeeper Assistant
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
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Sistema Principal
                            </button>
                            <button
                                onClick={() => setActiveSection('ocr')}
                                className={`px-4 py-3 text-sm font-medium border-b-2 ${activeSection === 'ocr'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                AI Bookkeeper Assistant
                                {ocrStats.totalInQueue > 0 && (
                                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1">
                                        {ocrStats.totalInQueue}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Navegación horizontal */}
                        <div className="flex-1 flex space-x-1">
                            {(activeSection === 'main' ? mainNavigation : ocrNavigation).map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => onViewChange(item.key)}
                                    className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${currentView === item.key
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    disabled={loading}
                                    title={item.description}
                                >
                                    <span className="mr-2">{item.icon}</span>
                                    <span className="hidden xl:inline">{item.label}</span>
                                    {item.badge && (
                                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] h-5 flex items-center justify-center">
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra de búsqueda móvil */}
            <div className="md:hidden p-4 border-t">
                <div className="relative" ref={dropdownRef}>
                    <form onSubmit={handleSearch}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchCuit}
                                onChange={handleSearchChange}
                                placeholder="Buscar CUIT..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={loading || isSearching}
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                </div>
                            )}
                        </div>
                    </form>

                    {/* Dropdown móvil */}
                    {showSearchDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                            {searchSuggestions.length > 0 ? (
                                <div className="py-2">
                                    {searchSuggestions.map((suggestion) => (
                                        <button
                                            key={suggestion.cuit}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                                        >
                                            <div>
                                                <div className="font-medium text-gray-900">{suggestion.cuit}</div>
                                                <div className="text-sm text-gray-500">{suggestion.name}</div>
                                            </div>
                                            <div className={`w-3 h-3 rounded-full ${suggestion.type === 'success' ? 'bg-green-500' :
                                                    suggestion.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}></div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-4 text-center text-gray-500">
                                    No se encontraron sugerencias
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Indicador de carga global */}
            {loading && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                    <div className="h-full bg-blue-500 animate-pulse"></div>
                </div>
            )}

            {/* Error de búsqueda */}
            {searchError && (
                <div className="absolute top-full left-0 right-0 bg-red-50 border-l-4 border-red-400 p-4 z-40">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                        <p className="text-sm text-red-700">{searchError}</p>
                        <button
                            onClick={() => setSearchError(null)}
                            className="ml-auto text-red-400 hover:text-red-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;