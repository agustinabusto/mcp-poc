import React, { useState, useMemo, useEffect } from 'react';
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
    TimeScale
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

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
    TimeScale
);

const ComplianceTrends = ({ trendsData, cuit, onTimeRangeChange, loading }) => {
    const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
    const [selectedMetric, setSelectedMetric] = useState('risk_score');

    // Actualizar datos cuando cambia el rango temporal
    useEffect(() => {
        if (onTimeRangeChange) {
            onTimeRangeChange(selectedTimeRange);
        }
    }, [selectedTimeRange, onTimeRangeChange]);

    // Preparar datos para gráfico de evolución de risk score
    const riskScoreChartData = useMemo(() => {
        if (!trendsData?.trends?.riskScoreEvolution) return null;

        const data = trendsData.trends.riskScoreEvolution;
        
        return {
            labels: data.map(item => new Date(item.date).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })),
            datasets: [
                {
                    label: 'Puntaje de Riesgo Promedio',
                    data: data.map(item => item.avgScore),
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Puntaje de Riesgo Máximo',
                    data: data.map(item => item.maxScore),
                    borderColor: 'rgb(220, 38, 38)',
                    backgroundColor: 'rgba(220, 38, 38, 0.05)',
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'Puntaje de Riesgo Mínimo',
                    data: data.map(item => item.minScore),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false
                }
            ]
        };
    }, [trendsData]);

    // Preparar datos para gráfico de compliance status
    const complianceStatusChartData = useMemo(() => {
        if (!trendsData?.trends?.complianceStatusTrend) return null;

        const data = trendsData.trends.complianceStatusTrend;
        const statusColors = {
            excellent: 'rgb(34, 197, 94)',
            good: 'rgb(59, 130, 246)',
            fair: 'rgb(245, 158, 11)',
            poor: 'rgb(239, 68, 68)',
            error: 'rgb(107, 114, 128)'
        };

        // Agrupar por status
        const statusGroups = data.reduce((acc, item) => {
            if (!acc[item.status]) {
                acc[item.status] = [];
            }
            acc[item.status].push(item);
            return acc;
        }, {});

        const datasets = Object.keys(statusGroups).map(status => ({
            label: status.charAt(0).toUpperCase() + status.slice(1),
            data: data.map(item => item.status === status ? item.score : null),
            borderColor: statusColors[status],
            backgroundColor: statusColors[status],
            tension: 0.4,
            spanGaps: false
        }));

        return {
            labels: data.map(item => new Date(item.date).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })),
            datasets
        };
    }, [trendsData]);

    // Preparar datos para gráfico de frecuencia de alertas
    const alertFrequencyChartData = useMemo(() => {
        if (!trendsData?.trends?.alertFrequency) return null;

        const data = trendsData.trends.alertFrequency.slice(0, 10); // Top 10
        const severityColors = {
            critical: 'rgb(220, 38, 38)',
            high: 'rgb(245, 101, 101)',
            medium: 'rgb(245, 158, 11)',
            low: 'rgb(34, 197, 94)'
        };

        return {
            labels: data.map(item => item.alert_type.replace(/_/g, ' ').toUpperCase()),
            datasets: [
                {
                    label: 'Cantidad de Alertas',
                    data: data.map(item => item.count),
                    backgroundColor: data.map(item => severityColors[item.severity] || 'rgb(107, 114, 128)'),
                    borderColor: data.map(item => severityColors[item.severity] || 'rgb(107, 114, 128)'),
                    borderWidth: 1
                }
            ]
        };
    }, [trendsData]);

    // Preparar datos para gráfico de patrones estacionales
    const seasonalPatternsChartData = useMemo(() => {
        if (!trendsData?.trends?.seasonalPatterns) return null;

        const data = trendsData.trends.seasonalPatterns;

        return {
            labels: data.map(item => item.dayOfWeek),
            datasets: [
                {
                    label: 'Cantidad de Alertas',
                    data: data.map(item => item.alertCount),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                },
                {
                    label: 'Severidad Promedio',
                    data: data.map(item => item.avgSeverityScore),
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: 'rgb(245, 158, 11)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        };
    }, [trendsData]);

    // Opciones comunes para gráficos
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            }
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Fecha'
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Valor'
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    // Opciones específicas para gráfico de barras con doble eje Y
    const dualAxisOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Severidad Promedio'
                },
                grid: {
                    drawOnChartArea: false,
                }
            }
        }
    };

    // Calcular métricas resumidas
    const trendSummary = useMemo(() => {
        if (!trendsData?.trends) return null;

        const riskData = trendsData.trends.riskScoreEvolution;
        const alertData = trendsData.trends.alertFrequency;

        if (!riskData?.length) return null;

        const currentRisk = riskData[riskData.length - 1]?.avgScore || 0;
        const previousRisk = riskData[0]?.avgScore || 0;
        const riskTrend = currentRisk - previousRisk;

        const totalAlerts = alertData?.reduce((sum, item) => sum + item.count, 0) || 0;
        const criticalAlerts = alertData?.filter(item => item.severity === 'critical').reduce((sum, item) => sum + item.count, 0) || 0;

        return {
            currentRisk: currentRisk.toFixed(2),
            riskTrend: riskTrend.toFixed(2),
            riskDirection: riskTrend > 0 ? 'up' : riskTrend < 0 ? 'down' : 'stable',
            totalAlerts,
            criticalAlerts,
            alertTypes: alertData?.length || 0
        };
    }, [trendsData]);

    // Renderizar controles de tiempo
    const renderTimeRangeControls = () => (
        <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-sm font-medium text-gray-700 self-center mr-3">Período:</span>
            {[
                { value: '7d', label: '7 días' },
                { value: '30d', label: '30 días' },
                { value: '90d', label: '90 días' },
                { value: '180d', label: '6 meses' },
                { value: '1y', label: '1 año' }
            ].map(option => (
                <button
                    key={option.value}
                    onClick={() => setSelectedTimeRange(option.value)}
                    className={`px-3 py-1 text-sm rounded-md border ${
                        selectedTimeRange === option.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );

    // Renderizar resumen de tendencias
    const renderTrendSummary = () => {
        if (!trendSummary) return null;

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{trendSummary.currentRisk}</div>
                    <div className="text-sm text-blue-700">Puntaje de Riesgo Actual</div>
                </div>
                <div className={`p-4 rounded-lg ${
                    trendSummary.riskDirection === 'up' ? 'bg-red-50' :
                    trendSummary.riskDirection === 'down' ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                    <div className={`text-2xl font-bold flex items-center ${
                        trendSummary.riskDirection === 'up' ? 'text-red-600' :
                        trendSummary.riskDirection === 'down' ? 'text-green-600' : 'text-gray-600'
                    }`}>
                        {trendSummary.riskDirection === 'up' && '↗️'}
                        {trendSummary.riskDirection === 'down' && '↘️'}
                        {trendSummary.riskDirection === 'stable' && '➡️'}
                        {Math.abs(parseFloat(trendSummary.riskTrend)).toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-700">Tendencia Risk</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{trendSummary.totalAlerts}</div>
                    <div className="text-sm text-yellow-700">Total Alertas</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{trendSummary.criticalAlerts}</div>
                    <div className="text-sm text-red-700">Alertas Críticas</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{trendSummary.alertTypes}</div>
                    <div className="text-sm text-purple-700">Tipos de Alertas</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-600">
                        {((trendSummary.totalAlerts - trendSummary.criticalAlerts) / Math.max(trendSummary.totalAlerts, 1) * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-indigo-700">Alertas Resueltas</div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Cargando análisis de tendencias...</span>
            </div>
        );
    }

    if (!trendsData?.trends) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📈</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos de tendencias</h3>
                <p className="text-gray-600">No se encontraron datos suficientes para generar análisis de tendencias.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Controles de tiempo */}
            {renderTimeRangeControls()}

            {/* Resumen de tendencias */}
            {renderTrendSummary()}

            {/* Gráficos */}
            <div className="space-y-8">
                {/* Evolución de Risk Score */}
                {riskScoreChartData && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Evolución del Puntaje de Riesgo
                        </h3>
                        <div className="h-80">
                            <Line data={riskScoreChartData} options={commonOptions} />
                        </div>
                    </div>
                )}

                {/* Tendencia de Compliance Status */}
                {complianceStatusChartData && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Tendencia de Estados de Cumplimiento
                        </h3>
                        <div className="h-80">
                            <Line data={complianceStatusChartData} options={commonOptions} />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Frecuencia de Alertas por Tipo */}
                    {alertFrequencyChartData && (
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Frecuencia de Alertas por Tipo
                            </h3>
                            <div className="h-80">
                                <Bar 
                                    data={alertFrequencyChartData} 
                                    options={{
                                        ...commonOptions,
                                        scales: {
                                            ...commonOptions.scales,
                                            x: {
                                                ...commonOptions.scales.x,
                                                title: {
                                                    display: true,
                                                    text: 'Tipo de Alerta'
                                                }
                                            },
                                            y: {
                                                ...commonOptions.scales.y,
                                                title: {
                                                    display: true,
                                                    text: 'Cantidad'
                                                }
                                            }
                                        }
                                    }} 
                                />
                            </div>
                        </div>
                    )}

                    {/* Patrones Estacionales */}
                    {seasonalPatternsChartData && (
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Patrones por Día de la Semana
                            </h3>
                            <div className="h-80">
                                <Bar 
                                    data={seasonalPatternsChartData} 
                                    options={{
                                        ...dualAxisOptions,
                                        scales: {
                                            ...dualAxisOptions.scales,
                                            x: {
                                                ...dualAxisOptions.scales.x,
                                                title: {
                                                    display: true,
                                                    text: 'Día de la Semana'
                                                }
                                            },
                                            y: {
                                                ...dualAxisOptions.scales.y,
                                                title: {
                                                    display: true,
                                                    text: 'Cantidad de Alertas'
                                                }
                                            }
                                        }
                                    }} 
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Análisis textual */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Análisis de Tendencias</h3>
                <div className="space-y-3 text-sm text-gray-700">
                    {trendSummary && (
                        <>
                            <p>
                                <strong>Puntaje de Riesgo:</strong> El valor actual es {trendSummary.currentRisk}, 
                                {trendSummary.riskDirection === 'up' && ' mostrando una tendencia al alza que requiere atención.'}
                                {trendSummary.riskDirection === 'down' && ' mostrando una mejora en el período analizado.'}
                                {trendSummary.riskDirection === 'stable' && ' manteniéndose estable en el período.'}
                            </p>
                            <p>
                                <strong>Actividad de Alertas:</strong> Se registraron {trendSummary.totalAlerts} alertas en total,
                                con {trendSummary.criticalAlerts} de severidad crítica ({((trendSummary.criticalAlerts / Math.max(trendSummary.totalAlerts, 1)) * 100).toFixed(1)}%).
                            </p>
                            <p>
                                <strong>Diversidad de Problemas:</strong> Se identificaron {trendSummary.alertTypes} tipos diferentes de alertas,
                                lo que indica {trendSummary.alertTypes > 3 ? 'múltiples áreas que requieren atención' : 'problemas focalizados'}.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplianceTrends;