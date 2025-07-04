// src/client/components/common/Header.jsx
import React, { useState } from 'react';
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
    WifiOff
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

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchCuit.trim() && onTaxpayerQuery) {
            onTaxpayerQuery(searchCuit.trim());
            setSearchCuit('');
        }
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

                    {/* Búsqueda */}
                    <div className="hidden md:flex flex-1 max-w-md mx-8">
                        <form onSubmit={handleSearch} className="w-full">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por CUIT (ej: 30500010912)"
                                    value={searchCuit}
                                    onChange={(e) => setSearchCuit(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={loading}
                                />
                                {loading && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    </div>
                                )}
                            </div>
                        </form>
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
                                title={item.description}
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

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2">
                        {/* Alertas badge */}
                        {alertCount > 0 && (
                            <button
                                onClick={() => onViewChange && onViewChange(navigationViews.ALERTS || 'alerts')}
                                className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                                title={`${alertCount} alertas activas`}
                            >
                                <Bell className="h-5 w-5" />
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {alertCount > 99 ? '99+' : alertCount}
                                </span>
                            </button>
                        )}

                        {/* Configuración */}
                        <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors">
                            <Settings className="h-5 w-5" />
                        </button>

                        {/* Menú móvil */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
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
                                onChange={(e) => setSearchCuit(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading}
                            />
                        </div>
                    </form>
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