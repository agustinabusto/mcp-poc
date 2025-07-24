// src/client/components/invoices/InvoiceIntegration.jsx
import React, { useState, useEffect } from 'react';
import { Database, Send, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { getMCPArcaService } from '../../services/mcp-arca-service.js';

const InvoiceIntegration = () => {
    const [arcaService, setArcaService] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initializeService();
    }, []);

    const initializeService = async () => {
        try {
            const service = await getMCPArcaService();
            setArcaService(service);

            const arcaStats = await service.getArcaStats();
            setStats(arcaStats);
        } catch (error) {
            console.error('Error inicializando servicio ARCA:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-600">Cargando integración ARCA...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center mb-6">
                        <Database className="h-8 w-8 text-purple-600 mr-3" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Integración ARCA</h1>
                            <p className="text-gray-600">Envío de facturas al sistema ARCA</p>
                        </div>
                    </div>

                    {/* Estadísticas ARCA */}
                    {stats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-blue-50 rounded-lg p-6">
                                <div className="flex items-center">
                                    <Send className="h-8 w-8 text-blue-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-blue-600">Enviadas Hoy</p>
                                        <p className="text-2xl font-bold text-blue-900">{stats.today?.sent || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 rounded-lg p-6">
                                <div className="flex items-center">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-green-600">Autorizadas</p>
                                        <p className="text-2xl font-bold text-green-900">{stats.today?.authorized || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 rounded-lg p-6">
                                <div className="flex items-center">
                                    <AlertTriangle className="h-8 w-8 text-red-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-red-600">Rechazadas</p>
                                        <p className="text-2xl font-bold text-red-900">{stats.today?.rejected || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 rounded-lg p-6">
                                <div className="flex items-center">
                                    <RefreshCw className="h-8 w-8 text-yellow-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-yellow-600">Pendientes</p>
                                        <p className="text-2xl font-bold text-yellow-900">{stats.today?.pending || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="text-center py-12">
                        <Database className="mx-auto h-16 w-16 text-purple-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Integración ARCA Activa</h3>
                        <p className="text-gray-600">Vista detallada de envíos a ARCA en desarrollo.</p>
                        <div className="mt-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                ✓ Servicio MCP ARCA Conectado
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceIntegration;