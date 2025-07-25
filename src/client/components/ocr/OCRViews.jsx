// src/client/components/ocr/OCRViews.jsx
import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
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
// Constants and Types
// ========================================
const OCR_STATUS = {
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    PENDING: 'pending'
};

const METRIC_TYPES = {
    THROUGHPUT: 'throughput',
    ACCURACY: 'accuracy',
    SPEED: 'speed',
    ERRORS: 'errors'
};

// ========================================
// Custom Hooks
// ========================================
const useResponsiveGrid = (baseClasses = "grid gap-4") => {
    return useMemo(() =>
        `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`,
        [baseClasses]
    );
};

const useOCRMetrics = () => {
    const [metrics, setMetrics] = useState({
        documentsProcessed: 156,
        accuracy: 98.5,
        processingQueue: 12,
        errorRate: 1.5,
        avgProcessingTime: 2.3,
        dailyThroughput: 1247,
        successRate: 98.7
    });

    const updateMetric = useCallback((key, value) => {
        setMetrics(prev => ({ ...prev, [key]: value }));
    }, []);

    return { metrics, updateMetric };
};

// ========================================
// Reusable Components
// ========================================
const MetricCard = ({
    icon: Icon,
    label,
    value,
    bgColor = "bg-blue-50",
    textColor = "text-blue-600",
    valueColor = "text-blue-900",
    className = "",
    onClick
}) => (
    <div
        className={`
            ${bgColor} rounded-lg p-4 sm:p-6 
            ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
            ${className}
        `}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
    >
        <div className="flex items-center space-x-3 sm:space-x-4">
            <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${textColor} flex-shrink-0`} />
            <div className="min-w-0 flex-1">
                <p className={`text-xs sm:text-sm font-medium ${textColor} truncate`}>
                    {label}
                </p>
                <p className={`text-lg sm:text-2xl font-bold ${valueColor} mt-1`}>
                    {value}
                </p>
            </div>
        </div>
    </div>
);

MetricCard.propTypes = {
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    bgColor: PropTypes.string,
    textColor: PropTypes.string,
    valueColor: PropTypes.string,
    className: PropTypes.string,
    onClick: PropTypes.func
};

const ProgressBar = ({
    label,
    value,
    target,
    unit = "",
    barColor = "bg-blue-500",
    className = ""
}) => {
    const percentage = target ? Math.min((value / target) * 100, 100) : 0;

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-gray-600 font-medium">{label}</span>
                <span className="text-gray-900 font-semibold">
                    {value}{unit} / {target}{unit}
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`${barColor} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                />
            </div>
        </div>
    );
};

ProgressBar.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    target: PropTypes.number.isRequired,
    unit: PropTypes.string,
    barColor: PropTypes.string,
    className: PropTypes.string
};

const StatusBadge = ({
    status,
    children,
    className = ""
}) => {
    const getStatusStyles = () => {
        switch (status) {
            case OCR_STATUS.COMPLETED:
                return "bg-green-100 text-green-800";
            case OCR_STATUS.PROCESSING:
                return "bg-yellow-100 text-yellow-800";
            case OCR_STATUS.FAILED:
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className={`
            inline-flex items-center px-3 py-1 rounded-full 
            text-xs sm:text-sm font-medium
            ${getStatusStyles()} ${className}
        `}>
            {children}
        </div>
    );
};

StatusBadge.propTypes = {
    status: PropTypes.oneOf(Object.values(OCR_STATUS)),
    children: PropTypes.node.isRequired,
    className: PropTypes.string
};

const FeatureList = ({ features, className = "" }) => (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 ${className}`}>
        {features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-2">
                <feature.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${feature.color} mt-0.5 flex-shrink-0`} />
                <span className="text-xs sm:text-sm text-gray-600">{feature.text}</span>
            </div>
        ))}
    </div>
);

FeatureList.propTypes = {
    features: PropTypes.arrayOf(PropTypes.shape({
        icon: PropTypes.elementType.isRequired,
        color: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired
    })).isRequired,
    className: PropTypes.string
};

// ========================================
// Main Components
// ========================================
export const OCRProcessingView = () => {
    const { metrics } = useOCRMetrics();
    const gridClasses = useResponsiveGrid();

    const processingFeatures = [
        { icon: CheckCircle, color: "text-green-500", text: "Reconocimiento de facturas PDF" },
        { icon: CheckCircle, color: "text-green-500", text: "Extracción de datos estructurados" },
        { icon: Clock, color: "text-yellow-500", text: "Validación automática de campos" },
        { icon: Clock, color: "text-yellow-500", text: "Interfaz de corrección manual" }
    ];

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <header className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    Procesamiento OCR
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                    Estado actual del motor de reconocimiento óptico de caracteres
                </p>
            </header>

            {/* Quick Stats */}
            <section className={`${gridClasses} mb-6`} aria-label="Estadísticas rápidas">
                <MetricCard
                    icon={Camera}
                    label="Documentos Procesados"
                    value={metrics.documentsProcessed}
                    bgColor="bg-blue-50"
                    textColor="text-blue-600"
                    valueColor="text-blue-900"
                />
                <MetricCard
                    icon={CheckCircle}
                    label="Precisión"
                    value={`${metrics.accuracy}%`}
                    bgColor="bg-green-50"
                    textColor="text-green-600"
                    valueColor="text-green-900"
                />
                <MetricCard
                    icon={Clock}
                    label="En Cola"
                    value={metrics.processingQueue}
                    bgColor="bg-yellow-50"
                    textColor="text-yellow-600"
                    valueColor="text-yellow-900"
                />
                <MetricCard
                    icon={AlertCircle}
                    label="Tasa de Error"
                    value={`${metrics.errorRate}%`}
                    bgColor="bg-red-50"
                    textColor="text-red-600"
                    valueColor="text-red-900"
                />
            </section>

            {/* Processing Status */}
            <section className="text-center py-8 sm:py-12 bg-white rounded-lg shadow mb-6">
                <FileText className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-blue-400 mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    Motor OCR Optimizado para Contabilidad
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-2xl mx-auto px-4">
                    Sistema de procesamiento de documentos contables con reconocimiento
                    inteligente de campos y validación automática
                </p>

                <FeatureList
                    features={processingFeatures}
                    className="max-w-2xl mx-auto px-4"
                />
            </section>
        </div>
    );
};

export const BankReconciliationView = () => {
    const gridClasses = useResponsiveGrid("grid gap-4");

    const reconciliationMetrics = [
        { icon: Calculator, label: "Transacciones Conciliadas", value: 89, color: "green" },
        { icon: RefreshCw, label: "En Proceso", value: 12, color: "yellow" },
        { icon: AlertCircle, label: "Discrepancias", value: 3, color: "red" }
    ];

    const reconciliationFeatures = [
        { icon: CheckCircle, color: "text-green-500", text: "Matching automático de transacciones" },
        { icon: CheckCircle, color: "text-green-500", text: "Detección de duplicados" },
        { icon: Clock, color: "text-yellow-500", text: "Alertas de discrepancias" },
        { icon: Clock, color: "text-yellow-500", text: "Reportes de conciliación" }
    ];

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <header className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    Conciliación Bancaria
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                    Automatización de conciliación entre extractos bancarios y registros contables
                </p>
            </header>

            <section className={`${gridClasses} mb-6`}>
                {reconciliationMetrics.map((metric, index) => (
                    <MetricCard
                        key={index}
                        icon={metric.icon}
                        label={metric.label}
                        value={metric.value}
                        bgColor={`bg-${metric.color}-50`}
                        textColor={`text-${metric.color}-600`}
                        valueColor={`text-${metric.color}-900`}
                    />
                ))}
            </section>

            <section className="text-center py-8 sm:py-12 bg-white rounded-lg shadow">
                <PieChart className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-green-400 mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    Conciliación Inteligente
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-2xl mx-auto px-4">
                    Automatización completa del proceso de conciliación con IA para
                    detectar patrones y anomalías
                </p>

                <FeatureList
                    features={reconciliationFeatures}
                    className="max-w-2xl mx-auto px-4"
                />
            </section>
        </div>
    );
};

export const TransactionCategorizationView = () => {
    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <header className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    Categorización de Transacciones
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                    Clasificación automática de transacciones usando machine learning
                </p>
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Precisión por Categoría</h4>
                    <div className="space-y-4">
                        <ProgressBar
                            label="Gastos Operativos"
                            value={95}
                            target={100}
                            unit="%"
                            barColor="bg-blue-500"
                        />
                        <ProgressBar
                            label="Ingresos"
                            value={98}
                            target={100}
                            unit="%"
                            barColor="bg-green-500"
                        />
                        <ProgressBar
                            label="Gastos Financieros"
                            value={92}
                            target={100}
                            unit="%"
                            barColor="bg-purple-500"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Velocidad de Procesamiento</h4>
                    <div className="space-y-4">
                        <ProgressBar
                            label="Velocidad actual"
                            value={1.8}
                            target={2.3}
                            unit="s"
                            barColor="bg-green-500"
                        />
                        <ProgressBar
                            label="Velocidad objetivo"
                            value={2.0}
                            target={2.3}
                            unit="s"
                            barColor="bg-yellow-500"
                        />
                    </div>
                </div>
            </section>

            <section className="text-center py-8 sm:py-12 bg-white rounded-lg shadow">
                <Activity className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-purple-400 mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    IA Contable Especializada
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-2xl mx-auto px-4">
                    Modelo de machine learning entrenado específicamente para
                    transacciones contables argentinas
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto px-4">
                    <StatusBadge status={OCR_STATUS.COMPLETED}>
                        🎯 Clasificación automática por contexto
                    </StatusBadge>
                    <StatusBadge status={OCR_STATUS.COMPLETED}>
                        📊 Análisis de patrones históricos
                    </StatusBadge>
                    <StatusBadge status={OCR_STATUS.PROCESSING}>
                        🧮 Detección de anomalías contables
                    </StatusBadge>
                    <StatusBadge status={OCR_STATUS.PROCESSING}>
                        🧠 Entrenamiento continuo con patrones contables
                    </StatusBadge>
                </div>
            </section>
        </div>
    );
};

export const OCRMetricsView = () => {
    const { metrics } = useOCRMetrics();
    const gridClasses = useResponsiveGrid();

    const advancedFeatures = [
        { icon: CheckCircle, color: "text-indigo-500", text: "📊 Dashboards interactivos" },
        { icon: CheckCircle, color: "text-green-500", text: "📈 Alertas de rendimiento" },
        { icon: Clock, color: "text-purple-500", text: "🔍 Análisis de errores" },
        { icon: Clock, color: "text-blue-500", text: "⚡ Optimización automática" }
    ];

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <header className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    Métricas OCR
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                    Dashboard de rendimiento y estadísticas del sistema OCR
                </p>
            </header>

            <section className={`${gridClasses} mb-6`}>
                <MetricCard
                    icon={TrendingUp}
                    label="Throughput Diario"
                    value={metrics.dailyThroughput.toLocaleString()}
                    bgColor="bg-indigo-50"
                    textColor="text-indigo-600"
                    valueColor="text-indigo-900"
                />
                <MetricCard
                    icon={BarChart3}
                    label="Tiempo Promedio"
                    value={`${metrics.avgProcessingTime}s`}
                    bgColor="bg-emerald-50"
                    textColor="text-emerald-600"
                    valueColor="text-emerald-900"
                />
                <MetricCard
                    icon={CheckCircle}
                    label="Éxito Total"
                    value={`${metrics.successRate}%`}
                    bgColor="bg-cyan-50"
                    textColor="text-cyan-600"
                    valueColor="text-cyan-900"
                />
                <MetricCard
                    icon={AlertCircle}
                    label="Errores Detectados"
                    value="24h"
                    bgColor="bg-amber-50"
                    textColor="text-amber-600"
                    valueColor="text-amber-900"
                />
            </section>

            <section className="text-center py-8 sm:py-12 bg-white rounded-lg shadow">
                <TrendingUp className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-indigo-400 mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    Analytics y Métricas Avanzadas
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-2xl mx-auto px-4">
                    Dashboard completo de análisis de rendimiento OCR en desarrollo
                </p>

                <FeatureList
                    features={advancedFeatures}
                    className="max-w-2xl mx-auto px-4"
                />
            </section>
        </div>
    );
};

// ========================================
// Exports
// ========================================
export const OCRViews = {
    OCRProcessingView,
    BankReconciliationView,
    TransactionCategorizationView,
    OCRMetricsView
};

export default OCRViews;