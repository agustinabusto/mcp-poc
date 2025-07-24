// ===============================================
// 1. COMPONENTE MODAL DE VISUALIZACIÓN
// ===============================================

import React, { useState, useEffect } from 'react';
import { Eye, Download, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const ReconciliationViewModal = ({ reconciliationId, isOpen, onClose }) => {
    const [reconciliationDetails, setReconciliationDetails] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && reconciliationId) {
            fetchReconciliationDetails();
        }
    }, [isOpen, reconciliationId]);

    const fetchReconciliationDetails = async () => {
        setLoading(true);
        try {
            // Simular llamada a API
            await new Promise(resolve => setTimeout(resolve, 500));

            // Datos dummy de ejemplo
            setReconciliationDetails({
                reconciliationId: reconciliationId || "recon_12345",
                period: "Enero 2025 (01/01 - 31/01)",
                executedDate: "2025-01-31 18:45",
                summary: {
                    bankMovements: 247,
                    bookRecords: 245,
                    matches: 238,
                    discrepancies: 9,
                    matchingRate: 96.7,
                    totalAmount: 2847650,
                    discrepancyAmount: 47220
                },
                matchBreakdown: {
                    exact: 198,
                    highConfidence: 32,
                    mediumConfidence: 8,
                    lowConfidence: 0
                },
                topDiscrepancies: [
                    {
                        id: 1,
                        type: "unmatched_bank",
                        amount: 45670,
                        description: "TRANSF PROV GONZALEZ SA",
                        date: "15/01/2025",
                        severity: "high",
                        suggestedAction: "Verificar si existe comprobante contable"
                    },
                    {
                        id: 2,
                        type: "amount_difference",
                        bankAmount: 12500,
                        bookAmount: 12450,
                        difference: 50,
                        description: "COMISION BANCARIA",
                        date: "20/01/2025",
                        severity: "low",
                        suggestedAction: "Verificar cálculo de comisión"
                    },
                    {
                        id: 3,
                        type: "unmatched_book",
                        amount: 8750,
                        description: "CHEQUE #001234",
                        date: "25/01/2025",
                        severity: "medium",
                        suggestedAction: "Confirmar fecha de cobro"
                    }
                ]
            });
        } catch (error) {
            console.error('Error fetching reconciliation details:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high': return 'text-red-600 bg-red-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'low': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'high': return <AlertTriangle className="h-4 w-4" />;
            case 'medium': return <Info className="h-4 w-4" />;
            case 'low': return <CheckCircle className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Detalles de Conciliación
                        </h2>
                        <p className="text-sm text-gray-600">
                            {reconciliationDetails?.period} • {reconciliationDetails?.executedDate}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Cargando detalles...</p>
                    </div>
                ) : reconciliationDetails ? (
                    <div className="p-6 space-y-6">
                        {/* Resumen Ejecutivo */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">
                                    {reconciliationDetails.summary.bankMovements}
                                </div>
                                <div className="text-sm text-gray-600">Mov. Bancarios</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                    {reconciliationDetails.summary.matches}
                                </div>
                                <div className="text-sm text-gray-600">Coincidencias</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">
                                    {reconciliationDetails.summary.discrepancies}
                                </div>
                                <div className="text-sm text-gray-600">Discrepancias</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-purple-600">
                                    {reconciliationDetails.summary.matchingRate}%
                                </div>
                                <div className="text-sm text-gray-600">Precisión</div>
                            </div>
                        </div>

                        {/* Gráfico de Coincidencias */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-4">Distribución de Coincidencias</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center">
                                        <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                                        Exactas
                                    </span>
                                    <span className="font-medium">{reconciliationDetails.matchBreakdown.exact}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center">
                                        <div className="w-4 h-4 bg-green-300 rounded mr-2"></div>
                                        Alta Confianza
                                    </span>
                                    <span className="font-medium">{reconciliationDetails.matchBreakdown.highConfidence}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center">
                                        <div className="w-4 h-4 bg-yellow-400 rounded mr-2"></div>
                                        Media Confianza
                                    </span>
                                    <span className="font-medium">{reconciliationDetails.matchBreakdown.mediumConfidence}</span>
                                </div>
                            </div>
                        </div>

                        {/* Lista de Discrepancias */}
                        <div>
                            <h3 className="font-semibold mb-4">Discrepancias Principales</h3>
                            <div className="space-y-3">
                                {reconciliationDetails.topDiscrepancies.map((discrepancy) => (
                                    <div key={discrepancy.id} className="border rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(discrepancy.severity)}`}>
                                                        {getSeverityIcon(discrepancy.severity)}
                                                        {discrepancy.severity.toUpperCase()}
                                                    </span>
                                                    <span className="text-sm text-gray-500">{discrepancy.date}</span>
                                                </div>
                                                <div className="font-medium">{discrepancy.description}</div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {discrepancy.type === 'amount_difference' ? (
                                                        <>Banco: {formatCurrency(discrepancy.bankAmount)} | Libro: {formatCurrency(discrepancy.bookAmount)}</>
                                                    ) : (
                                                        <>Monto: {formatCurrency(discrepancy.amount)}</>
                                                    )}
                                                </div>
                                                <div className="text-sm text-blue-600 mt-2">
                                                    💡 {discrepancy.suggestedAction}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        Error cargando los detalles de la conciliación
                    </div>
                )}
            </div>
        </div>
    );
};