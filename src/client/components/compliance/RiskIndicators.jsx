import React, { useMemo } from 'react';

export const RiskIndicators = ({ data, summaryStats }) => {
    // Calcular distribución de riesgo
    const riskDistribution = useMemo(() => {
        if (!data || data.length === 0) {
            return { critical: 0, high: 0, medium: 0, low: 0 };
        }

        return data.reduce((acc, item) => {
            const riskScore = item.risk_score;
            if (riskScore >= 0.85) acc.critical++;
            else if (riskScore >= 0.70) acc.high++;
            else if (riskScore >= 0.40) acc.medium++;
            else acc.low++;
            return acc;
        }, { critical: 0, high: 0, medium: 0, low: 0 });
    }, [data]);

    // Configuración de los niveles de riesgo
    const riskLevels = [
        {
            key: 'critical',
            label: 'Crítico',
            color: 'bg-red-500',
            textColor: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
            ),
            description: 'Requiere atención inmediata',
            threshold: '≥ 85%'
        },
        {
            key: 'high',
            label: 'Alto',
            color: 'bg-orange-500',
            textColor: 'text-orange-600',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
            ),
            description: 'Monitoreo frecuente necesario',
            threshold: '70% - 84%'
        },
        {
            key: 'medium',
            label: 'Medio',
            color: 'bg-yellow-500',
            textColor: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
            ),
            description: 'Monitoreo regular',
            threshold: '40% - 69%'
        },
        {
            key: 'low',
            label: 'Bajo',
            color: 'bg-green-500',
            textColor: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
            ),
            description: 'Estado óptimo',
            threshold: '< 40%'
        }
    ];

    // Calcular el total para porcentajes
    const total = data?.length || 0;

    // Encontrar el nivel de mayor riesgo
    const highestRiskLevel = riskDistribution.critical > 0 ? 'critical' :
                           riskDistribution.high > 0 ? 'high' :
                           riskDistribution.medium > 0 ? 'medium' : 'low';

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Indicadores de Riesgo
                </h3>
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                        highestRiskLevel === 'critical' ? 'bg-red-500' :
                        highestRiskLevel === 'high' ? 'bg-orange-500' :
                        highestRiskLevel === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                    }`}></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Estado: {
                            highestRiskLevel === 'critical' ? 'Crítico' :
                            highestRiskLevel === 'high' ? 'Alto' :
                            highestRiskLevel === 'medium' ? 'Medio' :
                            'Bajo'
                        }
                    </span>
                </div>
            </div>

            {/* Indicadores por nivel de riesgo */}
            <div className="space-y-4">
                {riskLevels.map((level) => {
                    const count = riskDistribution[level.key];
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    
                    return (
                        <div 
                            key={level.key}
                            className={`p-4 rounded-lg border-2 ${level.bgColor} ${level.borderColor} ${
                                count > 0 ? 'opacity-100' : 'opacity-60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <div className={level.textColor}>
                                        {level.icon}
                                    </div>
                                    <div>
                                        <div className={`font-medium ${level.textColor}`}>
                                            {level.label}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {level.threshold}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-bold ${level.textColor}`}>
                                        {count}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {percentage.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                            
                            {/* Barra de progreso */}
                            <div className="w-full bg-white rounded-full h-2">
                                <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${level.color}`}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                            
                            <div className="mt-2 text-xs text-gray-600">
                                {level.description}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Gráfico de distribución tipo donut */}
            <div className="mt-6 flex items-center justify-center">
                <div className="relative">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        {total > 0 ? (
                            <>
                                {/* Segmento crítico */}
                                {riskDistribution.critical > 0 && (
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="35"
                                        stroke="#ef4444"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={`${(riskDistribution.critical / total) * 219.9} 219.9`}
                                        strokeDashoffset="0"
                                        className="transition-all duration-300"
                                    />
                                )}
                                {/* Segmento alto */}
                                {riskDistribution.high > 0 && (
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="35"
                                        stroke="#f97316"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={`${(riskDistribution.high / total) * 219.9} 219.9`}
                                        strokeDashoffset={`-${(riskDistribution.critical / total) * 219.9}`}
                                        className="transition-all duration-300"
                                    />
                                )}
                                {/* Segmento medio */}
                                {riskDistribution.medium > 0 && (
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="35"
                                        stroke="#eab308"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={`${(riskDistribution.medium / total) * 219.9} 219.9`}
                                        strokeDashoffset={`-${((riskDistribution.critical + riskDistribution.high) / total) * 219.9}`}
                                        className="transition-all duration-300"
                                    />
                                )}
                                {/* Segmento bajo */}
                                {riskDistribution.low > 0 && (
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="35"
                                        stroke="#22c55e"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={`${(riskDistribution.low / total) * 219.9} 219.9`}
                                        strokeDashoffset={`-${((riskDistribution.critical + riskDistribution.high + riskDistribution.medium) / total) * 219.9}`}
                                        className="transition-all duration-300"
                                    />
                                )}
                            </>
                        ) : (
                            <circle
                                cx="50"
                                cy="50"
                                r="35"
                                stroke="#e5e7eb"
                                strokeWidth="8"
                                fill="none"
                            />
                        )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {total}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Total
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alertas por nivel de riesgo */}
            {summaryStats && summaryStats.activeAlerts > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Alertas Activas por Riesgo
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Críticas:</span>
                            <span className="font-medium text-red-600">
                                {data?.reduce((sum, item) => sum + (item.critical_alerts || 0), 0) || 0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Altas:</span>
                            <span className="font-medium text-orange-600">
                                {data?.reduce((sum, item) => sum + (item.high_alerts || 0), 0) || 0}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Recomendaciones basadas en riesgo */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Acción Recomendada
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {riskDistribution.critical > 0 && 
                        `${riskDistribution.critical} contribuyente(s) en riesgo crítico requieren atención inmediata.`
                    }
                    {riskDistribution.critical === 0 && riskDistribution.high > 0 && 
                        `${riskDistribution.high} contribuyente(s) en riesgo alto requieren monitoreo frecuente.`
                    }
                    {riskDistribution.critical === 0 && riskDistribution.high === 0 && riskDistribution.medium > 0 && 
                        `${riskDistribution.medium} contribuyente(s) en riesgo medio. Mantener monitoreo regular.`
                    }
                    {riskDistribution.critical === 0 && riskDistribution.high === 0 && riskDistribution.medium === 0 && 
                        "Todos los contribuyentes en riesgo bajo. Excelente estado de compliance."
                    }
                </p>
            </div>
        </div>
    );
};