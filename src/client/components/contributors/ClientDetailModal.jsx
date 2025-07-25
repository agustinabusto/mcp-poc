// src/client/components/contributors/ClientDetailModal.jsx
import React, { useState, useEffect } from 'react';
import {
    X,
    Building,
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    DollarSign,
    FileText,
    RefreshCw,
    Edit,
    Save,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Download,
    Filter,
    Search,
    TrendingUp,
    TrendingDown,
    Activity,
    Shield,
    AlertCircle
} from 'lucide-react';

import ComplianceIndicator, { ComplianceDetails, ComplianceGroup } from './ComplianceIndicator.jsx';

const ClientDetailModal = ({
    isOpen,
    onClose,
    client,
    onUpdate
}) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [editMode, setEditMode] = useState(false);
    const [editedClient, setEditedClient] = useState(client);
    const [loading, setLoading] = useState(false);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [invoiceFilter, setInvoiceFilter] = useState('all');
    const [invoiceSearch, setInvoiceSearch] = useState('');

    // Actualizar datos editados cuando cambia el cliente
    useEffect(() => {
        if (client) {
            setEditedClient(client);
        }
    }, [client]);

    // Cargar facturas cuando se abre el modal o cambia el cliente
    useEffect(() => {
        if (isOpen && client) {
            loadClientInvoices();
        }
    }, [isOpen, client]);

    // Cargar facturas del cliente
    const loadClientInvoices = async () => {
        setInvoicesLoading(true);
        try {
            // Simulación de carga de facturas - reemplazar con API real
            await new Promise(resolve => setTimeout(resolve, 1000));

            const mockInvoices = [
                {
                    id: 1,
                    number: '0001-00000123',
                    type: 'A',
                    date: '2025-01-15',
                    amount: 121000,
                    status: 'approved',
                    arcaStatus: 'sent',
                    cae: 'CAE12345678901234',
                    concept: 'Servicios profesionales'
                },
                {
                    id: 2,
                    number: '0001-00000124',
                    type: 'B',
                    date: '2025-01-10',
                    amount: 45000,
                    status: 'pending',
                    arcaStatus: 'processing',
                    cae: null,
                    concept: 'Consultoría técnica'
                },
                {
                    id: 3,
                    number: '0001-00000125',
                    type: 'A',
                    date: '2025-01-05',
                    amount: 89500,
                    status: 'error',
                    arcaStatus: 'rejected',
                    cae: null,
                    concept: 'Servicios de desarrollo',
                    error: 'CUIT receptor inválido'
                }
            ];

            setInvoices(mockInvoices);
        } catch (error) {
            console.error('Error loading invoices:', error);
        } finally {
            setInvoicesLoading(false);
        }
    };

    // Manejar cambios en el formulario de edición
    const handleInputChange = (field, value) => {
        setEditedClient(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Guardar cambios
    const handleSave = async () => {
        setLoading(true);
        try {
            await onUpdate(editedClient);
            setEditMode(false);
        } catch (error) {
            console.error('Error updating client:', error);
        } finally {
            setLoading(false);
        }
    };

    // Cancelar edición
    const handleCancel = () => {
        setEditedClient(client);
        setEditMode(false);
    };

    // Filtrar facturas
    const filteredInvoices = invoices.filter(invoice => {
        const matchesFilter = invoiceFilter === 'all' || invoice.status === invoiceFilter;
        const matchesSearch = !invoiceSearch ||
            invoice.number.includes(invoiceSearch) ||
            invoice.concept.toLowerCase().includes(invoiceSearch.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    // Estadísticas de compliance
    const complianceItems = [
        {
            label: 'Régimen IVA',
            status: client?.ivaStatus === 'Responsable Inscripto' ? 'compliant' : 'warning',
            type: 'compliance',
            details: { lastCheck: client?.lastIvaCheck }
        },
        {
            label: 'Monotributo',
            status: client?.monotributoStatus === 'Activo' ? 'compliant' : 'non_compliant',
            type: 'compliance',
            details: { lastCheck: client?.lastMonotributoCheck }
        },
        {
            label: 'Ganancias',
            status: client?.gananciasStatus === 'Activo' ? 'compliant' : 'warning',
            type: 'compliance',
            details: { lastCheck: client?.lastGananciasCheck }
        },
        {
            label: 'Seg. Social',
            status: client?.socialSecurityStatus === 'Al día' ? 'compliant' : 'non_compliant',
            type: 'compliance',
            details: { lastCheck: client?.lastSocialSecurityCheck }
        }
    ];

    // Estadísticas de facturas
    const invoiceStats = {
        total: invoices.length,
        approved: invoices.filter(inv => inv.status === 'approved').length,
        pending: invoices.filter(inv => inv.status === 'pending').length,
        errors: invoices.filter(inv => inv.status === 'error').length,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0)
    };

    if (!isOpen || !client) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

                <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Building className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                    {client.businessName}
                                </h3>
                                <p className="text-sm text-gray-600 font-mono">
                                    CUIT: {client.cuit}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            {!editMode ? (
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        Guardar
                                    </button>
                                </>
                            )}

                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            {[
                                { id: 'overview', label: 'Resumen', icon: Activity },
                                { id: 'compliance', label: 'Compliance', icon: Shield },
                                { id: 'invoices', label: 'Facturas', icon: FileText }
                            ].map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4 mr-2" />
                                        {tab.label}
                                        {tab.id === 'invoices' && invoices.length > 0 && (
                                            <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                                                {invoices.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Client Info Cards */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Basic Info */}
                                    <div className="bg-gray-50 rounded-lg p-6">
                                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                                            Información Básica
                                        </h4>
                                        <div className="space-y-4">
                                            {editMode ? (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Razón Social
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editedClient.businessName}
                                                            onChange={(e) => handleInputChange('businessName', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Email
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={editedClient.email || ''}
                                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Teléfono
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editedClient.phone || ''}
                                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Dirección
                                                        </label>
                                                        <textarea
                                                            value={editedClient.address || ''}
                                                            onChange={(e) => handleInputChange('address', e.target.value)}
                                                            rows="3"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center">
                                                        <Mail className="h-4 w-4 text-gray-400 mr-3" />
                                                        <span className="text-sm text-gray-900">
                                                            {client.email || 'No especificado'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Phone className="h-4 w-4 text-gray-400 mr-3" />
                                                        <span className="text-sm text-gray-900">
                                                            {client.phone || 'No especificado'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-start">
                                                        <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                                                        <span className="text-sm text-gray-900">
                                                            {client.address || 'No especificado'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                                                        <span className="text-sm text-gray-900">
                                                            Cliente desde: {client.createdAt ?
                                                                new Date(client.createdAt).toLocaleDateString('es-AR') :
                                                                'No disponible'
                                                            }
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Overview */}
                                    <div className="bg-gray-50 rounded-lg p-6">
                                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                                            Estado General
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Estado ARCA</span>
                                                <ComplianceIndicator
                                                    status={client.arcaStatus}
                                                    type="arca"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Compliance General</span>
                                                <ComplianceIndicator
                                                    status={client.complianceStatus}
                                                    type="compliance"
                                                    details={client.complianceDetails}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Última Actualización</span>
                                                <span className="text-sm text-gray-900">
                                                    {client.lastUpdate ?
                                                        new Date(client.lastUpdate).toLocaleDateString('es-AR') :
                                                        'Nunca'
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Invoice Summary */}
                                <div className="bg-white border border-gray-200 rounded-lg p-6">
                                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                                        Resumen de Facturas
                                    </h4>
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-900">
                                                {invoiceStats.total}
                                            </div>
                                            <div className="text-sm text-gray-600">Total</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {invoiceStats.approved}
                                            </div>
                                            <div className="text-sm text-gray-600">Aprobadas</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-yellow-600">
                                                {invoiceStats.pending}
                                            </div>
                                            <div className="text-sm text-gray-600">Pendientes</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600">
                                                {invoiceStats.errors}
                                            </div>
                                            <div className="text-sm text-gray-600">Errores</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                ${invoiceStats.totalAmount.toLocaleString('es-AR')}
                                            </div>
                                            <div className="text-sm text-gray-600">Monto Total</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Compliance Tab */}
                        {activeTab === 'compliance' && (
                            <div className="space-y-6">
                                {/* Main Compliance Status */}
                                <div className="bg-white border border-gray-200 rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-medium text-gray-900">
                                            Estado de Compliance
                                        </h4>
                                        <ComplianceIndicator
                                            status={client.complianceStatus}
                                            type="compliance"
                                            size="lg"
                                        />
                                    </div>

                                    <ComplianceGroup
                                        items={complianceItems}
                                        title="Obligaciones Fiscales"
                                    />

                                    {client.complianceDetails && (
                                        <ComplianceDetails
                                            details={client.complianceDetails}
                                            type="compliance"
                                        />
                                    )}
                                </div>

                                {/* ARCA Status Details */}
                                <div className="bg-white border border-gray-200 rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-medium text-gray-900">
                                            Estado en ARCA
                                        </h4>
                                        <ComplianceIndicator
                                            status={client.arcaStatus}
                                            type="arca"
                                            size="lg"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <h5 className="font-medium text-gray-900 mb-2">Información Fiscal</h5>
                                            <div className="space-y-2 text-gray-600">
                                                <div>Régimen IVA: {client.ivaStatus || 'No disponible'}</div>
                                                <div>Monotributo: {client.monotributoStatus || 'No disponible'}</div>
                                                <div>Ganancias: {client.gananciasStatus || 'No disponible'}</div>
                                                <div>Seguridad Social: {client.socialSecurityStatus || 'No disponible'}</div>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="font-medium text-gray-900 mb-2">Últimas Verificaciones</h5>
                                            <div className="space-y-2 text-gray-600">
                                                <div>IVA: {client.lastIvaCheck ? new Date(client.lastIvaCheck).toLocaleDateString('es-AR') : 'Nunca'}</div>
                                                <div>Monotributo: {client.lastMonotributoCheck ? new Date(client.lastMonotributoCheck).toLocaleDateString('es-AR') : 'Nunca'}</div>
                                                <div>Ganancias: {client.lastGananciasCheck ? new Date(client.lastGananciasCheck).toLocaleDateString('es-AR') : 'Nunca'}</div>
                                                <div>Seg. Social: {client.lastSocialSecurityCheck ? new Date(client.lastSocialSecurityCheck).toLocaleDateString('es-AR') : 'Nunca'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Invoices Tab */}
                        {activeTab === 'invoices' && (
                            <div className="space-y-6">
                                {/* Filters */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar facturas..."
                                                value={invoiceSearch}
                                                onChange={(e) => setInvoiceSearch(e.target.value)}
                                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                                            />
                                        </div>

                                        <select
                                            value={invoiceFilter}
                                            onChange={(e) => setInvoiceFilter(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="all">Todos los estados</option>
                                            <option value="approved">Aprobadas</option>
                                            <option value="pending">Pendientes</option>
                                            <option value="error">Con errores</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={loadClientInvoices}
                                        disabled={invoicesLoading}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-2 ${invoicesLoading ? 'animate-spin' : ''}`} />
                                        Actualizar
                                    </button>
                                </div>

                                {/* Invoices Table */}
                                {invoicesLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                                        <span className="text-gray-600">Cargando facturas...</span>
                                    </div>
                                ) : filteredInvoices.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            No hay facturas
                                        </h3>
                                        <p className="text-gray-500">
                                            {invoiceSearch || invoiceFilter !== 'all'
                                                ? 'No se encontraron facturas con los filtros aplicados'
                                                : 'Este cliente no tiene facturas registradas'
                                            }
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                        {/* Desktop Table */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Número
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Tipo
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Fecha
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Monto
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Estado
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            CAE
                                                        </th>
                                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Acciones
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {filteredInvoices.map((invoice) => (
                                                        <tr key={invoice.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                                                {invoice.number}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    Tipo {invoice.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {new Date(invoice.date).toLocaleDateString('es-AR')}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                ${invoice.amount.toLocaleString('es-AR')}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <ComplianceIndicator
                                                                    status={invoice.status}
                                                                    type="compliance"
                                                                    size="sm"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                                {invoice.cae || 'Pendiente'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <button
                                                                    className="text-blue-600 hover:text-blue-900 mr-3"
                                                                    title="Ver detalles"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </button>
                                                                {invoice.cae && (
                                                                    <button
                                                                        className="text-gray-600 hover:text-gray-900"
                                                                        title="Descargar PDF"
                                                                    >
                                                                        <Download className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Cards */}
                                        <div className="md:hidden divide-y divide-gray-200">
                                            {filteredInvoices.map((invoice) => (
                                                <div key={invoice.id} className="p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 font-mono">
                                                                {invoice.number}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                {invoice.concept}
                                                            </p>
                                                        </div>
                                                        <ComplianceIndicator
                                                            status={invoice.status}
                                                            type="compliance"
                                                            size="sm"
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between text-sm">
                                                        <div>
                                                            <span className="text-gray-500">Tipo {invoice.type}</span>
                                                            <span className="mx-2 text-gray-300">•</span>
                                                            <span className="text-gray-500">
                                                                {new Date(invoice.date).toLocaleDateString('es-AR')}
                                                            </span>
                                                        </div>
                                                        <div className="font-medium text-gray-900">
                                                            ${invoice.amount.toLocaleString('es-AR')}
                                                        </div>
                                                    </div>

                                                    {invoice.cae && (
                                                        <div className="text-xs text-gray-500 font-mono">
                                                            CAE: {invoice.cae}
                                                        </div>
                                                    )}

                                                    {invoice.error && (
                                                        <div className="text-xs text-red-600">
                                                            Error: {invoice.error}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDetailModal;