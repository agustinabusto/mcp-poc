// src/client/components/UserManagement/index.jsx
import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import SimpleUserForm from './SimpleUserForm.jsx';

// Mock de datos - reemplazar con API real
const mockUsers = [
    {
        id: 'admin-001',
        firstName: 'Admin',
        lastName: 'System',
        email: 'admin@mcp-poc.com',
        role: 'Admin',
        isActive: true,
        lastLogin: '2025-01-29T10:30:00Z',
        createdAt: '2025-01-01T00:00:00Z'
    },
    {
        id: 'user-002',
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan.perez@empresa.com',
        role: 'Manager',
        isActive: true,
        lastLogin: '2025-01-28T15:45:00Z',
        createdAt: '2025-01-15T09:00:00Z'
    },
    {
        id: 'user-003',
        firstName: 'María',
        lastName: 'García',
        email: 'maria.garcia@empresa.com',
        role: 'Operator',
        isActive: true,
        lastLogin: '2025-01-29T08:20:00Z',
        createdAt: '2025-01-20T14:30:00Z'
    },
    {
        id: 'user-004',
        firstName: 'Carlos',
        lastName: 'López',
        email: 'carlos.lopez@empresa.com',
        role: 'Viewer',
        isActive: false,
        lastLogin: '2025-01-25T11:15:00Z',
        createdAt: '2025-01-10T16:45:00Z'
    }
];

