import React, { useMemo } from 'react';

export const ComplianceScore = ({ data, metrics }) => {
    // Calcular estadísticas de compliance
    const complianceStats = useMemo(() => {
        if (!data || data.length === 0) {
            return {
                totalScore: 0,
                distribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
                trend: 0
            };
        }

        // Distribución por estado
        const distribution = data.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, { excellent: 0, good: 0, fair: 0, poor: 0 });

        // Score promedio
        const totalScore = data.reduce((sum, item) => {
            const statusScore = {
                excellent: 100,
                good: 80,
                fair: 60,
                poor: 30
            };
            return sum + (statusScore[item.status] || 0);
        }, 0) / data.length;

        // Calcular tendencia (simulada)
        const trend = metrics?.compliance_rate ? 
            parseFloat(metrics.compliance_rate) - 75 : 0; // Comparar con baseline de 75%

        return {
            totalScore: Math.round(totalScore),
            distribution,
            trend
        };
    }, [data, metrics]);

    // Determinar color basado en score
    const getScoreColor = (score) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 75) return 'text-blue-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    // Determinar color de fondo del indicador circular
    const getScoreBackground = (score) => {
        if (score >= 90) return 'stroke-green-600';
        if (score >= 75) return 'stroke-blue-600';
        if (score >= 60) return 'stroke-yellow-600';
        return 'stroke-red-600';
    };

    // Calcular porcentaje para el círculo
    const circumference = 2 * Math.PI * 40; // radio de 40
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (complianceStats.totalScore / 100) * circumference;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Score de Compliance
                </h3>
                <div className="flex items-center space-x-2">
                    {complianceStats.trend !== 0 && (
                        <div className={`flex items-center text-sm ${
                            complianceStats.trend > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {complianceStats.trend > 0 ? (
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                </svg>
                            )}
                            {Math.abs(complianceStats.trend).toFixed(1)}%
                        </div>
                    )}
                </div>
            </div>

            {/* Indicador circular principal */}
            <div className="flex items-center justify-center mb-6">
                <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                        {/* Círculo de fondo */}
                        <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-gray-200 dark:text-gray-700"
                        />
                        {/* Círculo de progreso */}
                        <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className={getScoreBackground(complianceStats.totalScore)}
                            style={{
                                transition: 'stroke-dashoffset 0.5s ease-in-out'
                            }}
                        />
                    </svg>
                    {/* Score en el centro */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className={`text-3xl font-bold ${getScoreColor(complianceStats.totalScore)}`}>
                                {complianceStats.totalScore}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                de 100
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Distribución por estado */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Distribución por Estado
                </h4>
                
                {/* Excelente */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Excelente</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                    width: `${data.length > 0 ? (complianceStats.distribution.excellent / data.length) * 100 : 0}%` 
                                }}
                            ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                            {complianceStats.distribution.excellent}
                        </span>
                    </div>
                </div>

                {/* Bueno */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Bueno</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                    width: `${data.length > 0 ? (complianceStats.distribution.good / data.length) * 100 : 0}%` 
                                }}
                            ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                            {complianceStats.distribution.good}
                        </span>
                    </div>
                </div>

                {/* Regular */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Regular</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                    width: `${data.length > 0 ? (complianceStats.distribution.fair / data.length) * 100 : 0}%` 
                                }}
                            ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                            {complianceStats.distribution.fair}
                        </span>
                    </div>
                </div>

                {/* Deficiente */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Deficiente</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                    width: `${data.length > 0 ? (complianceStats.distribution.poor / data.length) * 100 : 0}%` 
                                }}
                            ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                            {complianceStats.distribution.poor}
                        </span>
                    </div>
                </div>
            </div>

            {/* Métricas adicionales */}
            {metrics && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {metrics.total_monitored || data.length}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Total Monitoreados
                            </div>
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {metrics.avg_risk_score ? (metrics.avg_risk_score * 100).toFixed(1) : '0.0'}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Risk Score Promedio
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recomendaciones basadas en score */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Recomendación
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {complianceStats.totalScore >= 90 && 
                        "Excelente nivel de compliance. Mantener el monitoreo actual."
                    }
                    {complianceStats.totalScore >= 75 && complianceStats.totalScore < 90 && 
                        "Buen nivel de compliance. Revisar casos en estado regular o deficiente."
                    }
                    {complianceStats.totalScore >= 60 && complianceStats.totalScore < 75 && 
                        "Nivel de compliance medio. Se recomienda acción preventiva en casos críticos."
                    }
                    {complianceStats.totalScore < 60 && 
                        "Nivel de compliance bajo. Requiere atención inmediata y plan de mejora."
                    }
                </p>
            </div>
        </div>
    );
};