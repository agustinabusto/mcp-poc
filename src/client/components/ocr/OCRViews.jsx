// src/client/components/ocr/OCRViews.jsx
import React from 'react';
import {
    Camera,
    TrendingUp,
    Calculator,
    PieChart,
    FileText,
    AlertCircle,
    CheckCircle,
    Clock,
    BarChart3,
    RefreshCw,
    Activity,
    Zap,
    Target
} from 'lucide-react';

// ========================================
// OCR Processing View
// ========================================
export const OCRProcessingView = () => {
    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Procesamiento OCR</h2>
                <p className="text-gray-600">Estado actual del motor de reconocimiento óptico de caracteres</p>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <Camera className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-blue-600">Documentos Procesados</p>
                            <p className="text-2xl font-bold text-blue-900">156</p>
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-green-600">Precisión</p>
                            <p className="text-2xl font-bold text-green-900">98.5%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <Clock className="h-8 w-8 text-yellow-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-yellow-600">En Cola</p>
                            <p className="text-2xl font-bold text-yellow-900">12</p>
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-red-600">Errores</p>
                            <p className="text-2xl font-bold text-red-900">3</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Estado del servicio */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Estado del Servicio OCR</h3>
                <div className="flex items-center space-x-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Motor OCR: Operativo</span>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">API de Procesamiento: Activa</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Cola de Procesamiento: 12 documentos pendientes</span>
                </div>
            </div>

            {/* Funcionalidad en desarrollo */}
            <div className="text-center py-8 bg-white rounded-lg shadow">
                <Camera className="mx-auto h-16 w-16 text-purple-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Vista Detallada en Desarrollo</h3>
                <p className="text-gray-600 mb-4">
                    La interfaz completa de procesamiento OCR está siendo desarrollada con las siguientes características:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                    <div className="flex items-start space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <span className="text-sm text-gray-600">Reconocimiento de facturas PDF</span>
                    </div>
                    <div className="flex items-start space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <span className="text-sm text-gray-600">Extracción de datos estructurados</span>
                    </div>
                    <div className="flex items-start space-x-2">
                        <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <span className="text-sm text-gray-600">Validación automática de campos</span>
                    </div>
                    <div className="flex items-start space-x-2">
                        <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <span className="text-sm text-gray-600">Interfaz de corrección manual</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ========================================
// Bank Reconciliation View
// ========================================
export const BankReconciliationView = () => {
    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Conciliación Bancaria</h2>
                <p className="text-gray-600">Automatización de conciliación entre extractos bancarios y registros contables</p>
            </div>

            {/* Estadísticas de conciliación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <Calculator className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-green-600">Conciliados</p>
                            <p className="text-2xl font-bold text-green-900">89%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <AlertCircle className="h-8 w-8 text-yellow-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-yellow-600">Diferencias</p>
                            <p className="text-2xl font-bold text-yellow-900">$12,500</p>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-blue-600">Movimientos</p>
                            <p className="text-2xl font-bold text-blue-900">1,247</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Últimas conciliaciones */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Últimas Conciliaciones</h3>
                <div className="space-y-3">
                    {[
                        { bank: 'Banco Nación', date: '2025-07-25', status: 'completed', matches: 45, differences: 2 },
                        { bank: 'Banco Galicia', date: '2025-07-24', status: 'pending', matches: 23, differences: 5 },
                        { bank: 'Santander', date: '2025-07-24', status: 'completed', matches: 67, differences: 1 }
                    ].map((reconciliation, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${reconciliation.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                                    }`}></div>
                                <div>
                                    <p className="font-medium">{reconciliation.bank}</p>
                                    <p className="text-sm text-gray-500">{reconciliation.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">{reconciliation.matches} coincidencias</p>
                                <p className="text-sm text-red-600">{reconciliation.differences} diferencias</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-center py-12 bg-white rounded-lg shadow">
                <Calculator className="mx-auto h-16 w-16 text-green-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Conciliación Bancaria Automática</h3>
                <p className="text-gray-600 mb-4">
                    Sistema de conciliación inteligente para extractos bancarios
                </p>
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    🏦 Integración con múltiples bancos en desarrollo
                </div>
            </div>
        </div>
    );
};

// ========================================
// Transaction Categorization View  
// ========================================
export const TransactionCategorizationView = () => {
    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Categorización de Transacciones</h2>
                <p className="text-gray-600">IA para clasificación automática de movimientos contables</p>
            </div>

            {/* Estadísticas de categorización */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-purple-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <PieChart className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-purple-600">Auto-categorizadas</p>
                            <p className="text-2xl font-bold text-purple-900">94%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <BarChart3 className="h-8 w-8 text-indigo-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-indigo-600">Confianza IA</p>
                            <p className="text-2xl font-bold text-indigo-900">97.2%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-teal-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-teal-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-teal-600">Categorías</p>
                            <p className="text-2xl font-bold text-teal-900">28</p>
                        </div>
                    </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <Clock className="h-8 w-8 text-orange-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-orange-600">Pendientes</p>
                            <p className="text-2xl font-bold text-orange-900">47</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Categorías principales */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Categorías Más Utilizadas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { name: 'Gastos Operativos', count: 234, color: 'bg-blue-100 text-blue-800' },
                        { name: 'Compras', count: 189, color: 'bg-green-100 text-green-800' },
                        { name: 'Servicios', count: 156, color: 'bg-purple-100 text-purple-800' },
                        { name: 'Impuestos', count: 98, color: 'bg-red-100 text-red-800' }
                    ].map((category, index) => (
                        <div key={index} className="text-center">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                                {category.name}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{category.count} transacciones</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Rendimiento de la IA */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Rendimiento del Modelo IA</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                        <Target className="mx-auto h-8 w-8 text-purple-600 mb-2" />
                        <p className="text-2xl font-bold text-purple-900">97.2%</p>
                        <p className="text-sm text-purple-600">Precisión</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                        <Activity className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                        <p className="text-2xl font-bold text-blue-900">95.8%</p>
                        <p className="text-sm text-blue-600">Recall</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg">
                        <Zap className="mx-auto h-8 w-8 text-green-600 mb-2" />
                        <p className="text-2xl font-bold text-green-900">96.5%</p>
                        <p className="text-sm text-green-600">F1-Score</p>
                    </div>
                </div>
            </div>

            <div className="text-center py-12 bg-white rounded-lg shadow">
                <div className="mx-auto h-16 w-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">🤖</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">IA de Categorización Avanzada</h3>
                <p className="text-gray-600 mb-4">
                    Machine Learning para clasificación automática de transacciones contables
                </p>
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    🧠 Entrenamiento continuo con patrones contables
                </div>
            </div>
        </div>
    );
};

// ========================================
// OCR Metrics View
// ========================================
export const OCRMetricsView = () => {
    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Métricas OCR</h2>
                <p className="text-gray-600">Dashboard de rendimiento y estadísticas del sistema OCR</p>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-indigo-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-indigo-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-indigo-600">Throughput Diario</p>
                            <p className="text-2xl font-bold text-indigo-900">1,247</p>
                        </div>
                    </div>
                </div>

                <div className="bg-emerald-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <BarChart3 className="h-8 w-8 text-emerald-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-emerald-600">Tiempo Promedio</p>
                            <p className="text-2xl font-bold text-emerald-900">2.3s</p>
                        </div>
                    </div>
                </div>

                <div className="bg-cyan-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-cyan-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-cyan-600">Éxito Total</p>
                            <p className="text-2xl font-bold text-cyan-900">98.7%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 rounded-lg p-6">
                    <div className="flex items-center">
                        <AlertCircle className="h-8 w-8 text-amber-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-amber-600">Errores</p>
                            <p className="text-2xl font-bold text-amber-900">1.3%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gráfico de rendimiento semanal */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Rendimiento Semanal</h3>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                        <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-500">Gráfico de métricas en desarrollo</p>
                        <p className="text-sm text-gray-400">Integración con Chart.js en progreso</p>
                    </div>
                </div>
            </div>

            {/* Métricas por tipo de documento */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Precisión por Tipo de Documento</h3>
                <div className="space-y-4">
                    {[
                        { type: 'Facturas A', processed: 456, accuracy: 99.2, color: 'bg-green-500' },
                        { type: 'Facturas B', processed: 334, accuracy: 98.8, color: 'bg-blue-500' },
                        { type: 'Facturas C', processed: 289, accuracy: 97.5, color: 'bg-purple-500' },
                        { type: 'Recibos', processed: 168, accuracy: 96.3, color: 'bg-orange-500' }
                    ].map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${doc.color}`}></div>
                                <div>
                                    <p className="font-medium">{doc.type}</p>
                                    <p className="text-sm text-gray-500">{doc.processed} documentos procesados</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">{doc.accuracy}%</p>
                                <p className="text-sm text-gray-500">precisión</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tendencias de rendimiento */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Tendencias de Rendimiento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Mejoras del Mes</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Velocidad de procesamiento</span>
                                <span className="text-sm font-medium text-green-600">+15%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Precisión OCR</span>
                                <span className="text-sm font-medium text-green-600">+2.3%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Reducción de errores</span>
                                <span className="text-sm font-medium text-green-600">-0.8%</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Objetivos del Mes</h4>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Precisión objetivo: 99%</span>
                                    <span className="text-gray-900">98.7%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '98.7%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Velocidad objetivo: <2s</span>
                                    <span className="text-gray-900">2.3s</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Estado del sistema */}
            <div className="text-center py-12 bg-white rounded-lg shadow">
                <TrendingUp className="mx-auto h-16 w-16 text-indigo-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics y Métricas Avanzadas</h3>
                <p className="text-gray-600 mb-4">
                    Dashboard completo de análisis de rendimiento OCR en desarrollo
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                        📊 Dashboards interactivos
                    </div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        📈 Alertas de rendimiento
                    </div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        🔍 Análisis de errores
                    </div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        ⚡ Optimización automática
                    </div>
                </div>
            </div>
        </div>
    );
};

// Exportar todos los componentes como named exports
export {
    OCRProcessingView,
    BankReconciliationView,
    TransactionCategorizationView,
    OCRMetricsView
};

// También exportar como default si se necesita
export default {
    OCRProcessingView,
    BankReconciliationView,
    TransactionCategorizationView,
    OCRMetricsView
};