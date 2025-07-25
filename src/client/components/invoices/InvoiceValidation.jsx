// ==============================================
// 3. src/client/components/invoices/InvoiceValidation.jsx
import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, X, Eye, Edit3 } from 'lucide-react';

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
                businessName: 'Empresa Ejemplo SA'
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
                businessName: 'Proveedor XYZ'
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'valid':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Válida
                </span>;
            case 'needs_review':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Revisar
                </span>;
            case 'invalid':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <X className="w-3 h-3 mr-1" />
                    Inválida
                </span>;
            default:
                return null;
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Validación de Facturas</h2>
                <p className="text-gray-600">Revisa y valida los datos extraídos de las facturas</p>
            </div>

            {/* Resumen de validación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

            {/* Lista de facturas */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-medium">Facturas Procesadas</h3>
                </div>
                <div className="divide-y">
                    {validationResults.map(result => (
                        <div key={result.id} className="px-6 py-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <h4 className="font-medium">{result.filename}</h4>
                                    {getStatusBadge(result.status)}
                                    <span className="text-sm text-gray-500">
                                        Confianza: {result.confidence}%
                                    </span>
                                </div>
                                <div className="flex space-x-2">
                                    <button className="text-blue-600 hover:bg-blue-50 p-2 rounded">
                                        <Eye className="h-4 w-4" />
                                    </button>
                                    <button className="text-gray-600 hover:bg-gray-50 p-2 rounded">
                                        <Edit3 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Número:</span>
                                    <p className="font-medium">{result.extractedData.number}</p>
                                    {result.validations.format ?
                                        <CheckCircle className="h-3 w-3 text-green-500 inline ml-1" /> :
                                        <X className="h-3 w-3 text-red-500 inline ml-1" />
                                    }
                                </div>
                                <div>
                                    <span className="text-gray-500">CUIT:</span>
                                    <p className="font-medium">{result.extractedData.cuit}</p>
                                    {result.validations.cuit ?
                                        <CheckCircle className="h-3 w-3 text-green-500 inline ml-1" /> :
                                        <X className="h-3 w-3 text-red-500 inline ml-1" />
                                    }
                                </div>
                                <div>
                                    <span className="text-gray-500">Fecha:</span>
                                    <p className="font-medium">{result.extractedData.date}</p>
                                    {result.validations.date ?
                                        <CheckCircle className="h-3 w-3 text-green-500 inline ml-1" /> :
                                        <X className="h-3 w-3 text-red-500 inline ml-1" />
                                    }
                                </div>
                                <div>
                                    <span className="text-gray-500">Importe:</span>
                                    <p className="font-medium">${result.extractedData.amount}</p>
                                    {result.validations.amount ?
                                        <CheckCircle className="h-3 w-3 text-green-500 inline ml-1" /> :
                                        <X className="h-3 w-3 text-red-500 inline ml-1" />
                                    }
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InvoiceValidation;