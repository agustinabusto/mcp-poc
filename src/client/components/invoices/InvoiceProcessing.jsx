// src/client/components/invoices/InvoiceProcessing.jsx
import React from 'react';
import { Scan, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const InvoiceProcessing = () => {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center mb-6">
                        <Scan className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Procesamiento de Facturas</h1>
                            <p className="text-gray-600">Estado del procesamiento OCR y validación</p>
                        </div>
                    </div>

                    <div className="text-center py-12">
                        <Clock className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Componente en Desarrollo</h3>
                        <p className="text-gray-600">Esta vista mostrará el estado del procesamiento OCR de facturas.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceProcessing;