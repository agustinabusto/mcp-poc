// src/client/components/contributors/ComplianceIndicator.jsx
import React from 'react';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    Minus,
    Shield,
    AlertCircle,
    Info
} from 'lucide-react';

const ComplianceIndicator = ({
    status,
    type = 'compliance',
    details = null,
    size = 'sm',
    showText = true,
    showTooltip = true
}) => {
    // Configuraciones por tipo
    const getStatusConfig = () => {
        if (type === 'arca') {
            switch (status) {
                case 'compliant':
                case 'active':
                case 'green':
                    return {
                        icon: CheckCircle,
                        color: 'text-green-600',
                        bgColor: 'bg-green-100',
                        borderColor: 'border-green-200',
                        text: 'Activo',
                        description: 'Estado fiscal normal en ARCA'
                    };
                case 'warning':
                case 'yellow':
                case 'pending':
                    return {
                        icon: AlertTriangle,
                        color: 'text-yellow-600',
                        bgColor: 'bg-yellow-100',
                        borderColor: 'border-yellow-200',
                        text: 'Advertencia',
                        description: 'Requiere atención en ARCA'
                    };
                case 'non_compliant':
                case 'error':
                case 'red':
                case 'inactive':
                    return {
                        icon: XCircle,
                        color: 'text-red-600',
                        bgColor: 'bg-red-100',
                        borderColor: 'border-red-200',
                        text: 'Inactivo',
                        description: 'Estado fiscal problemático en ARCA'
                    };
                case 'processing':
                case 'loading':
                    return {
                        icon: Clock,
                        color: 'text-blue-600',
                        bgColor: 'bg-blue-100',
                        borderColor: 'border-blue-200',
                        text: 'Procesando',
                        description: 'Consultando estado en ARCA'
                    };
                default:
                    return {
                        icon: Minus,
                        color: 'text-gray-600',
                        bgColor: 'bg-gray-100',
                        borderColor: 'border-gray-200',
                        text: 'Desconocido',
                        description: 'Estado no disponible'
                    };
            }
        } else if (type === 'compliance') {
            switch (status) {
                case 'compliant':
                case 'good':
                case 'green':
                    return {
                        icon: Shield,
                        color: 'text-green-600',
                        bgColor: 'bg-green-100',
                        borderColor: 'border-green-200',
                        text: 'Compliant',
                        description: 'Todas las obligaciones al día'
                    };
                case 'partial':
                case 'warning':
                case 'yellow':
                    return {
                        icon: AlertCircle,
                        color: 'text-yellow-600',
                        bgColor: 'bg-yellow-100',
                        borderColor: 'border-yellow-200',
                        text: 'Parcial',
                        description: 'Algunas obligaciones pendientes'
                    };
                case 'non_compliant':
                case 'critical':
                case 'red':
                    return {
                        icon: XCircle,
                        color: 'text-red-600',
                        bgColor: 'bg-red-100',
                        borderColor: 'border-red-200',
                        text: 'No Compliant',
                        description: 'Múltiples incumplimientos'
                    };
                case 'pending':
                case 'processing':
                    return {
                        icon: Clock,
                        color: 'text-blue-600',
                        bgColor: 'bg-blue-100',
                        borderColor: 'border-blue-200',
                        text: 'Pendiente',
                        description: 'Evaluando compliance'
                    };
                default:
                    return {
                        icon: Info,
                        color: 'text-gray-600',
                        bgColor: 'bg-gray-100',
                        borderColor: 'border-gray-200',
                        text: 'Sin datos',
                        description: 'No hay información disponible'
                    };
            }
        }

        // Fallback genérico
        return {
            icon: Info,
            color: 'text-gray-600',
            bgColor: 'bg-gray-100',
            borderColor: 'border-gray-200',
            text: 'N/A',
            description: 'Estado no definido'
        };
    };

    const config = getStatusConfig();
    const IconComponent = config.icon;

    // Tamaños
    const sizeClasses = {
        xs: {
            container: 'px-2 py-1',
            icon: 'h-3 w-3',
            text: 'text-xs'
        },
        sm: {
            container: 'px-2.5 py-1.5',
            icon: 'h-4 w-4',
            text: 'text-sm'
        },
        md: {
            container: 'px-3 py-2',
            icon: 'h-5 w-5',
            text: 'text-sm'
        },
        lg: {
            container: 'px-4 py-2',
            icon: 'h-6 w-6',
            text: 'text-base'
        }
    };

    const sizeConfig = sizeClasses[size] || sizeClasses.sm;

    // Generar tooltip con detalles
    const getTooltipContent = () => {
        let content = config.description;

        if (details) {
            if (details.lastCheck) {
                content += `\n\nÚltima verificación: ${new Date(details.lastCheck).toLocaleString('es-AR')}`;
            }

            if (details.issues && details.issues.length > 0) {
                content += `\n\nProblemas detectados:`;
                details.issues.forEach(issue => {
                    content += `\n• ${issue}`;
                });
            }

            if (details.nextCheck) {
                content += `\n\nPróxima verificación: ${new Date(details.nextCheck).toLocaleString('es-AR')}`;
            }
        }

        return content;
    };

    const tooltipContent = getTooltipContent();

    return (
        <div className="relative inline-flex">
            {/* Badge/Indicator */}
            <span
                className={`
                    inline-flex items-center font-medium rounded-full border
                    ${config.bgColor} ${config.borderColor} ${config.color}
                    ${sizeConfig.container} ${sizeConfig.text}
                    ${showTooltip ? 'cursor-help' : ''}
                    transition-colors duration-200
                `}
                title={showTooltip ? tooltipContent : undefined}
            >
                <IconComponent className={`${sizeConfig.icon} ${showText ? 'mr-1.5' : ''}`} />
                {showText && (
                    <span className="font-medium">{config.text}</span>
                )}
            </span>

            {/* Pulse animation for processing states */}
            {(status === 'processing' || status === 'loading') && (
                <span className="absolute inset-0 rounded-full animate-pulse bg-blue-400 opacity-75"></span>
            )}
        </div>
    );
};

// Componente específico para mostrar detalles de compliance
export const ComplianceDetails = ({ details, type = 'compliance' }) => {
    if (!details) return null;

    return (
        <div className="mt-2 space-y-2">
            {details.issues && details.issues.length > 0 && (
                <div className="text-xs text-gray-600">
                    <div className="font-medium mb-1">Problemas detectados:</div>
                    <ul className="space-y-1 ml-2">
                        {details.issues.map((issue, index) => (
                            <li key={index} className="flex items-start">
                                <span className="inline-block w-1 h-1 rounded-full bg-red-400 mt-2 mr-2 flex-shrink-0"></span>
                                <span>{issue}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {details.lastCheck && (
                <div className="text-xs text-gray-500">
                    Última verificación: {new Date(details.lastCheck).toLocaleString('es-AR')}
                </div>
            )}

            {details.nextCheck && (
                <div className="text-xs text-gray-500">
                    Próxima verificación: {new Date(details.nextCheck).toLocaleString('es-AR')}
                </div>
            )}

            {details.score && (
                <div className="text-xs text-gray-600">
                    Puntaje de compliance: {details.score}/100
                </div>
            )}
        </div>
    );
};

// Componente para mostrar múltiples indicadores
export const ComplianceGroup = ({ items, title }) => {
    if (!items || items.length === 0) return null;

    return (
        <div className="space-y-2">
            {title && (
                <h4 className="text-sm font-medium text-gray-700">{title}</h4>
            )}
            <div className="space-y-1">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <ComplianceIndicator
                            status={item.status}
                            type={item.type || 'compliance'}
                            details={item.details}
                            size="xs"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ComplianceIndicator;