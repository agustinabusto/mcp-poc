// src/client/components/common/Header.jsx - Versión mejorada con búsqueda funcional
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
    CheckCircle
} from 'lucide-react';

export const Header = ({
    currentView,
    onViewChange,
    onTaxpayerQuery,
    views = {},
    loading = false,
    isConnected = false,
    alertCount = 0
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchCuit, setSearchCuit] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [searchError, setSearchError] = useState(null);

    const searchRef = useRef(null);
    const dropdownRef = useRef(null);

    // Navegación por defecto si no se proporciona views
    const defaultViews = {
        DASHBOARD: "dashboard",
        TAXPAYER: "taxpayer",
        COMPLIANCE: "compliance",
        ALERTS: "alerts",
        METRICS: "metrics",
        GROQ_CHAT: "groq_chat"
    };

    const navigationViews = views && Object.keys(views).length > 0 ? views : defaultViews;

    // Configuración de navegación con iconos y labels
    const navigation = [
        {
            key: navigationViews.DASHBOARD || 'dashboard',
            label: 'Dashboard',
            icon: <BarChart3 className="h-5 w-5" />,
            description: 'Vista general del sistema'
        },
        {
            key: navigationViews.ALERTS || 'alerts',
            label: 'Alertas',
            icon: <AlertTriangle className="h-5 w-5" />,
            description: 'Panel de alertas activas',
            badge: alertCount > 0 ? alertCount : null
        },
        {
            key: navigationViews.METRICS || 'metrics',
            label: 'Métricas',
            icon: <Activity className="h-5 w-5" />,
            description: 'Métricas del sistema'
        },
        {
            key: navigationViews.GROQ_CHAT || 'groq_chat',
            label: 'Chat IA',
            icon: <MessageSquare className="h-5 w-5" />,
            description: 'Chat con IA Groq'
        }
    ];

    // CUITs de prueba conocidos para autocomplete
    const knownCuits = [
        { cuit: '30500010912', name: 'MERCADOLIBRE S.R.L.', type: 'success' },
        { cuit: '27230938607', name: 'RODRIGUEZ MARIA LAURA', type: 'success' },
        { cuit: '20123456789', name: 'GARCIA CARLOS ALBERTO', type: 'success' },
        { cuit: '20111222333', name: 'LOPEZ JUAN CARLOS - SIN ACTIVIDADES', type: 'warning' },
        { cuit: '27999888777', name: 'GOMEZ CARLOS ALBERTO - MONOTRIBUTO VENCIDO', type: 'warning' },
        { cuit: '30555666777', name: 'SERVICIOS DISCONTINUADOS S.R.L. - INACTIVO', type: 'error' },
        { cuit: '30777888999', name: 'CONSTRUCTORA IRREGULAR S.A. - PROBLEMAS LABORALES', type: 'error' }
    ];

    // Cargar historial del localStorage
    useEffect(() => {
        const saved = localStorage.getItem('afip_search_history');
        if (saved) {
            try {
                setSearchHistory(JSON.parse(saved));
            } catch (e) {
                console.warn('Error loading search history:', e);
            }
        }
    }, []);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowSearchDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Validar formato CUIT
    const validateCuit = (cuit) => {
        const cleanCuit = cuit.replace(/[-\s]/g, '');
        if (!/^\d{11}$/.test(cleanCuit)) {
            return { valid: false, message: 'CUIT debe tener 11 dígitos' };
        }
        return { valid: true, message: '' };
    };

    // Manejar cambio en input de búsqueda
    const handleSearchInputChange = (e) => {
        const value = e.target.value;
        setSearchCuit(value);
        setSearchError(null);

        // Mostrar sugerencias si hay texto
        if (value.length > 0) {
            const filtered = knownCuits.filter(item =>
                item.cuit.includes(value) ||
                item.name.toLowerCase().includes(value.toLowerCase())
            );
            setSearchSuggestions(filtered.slice(0, 5));
            setShowSearchDropdown(true);
        } else {
            setSearchSuggestions([]);
            setShowSearchDropdown(false);
        }
    };

    // Manejar búsqueda
    const handleSearch = async (e, searchValue = null) => {
        e.preventDefault();

        const cuitToSearch = searchValue || searchCuit.trim();
        if (!cuitToSearch) return;

        // Validar formato
        const validation = validateCuit(cuitToSearch);
        if (!validation.valid) {
            setSearchError(validation.message);
            return;
        }

        setIsSearching(true);
        setSearchError(null);
        setShowSearchDropdown(false);

        try {
            // Agregar al historial
            const historyItem = {
                cuit: cuitToSearch,
                timestamp: new Date().toISOString(),
                name: knownCuits.find(k => k.cuit === cuitToSearch)?.name || 'Contribuyente'
            };

            const newHistory = [historyItem, ...searchHistory.filter(h => h.cuit !== cuitToSearch)].slice(0, 10);
            setSearchHistory(newHistory);
            localStorage.setItem('afip_search_history', JSON.stringify(newHistory));

            // Ejecutar búsqueda
            if (onTaxpayerQuery) {
                await onTaxpayerQuery(cuitToSearch);
                setSearchCuit('');
            }

        } catch (error) {
            console.error('Search error:', error);
            setSearchError('Error en la búsqueda. Intente nuevamente.');
        } finally {
            setIsSearching(false);
        }
    };

    // Manejar selección de sugerencia
    const handleSuggestionSelect = (suggestion) => {
        setSearchCuit(suggestion.cuit);
        setShowSearchDropdown(false);
        // Simular submit
        const fakeEvent = { preventDefault: () => { } };
        handleSearch(fakeEvent, suggestion.cuit);
    };

    // Limpiar historial
    const clearSearchHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('afip_search_history');
    };

    const getConnectionStatus = () => {
        if (isConnected) {
            return {
                icon: <Wifi className="h-4 w-4 text-green-600" />,
                text: 'Conectado',
                color: 'text-green-600'
            };
        } else {
            return {
                icon: <WifiOff className="h-4 w-4 text-red-600" />,
                text: 'Desconectado',
                color: 'text-red-600'
            };
        }
    };

    const connectionStatus = getConnectionStatus();

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo y título */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                                <Activity className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">AFIP Monitor</h1>
                                <p className="text-xs text-gray-500">MCP System</p>
                            </div>
                        </div>

                        {/* Estado de conexión */}
                        <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 ${connectionStatus.color}`}>
                            {connectionStatus.icon}
                            <span className="text-sm font-medium">{connectionStatus.text}</span>
                        </div>
                    </div>

                    {/* Búsqueda mejorada */}
                    <div className="hidden md:flex flex-1 max-w-md mx-8 relative" ref={dropdownRef}>
                        <form onSubmit={handleSearch} className="w-full">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder="Buscar por CUIT (ej: 30500010912)"
                                    value={searchCuit}
                                    onChange={handleSearchInputChange}
                                    onFocus={() => {
                                        if (searchHistory.length > 0 && !searchCuit) {
                                            setShowSearchDropdown(true);
                                        }
                                    }}
                                    className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${searchError ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    disabled={loading || isSearching}
                                />
                                {(loading || isSearching) && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    </div>
                                )}
                                {searchError && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                    </div>
                                )}
                            </div>
                        </form>

                        {/* Dropdown de sugerencias e historial */}
                        {showSearchDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                                {/* Sugerencias */}
                                {searchSuggestions.length > 0 && (
                                    <div className="p-2">
                                        <div className="text-xs font-medium text-gray-500 px-2 py-1">Sugerencias</div>
                                        {searchSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSuggestionSelect(suggestion)}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-3"
                                            >
                                                <User className="h-4 w-4 text-gray-400" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900">{suggestion.cuit}</div>
                                                    <div className="text-sm text-gray-600 truncate">{suggestion.name}</div>
                                                </div>
                                                <div className={`w-2 h-2 rounded-full ${suggestion.type === 'success' ? 'bg-green-500' :
                                                        suggestion.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}></div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Historial */}
                                {searchHistory.length > 0 && searchSuggestions.length === 0 && (
                                    <div className="p-2">
                                        <div className="flex items-center justify-between px-2 py-1">
                                            <div className="text-xs font-medium text-gray-500">Búsquedas recientes</div>
                                            <button
                                                onClick={clearSearchHistory}
                                                className="text-xs text-blue-600 hover:text-blue-800"
                                            >
                                                Limpiar
                                            </button>
                                        </div>
                                        {searchHistory.slice(0, 5).map((item, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSuggestionSelect(item)}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-3"
                                            >
                                                <History className="h-4 w-4 text-gray-400" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900">{item.cuit}</div>
                                                    <div className="text-sm text-gray-600 truncate">{item.name}</div>
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {new Date(item.timestamp).toLocaleDateString()}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Estado vacío */}
                                {searchSuggestions.length === 0 && searchHistory.length === 0 && searchCuit.length === 0 && (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                        Ingrese un CUIT para buscar contribuyentes
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error de búsqueda */}
                        {searchError && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-red-50 border border-red-200 rounded-lg p-2 z-50">
                                <div className="flex items-center gap-2 text-red-700 text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    {searchError}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navegación Desktop */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {navigation.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => onViewChange && onViewChange(item.key)}
                                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === item.key
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                                {item.badge && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Botón menú móvil */}
                    <div className="lg:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                        >
                            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* Búsqueda móvil */}
                <div className="md:hidden pb-4">
                    <form onSubmit={handleSearch}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por CUIT"
                                value={searchCuit}
                                onChange={handleSearchInputChange}
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${searchError ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                disabled={loading || isSearching}
                            />
                            {(loading || isSearching) && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                </div>
                            )}
                        </div>
                    </form>
                    {searchError && (
                        <div className="mt-2 flex items-center gap-2 text-red-700 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {searchError}
                        </div>
                    )}
                </div>

                {/* Menú móvil desplegable */}
                {isMenuOpen && (
                    <div className="lg:hidden border-t border-gray-200 py-4">
                        <nav className="space-y-2">
                            {navigation.map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => {
                                        onViewChange && onViewChange(item.key);
                                        setIsMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${currentView === item.key
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {item.icon}
                                    <div className="flex-1">
                                        <div className="font-medium">{item.label}</div>
                                        <div className="text-xs text-gray-500">{item.description}</div>
                                    </div>
                                    {item.badge && (
                                        <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>

                        {/* Estado de conexión móvil */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className={`flex items-center gap-2 px-4 py-2 ${connectionStatus.color}`}>
                                {connectionStatus.icon}
                                <span className="text-sm font-medium">{connectionStatus.text}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};