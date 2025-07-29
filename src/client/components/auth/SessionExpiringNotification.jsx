// ===================================================
// 10. NOTIFICACIÓN DE SESIÓN EXPIRANDO
// src/client/components/auth/SessionExpiringNotification.jsx
// ===================================================

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const SessionExpiringNotification = () => {
    const { sessionExpiring, refreshToken, logout } = useAuth();
    const [showNotification, setShowNotification] = useState(false);

    useEffect(() => {
        if (sessionExpiring) {
            setShowNotification(true);
        }
    }, [sessionExpiring]);

    const handleRefresh = async () => {
        try {
            await refreshToken();
            setShowNotification(false);
        } catch (error) {
            console.error('Error refrescando sesión:', error);
        }
    };

    const handleLogout = async () => {
        await logout();
        setShowNotification(false);
    };

    if (!showNotification) return null;

    return (
        <div className="fixed top-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg z-50 max-w-sm">
            <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-800">
                        Sesión por expirar
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                        Tu sesión expirará pronto. ¿Deseas renovarla?
                    </p>
                    <div className="mt-3 flex space-x-2">
                        <button
                            onClick={handleRefresh}
                            className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
                        >
                            Renovar
                        </button>
                        <button
                            onClick={handleLogout}
                            className="text-xs text-yellow-700 hover:text-yellow-800 transition-colors"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => setShowNotification(false)}
                    className="text-yellow-600 hover:text-yellow-800 ml-2"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default SessionExpiringNotification;