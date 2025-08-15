import React, { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    RadialLinearScale
} from 'chart.js';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    RadialLinearScale
);

const CompliancePatterns = ({ patternsData, cuit, loading }) => {
    // Preparar datos para gráfico de problemas recurrentes
    const recurringIssuesChartData = useMemo(() => {
        if (!patternsData?.patterns?.recurringIssues) return null;

        const data = patternsData.patterns.recurringIssues.slice(0, 8); // Top 8

        return {
            labels: data.map(item => item.alert_type.replace(/_/g, ' ').toUpperCase()),
            datasets: [
                {
                    label: 'Ocurrencias',
                    data: data.map(item => item.occurrences),
                    backgroundColor: data.map((_, index) => {
                        const colors = [
                            'rgba(239, 68, 68, 0.8)',   // Red
                            'rgba(245, 158, 11, 0.8)',  // Amber
                            'rgba(59, 130, 246, 0.8)',  // Blue
                            'rgba(16, 185, 129, 0.8)',  // Emerald
                            'rgba(139, 92, 246, 0.8)',  // Violet
                            'rgba(236, 72, 153, 0.8)',  // Pink
                            'rgba(20, 184, 166, 0.8)',  // Teal
                            'rgba(251, 146, 60, 0.8)'   // Orange
                        ];
                        return colors[index % colors.length];
                    }),
                    borderColor: data.map((_, index) => {
                        const colors = [
                            'rgb(239, 68, 68)',   // Red
                            'rgb(245, 158, 11)',  // Amber
                            'rgb(59, 130, 246)',  // Blue
                            'rgb(16, 185, 129)',  // Emerald
                            'rgb(139, 92, 246)',  // Violet
                            'rgb(236, 72, 153)',  // Pink
                            'rgb(20, 184, 166)',  // Teal
                            'rgb(251, 146, 60)'   // Orange
                        ];
                        return colors[index % colors.length];
                    }),
                    borderWidth: 1
                }
            ]
        };
    }, [patternsData]);

    // Preparar datos para gráfico de tasa de resolución
    const resolutionRateChartData = useMemo(() => {
        if (!patternsData?.patterns?.recurringIssues) return null;

        const data = patternsData.patterns.recurringIssues.slice(0, 5);

        return {
            labels: data.map(item => item.alert_type.replace(/_/g, ' ').toUpperCase()),
            datasets: [
                {
                    label: 'Tasa de Resolución (%)',
                    data: data.map(item => item.resolutionRate),
                    backgroundColor: data.map(item => 
                        item.resolutionRate >= 80 ? 'rgba(34, 197, 94, 0.8)' :
                        item.resolutionRate >= 60 ? 'rgba(245, 158, 11, 0.8)' :
                        'rgba(239, 68, 68, 0.8)'
                    ),
                    borderColor: data.map(item => 
                        item.resolutionRate >= 80 ? 'rgb(34, 197, 94)' :
                        item.resolutionRate >= 60 ? 'rgb(245, 158, 11)' :
                        'rgb(239, 68, 68)'
                    ),
                    borderWidth: 1
                }
            ]
        };
    }, [patternsData]);

    // Análisis de tendencia de performance
    const performanceAnalysis = useMemo(() => {
        if (!patternsData?.patterns?.performanceTrend || !patternsData?.patterns?.trendAnalysis) return null;

        const trend = patternsData.patterns.performanceTrend;
        const analysis = patternsData.patterns.trendAnalysis;

        return {
            current: {
                riskScore: trend.currentRiskScore?.toFixed(2) || '0.00',
                status: analysis.overallTrend
            },
            changes: {
                riskChange: analysis.riskScoreTrend?.toFixed(2) || '0.00',
                recentTrend: analysis.recent30DayTrend?.toFixed(2) || '0.00',
                alertChange: analysis.alertTrend || 0
            },
            indicators: {
                riskDirection: analysis.riskScoreTrend > 0.5 ? 'deteriorating' : 
                              analysis.riskScoreTrend < -0.5 ? 'improving' : 'stable',
                alertTrend: analysis.alertTrend > 2 ? 'increasing' :
                           analysis.alertTrend < -2 ? 'decreasing' : 'stable'
            }
        };
    }, [patternsData]);

    // Preparar datos de predicciones
    const predictionsData = useMemo(() => {
        if (!patternsData?.patterns?.predictiveInsights) return [];

        return patternsData.patterns.predictiveInsights
            .filter(insight => insight.daysUntilNext !== null && insight.daysUntilNext > 0)
            .sort((a, b) => a.daysUntilNext - b.daysUntilNext)
            .slice(0, 5); // Top 5 predicciones más próximas
    }, [patternsData]);

    // Renderizar card de métrica
    const renderMetricCard = (title, value, subtitle, trend, color = 'blue') => (
        <div className={`bg-${color}-50 p-4 rounded-lg border border-${color}-200`}>
            <div className="flex items-center justify-between">
                <div>
                    <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
                    <div className={`text-sm text-${color}-700`}>{title}</div>
                    {subtitle && <div className="text-xs text-gray-600 mt-1">{subtitle}</div>}
                </div>
                {trend && (
                    <div className="text-right">
                        <div className={`text-lg ${
                            trend.direction === 'up' ? 'text-red-500' :
                            trend.direction === 'down' ? 'text-green-500' :
                            'text-gray-500'
                        }`}>
                            {trend.direction === 'up' && '↗️'}
                            {trend.direction === 'down' && '↘️'}
                            {trend.direction === 'stable' && '➡️'}
                        </div>
                        <div className="text-xs text-gray-600">{trend.value}</div>
                    </div>
                )}
            </div>
        </div>
    );

    // Renderizar tabla de problemas recurrentes
    const renderRecurringIssuesTable = () => {
        if (!patternsData?.patterns?.recurringIssues) return null;

        return (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Problemas Recurrentes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo de Problema
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ocurrencias
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tiempo Promedio Resolución
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tasa de Resolución
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Último Caso
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {patternsData.patterns.recurringIssues.map((issue, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {issue.alert_type.replace(/_/g, ' ').toUpperCase()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {issue.occurrences}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {issue.avgResolutionTime ? `${issue.avgResolutionTime.toFixed(1)} días` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            issue.resolutionRate >= 80 ? 'bg-green-100 text-green-800' :
                                            issue.resolutionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {issue.resolutionRate.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {new Date(issue.lastOccurrence).toLocaleDateString('es-AR')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Renderizar predicciones
    const renderPredictions = () => {
        if (!predictionsData.length) return null;

        return (
            <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Predicciones Próximas</h3>
                    <p className="text-sm text-gray-600 mt-1">Basadas en patrones históricos</p>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {predictionsData.map((prediction, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-gray-900">
                                        {prediction.alert_type.replace(/_/g, ' ').toUpperCase()}
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Promedio entre ocurrencias: {prediction.avgDaysBetweenOccurrences?.toFixed(1)} días
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        Basado en {prediction.historicalOccurrences} ocurrencias históricas
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-purple-600">
                                        {prediction.daysUntilNext} días
                                    </div>
                                    <div className="text-xs text-purple-700">Próxima predicción</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Analizando patrones de compliance...</span>
            </div>
        );
    }

    if (!patternsData?.patterns) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos de patrones</h3>
                <p className="text-gray-600">No se encontraron datos suficientes para análisis de patrones.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Resumen de performance */}
            {performanceAnalysis && (
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Análisis de Desempeño</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {renderMetricCard(
                            'Puntaje de Riesgo Actual',
                            performanceAnalysis.current.riskScore,
                            `Tendencia: ${performanceAnalysis.current.status}`,
                            {
                                direction: performanceAnalysis.indicators.riskDirection === 'improving' ? 'down' :
                                          performanceAnalysis.indicators.riskDirection === 'deteriorating' ? 'up' : 'stable',
                                value: `${performanceAnalysis.changes.riskChange > 0 ? '+' : ''}${performanceAnalysis.changes.riskChange}`
                            },
                            performanceAnalysis.indicators.riskDirection === 'improving' ? 'green' :
                            performanceAnalysis.indicators.riskDirection === 'deteriorating' ? 'red' : 'blue'
                        )}
                        
                        {renderMetricCard(
                            'Tendencia 30 días',
                            performanceAnalysis.changes.recentTrend,
                            'Cambio promedio',
                            {
                                direction: parseFloat(performanceAnalysis.changes.recentTrend) > 0 ? 'up' :
                                          parseFloat(performanceAnalysis.changes.recentTrend) < 0 ? 'down' : 'stable',
                                value: 'Últimos 30 días'
                            },
                            parseFloat(performanceAnalysis.changes.recentTrend) > 0 ? 'red' :
                            parseFloat(performanceAnalysis.changes.recentTrend) < 0 ? 'green' : 'gray'
                        )}
                        
                        {renderMetricCard(
                            'Cambio en Alertas',
                            Math.abs(performanceAnalysis.changes.alertChange),
                            `${performanceAnalysis.changes.alertChange > 0 ? 'Incremento' : 
                               performanceAnalysis.changes.alertChange < 0 ? 'Reducción' : 'Sin cambio'}`,
                            {
                                direction: performanceAnalysis.changes.alertChange > 0 ? 'up' :
                                          performanceAnalysis.changes.alertChange < 0 ? 'down' : 'stable',
                                value: 'vs período anterior'
                            },
                            performanceAnalysis.changes.alertChange > 0 ? 'red' :
                            performanceAnalysis.changes.alertChange < 0 ? 'green' : 'gray'
                        )}
                        
                        {renderMetricCard(
                            'Estado General',
                            performanceAnalysis.current.status.toUpperCase(),
                            'Evaluación global',
                            null,
                            performanceAnalysis.current.status === 'improving' ? 'green' :
                            performanceAnalysis.current.status === 'deteriorating' ? 'red' : 'blue'
                        )}
                    </div>
                </div>
            )}

            {/* Gráficos de patrones */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Problemas recurrentes */}
                {recurringIssuesChartData && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Problemas Más Frecuentes
                        </h3>
                        <div className="h-80">
                            <Bar 
                                data={recurringIssuesChartData} 
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            display: false
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: function(context) {
                                                    return `Ocurrencias: ${context.parsed.y}`;
                                                }
                                            }
                                        }
                                    },
                                    scales: {
                                        x: {
                                            title: {
                                                display: true,
                                                text: 'Tipo de Problema'
                                            },
                                            ticks: {
                                                maxRotation: 45
                                            }
                                        },
                                        y: {
                                            title: {
                                                display: true,
                                                text: 'Ocurrencias'
                                            }
                                        }
                                    }
                                }} 
                            />
                        </div>
                    </div>
                )}

                {/* Tasa de resolución */}
                {resolutionRateChartData && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Tasa de Resolución por Tipo
                        </h3>
                        <div className="h-80">
                            <Bar 
                                data={resolutionRateChartData} 
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            display: false
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: function(context) {
                                                    return `Tasa de resolución: ${context.parsed.y.toFixed(1)}%`;
                                                }
                                            }
                                        }
                                    },
                                    scales: {
                                        x: {
                                            title: {
                                                display: true,
                                                text: 'Tipo de Problema'
                                            },
                                            ticks: {
                                                maxRotation: 45
                                            }
                                        },
                                        y: {
                                            title: {
                                                display: true,
                                                text: 'Tasa de Resolución (%)'
                                            },
                                            min: 0,
                                            max: 100
                                        }
                                    }
                                }} 
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Tabla de problemas recurrentes */}
            {renderRecurringIssuesTable()}

            {/* Predicciones */}
            {renderPredictions()}

            {/* Insights y recomendaciones */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Observaciones y Recomendaciones</h3>
                <div className="space-y-4 text-sm text-gray-700">
                    {performanceAnalysis && (
                        <>
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">1</span>
                                </div>
                                <p>
                                    <strong>Estado General:</strong> El análisis muestra una tendencia {performanceAnalysis.current.status === 'improving' ? 'positiva' : performanceAnalysis.current.status === 'deteriorating' ? 'negativa' : 'estable'} 
                                    en el compliance. {performanceAnalysis.current.status === 'deteriorating' && 'Se recomienda revisar las causas del deterioro y tomar acciones correctivas.'}
                                    {performanceAnalysis.current.status === 'improving' && 'Continuar con las buenas prácticas implementadas.'}
                                </p>
                            </div>
                            
                            {patternsData.patterns.recurringIssues?.length > 0 && (
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">2</span>
                                    </div>
                                    <p>
                                        <strong>Problemas Recurrentes:</strong> Se identificaron {patternsData.patterns.recurringIssues.length} tipos de problemas recurrentes.
                                        El problema más frecuente es "{patternsData.patterns.recurringIssues[0]?.alert_type.replace(/_/g, ' ')}" con {patternsData.patterns.recurringIssues[0]?.occurrences} ocurrencias.
                                    </p>
                                </div>
                            )}
                            
                            {predictionsData.length > 0 && (
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">3</span>
                                    </div>
                                    <p>
                                        <strong>Predicciones:</strong> Se espera el próximo problema de tipo "{predictionsData[0]?.alert_type.replace(/_/g, ' ')}" 
                                        en aproximadamente {predictionsData[0]?.daysUntilNext} días. Considerar acciones preventivas.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompliancePatterns;