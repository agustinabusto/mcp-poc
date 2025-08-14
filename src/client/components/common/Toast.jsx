// src/client/components/common/Toast.jsx
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export const Toast = ({ 
    type = 'success', 
    message, 
    onClose, 
    duration = 5000,
    className = '' 
}) => {
    useEffect(() => {
        if (duration && onClose) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const getTypeClasses = () => {
        switch (type) {
            case 'success':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'error':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'info':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="h-5 w-5" />;
            case 'error':
                return <AlertCircle className="h-5 w-5" />;
            case 'warning':
                return <AlertCircle className="h-5 w-5" />;
            case 'info':
                return <AlertCircle className="h-5 w-5" />;
            default:
                return <CheckCircle className="h-5 w-5" />;
        }
    };

    return (
        <div className={`fixed top-4 right-4 z-50 ${className}`}>
            <div className={`flex items-center px-4 py-3 rounded-lg shadow-lg border ${getTypeClasses()} min-w-72 max-w-96`}>
                <div className="flex-shrink-0 mr-3">
                    {getIcon()}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium">{message}</p>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 ml-3 text-current hover:opacity-70 transition-opacity"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Toast;