// src/client/components/UserManagement/UserForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserService } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { Toast } from '../UI/Toast';

export const UserForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        role: 'Viewer',
        permissions: [],
        isActive: true
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState(null);

    const roles = ['Admin', 'Manager', 'Operator', 'Viewer'];
    const availablePermissions = [
        'users.read',
        'users.write',
        'users.delete',
        'reports.read',
        'reports.write',
        'settings.read',
        'settings.write',
        'afip.read',
        'afip.write'
    ];

    useEffect(() => {
        if (isEdit) {
            loadUser();
        }
    }, [id]);

    const loadUser = async () => {
        try {
            setLoading(true);
            const response = await UserService.getUser(id);
            setFormData(response.data);
        } catch (error) {
            setToast({
                type: 'error',
                message: 'Error al cargar usuario'
            });
            navigate('/users');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            if (name === 'permissions') {
                const permission = value;
                setFormData(prev => ({
                    ...prev,
                    permissions: checked
                        ? [...prev.permissions, permission]
                        : prev.permissions.filter(p => p !== permission)
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    [name]: checked
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        // Limpiar error del campo
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'El nombre es requerido';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'El apellido es requerido';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'El email es requerido';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'El email no es válido';
        }

        if (!formData.role) {
            newErrors.role = 'El rol es requerido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setSaving(true);

            if (isEdit) {
                await UserService.updateUser(id, formData);
                setToast({
                    type: 'success',
                    message: 'Usuario actualizado correctamente'
                });
            } else {
                await UserService.createUser(formData);
                setToast({
                    type: 'success',
                    message: 'Usuario creado correctamente'
                });
            }

            setTimeout(() => {
                navigate('/users');
            }, 1500);

        } catch (error) {
            setToast({
                type: 'error',
                message: error.response?.data?.message || 'Error al guardar usuario'
            });
        } finally {
            setSaving(false);
        }
    };

    const canEditRole = () => {
        return currentUser.role === 'Admin' && (!isEdit || formData.id !== currentUser.id);
    };

    const canEditPermissions = () => {
        return currentUser.role === 'Admin';
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <button
                            onClick={() => navigate('/users')}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            ← Volver
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
                        </h1>
                    </div>
                </div>

                {/* Formulario */}
                <div className="bg-white rounded-lg shadow-sm">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Información personal */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Información Personal
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre *
                                    </label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.firstName ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="Ingresa el nombre"
                                    />
                                    {errors.firstName && (
                                        <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                                        Apellido *
                                    </label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.lastName ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="Ingresa el apellido"
                                    />
                                    {errors.lastName && (
                                        <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="usuario@ejemplo.com"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                                )}
                            </div>
                        </div>

                        {/* Rol y permisos */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Rol y Permisos
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                                        Rol *
                                    </label>
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        disabled={!canEditRole()}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.role ? 'border-red-300' : 'border-gray-300'
                                            } ${!canEditRole() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    >
                                        {roles.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                    {errors.role && (
                                        <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                                    )}
                                    {!canEditRole() && (
                                        <p className="mt-1 text-sm text-gray-500">
                                            No tienes permisos para cambiar el rol
                                        </p>
                                    )}
                                </div>

                                {canEditPermissions() && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Permisos Adicionales
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                            {availablePermissions.map(permission => (
                                                <label key={permission} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        name="permissions"
                                                        value={permission}
                                                        checked={formData.permissions.includes(permission)}
                                                        onChange={handleChange}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">
                                                        {permission}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Estado */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Estado
                            </h3>

                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Usuario activo
                                </span>
                            </label>
                        </div>

                        {/* Botones */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => navigate('/users')}
                                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-center"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Guardando...
                                    </>
                                ) : (
                                    isEdit ? 'Actualizar Usuario' : 'Crear Usuario'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Toast notifications */}
                {toast && (
                    <Toast
                        type={toast.type}
                        message={toast.message}
                        onClose={() => setToast(null)}
                    />
                )}
            </div>
        </div>
    );
};