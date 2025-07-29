// ===================================================
// 7. COMPONENTE PRINCIPAL DE AUTENTICACIÓN
// src/client/components/auth/AuthLayout.jsx
// ===================================================

import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import LoginForm from './LoginForm.jsx';
import RegisterForm from './RegisterForm.jsx';
import ForgotPasswordForm from './ForgotPasswordForm.jsx';

const AuthLayout = () => {
    const [currentForm, setCurrentForm] = useState('login'); // 'login', 'register', 'forgot'

    const renderForm = () => {
        switch (currentForm) {
            case 'register':
                return (
                    <RegisterForm
                        onToggleForm={() => setCurrentForm('login')}
                    />
                );
            case 'forgot':
                return (
                    <ForgotPasswordForm
                        onBack={() => setCurrentForm('login')}
                    />
                );
            default:
                return (
                    <LoginForm
                        onToggleForm={() => setCurrentForm('register')}
                        onForgotPassword={() => setCurrentForm('forgot')}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
                        <Activity className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">BookKeeper</h1>
                    <p className="text-gray-600">Sistema de Gestión Fiscal</p>
                </div>

                {/* Form */}
                {renderForm()}

                {/* Footer */}
                <div className="text-center mt-8 text-sm text-gray-500">
                    © 2025 Snarx.io - Todos los derechos reservados
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;