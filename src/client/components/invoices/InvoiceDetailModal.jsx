// src/client/components/invoices/InvoiceDetailModal.jsx
import React, { useState, useEffect } from 'react';
import {
    X,
    FileText,
    Clock,
    CheckCircle,
    AlertTriangle,
    ExternalLink,
    Download,
    RefreshCw,
    Copy,
    Eye,
    Calendar,
    DollarSign,
    Building,
    Hash,
    User
} from 'lucide-react';

const InvoiceDetailModal = ({
    isOpen,
    onClose,
    invoiceId,
    arcaService
}) => {
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        if (isOpen && invoiceId) {
            loadInvoiceDetail();
        }
    }, [isOpen, invoiceId]);

    const loadInvoiceDetail = async () => {
        setLoading(true);
        try {
            const detail = await arcaService.getInvoiceDetail(invoiceId);
            setInvoice(detail);
        } catch (error) {
            console.error('Error cargando detalle:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async () => {
        setRetrying(true);
        try {
            const result = await arcaService.retryInvoice(invoiceId);
            // Actualizar el estado de la factura
            setInvoice(prev => ({
                ...prev,
                status: 'OK',
                arcaResponse: result
            }));
        } catch (error) {
            console.error('Error en reintento:', error);
        } finally {
            setRetrying(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Aquí podrías mostrar un toast de confirmación
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <FileText className="h-6 w-6 text-blue-600" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Detalle de Factura
                            </h2>
                            <p className="text-sm text-gray-600">
                                {invoice?.number || invoiceId}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-600" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                        <span className="ml-3 text-gray-600">Cargando detalle...</span>
                    </div>
                ) : invoice ? (
                    <>
                        {/* Tabs */}
                        <div className="border-b border-gray-200">
                            <nav className="flex space-x-8 px-6">
                                {[
                                    { id: 'general', label: 'General', icon: FileText },
                                    { id: 'arca', label: 'ARCA', icon: ExternalLink },
                                    { id: 'history', label: 'Historial', icon: Clock }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center space-x-2 py-3 border-b-2 font-medium text-sm ${activeTab === tab.id
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <tab.icon className="h-4 w-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {activeTab === 'general' && (
                                <GeneralTab invoice={invoice} onCopy={copyToClipboard} />
                            )}
                            {activeTab === 'arca' && (
                                <ArcaTab
                                    invoice={invoice}
                                    onRetry={handleRetry}
                                    retrying={retrying}
                                    onCopy={copyToClipboard}
                                />
                            )}
                            {activeTab === 'history' && (
                                <HistoryTab invoice={invoice} />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                            <div className="flex items-center space-x-4">
                                <StatusBadge status={invoice.status} />
                                <span className="text-sm text-gray-600">
                                    Enviada {new Date(invoice.sentAt).toLocaleString('es-AR')}
                                </span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    <Download className="h-4 w-4" />
                                    <span>Descargar</span>
                                </button>
                                <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    <Eye className="h-4 w-4" />
                                    <span>Ver PDF</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="p-6 text-center">
                        <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Error cargando detalle
                        </h3>
                        <p className="text-gray-600">
                            No se pudo cargar la información de la factura
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Tab de información general
const GeneralTab = ({ invoice, onCopy }) => (
    <div className="space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard
                icon={Hash}
                title="Número de Factura"
                value={invoice.number}
                copyable
                onCopy={onCopy}
            />
            <InfoCard
                icon={Building}
                title="Razón Social"
                value={invoice.businessName}
            />
            <InfoCard
                icon={User}
                title="CUIT"
                value={invoice.cuit}
                copyable
                onCopy={onCopy}
            />
            <InfoCard
                icon={FileText}
                title="Tipo"
                value={`Factura ${invoice.type}`}
            />
            <InfoCard
                icon={Calendar}
                title="Fecha"
                value={new Date(invoice.date).toLocaleDateString('es-AR')}
            />
            <InfoCard
                icon={DollarSign}
                title="Total"
                value={`$${parseFloat(invoice.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
            />
        </div>

        {/* Ítems de la factura */}
        {invoice.items && (
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Ítems de la Factura</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Descripción
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cantidad
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Precio Unit.
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    IVA
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoice.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {item.description}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {item.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${item.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${item.taxAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        ${item.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
);

// Tab de información ARCA
const ArcaTab = ({ invoice, onRetry, retrying, onCopy }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard
                icon={ExternalLink}
                title="ID ARCA"
                value={invoice.arcaId || 'No asignado'}
                copyable={!!invoice.arcaId}
                onCopy={onCopy}
            />
            <InfoCard
                icon={CheckCircle}
                title="Estado en ARCA"
                value={invoice.status}
                badge
            />
        </div>

        {invoice.arcaResponse && (
            <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Respuesta de ARCA</h3>

                {invoice.status === 'OK' ? (
                    <div className="space-y-3">
                        <InfoCard
                            title="CAE"
                            value={invoice.arcaResponse.cae}
                            copyable
                            onCopy={onCopy}
                        />
                        <InfoCard
                            title="Válido hasta"
                            value={new Date(invoice.arcaResponse.validUntil).toLocaleDateString('es-AR')}
                        />
                        <InfoCard
                            title="Mensaje"
                            value={invoice.arcaResponse.message}
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700 font-medium mb-2">Error:</p>
                            <p className="text-sm text-red-600">{invoice.arcaResponse.error}</p>
                            {invoice.arcaResponse.errorCode && (
                                <p className="text-xs text-red-500 mt-2">
                                    Código: {invoice.arcaResponse.errorCode}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={onRetry}
                            disabled={retrying}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
                            <span>{retrying ? 'Reintentando...' : 'Reintentar Envío'}</span>
                        </button>
                    </div>
                )}
            </div>
        )}
    </div>
);

// Tab de historial
const HistoryTab = ({ invoice }) => (
    <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Historial de Eventos</h3>

        <div className="flow-root">
            <ul className="-mb-8">
                {invoice.history?.map((event, index) => (
                    <li key={index}>
                        <div className="relative pb-8">
                            {index !== invoice.history.length - 1 && (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                            )}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${event.status === 'OK' ? 'bg-green-500' : 'bg-red-500'
                                        }`}>
                                        {event.status === 'OK' ? (
                                            <CheckCircle className="h-5 w-5 text-white" />
                                        ) : (
                                            <AlertTriangle className="h-5 w-5 text-white" />
                                        )}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            {event.action} - <span className="font-medium text-gray-900">{event.message}</span>
                                        </p>
                                    </div>
                                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                        {new Date(event.timestamp).toLocaleString('es-AR')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

// Componente de tarjeta de información
const InfoCard = ({ icon: Icon, title, value, copyable, onCopy, badge }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                {Icon && <Icon className="h-5 w-5 text-gray-400" />}
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    {badge ? (
                        <StatusBadge status={value} />
                    ) : (
                        <p className="text-lg font-semibold text-gray-900">{value}</p>
                    )}
                </div>
            </div>
            {copyable && (
                <button
                    onClick={() => onCopy(value)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copiar"
                >
                    <Copy className="h-4 w-4 text-gray-400" />
                </button>
            )}
        </div>
    </div>
);

// Componente de badge de estado
const StatusBadge = ({ status }) => {
    const getStatusConfig = (status) => {
        switch (status) {
            case 'OK':
                return {
                    color: 'bg-green-100 text-green-800 border-green-200',
                    icon: CheckCircle
                };
            case 'ERROR':
                return {
                    color: 'bg-red-100 text-red-800 border-red-200',
                    icon: AlertTriangle
                };
            case 'PENDING':
                return {
                    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    icon: Clock
                };
            default:
                return {
                    color: 'bg-gray-100 text-gray-800 border-gray-200',
                    icon: FileText
                };
        }
    };

    const config = getStatusConfig(status);
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
            <Icon className="h-3 w-3" />
            <span>{status}</span>
        </span>
    );
};

export default InvoiceDetailModal;