// src/client/components/contributors/ClientListView.jsx
import React, { useState } from 'react';
import {
    Building,
    User,
    Eye,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    ChevronDown,
    ChevronUp,
    Calendar,
    DollarSign,
    FileText,
    TrendingUp,
    TrendingDown,
    Minus,
    Users
} from 'lucide-react';

import ComplianceIndicator from './ComplianceIndicator.jsx';

const ClientListView = ({
    clients = [],
    loading = false,
    onClientClick,
    onRefreshClient
}) => {
    const [sortBy, setSortBy] = useState('businessName');
    const [sortOrder, setSortOrder] = useState('asc');
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Funciones de ordenamiento
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const sortedClients = [...clients].sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        // Manejar valores especiales
        if (sortBy === 'businessName' || sortBy === 'cuit') {
            aValue = aValue?.toLowerCase() || '';
            bValue = bValue?.toLowerCase() || '';
        }

        if (sortBy === 'lastUpdate') {
            aValue = new Date(aValue || 0);
            bValue = new Date(bValue || 0);
        }

        if (sortOrder === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
    });

    // Toggle expanded row
    const toggleExpandedRow = (clientId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(clientId)) {
            newExpanded.delete(clientId);
        } else {
            newExpanded.add(clientId);
        }
        setExpandedRows(newExpanded);
    };

    // Render sort icon
    const SortIcon = ({ field }) => {
        if (sortBy !== field) {
            return <Minus className="h-4 w-4 text-gray-400" />;
        }
        return sortOrder === 'asc' ?
            <TrendingUp className="h-4 w-4 text-blue-500" /> :
            <TrendingDown className="h-4 w-4 text-blue-500" />;
    };

    if (!clients.length && !loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
                <div className="text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No hay contribuyentes registrados
                    </h3>
                    <p className="text-gray-500 mb-6">
                        Comienza importando clientes individualmente o en lote
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900">
                    Lista de Contribuyentes ({clients.length})
                </h3>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('businessName')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Razón Social</span>
                                    <SortIcon field="businessName" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('cuit')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>CUIT</span>
                                    <SortIcon field="cuit" />
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado ARCA
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Compliance
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('lastUpdate')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Última Actualización</span>
                                    <SortIcon field="lastUpdate" />
                                </div>
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedClients.map((client) => (
                            <React.Fragment key={client.id}>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-blue-100 rounded-lg mr-3">
                                                <Building className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {client.businessName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {client.category || 'Sin categoría'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-mono text-gray-900">
                                            {client.cuit}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <ComplianceIndicator
                                            status={client.arcaStatus}
                                            type="arca"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <ComplianceIndicator
                                            status={client.complianceStatus}
                                            type="compliance"
                                            details={client.complianceDetails}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center">
                                            <Calendar className="h-4 w-4 mr-1" />
                                            {client.lastUpdate ?
                                                new Date(client.lastUpdate).toLocaleDateString('es-AR') :
                                                'Nunca'
                                            }
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => onClientClick(client)}
                                                className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                                title="Ver detalles"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => onRefreshClient(client.cuit)}
                                                className="text-gray-600 hover:text-gray-900 p-1 rounded"
                                                title="Actualizar datos"
                                                disabled={loading}
                                            >
                                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => toggleExpandedRow(client.id)}
                                                className="text-gray-600 hover:text-gray-900 p-1 rounded"
                                                title="Ver resumen"
                                            >
                                                {expandedRows.has(client.id) ?
                                                    <ChevronUp className="h-4 w-4" /> :
                                                    <ChevronDown className="h-4 w-4" />
                                                }
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {/* Expanded Row */}
                                {expandedRows.has(client.id) && (
                                    <tr className="bg-gray-50">
                                        <td colSpan="6" className="px-6 py-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <h4 className="font-medium text-gray-900 mb-2">Información Fiscal</h4>
                                                    <div className="space-y-1 text-gray-600">
                                                        <div>Régimen IVA: {client.ivaStatus || 'N/A'}</div>
                                                        <div>Monotributo: {client.monotributoStatus || 'N/A'}</div>
                                                        <div>Ganancias: {client.gananciasStatus || 'N/A'}</div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-900 mb-2">Últimas Facturas</h4>
                                                    <div className="space-y-1 text-gray-600">
                                                        <div>Total: {client.invoiceStats?.total || 0}</div>
                                                        <div>Pendientes: {client.invoiceStats?.pending || 0}</div>
                                                        <div>Errores: {client.invoiceStats?.errors || 0}</div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-900 mb-2">Contacto</h4>
                                                    <div className="space-y-1 text-gray-600">
                                                        <div>Email: {client.email || 'N/A'}</div>
                                                        <div>Teléfono: {client.phone || 'N/A'}</div>
                                                        <div>Domicilio: {client.address || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
                <div className="space-y-4 p-4">
                    {sortedClients.map((client) => (
                        <div key={client.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Building className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900">
                                            {client.businessName}
                                        </h4>
                                        <p className="text-sm text-gray-500 font-mono">
                                            {client.cuit}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => onClientClick(client)}
                                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => onRefreshClient(client.cuit)}
                                        className="text-gray-600 hover:text-gray-900 p-1 rounded"
                                        disabled={loading}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Status Indicators */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Estado ARCA</p>
                                        <ComplianceIndicator
                                            status={client.arcaStatus}
                                            type="arca"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Compliance</p>
                                        <ComplianceIndicator
                                            status={client.complianceStatus}
                                            type="compliance"
                                            details={client.complianceDetails}
                                        />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Última actualización</p>
                                    <p className="text-sm text-gray-900">
                                        {client.lastUpdate ?
                                            new Date(client.lastUpdate).toLocaleDateString('es-AR') :
                                            'Nunca'
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Expandable Details */}
                            {expandedRows.has(client.id) && (
                                <div className="border-t border-gray-200 pt-3 mt-3">
                                    <div className="grid grid-cols-1 gap-3 text-sm">
                                        <div>
                                            <h5 className="font-medium text-gray-900 mb-1">Información Fiscal</h5>
                                            <div className="text-gray-600 space-y-1">
                                                <div>IVA: {client.ivaStatus || 'N/A'}</div>
                                                <div>Monotributo: {client.monotributoStatus || 'N/A'}</div>
                                                <div>Ganancias: {client.gananciasStatus || 'N/A'}</div>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="font-medium text-gray-900 mb-1">Facturas</h5>
                                            <div className="text-gray-600 space-y-1">
                                                <div>Total: {client.invoiceStats?.total || 0}</div>
                                                <div>Pendientes: {client.invoiceStats?.pending || 0}</div>
                                                <div>Errores: {client.invoiceStats?.errors || 0}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Toggle Button */}
                            <button
                                onClick={() => toggleExpandedRow(client.id)}
                                className="w-full flex items-center justify-center py-2 text-sm text-gray-600 hover:text-gray-900 border-t border-gray-200"
                            >
                                {expandedRows.has(client.id) ? (
                                    <>
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                        Ocultar detalles
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4 mr-1" />
                                        Ver detalles
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-gray-600">Actualizando datos...</span>
                </div>
            )}
        </div>
    );
};

export default ClientListView;