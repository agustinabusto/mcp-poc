// ==============================================
// src/client/components/invoices/InvoiceValidation.jsx
// Componente mejorado para validación de facturas con vista expandida
// ==============================================

import React, { useState } from 'react';
import {
    CheckCircle,
    AlertTriangle,
    X,
    Eye,
    Edit3,
    ChevronDown,
    ChevronUp,
    FileText,
    DollarSign,
    Calendar,
    Building,
    Hash,
    User,
    Phone,
    Mail
} from 'lucide-react';

const InvoiceValidation = () => {
    const [validationResults, setValidationResults] = useState([
        {
            id: 1,
            filename: 'Factura_001.pdf',
            status: 'valid',
            extractedData: {
                number: '0001-00000123',
                date: '2025-07-25',
                amount: '15000.00',
                cuit: '20-12345678-9',
                businessName: 'Empresa Ejemplo SA',
                // Datos adicionales para vista expandida
                type: 'Factura B',
                pointOfSale: '0001',
                customerName: 'Cliente Demo SRL',
                customerCuit: '30-98765432-1',
                customerAddress: 'Av. Corrientes 1234, CABA',
                items: [
                    {
                        id: 1,
                        description: 'Servicio de Consultoría',
                        quantity: 1,
                        unitPrice: 12600.00,
                        total: 12600.00
                    },
                    {
                        id: 2,
                        description: 'Desarrollo de Software',
                        quantity: 2,
                        unitPrice: 1200.00,
                        total: 2400.00
                    }
                ],
                subtotal: 15000.00,
                tax: 0.00,
                total: 15000.00
            },
            confidence: 98,
            validations: {
                format: true,
                cuit: true,
                amount: true,
                date: true
            }
        },
        {
            id: 2,
            filename: 'Factura_002.jpg',
            status: 'needs_review',
            extractedData: {
                number: '0002-00000124',
                date: '2025-07-25',
                amount: '8500.00',
                cuit: '20-98765432-1',
                businessName: 'Proveedor XYZ',
                type: 'Factura A',
                pointOfSale: '0002',
                customerName: 'Empresa ABC SA',
                customerCuit: '30-11111111-1',
                customerAddress: 'Av. Santa Fe 5678, CABA',
                items: [
                    {
                        id: 1,
                        description: 'Producto Premium',
                        quantity: 5,
                        unitPrice: 1400.00,
                        total: 7000.00
                    },
                    {
                        id: 2,
                        description: 'Envío Express',
                        quantity: 1,
                        unitPrice: 1500.00,
                        total: 1500.00
                    }
                ],
                subtotal: 7024.79,
                tax: 1475.21,
                total: 8500.00
            },
            confidence: 75,
            validations: {
                format: true,
                cuit: false,
                amount: true,
                date: true
            }
        }
    ]);

    // Estado para controlar qué factura está expandida
    const [expandedInvoice, setExpandedInvoice] = useState(null);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'valid':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Válida
                    </span>
                );
            case 'needs_review':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Revisar
                    </span>
                );
            case 'invalid':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <X className="w-3 h-3 mr-1" />
                        Inválida
                    </span>
                );
            default:
                return null;
        }
    };

    const toggleInvoiceExpansion = (invoiceId) => {
        setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    const ValidationIcon = ({ isValid }) => (
        isValid ?
            <CheckCircle className="h-3 w-3 text-green-500 inline ml-1" /> :
            <X className="h-3 w-3 text-red-500 inline ml-1" />
    );

    const InvoiceDetailView = ({ invoice }) => (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información del Emisor */}
                <div className="space-y-4">
                    <h5 className="font-semibold text-gray-900 flex items-center">
                        <Building className="h-4 w-4 mr-2 text-blue-600" />
                        Información del Emisor
                    </h5>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Razón Social:</span>
                            <span className="font-medium">{invoice.extractedData.businessName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">CUIT:</span>
                            <span className="font-medium">{invoice.extractedData.cuit}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Tipo:</span>
                            <span className="font-medium">{invoice.extractedData.type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Punto de Venta:</span>
                            <span className="font-medium">{invoice.extractedData.pointOfSale}</span>
                        </div>
                    </div>
                </div>

                {/* Información del Cliente */}
                <div className="space-y-4">
                    <h5 className="font-semibold text-gray-900 flex items-center">
                        <User className="h-4 w-4 mr-2 text-green-600" />
                        Información del Cliente
                    </h5>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Cliente:</span>
                            <span className="font-medium">{invoice.extractedData.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">CUIT:</span>
                            <span className="font-medium">{invoice.extractedData.customerCuit}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                            <span className="text-gray-600">Dirección:</span>
                            <span className="font-medium text-right">{invoice.extractedData.customerAddress}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detalle de Items */}
            <div className="mt-6">
                <h5 className="font-semibold text-gray-900 flex items-center mb-4">
                    <FileText className="h-4 w-4 mr-2 text-purple-600" />
                    Detalle de Items
                </h5>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Descripción
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cant.
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Precio Unit.
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoice.extractedData.items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-sm text-gray-900">
                                        {item.description}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                                        {item.quantity}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                                        {formatCurrency(item.unitPrice)}
                                    </td>
                                    <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                                        {formatCurrency(item.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Totales */}
            <div className="mt-6 bg-white rounded-lg p-4 border">
                <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">{formatCurrency(invoice.extractedData.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">IVA:</span>
                            <span className="font-medium">{formatCurrency(invoice.extractedData.tax)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                            <span>Total:</span>
                            <span>{formatCurrency(invoice.extractedData.total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Validación de Facturas</h2>
                <p className="text-gray-600">Revisa y valida los datos extraídos de las facturas</p>
            </div>

            {/* Resumen de validación - Mobile First */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-600">Válidas</p>
                            <p className="text-xl font-bold text-green-900">
                                {validationResults.filter(r => r.status === 'valid').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-yellow-600">Para Revisar</p>
                            <p className="text-xl font-bold text-yellow-900">
                                {validationResults.filter(r => r.status === 'needs_review').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <X className="h-6 w-6 text-red-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-red-600">Inválidas</p>
                            <p className="text-xl font-bold text-red-900">
                                {validationResults.filter(r => r.status === 'invalid').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de facturas con funcionalidad de expansión */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b">
                    <h3 className="text-lg font-medium">Facturas Procesadas</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Haz clic en una fila para ver el contenido completo
                    </p>
                </div>

                <div className="divide-y">
                    {validationResults.map(result => (
                        <div key={result.id} className="px-4 sm:px-6 py-4">
                            {/* Fila principal clickeable */}
                            <div
                                className="cursor-pointer hover:bg-gray-50 transition-colors duration-200 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 rounded"
                                onClick={() => toggleInvoiceExpansion(result.id)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3 flex-wrap">
                                        <h4 className="font-medium text-gray-900">{result.filename}</h4>
                                        {getStatusBadge(result.status)}
                                        <span className="text-sm text-gray-500">
                                            Confianza: {result.confidence}%
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Aquí puedes agregar lógica para previsualizar
                                            }}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                            className="text-gray-600 hover:bg-gray-50 p-2 rounded transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Aquí puedes agregar lógica para editar
                                            }}
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </button>
                                        {expandedInvoice === result.id ?
                                            <ChevronUp className="h-4 w-4 text-gray-400" /> :
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                        }
                                    </div>
                                </div>

                                {/* Resumen compacto - Mobile First */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500 flex items-center">
                                            <Hash className="h-3 w-3 mr-1" />
                                            Número:
                                        </span>
                                        <p className="font-medium flex items-center">
                                            {result.extractedData.number}
                                            <ValidationIcon isValid={result.validations.format} />
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 flex items-center">
                                            <Building className="h-3 w-3 mr-1" />
                                            CUIT:
                                        </span>
                                        <p className="font-medium flex items-center">
                                            {result.extractedData.cuit}
                                            <ValidationIcon isValid={result.validations.cuit} />
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 flex items-center">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            Fecha:
                                        </span>
                                        <p className="font-medium flex items-center">
                                            {result.extractedData.date}
                                            <ValidationIcon isValid={result.validations.date} />
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 flex items-center">
                                            <DollarSign className="h-3 w-3 mr-1" />
                                            Monto:
                                        </span>
                                        <p className="font-medium flex items-center">
                                            {formatCurrency(parseFloat(result.extractedData.amount))}
                                            <ValidationIcon isValid={result.validations.amount} />
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Vista expandida del contenido */}
                            {expandedInvoice === result.id && (
                                <InvoiceDetailView invoice={result} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InvoiceValidation;