export const UserManagement = () => {
    const [users, setUsers] = useState(mockUsers);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [notification, setNotification] = useState(null);

    // Listener para el evento personalizado
    useEffect(() => {
        console.log('🟢 UserManagement - Configurando listener createUser');
        
        const handleCreateUserEvent = () => {
            console.log('🟢 UserManagement - Evento createUser recibido');
            setShowCreateForm(true);
        };

        document.addEventListener('createUser', handleCreateUserEvent);
        return () => {
            console.log('🟢 UserManagement - Removiendo listener createUser');
            document.removeEventListener('createUser', handleCreateUserEvent);
        };
    }, []);

    const roles = ['Admin', 'Manager', 'Operator', 'Viewer'];

    // Filtrar usuarios
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm === '' ||
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === '' || user.role === roleFilter;
        const matchesStatus = statusFilter === '' ||
            (statusFilter === 'active' && user.isActive) ||
            (statusFilter === 'inactive' && !user.isActive);

        return matchesSearch && matchesRole && matchesStatus;
    });

    // Mostrar notificación
    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Crear usuario
    const handleCreateUser = (userData) => {
        const newUser = {
            id: `user-${Date.now()}`,
            ...userData,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };

        setUsers(prev => [...prev, newUser]);
        setShowCreateForm(false);
        showNotification('Usuario creado exitosamente');
    };

    // Editar usuario
    const handleEditUser = (userData) => {
        setUsers(prev => prev.map(user =>
            user.id === editingUser.id
                ? { ...user, ...userData }
                : user
        ));
        setEditingUser(null);
        showNotification('Usuario actualizado exitosamente');
    };

    // Eliminar usuario
    const handleDeleteUser = (userId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
            setUsers(prev => prev.filter(user => user.id !== userId));
            showNotification('Usuario eliminado exitosamente');
        }
    };

    // Toggle estado activo
    const handleToggleStatus = (userId) => {
        setUsers(prev => prev.map(user =>
            user.id === userId
                ? { ...user, isActive: !user.isActive }
                : user
        ));
        showNotification('Estado del usuario actualizado');
    };

    // Obtener color del rol
    const getRoleColor = (role) => {
        const colors = {
            Admin: 'bg-red-100 text-red-800 border-red-200',
            Manager: 'bg-blue-100 text-blue-800 border-blue-200',
            Operator: 'bg-green-100 text-green-800 border-green-200',
            Viewer: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    // Formatear fecha
    const formatDate = (dateString) => {
        if (!dateString) return 'Nunca';
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Si está mostrando formulario de creación
    if (showCreateForm) {
        return (
            <SimpleUserForm
                onSave={handleCreateUser}
                onCancel={() => setShowCreateForm(false)}
                title="Crear Nuevo Usuario"
            />
        );
    }

    // Si está editando un usuario
    if (editingUser) {
        return (
            <SimpleUserForm
                user={editingUser}
                onSave={handleEditUser}
                onCancel={() => setEditingUser(null)}
                title="Editar Usuario"
            />
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
                            <p className="text-gray-600">Administra usuarios y permisos del sistema</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setLoading(true)}
                            disabled={loading}
                            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>

                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Usuario
                        </button>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Búsqueda */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Filtro por rol */}
                    <div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Todos los roles</option>
                            {roles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro por estado */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Todos los estados</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Lista de usuarios */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {filteredUsers.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron usuarios</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || roleFilter || statusFilter
                                ? 'Intenta modificar los filtros de búsqueda'
                                : 'Comienza creando tu primer usuario'
                            }
                        </p>
                        {!searchTerm && !roleFilter && !statusFilter && (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Usuario
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Vista Desktop - Tabla */}
                        <div className="hidden lg:block">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Usuario
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Rol
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Último Acceso
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0">
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <span className="text-sm font-medium text-blue-600">
                                                                {user.firstName[0]}{user.lastName[0]}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.firstName} {user.lastName}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    {user.isActive ? (
                                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                                                    )}
                                                    <span className={`text-sm ${user.isActive ? 'text-green-800' : 'text-red-800'}`}>
                                                        {user.isActive ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(user.lastLogin)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-3">
                                                    <button
                                                        onClick={() => setEditingUser(user)}
                                                        className="text-blue-600 hover:text-blue-900 transition-colors"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(user.id)}
                                                        className={`transition-colors ${user.isActive
                                                                ? 'text-yellow-600 hover:text-yellow-900'
                                                                : 'text-green-600 hover:text-green-900'
                                                            }`}
                                                    >
                                                        {user.isActive ? 'Desactivar' : 'Activar'}
                                                    </button>
                                                    {user.role !== 'Admin' && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="text-red-600 hover:text-red-900 transition-colors"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista Mobile - Cards */}
                        <div className="lg:hidden divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <div key={user.id} className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                                <span className="text-sm font-medium text-blue-600">
                                                    {user.firstName[0]}{user.lastName[0]}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">
                                                    {user.firstName} {user.lastName}
                                                </h3>
                                                <p className="text-sm text-gray-500">{user.email}</p>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(user.role)}`}>
                                                        {user.role}
                                                    </span>
                                                    <div className="flex items-center">
                                                        {user.isActive ? (
                                                            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                                                        ) : (
                                                            <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                                                        )}
                                                        <span className={`text-xs ${user.isActive ? 'text-green-800' : 'text-red-800'}`}>
                                                            {user.isActive ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col space-y-1">
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="text-blue-600 hover:text-blue-900 text-sm transition-colors"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(user.id)}
                                                className={`text-sm transition-colors ${user.isActive
                                                        ? 'text-yellow-600 hover:text-yellow-900'
                                                        : 'text-green-600 hover:text-green-900'
                                                    }`}
                                            >
                                                {user.isActive ? 'Desactivar' : 'Activar'}
                                            </button>
                                            {user.role !== 'Admin' && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="text-red-600 hover:text-red-900 text-sm transition-colors"
                                                >
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-2 text-xs text-gray-500">
                                        Último acceso: {formatDate(user.lastLogin)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Estadísticas */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                            <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Activos</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {users.filter(u => u.isActive).length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Admins</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {users.filter(u => u.role === 'Admin').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Filter className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Filtrados</p>
                            <p className="text-2xl font-semibold text-gray-900">{filteredUsers.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notificación */}
            {notification && (
                <div className="fixed top-4 right-4 z-50">
                    <div className={`flex items-center px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                        {notification.type === 'success' ? (
                            <CheckCircle className="h-5 w-5 mr-2" />
                        ) : (
                            <AlertCircle className="h-5 w-5 mr-2" />
                        )}
                        {notification.message}
                    </div>
                </div>
            )}
        </div>
    );
};

