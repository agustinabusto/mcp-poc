// src/client/components/ocr/BankReconciliationPanel.jsx
import React, { useState, useEffect } from 'react';
import {
    Calculator,
    CheckCircle,
    AlertCircle,
    Clock,
    RefreshCw,
    Download,
    Eye,
    Filter,
    Search
} from 'lucide-react';
import { useBankReconciliation } from '../../hooks/useBankReconciliation.js';

const BankReconciliationPanel = () => {
    const {
        reconciliations,
        performReconciliation,
        getReconciliationStatus,
        loadReconciliations,
        loading,
        error
    } = useBankReconciliation();

    const [selectedPeriod, setSelectedPeriod] = useState('current_month');
    const [showDetails, setShowDetails] = useState(null);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'in_progress':
                return <Clock className="w-5 h-5 text-blue-500" />;
            case 'failed':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-AR');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Conciliación Bancaria</h2>
                <button
                    onClick={loadReconciliations}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                </button>
            </div>

            {/* Resumen de conciliaciones */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Conciliaciones</p>
                            <p className="text-2xl font-bold text-gray-900">{reconciliations.length}</p>
                        </div>
                        <Calculator className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Completadas</p>
                            <p className="text-2xl font-bold text-green-600">
                                {reconciliations.filter(r => r.status === 'completed').length}
                            </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Tasa Promedio</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {reconciliations.length > 0
                                    ? `${(reconciliations.reduce((acc, r) => acc + r.matchingRate, 0) / reconciliations.length * 100).toFixed(1)}%`
                                    : '0%'
                                }
                            </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">En Proceso</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {reconciliations.filter(r => r.status === 'in_progress').length}
                            </p>
                        </div>
                        <Clock className="w-8 h-8 text-orange-500" />
                    </div>
                </div>
            </div>

            {/* Lista de conciliaciones */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Historial de Conciliaciones</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Período
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Coincidencias
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Discrepancias
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reconciliations.map((reconciliation) => (
                                <tr key={reconciliation.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {getStatusIcon(reconciliation.status)}
                                            <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                                                {reconciliation.status === 'completed' ? 'Completada' :
                                                    reconciliation.status === 'in_progress' ? 'En Proceso' : 'Fallida'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(reconciliation.startDate)} - {formatDate(reconciliation.endDate)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div>
                                            <div className="font-medium">{(reconciliation.matchingRate * 100).toFixed(1)}%</div>
                                            <div className="text-gray-500">{reconciliation.matchedTransactions} transacciones</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div>
                                            <div className="font-medium">{formatCurrency(reconciliation.totalDiscrepancy)}</div>
                                            <div className="text-gray-500">
                                                {reconciliation.unmatchedBank + reconciliation.unmatchedBook} sin match
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(reconciliation.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => setShowDetails(reconciliation.id)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="text-green-600 hover:text-green-900">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BankReconciliationPanel;