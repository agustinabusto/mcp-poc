// src/client/components/invoices/InvoiceIntake.jsx
import React, { useState, useEffect } from 'react';
import {
    Upload,
    Mail,
    Smartphone,
    Package,
    Camera,
    FileText,
    CheckCircle,
    Clock,
    AlertTriangle,
    Send,
    Eye,
    RefreshCw,
    Download,
    Filter,
    Search
} from 'lucide-react';
import { getMCPClient } from '../../services/mcp-client.js';

const InvoiceIntake = () => {
    const [activeTab, setActiveTab] = useState('email');
    const [invoices, setInvoices] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mcpClient, setMcpClient] = useState(null);
    const [mcpStatus, setMcpStatus] = useState('disconnected');
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para diferentes secciones
    const [stats, setStats] = useState({
        email: { connected: true, todayProcessed: 3, avgAccuracy: 97.2 },
        manual: { todayProcessed: 1, avgAccuracy: 98.5 },
        mobile: { connected: true, todayProcessed: 3, avgAccuracy: 97.4 },
        batch: { todayProcessed: 4, avgAccuracy: 94.5 }
    });

    useEffect(() => {
        initializeMCPClient();
        loadInvoiceData();
    }, []);

    const initializeMCPClient = async () => {
        try {
            const client = await getMCPClient();
            setMcpClient(client);
            setMcpStatus('connected');
        } catch (error) {
            console.error('Error conectando MCP:', error);
            setMcpStatus('error');
        }
    };

    const loadInvoiceData = () => {
        // Datos basados en las imágenes proporcionadas
        const sampleInvoices = [
            {
                id: 1,
                origin: 'Email',
                source: 'proveedor@ejemplo.com',
                cuit: '29-12345678-9',
                businessName: 'EMPRESA EJEMPLO SRL',
                date: '2024-01-15',
                number: '0001-00000123',
                type: 'A',
                total: 12100,
                status: 'Procesado',
                precision: 98.5,
                description: 'Servicios profesionales',
                arcaStatus: null,
                timestamp: '2024-01-15T10:30:00Z'
            },
            {
                id: 2,
                origin: 'Email',
                source: 'facturacion@empresa.com',
                cuit: '30-87654321-2',
                businessName: 'SERVICIOS TECH SA',
                date: '2024-01-14',
                number: '0002-00000567',
                type: 'B',
                total: 8500,
                status: 'En cola',
                precision: 95.2,
                description: 'Desarrollo de software',
                arcaStatus: null,
                timestamp: '2024-01-14T14:20:00Z'
            },
            {
                id: 3,
                origin: 'Manual',
                source: 'Upload manual',
                cuit: '29-12345678-9',
                businessName: 'EMPRESA EJEMPLO SRL',
                date: '2024-01-15',
                number: '0001-00000123',
                type: 'A',
                total: 12100,
                status: 'Procesado',
                precision: 98.5,
                description: 'Servicios profesionales',
                arcaStatus: null,
                timestamp: '2024-01-15T11:45:00Z'
            },
            {
                id: 4,
                origin: 'Mobile',
                source: 'Snarx Mobile Scanner',
                cuit: '27-33445566-7',
                businessName: 'COMERCIO RETAIL SA',
                date: '2024-01-15',
                number: '0004-00000789',
                type: 'A',
                total: 25400,
                status: 'Procesado',
                precision: 97.3,
                description: 'Venta de productos',
                arcaStatus: null,
                timestamp: '2024-01-15T16:10:00Z'
            },
            {
                id: 5,
                origin: 'Mobile',
                source: 'Snarx Mobile Scanner',
                cuit: '20-77889900-2',
                businessName: 'SERVICIOS VARIOS SRL',
                date: '2024-01-14',
                number: '0002-00000345',
                type: 'B',
                total: 14300,
                status: 'Procesado',
                precision: 98.9,
                description: 'Servicios técnicos',
                arcaStatus: null,
                timestamp: '2024-01-14T09:15:00Z'
            },
            {
                id: 6,
                origin: 'Mobile',
                source: 'Snarx Mobile Scanner',
                cuit: '30-44556677-8',
                businessName: 'DISTRIBUIDORA ABC SA',
                date: '2024-01-13',
                number: '0001-00000678',
                type: 'C',
                total: 9800,
                status: 'Procesado',
                precision: 96.1,
                description: 'Distribución de productos',
                arcaStatus: null,
                timestamp: '2024-01-13T13:22:00Z'
            },
            {
                id: 7,
                origin: 'Batch',
                source: 'Lote_Enero_2024.zip',
                cuit: '20-11223344-5',
                businessName: 'BATCH PROCESS SA',
                date: '2024-01-15',
                number: '0005-00000123',
                type: 'A',
                total: 33200,
                status: 'Procesado',
                precision: 98.2,
                description: 'Procesamiento en lote',
                arcaStatus: null,
                timestamp: '2024-01-15T08:00:00Z'
            },
            {
                id: 8,
                origin: 'Batch',
                source: 'Lote_Enero_2024.zip',
                cuit: '27-55667788-9',
                businessName: 'EMPRESAS BATCH SRL',
                date: '2024-01-14',
                number: '0003-00000456',
                type: 'B',
                total: 19500,
                status: 'Procesado',
                precision: 97.6,
                description: 'Servicios administrativos',
                arcaStatus: null,
                timestamp: '2024-01-14T08:30:00Z'
            },
            {
                id: 9,
                origin: 'Batch',
                source: 'Lote_Enero_2024.zip',
                cuit: '30-99001122-3',
                businessName: 'LOTE COMERCIAL SA',
                date: '2024-01-13',
                number: '0001-00000789',
                type: 'A',
                total: 41000,
                status: 'Error',
                precision: 85.3,
                description: 'PDF corrupto - datos parciales',
                arcaStatus: null,
                timestamp: '2024-01-13T07:45:00Z'
            },
            {
                id: 10,
                origin: 'Batch',
                source: 'Lote_Enero_2024.zip',
                cuit: '20-33445566-7',
                businessName: 'PROCESOS AUTO SRL',
                date: '2024-01-12',
                number: '0002-00000234',
                type: 'C',
                total: 16700,
                status: 'Procesado',
                precision: 96.8,
                description: 'Servicios automotrices',
                arcaStatus: null,
                timestamp: '2024-01-12T10:12:00Z'
            }
        ];
        setInvoices(sampleInvoices);
    };

    const sendToArca = async (invoice) => {
        if (!mcpClient) {
            alert('Cliente MCP no conectado');
            return;
        }

        setIsProcessing(true);
        try {
            // Simular envío a ARCA usando el servidor MCP
            const result = await mcpClient.callTool('send_to_arca', {
                cuit: invoice.cuit,
                invoiceNumber: invoice.number,
                amount: invoice.total,
                date: invoice.date,
                type: invoice.type,
                businessName: invoice.businessName,
                description: invoice.description,
                origin: invoice.origin
            });

            // Actualizar estado de la factura
            setInvoices(prev => prev.map(inv =>
                inv.id === invoice.id
                    ? {
                        ...inv,
                        arcaStatus: 'Enviado',
                        arcaTimestamp: new Date().toISOString(),
                        arcaResponse: result
                    }
                    : inv
            ));

            alert(`✅ Factura enviada a ARCA exitosamente`);
        } catch (error) {
            console.error('Error enviando a ARCA:', error);

            // Actualizar con error
            setInvoices(prev => prev.map(inv =>
                inv.id === invoice.id
                    ? {
                        ...inv,
                        arcaStatus: 'Error',
                        arcaError: error.message
                    }
                    : inv
            ));

            alert(`❌ Error enviando a ARCA: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Procesado':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'En cola':
                return <Clock className="h-5 w-5 text-yellow-500" />;
            case 'Error':
                return <AlertTriangle className="h-5 w-5 text-red-500" />;
            default:
                return <Clock className="h-5 w-5 text-gray-500" />;
        }
    };

    const getArcaStatusBadge = (arcaStatus) => {
        if (!arcaStatus) return null;

        const statusConfig = {
            'Enviado': 'bg-green-100 text-green-800',
            'Error': 'bg-red-100 text-red-800',
            'Pendiente': 'bg-yellow-100 text-yellow-800'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[arcaStatus] || 'bg-gray-100 text-gray-800'}`}>
                {arcaStatus}
            </span>
        );
    };

    const filteredInvoices = invoices.filter(invoice => {
        const matchesFilter = filter === 'all' || invoice.origin.toLowerCase() === filter;
        const matchesSearch = searchTerm === '' ||
            invoice.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.cuit.includes(searchTerm) ||
            invoice.number.includes(searchTerm);

        return matchesFilter && matchesSearch;
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-AR');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Ingreso de Facturas</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Sistema de procesamiento e integración con ARCA
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className={`flex items-center px-3 py-2 rounded-full text-sm ${mcpStatus === 'connected'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${mcpStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                                    }`} />
                                MCP {mcpStatus === 'connected' ? 'Conectado' : 'Desconectado'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Canales de Ingreso */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Email */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <Mail className="h-8 w-8 text-blue-600" />
                                <h3 className="ml-3 text-lg font-medium text-gray-900">Email</h3>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${stats.email.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600">Procesadas hoy: <span className="font-semibold">{stats.email.todayProcessed}</span></p>
                            <p className="text-sm text-gray-600">Precisión promedio: <span className="font-semibold">{stats.email.avgAccuracy}%</span></p>
                        </div>
                    </div>

                    {/* Manual */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <Upload className="h-8 w-8 text-purple-600" />
                                <h3 className="ml-3 text-lg font-medium text-gray-900">Manual</h3>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600">Procesadas hoy: <span className="font-semibold">{stats.manual.todayProcessed}</span></p>
                            <p className="text-sm text-gray-600">Precisión promedio: <span className="font-semibold">{stats.manual.avgAccuracy}%</span></p>
                        </div>
                    </div>

                    {/* Mobile */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <Smartphone className="h-8 w-8 text-orange-600" />
                                <h3 className="ml-3 text-lg font-medium text-gray-900">Mobile</h3>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${stats.mobile.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600">Procesadas hoy: <span className="font-semibold">{stats.mobile.todayProcessed}</span></p>
                            <p className="text-sm text-gray-600">Precisión promedio: <span className="font-semibold">{stats.mobile.avgAccuracy}%</span></p>
                        </div>
                    </div>

                    {/* Batch */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <Package className="h-8 w-8 text-green-600" />
                                <h3 className="ml-3 text-lg font-medium text-gray-900">Lotes</h3>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600">Procesadas hoy: <span className="font-semibold">{stats.batch.todayProcessed}</span></p>
                            <p className="text-sm text-gray-600">Precisión promedio: <span className="font-semibold">{stats.batch.avgAccuracy}%</span></p>
                        </div>
                    </div>
                </div>

                {/* Filtros y búsqueda */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                                <Filter className="h-5 w-5 text-gray-400 mr-2" />
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Todos los canales</option>
                                    <option value="email">Email</option>
                                    <option value="manual">Manual</option>
                                    <option value="mobile">Mobile</option>
                                    <option value="batch">Lotes</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <div className="relative">
                                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Buscar por empresa, CUIT o número..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lista de Facturas */}
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b">
                        <h3 className="text-lg font-medium text-gray-900">
                            Facturas Procesadas ({filteredInvoices.length})
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Origen
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        CUIT
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Razón Social
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Número
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Precisión
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ARCA
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {invoice.origin === 'Email' && <Mail className="h-4 w-4 text-blue-600 mr-2" />}
                                                {invoice.origin === 'Manual' && <Upload className="h-4 w-4 text-purple-600 mr-2" />}
                                                {invoice.origin === 'Mobile' && <Smartphone className="h-4 w-4 text-orange-600 mr-2" />}
                                                {invoice.origin === 'Batch' && <Package className="h-4 w-4 text-green-600 mr-2" />}
                                                <span className="text-sm font-medium text-gray-900">{invoice.origin}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {invoice.cuit}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{invoice.businessName}</div>
                                            <div className="text-sm text-gray-500">{invoice.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(invoice.date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {invoice.number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${invoice.type === 'A' ? 'bg-blue-100 text-blue-800' :
                                                    invoice.type === 'B' ? 'bg-green-100 text-green-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {invoice.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatCurrency(invoice.total)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {getStatusIcon(invoice.status)}
                                                <span className="ml-2 text-sm text-gray-900">{invoice.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`w-full bg-gray-200 rounded-full h-2 mr-2 ${invoice.precision >= 95 ? 'bg-green-200' :
                                                        invoice.precision >= 90 ? 'bg-yellow-200' : 'bg-red-200'
                                                    }`}>
                                                    <div
                                                        className={`h-2 rounded-full ${invoice.precision >= 95 ? 'bg-green-500' :
                                                                invoice.precision >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`}
                                                        style={{ width: `${invoice.precision}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm text-gray-600 min-w-0">{invoice.precision}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getArcaStatusBadge(invoice.arcaStatus)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                <button className="text-blue-600 hover:text-blue-900">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                {invoice.status === 'Procesado' && !invoice.arcaStatus && (
                                                    <button
                                                        onClick={() => sendToArca(invoice)}
                                                        disabled={isProcessing}
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isProcessing ? (
                                                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                                        ) : (
                                                            <Send className="h-3 w-3 mr-1" />
                                                        )}
                                                        Enviar ARCA
                                                    </button>
                                                )}
                                                {invoice.arcaStatus === 'Enviado' && (
                                                    <span className="text-xs text-green-600 font-medium">Enviado ✓</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredInvoices.length === 0 && (
                        <div className="text-center py-12">
                            <FileText className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay facturas</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                No se encontraron facturas que coincidan con los filtros seleccionados.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoiceIntake;