// ==============================================
// 2. src/client/components/invoices/InvoiceProcessing.jsx
import React, { useState, useEffect } from 'react';
import { Scan, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const InvoiceProcessing = () => {
    const [processingQueue, setProcessingQueue] = useState([]);
    const [stats, setStats] = useState({
        processing: 0,
        completed: 0,
        failed: 0,
        accuracy: 95
    });

    useEffect(() => {
        // Simular datos de procesamiento
        const mockQueue = [
            { id: 1, name: 'Factura_001.pdf', status: 'processing', progress: 75 },
            { id: 2, name: 'Factura_002.jpg', status: 'completed', progress: 100 },
            { id: 3, name: 'Factura_003.pdf', status: 'failed', progress: 0 },
            { id: 4, name: 'Factura_004.png', status: 'queued', progress: 0 },
        ];
        setProcessingQueue(mockQueue);

        // Actualizar estadísticas
        setStats({
            processing: mockQueue.filter(q => q.status === 'processing').length,
            completed: mockQueue.filter(q => q.status === 'completed').length,
            failed: mockQueue.filter(q => q.status === 'failed').length,
            accuracy: 95
        });
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'processing': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
            case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'failed': return <AlertCircle className="h-5 w-5 text-red-500" />;
            default: return <Clock className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'processing': return 'bg-blue-500';
            case 'completed': return 'bg-green-500';
            case 'failed': return 'bg-red-500';
            default: return 'bg-gray-300';
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Procesamiento OCR</h2>
                <p className="text-gray-600">Estado del procesamiento de facturas con OCR</p>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <RefreshCw className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-blue-600">Procesando</p>
                            <p className="text-2xl font-bold text-blue-900">{stats.processing}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-green-600">Completadas</p>
                            <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-red-600">Fallidas</p>
                            <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <Scan className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-purple-600">Precisión</p>
                            <p className="text-2xl font-bold text-purple-900">{stats.accuracy}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cola de procesamiento */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-medium">Cola de Procesamiento</h3>
                </div>
                <div className="divide-y">
                    {processingQueue.map(item => (
                        <div key={item.id} className="px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    {getStatusIcon(item.status)}
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-sm text-gray-500 capitalize">{item.status}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">{item.progress}%</p>
                                    <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                                        <div
                                            className={`h-2 rounded-full ${getStatusColor(item.status)}`}
                                            style={{ width: `${item.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InvoiceProcessing;