// ===== src/client/components/ocr/data-displays/ReceiptDataDisplay.jsx =====
import React from 'react';
import { Receipt, Calendar, DollarSign, FileText } from 'lucide-react';

const ReceiptDataDisplay = ({ data }) => {
    if (!data) {
        return (
            <div className="text-center py-8 text-gray-500">
                <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hay datos de recibo disponibles</p>
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

    return (
        <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                    <Receipt className="w-5 h-5 mr-2" />
                    Datos del Recibo
                </h4>

                <div className="space-y-3">
                    {data.fecha && (
                        <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            <div>
                                <span className="text-sm text-purple-600">Fecha:</span>
                                <p className="font-medium text-purple-900">
                                    {new Date(data.fecha).toLocaleDateString('es-AR')}
                                </p>
                            </div>
                        </div>
                    )}

                    {data.concepto && (
                        <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-purple-600" />
                            <div>
                                <span className="text-sm text-purple-600">Concepto:</span>
                                <p className="font-medium text-purple-900">{data.concepto}</p>
                            </div>
                        </div>
                    )}

                    {data.monto && (
                        <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-purple-600" />
                            <div>
                                <span className="text-sm text-purple-600">Monto:</span>
                                <p className="font-medium text-purple-900 text-lg">
                                    {formatCurrency(data.monto)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReceiptDataDisplay;