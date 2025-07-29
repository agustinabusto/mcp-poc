// ===================================================
// 8. GUARD DE RUTAS PROTEGIDAS  
// src/client/components/auth/ProtectedRoute.jsx
// ===================================================

import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import AuthLayout from './AuthLayout.jsx';

const ProtectedRoute = ({ children, requiredPermission = null }) => {
    const { isAuthenticated, permissions, loading } = useAuth();

    // Mostrar loading mientras se verifica autenticación
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Verificando autenticación...</p>
                </div>
            </div>
        );
    }

    // Si no está autenticado, mostrar login
    if (!isAuthenticated) {
        return <AuthLayout />;
    }

    // Si requiere permiso específico y no lo tiene
    if (requiredPermission && !permissions.includes(requiredPermission)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Acceso Denegado
                    </h2>
                    <p className="text-gray-600">
                        No tienes permisos para acceder a esta sección
                    </p>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;