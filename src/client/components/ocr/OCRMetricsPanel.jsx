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
            </div>
        </div>
    )
}

export default OCRMetricsPanel;