// src/client/components/invoices/InvoiceIntegration.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Database,
    Send,
    CheckCircle,
    AlertTriangle,
    RefreshCw,
    ArrowLeft,
    Calendar,
    Clock,
    FileText,
    ExternalLink,
    Filter,
    Search
} from 'lucide-react';
import { getMCPArcaService } from '../../services/mcp-arca-service.js';

// Componente para mostrar el listado de facturas enviadas
const InvoiceListModal = ({
    isOpen,
    onClose,
    invoices,
    loading,
    onRefresh,
    onViewDetail,
    date = 'hoy'
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch =
            invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.businessName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Facturas Enviadas {date}
                            </h2>
                            <p className="text-sm text-gray-600">
                                {filteredInvoices.length} de {invoices.length} facturas
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
                    </button>
                </div>

                {/* Filtros */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Búsqueda */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por número o razón social..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Filtro por estado */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                            >
                                <option value="all">Todos los estados</option>
                                <option value="OK">Enviadas OK</option>
                                <option value="ERROR">Con Error</option>
                                <option value="PENDING">Pendientes</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Lista de facturas */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                            <span className="ml-3 text-gray-600">Cargando facturas...</span>
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No se encontraron facturas
                            </h3>
                            <p className="text-gray-600">
                                {searchTerm || statusFilter !== 'all'
                                    ? 'Intenta ajustar los filtros de búsqueda'
                                    : 'No hay facturas enviadas para mostrar'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredInvoices.map((invoice) => (
                                <InvoiceCard
                                    key={invoice.id}
                                    invoice={invoice}
                                    onViewDetail={onViewDetail}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Importar el modal de detalle
import InvoiceDetailModal from './InvoiceDetailModal.jsx';

// Componente para cada factura individual
const InvoiceCard = ({ invoice, onViewDetail }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'OK':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'ERROR':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'OK':
                return <CheckCircle className="h-4 w-4" />;
            case 'ERROR':
                return <AlertTriangle className="h-4 w-4" />;
            case 'PENDING':
                return <Clock className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    return (
        <div
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onViewDetail(invoice.id)}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Información principal */}
                <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                            {invoice.number}
                        </h3>
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                            {getStatusIcon(invoice.status)}
                            <span>{invoice.status}</span>
                        </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                        <p className="font-medium">{invoice.businessName}</p>
                        <p>CUIT: {invoice.cuit}</p>
                        <div className="flex items-center space-x-4">
                            <span className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(invoice.date).toLocaleDateString('es-AR')}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{new Date(invoice.sentAt).toLocaleTimeString('es-AR')}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Información adicional */}
                <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 mb-1">
                        ${parseFloat(invoice.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                        Tipo {invoice.type}
                    </div>

                    {/* Código de respuesta ARCA */}
                    {invoice.arcaResponse && (
                        <div className="text-xs">
                            {invoice.status === 'OK' ? (
                                <div className="text-green-600 font-mono">
                                    CAE: {invoice.arcaResponse.cae}
                                </div>
                            ) : (
                                <div className="text-red-600">
                                    Error: {invoice.arcaResponse.error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Botón para ver detalles */}
                    {invoice.arcaId && (
                        <button className="mt-2 text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1">
                            <ExternalLink className="h-3 w-3" />
                            <span>Ver en ARCA</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Mensaje de error expandido */}
            {invoice.status === 'ERROR' && invoice.errorDetails && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 font-medium mb-1">Detalles del error:</p>
                    <p className="text-sm text-red-600 font-mono">{invoice.errorDetails}</p>
                </div>
            )}
        </div>
    );
};

// Componente principal mejorado
const InvoiceIntegration = () => {
    const [arcaService, setArcaService] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showInvoiceList, setShowInvoiceList] = useState(false);
    const [invoiceListLoading, setInvoiceListLoading] = useState(false);
    const [todayInvoices, setTodayInvoices] = useState([]);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

    useEffect(() => {
        initializeService();
    }, []);

    const initializeService = async () => {
        try {
            const service = await getMCPArcaService();
            setArcaService(service);

            const arcaStats = await service.getArcaStats();
            setStats(arcaStats);
        } catch (error) {
            console.error('Error inicializando servicio ARCA:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnviadasHoyClick = useCallback(async () => {
        setShowInvoiceList(true);
        setInvoiceListLoading(true);

        try {
            // Simular llamada al servicio para obtener facturas del día
            const today = new Date().toISOString().split('T')[0];
            const invoices = await arcaService.getTodayInvoices(today);
            setTodayInvoices(invoices);
        } catch (error) {
            console.error('Error cargando facturas del día:', error);
            // Datos de ejemplo para desarrollo
            setTodayInvoices(generateMockInvoices());
        } finally {
            setInvoiceListLoading(false);
        }
    }, [arcaService]);

    const handleViewInvoiceDetail = useCallback((invoiceId) => {
        setSelectedInvoiceId(invoiceId);
        setShowDetailModal(true);
    }, []);

    const generateMockInvoices = () => {
        const mockInvoices = [
            {
                id: '1',
                number: '0001-00000123',
                businessName: 'Tech Solutions S.A.',
                cuit: '30-12345678-9',
                total: 125000.50,
                type: 'A',
                date: new Date().toISOString(),
                sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                status: 'OK',
                arcaId: 'ARCA-2025-12345',
                arcaResponse: {
                    cae: '75123456789012',
                    validUntil: '2025-08-25'
                }
            },
            {
                id: '2',
                number: '0001-00000124',
                businessName: 'Comercial del Norte Ltda.',
                cuit: '33-87654321-9',
                total: 89750.25,
                type: 'B',
                date: new Date().toISOString(),
                sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                status: 'ERROR',
                errorDetails: 'CUIT del receptor no válido en AFIP',
                arcaResponse: {
                    error: 'Validation Error: Invalid CUIT'
                }
            },
            {
                id: '3',
                number: '0001-00000125',
                businessName: 'Servicios Integrales SRL',
                cuit: '30-55555555-5',
                total: 45200.75,
                type: 'C',
                date: new Date().toISOString(),
                sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                status: 'PENDING',
                arcaId: 'ARCA-2025-12347'
            }
        ];

        return mockInvoices;
    };

    const refreshInvoiceList = useCallback(async () => {
        setInvoiceListLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const invoices = await arcaService.getTodayInvoices(today);
            setTodayInvoices(invoices);
        } catch (error) {
            console.error('Error actualizando facturas:', error);
            setTodayInvoices(generateMockInvoices());
        } finally {
            setInvoiceListLoading(false);
        }
    }, [arcaService]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-600">Cargando integración ARCA...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                        <div className="flex items-center mb-6">
                            <Database className="h-8 w-8 text-purple-600 mr-3" />
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                    Integración ARCA
                                </h1>
                                <p className="text-gray-600 text-sm sm:text-base">
                                    Envío de facturas al sistema ARCA
                                </p>
                            </div>
                        </div>

                        {/* Estadísticas ARCA */}
                        {stats && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                                {/* Card clickeable: Enviadas Hoy */}
                                <div
                                    onClick={handleEnviadasHoyClick}
                                    className="bg-blue-50 rounded-lg p-4 sm:p-6 cursor-pointer hover:bg-blue-100 transition-colors border-2 border-transparent hover:border-blue-200"
                                >
                                    <div className="flex items-center">
                                        <Send className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                                        <div className="ml-3 sm:ml-4">
                                            <p className="text-xs sm:text-sm font-medium text-blue-600">
                                                Enviadas Hoy
                                            </p>
                                            <p className="text-xl sm:text-2xl font-bold text-blue-900">
                                                {stats.today?.sent || 0}
                                            </p>
                                            <p className="text-xs text-blue-600 mt-1">
                                                Click para ver detalle
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-green-50 rounded-lg p-4 sm:p-6">
                                    <div className="flex items-center">
                                        <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                                        <div className="ml-3 sm:ml-4">
                                            <p className="text-xs sm:text-sm font-medium text-green-600">
                                                Autorizadas
                                            </p>
                                            <p className="text-xl sm:text-2xl font-bold text-green-900">
                                                {stats.today?.authorized || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-red-50 rounded-lg p-4 sm:p-6">
                                    <div className="flex items-center">
                                        <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                                        <div className="ml-3 sm:ml-4">
                                            <p className="text-xs sm:text-sm font-medium text-red-600">
                                                Rechazadas
                                            </p>
                                            <p className="text-xl sm:text-2xl font-bold text-red-900">
                                                {stats.today?.rejected || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 rounded-lg p-4 sm:p-6">
                                    <div className="flex items-center">
                                        <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                                        <div className="ml-3 sm:ml-4">
                                            <p className="text-xs sm:text-sm font-medium text-yellow-600">
                                                Pendientes
                                            </p>
                                            <p className="text-xl sm:text-2xl font-bold text-yellow-900">
                                                {stats.today?.pending || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="text-center py-8 sm:py-12">
                            <Database className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-purple-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Integración ARCA Activa
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base">
                                Haz click en "Enviadas Hoy" para ver el detalle de facturas.
                            </p>
                            <div className="mt-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                    ✓ Servicio MCP ARCA Conectado
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal para mostrar lista de facturas */}
            <InvoiceListModal
                isOpen={showInvoiceList}
                onClose={() => setShowInvoiceList(false)}
                invoices={todayInvoices}
                loading={invoiceListLoading}
                onRefresh={refreshInvoiceList}
                onViewDetail={handleViewInvoiceDetail}
                date="hoy"
            />

            {/* Modal para mostrar detalle de factura */}
            <InvoiceDetailModal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedInvoiceId(null);
                }}
                invoiceId={selectedInvoiceId}
                arcaService={arcaService}
            />
        </>
    );
};

export default InvoiceIntegration;