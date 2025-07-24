// src/client/components/invoices/InvoiceValidation.jsx
import React from 'react';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const InvoiceValidation = () => {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center mb-6">
                        <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Validación de Facturas</h1>
                            <p className="text-gray-600">Revisión y validación de datos extraídos</p>
                        </div>
                    </div>

                    <div className="text-center py-12">
                        <AlertTriangle className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Componente en Desarrollo</h3>
                        <p className="text-gray-600">Esta vista permitirá validar y corregir datos de facturas procesadas.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceValidation;