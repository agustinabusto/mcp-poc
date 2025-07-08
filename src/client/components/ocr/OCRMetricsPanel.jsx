// src/client/components/ocr/OCRMetricsPanel.jsx
import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    PieChart,
    Activity,
    FileText,
    Clock,
    CheckCircle,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';

const OCRMetricsPanel = () => {
    const [timeRange, setTimeRange] = useState('30');
    const [metrics, setMetrics] = useState({
        documentsProcessed: 0,
        successRate: 0,
        averageProcessingTime: 0,
        totalInQueue: 0,
        errorRate: 0,
        confidenceAverage: 0
    });

    const mockMetricsData = {
        overview: {
            documentsProcessed: 247,
            successRate: 0.956,
            averageProcessingTime: 3.2,
            totalInQueue: 3,
            errorRate: 0.044,
            confidenceAverage: 0.912
        },
        byType: [
            { type: 'Facturas', count: 120, success: 98, confidence: 0.94 },
            { type: 'Extractos Bancarios', count: 85, success: 80, confidence: 0.89 },
            { type: 'Recibos', count: 42, success: 41, confidence: 0.91 }
        ],
        daily: [
            { date: '2024-01-08', processed: 15, success: 14, failed: 1 },
            { date: '2024-01-09', processed: 22, success: 21, failed: 1 },
            { date: '2024-01-10', processed: 18, success: 17, failed: 1 },
            { date: '2024-01-11', processed: 25, success: 24, failed: 1 },
            { date: '2024-01-12', processed: 20, success: 19, failed: 1 }
        ]
    };

    useEffect(() => {
        setMetrics(mockMetricsData.overview);
    }, [timeRange]);

    const formatPercentage = (value) => `${(value * 100).toFixed(1)}%`;
    const formatTime = (seconds) => `${seconds.toFixed(1)}s`;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Métricas OCR</h2>
                <div className="flex space-x-4">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="7">Últimos 7 días</option>
                        <option value="30">Últimos 30 días</option>
                        <option value="90">Últimos 90 días</option>
                    </select>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <RefreshCw className="w-4 h-4" />
                        <span>Actualizar</span>
                    </button>
                </div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Documentos Procesados</p>
                            <p className="text-3xl font-bold text-gray-900">{metrics.documentsProcessed}</p>
                            <p className="text-sm text-green-600">+12% vs período anterior</p>
                        </div>
                        <FileText className="w-10 h-10 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Tasa de Éxito</p>
                            <p className="text-3xl font-bold text-green-600">{formatPercentage(metrics.successRate)}</p>
                            <p className="text-sm text-green-600">+2.1% vs período anterior</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
                            <p className="text-3xl font-bold text-blue-600">{formatTime(metrics.averageProcessingTime)}</p>
                            <p className="text-sm text-green-600">-0.8s vs período anterior</p>
                        </div>
                        <Clock className="w-10 h-10 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Confianza Promedio</p>
                            <p className="text-3xl font-bold text-purple-600">{formatPercentage(metrics.confidenceAverage)}</p>
                            <p className="text-sm text-green-600">+1.2% vs período anterior</p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-purple-500" />
                    </div>
                </div>
            </div>

            {/* Métricas por tipo de documento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b">
                        <h3 className="text-lg font-semibold text-gray-900">Procesamiento por Tipo</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {mockMetricsData.byType.map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-900">{item.type}</span>
                                            <span className="text-sm text-gray-500">{item.count} documentos</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{ width: `${(item.success / item.count) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-xs text-gray-500">
                                                {item.success} exitosos
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {formatPercentage(item.confidence)} confianza
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actividad diaria */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b">
                        <h3 className="text-lg font-semibold text-gray-900">Actividad Diaria</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            {mockMetricsData.daily.map((day, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-gray-900">
                                            {new Date(day.date).toLocaleDateString('es-AR')}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm">
                                        <span className="text-gray-600">{day.processed} procesados</span>
                                        <span className="text-green-600">{day.success} exitosos</span>
                                        {day.failed > 0 && (
                                            <span className="text-red-600">{day.failed} fallidos</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Alertas y recomendaciones */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Alertas y Recomendaciones</h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-yellow-800">Cola de procesamiento creciendo</h4>
                                <p className="text-sm text-yellow-700">
                                    Hay {metrics.totalInQueue} documentos en cola. Considera aumentar la capacidad de procesamiento.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-blue-800">Mejora en la precisión</h4>
                                <p className="text-sm text-blue-700">
                                    La confianza promedio ha mejorado un 1.2% en el último período. El modelo está aprendiendo efectivamente.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-green-800">Rendimiento estable</h4>
                                <p className="text-sm text-green-700">
                                    El tiempo de procesamiento se mantiene por debajo de los 5 segundos promedio. Excelente performance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Configuración de alertas */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Configuración de Alertas</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Alerta si la tasa de error supera:
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    defaultValue="10"
                                    className="flex-1"
                                />
                                <span className="text-sm text-gray-600">10%</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Alerta si el tiempo promedio supera:
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="range"
                                    min="5"
                                    max="30"
                                    defaultValue="15"
                                    className="flex-1"
                                />
                                <span className="text-sm text-gray-600">15s</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Alerta si la cola supera:
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="range"
                                    min="5"
                                    max="50"
                                    defaultValue="20"
                                    className="flex-1"
                                />
                                <span className="text-sm text-gray-600">20 documentos</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Frecuencia de notificaciones:
                            </label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option>Inmediata</option>
                                <option>Cada hora</option>
                                <option>Diaria</option>
                                <option>Semanal</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Guardar Configuración
                        </button>
                    </div>
                </div>
            </div>

            {/* Estadísticas avanzadas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b">
                        <h3 className="text-lg font-semibold text-gray-900">Distribución de Confianza</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">90-100%</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">185 docs</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">80-89%</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">49 docs</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">70-79%</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">10 docs</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">70%</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">3 docs</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b">
                        <h3 className="text-lg font-semibold text-gray-900">Tiempos de Procesamiento</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-900">Más rápido</span>
                                <span className="text-sm text-green-600">0.8s</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-900">Promedio</span>
                                <span className="text-sm text-blue-600">3.2s</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-900">Más lento</span>
                                <span className="text-sm text-red-600">12.4s</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-900">Objetivo</span>
                                <span className="text-sm text-gray-600">5.0s</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Exportar datos */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Exportar Datos</h3>
                </div>
                <div className="p-6">
                    <div className="flex flex-wrap gap-4">
                        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <BarChart3 className="w-4 h-4" />
                            <span>Exportar CSV</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <PieChart className="w-4 h-4" />
                            <span>Generar Reporte PDF</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                            <Activity className="w-4 h-4" />
                            <span>Dashboard en Tiempo Real</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OCRMetricsPanel;