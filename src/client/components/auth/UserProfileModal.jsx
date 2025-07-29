// ===================================================
// 6. MODAL DE PERFIL DE USUARIO
// src/client/components/auth/UserProfileModal.jsx
// ===================================================

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/auth-service.js';

const UserProfileModal = ({ isOpen, onClose }) => {
    const { user, updateUser, logout } = useAuth();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || ''
            });
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Actualizar perfil en el servidor
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authService.getAccessToken()}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            updateUser(data.data);
            setSuccess(true);

            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2000);

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            onClose();
        } catch (error) {
            console.error('Error en logout:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Perfil de Usuario
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    {success && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                            <p className="text-green-700 text-sm">Perfil actualizado correctamente</p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading}
                            />
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;