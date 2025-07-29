// ===================================================
// 3. COMPONENTE DE LOGIN RESPONSIVE
// src/client/components/auth/LoginForm.jsx
// ===================================================

import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const LoginForm = ({ onToggleForm, onForgotPassword }) => {
    const { login, loading, error } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const validateForm = () => {
        const errors = {};

        if (!formData.email) {
            errors.email = 'Email es requerido';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Email inválido';
        }

        if (!formData.password) {
            errors.password = 'Contraseña es requerida';
        } else if (formData.password.length < 6) {
            errors.password = 'Contraseña debe tener al menos 6 caracteres';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            await login(formData, {
                userAgent: navigator.userAgent,
                deviceId: localStorage.getItem('@bookkeeper/device_id')
            });
        } catch (error) {
            console.error('Error en login:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Limpiar error del campo al escribir
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        Iniciar Sesión
                    </h2>
                    <p className="text-gray-600 mt-2">
                        Accede a tu cuenta BookKeeper
                    </p>
                </div>

                {/* Error global */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
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
                                value={formData.email}
                                onChange={handleChange}
                                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${formErrors.email ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="tu@email.com"
                                disabled={loading}
                            />
                        </div>
                        {formErrors.email && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={handleChange}
                                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${formErrors.password ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="Tu contraseña"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                disabled={loading}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        {formErrors.password && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                        )}
                    </div>

                    {/* Forgot Password */}
                    <div className="text-right">
                        <button
                            type="button"
                            onClick={onForgotPassword}
                            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                            disabled={loading}
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                Iniciando sesión...
                            </>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>

                {/* Toggle to Register */}
                <div className="mt-6 text-center">
                    <p className="text-gray-600">
                        ¿No tienes cuenta?{' '}
                        <button
                            onClick={onToggleForm}
                            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            disabled={loading}
                        >
                            Crear cuenta
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;