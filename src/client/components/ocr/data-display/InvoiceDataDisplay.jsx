// ===== src/client/components/ocr/data-displays/InvoiceDataDisplay.jsx =====
import React from 'react';
import { FileText, Calendar, Building, DollarSign, Hash } from 'lucide-react';

const InvoiceDataDisplay = ({ data }) => {
    if (!data) {
        return (
            <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hay datos de factura disponibles</p>
            </div>
        );
    }

    const formatCurrency = (amount) => {
        if (!amount) return 'No especificado';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    const formatCUIT = (cuit) => {
        if (!cuit) return 'No especificado';
        const clean = cuit.toString().replace(/[-\s]/g, '');
        if (clean.length === 11) {
            return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
        }
        return cuit;
    };

    return (
        <div className="space-y-6">
            {/* Información principal */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Datos de la Factura
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.numero && (
                        <div className="flex items-center space-x-2">
                            <Hash className="w-4 h-4 text-blue-600" />
                            <div>
                                <span className="text-sm text-blue-600">Número:</span>
                                <p className="font-medium text-blue-900">{data.numero}</p>
                            </div>
                        </div>
                    )}
                    {data.fecha && (
                        <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <div>
                                <span className="text-sm text-blue-600">Fecha:</span>
                                <p className="font-medium text-blue-900">
                                    {new Date(data.fecha).toLocaleDateString('es-AR')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Información del emisor */}
            {(data.cuit || data.razonSocial || data.condicionIva) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Building className="w-5 h-5 mr-2" />
                        Datos del Emisor
                    </h4>
                    <div className="space-y-3">
                        {data.razonSocial && (
                            <div>
                                <span className="text-sm text-gray-600">Razón Social:</span>
                                <p className="font-medium text-gray-900">{data.razonSocial}</p>
                            </div>
                        )}
                        {data.cuit && (
                            <div>
                                <span className="text-sm text-gray-600">CUIT:</span>
                                <p className="font-medium text-gray-900">{formatCUIT(data.cuit)}</p>
                            </div>
                        )}
                        {data.condicionIva && (
                            <div>
                                <span className="text-sm text-gray-600">Condición ante el IVA:</span>
                                <p className="font-medium text-gray-900">{data.condicionIva}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Montos */}
            {(data.subtotal || data.iva || data.total) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                        <DollarSign className="w-5 h-5 mr-2" />
                        Importes
                    </h4>
                    <div className="space-y-2">
                        {data.subtotal && (
                            <div className="flex justify-between">
                                <span className="text-green-600">Subtotal:</span>
                                <span className="font-medium text-green-900">
                                    {formatCurrency(data.subtotal)}
                                </span>
                            </div>
                        )}
                        {data.iva && (
                            <div className="flex justify-between">
                                <span className="text-green-600">IVA:</span>
                                <span className="font-medium text-green-900">
                                    {formatCurrency(data.iva)}
                                </span>
                            </div>
                        )}
                        {data.percepciones && data.percepciones > 0 && (
                            <div className="flex justify-between">
                                <span className="text-green-600">Percepciones:</span>
                                <span className="font-medium text-green-900">
                                    {formatCurrency(data.percepciones)}
                                </span>
                            </div>
                        )}
                        {data.total && (
                            <div className="flex justify-between pt-2 border-t border-green-300">
                                <span className="text-green-600 font-semibold">Total:</span>
                                <span className="font-bold text-green-900 text-lg">
                                    {formatCurrency(data.total)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Items de la factura */}
            {data.items && data.items.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Items Facturados</h4>
                    <div className="space-y-2">
                        {data.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{item.descripcion}</p>
                                    <p className="text-sm text-gray-600">
                                        Cantidad: {item.cantidad} × {formatCurrency(item.precio)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-gray-900">
                                        {formatCurrency(item.subtotal || (item.cantidad * item.precio))}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceDataDisplay;