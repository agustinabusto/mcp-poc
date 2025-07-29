// ===================================================
// 5. COMPONENTE DE RECUPERACIÓN DE CONTRASEÑA  
// src/client/components/auth/ForgotPasswordForm.jsx
// ===================================================

import React, { useState } from 'react';
import { Mail, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../../services/auth-service.js';

const ForgotPasswordForm = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            setError('Email es requerido');
            return;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Email inválido');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await authService.forgotPassword(email);
            setSuccess(true);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 text-center">
                    <div className="mb-4">
                        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <Mail className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Email Enviado
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Hemos enviado un enlace de recuperación a <strong>{email}</strong>.
                        Revisa tu bandeja de entrada y spam.
                    </p>
                    <button
                        onClick={onBack}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                        Volver al login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
                <div className="text-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        Recuperar Contraseña
                    </h2>
                    <p className="text-gray-600 mt-2">
                        Ingresa tu email para recibir un enlace de recuperación
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError('');
                                }}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                placeholder="tu@email.com"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                Enviando...
                            </>
                        ) : (
                            'Enviar enlace de recuperación'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={onBack}
                        className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        disabled={loading}
                    >
                        ← Volver al login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordForm;