// src/client/components/ComplianceView.jsx
import React, { useState } from 'react';

export const ComplianceView = ({
    complianceData,
    complianceHistory,
    isLoading,
    onRefresh,
    onRunCheck,
    selectedCuit,
    onCuitChange,
    settings
}) => {
    const [cuitInput, setCuitInput] = useState(selectedCuit || '');

    const handleRunCheck = () => {
        if (cuitInput) {
            onRunCheck(cuitInput, {
                from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Verificación de Compliance
                </h2>

                <div className="flex gap-4 mb-6">
                    <input
                        type="text"
                        value={cuitInput}
                        onChange={(e) => setCuitInput(e.target.value)}
                        placeholder="Ingrese CUIT (XX-XXXXXXXX-X)"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                        onClick={handleRunCheck}
                        disabled={!cuitInput || isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoading ? 'Verificando...' : 'Verificar'}
                    </button>
                </div>

                {complianceData && (
                    <div className="border-t pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className={`text-4xl font-bold mb-2 ${complianceData.score >= 80 ? 'text-green-600' :
                                        complianceData.score >= 60 ? 'text-yellow-600' :
                                            'text-red-600'
                                    }`}>
                                    {complianceData.score}%
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">Score de Compliance</p>
                            </div>

                            <div className="text-center">
                                <div className={`text-lg font-medium mb-2 ${complianceData.overallStatus === 'excellent' ? 'text-green-600' :
                                        complianceData.overallStatus === 'good' ? 'text-blue-600' :
                                            complianceData.overallStatus === 'fair' ? 'text-yellow-600' :
                                                'text-red-600'
                                    }`}>
                                    {complianceData.overallStatus?.toUpperCase()}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">Estado General</p>
                            </div>

                            <div className="text-center">
                                <div className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
                                    {new Date(complianceData.timestamp).toLocaleDateString()}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">Última Verificación</p>
                            </div>
                        </div>

                        {complianceData.checks && Object.keys(complianceData.checks).length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                    Detalle de Verificaciones
                                </h3>
                                <div className="space-y-3">
                                    {Object.entries(complianceData.checks).map(([key, check]) => (
                                        <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {key.replace('_', ' ').toUpperCase()}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Score: {check.score}%
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded ${check.status === 'compliant' ? 'bg-green-100 text-green-800' :
                                                    check.status === 'non_compliant' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {check.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {complianceData.recommendations && complianceData.recommendations.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                    Recomendaciones
                                </h3>
                                <ul className="space-y-2">
                                    {complianceData.recommendations.map((rec, idx) => (
                                        <li key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};