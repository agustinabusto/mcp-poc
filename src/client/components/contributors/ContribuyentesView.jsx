// src/client/components/contributors/ContribuyentesView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Upload,
    Users,
    Download,
    Plus,
    FileText,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Edit,
    Trash2,
    Filter,
    Search,
    RefreshCw,
    FileSpreadsheet,
    User,
    Building,
    Calendar,
    DollarSign,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Minus
} from 'lucide-react';

// Componentes específicos
import ClientImportModal from './ClientImportModal.jsx';
import ClientListView from './ClientListView.jsx';
import ClientDetailModal from './ClientDetailModal.jsx';
import ComplianceIndicator from './ComplianceIndicator.jsx';

// Hooks y servicios
import { useContributors } from '../../hooks/useContributors.js';
import { contributorsService } from '../../services/contributors-service.js';

const ContribuyentesView = () => {
    // Estados principales
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'import', 'list'
    const [showImportModal, setShowImportModal] = useState(false);
    const [showClientDetail, setShowClientDetail] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [importType, setImportType] = useState('individual'); // 'individual', 'batch'

    // Datos y estados de carga
    const {
        clients,
        loading,
        error,
        metrics,
        filters,
        pagination,
        loadClients,
        createClient,
        updateClient,
        deleteClient,
        importClients,
        refreshClient
    } = useContributors();

    // Estados de filtros y búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [complianceFilter, setComplianceFilter] = useState('all');

    // Cargar datos iniciales
    useEffect(() => {
        loadClients();
    }, [loadClients]);

    // Manejadores de eventos
    const handleImportClick = useCallback((type) => {
        setImportType(type);
        setShowImportModal(true);
    }, []);

    const handleClientClick = useCallback((client) => {
        setSelectedClient(client);
        setShowClientDetail(true);
    }, []);

    const handleImportComplete = useCallback(async (importData) => {
        try {
            await importClients(importData);
            setShowImportModal(false);
            loadClients(); // Recargar lista
        } catch (error) {
            console.error('Error importing clients:', error);
        }
    }, [importClients, loadClients]);

    const handleRefreshClient = useCallback(async (cuit) => {
        try {
            await refreshClient(cuit);
            loadClients(); // Recargar lista
        } catch (error) {
            console.error('Error refreshing client:', error);
        }
    }, [refreshClient, loadClients]);

    // Filtrar clientes según criterios
    const filteredClients = clients.filter(client => {
        const matchesSearch = !searchTerm ||
            client.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.cuit.includes(searchTerm);

        const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

        const matchesCompliance = complianceFilter === 'all' ||
            client.complianceStatus === complianceFilter;

        return matchesSearch && matchesStatus && matchesCompliance;
    });

    // Dashboard Stats
    const stats = {
        total: metrics.totalClients || 0,
        compliant: metrics.compliantClients || 0,
        nonCompliant: metrics.nonCompliantClients || 0,
        pending: metrics.pendingClients || 0
    };

    if (loading && !clients.length) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Cargando contribuyentes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Contribuyentes</h1>
                        <p className="text-gray-600 mt-1">
                            Gestión de clientes del estudio contable
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                        <button
                            onClick={() => handleImportClick('individual')}
                            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 
                                     rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white 
                                     hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
                                     focus:ring-blue-500 transition-colors"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Cliente
                        </button>

                        <button
                            onClick={() => handleImportClick('batch')}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent 
                                     rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 
                                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                                     focus:ring-blue-500 transition-colors"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Importar Lote
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">En Compliance</p>
                            <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">No Compliance</p>
                            <p className="text-2xl font-bold text-red-600">{stats.nonCompliant}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Pendientes</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por CUIT o razón social..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 
                                         focus:ring-blue-500 focus:border-blue-500 w-full sm:w-80"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 
                                     focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                            <option value="suspended">Suspendidos</option>
                        </select>

                        {/* Compliance Filter */}
                        <select
                            value={complianceFilter}
                            onChange={(e) => setComplianceFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 
                                     focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">Todo compliance</option>
                            <option value="compliant">En compliance</option>
                            <option value="non_compliant">Sin compliance</option>
                            <option value="pending">Pendiente</option>
                        </select>
                    </div>

                    <button
                        onClick={loadClients}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 
                                 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white 
                                 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
                                 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
                        <div>
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <p className="text-sm text-red-700 mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Client List */}
            <ClientListView
                clients={filteredClients}
                loading={loading}
                onClientClick={handleClientClick}
                onRefreshClient={handleRefreshClient}
            />

            {/* Modals */}
            {showImportModal && (
                <ClientImportModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onImport={handleImportComplete}
                    importType={importType}
                />
            )}

            {showClientDetail && selectedClient && (
                <ClientDetailModal
                    isOpen={showClientDetail}
                    onClose={() => setShowClientDetail(false)}
                    client={selectedClient}
                    onUpdate={(updatedClient) => {
                        updateClient(updatedClient);
                        setSelectedClient(updatedClient);
                    }}
                />
            )}
        </div>
    );
};

export default ContribuyentesView;