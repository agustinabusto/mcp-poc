// src/client/components/UserManagement/UserList.jsx
import React, { useState, useEffect } from 'react';
// Import condicional para evitar errores cuando no hay Router
let useNavigate;
try {
    const { useNavigate: routerNavigate } = require('react-router-dom');
    useNavigate = routerNavigate;
} catch (e) {
    // Fallback si react-router-dom no está disponible
    useNavigate = () => () => console.warn('Navigation not available');
}
import { UserService } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { ConfirmDialog } from '../UI/ConfirmDialog';
import { Toast } from '../UI/Toast';

export const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [toast, setToast] = useState(null);

    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const roles = ['Admin', 'Manager', 'Operator', 'Viewer'];
    const itemsPerPage = 10;

    useEffect(() => {
        loadUsers();
    }, [currentPage, searchTerm, roleFilter]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await UserService.getUsers({
                page: currentPage,
                limit: itemsPerPage,
                search: searchTerm,
                role: roleFilter
            });

            setUsers(response.data.users);
            setTotalPages(response.data.pages);
        } catch (error) {
            setToast({
                type: 'error',
                message: 'Error al cargar usuarios'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleRoleFilter = (e) => {
        setRoleFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleDeleteUser = async () => {
        try {
            await UserService.deleteUser(userToDelete.id);
            setToast({
                type: 'success',
                message: 'Usuario eliminado correctamente'
            });
            loadUsers();
        } catch (error) {
            setToast({
                type: 'error',
                message: 'Error al eliminar usuario'
            });
        } finally {
            setShowDeleteDialog(false);
            setUserToDelete(null);
        }
    };

    const getRoleColor = (role) => {
        const colors = {
            Admin: 'bg-red-100 text-red-800',
            Manager: 'bg-blue-100 text-blue-800',
            Operator: 'bg-green-100 text-green-800',
            Viewer: 'bg-gray-100 text-gray-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    const canDeleteUser = (user) => {
        return currentUser.role === 'Admin' && user.id !== currentUser.id;
    };

    const canEditUser = (user) => {
        return currentUser.role === 'Admin' ||
            (currentUser.role === 'Manager' && user.role !== 'Admin') ||
            user.id === currentUser.id;
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            {/* Header Mobile-First */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        Gestión de Usuarios
                    </h1>

                    {currentUser.role === 'Admin' && (
                        <button
                            onClick={() => navigate('/users/new')}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            + Nuevo Usuario
                        </button>
                    )}
                </div>
            </div>

            {/* Filtros Mobile-First */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Búsqueda */}
                    <div className="flex-1">
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                            Buscar usuarios
                        </label>
                        <input
                            id="search"
                            type="text"
                            placeholder="Nombre, apellido o email..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Filtro por rol */}
                    <div className="lg:w-48">
                        <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-2">
                            Filtrar por rol
                        </label>
                        <select
                            id="role-filter"
                            value={roleFilter}
                            onChange={handleRoleFilter}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Todos los roles</option>
                            {roles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Lista de usuarios - Mobile-First */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {users.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No se encontraron usuarios
                    </div>
                ) : (
                    <>
                        {/* Vista desktop - tabla */}
                        <div className="hidden lg:block overflow-x-auto">
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
                                            Último acceso
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {user.isActive ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.lastLogin
                                                    ? new Date(user.lastLogin).toLocaleDateString('es-ES')
                                                    : 'Nunca'
                                                }
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    {canEditUser(user) && (
                                                        <button
                                                            onClick={() => navigate(`/users/${user.id}/edit`)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            Editar
                                                        </button>
                                                    )}
                                                    {canDeleteUser(user) && (
                                                        <button
                                                            onClick={() => {
                                                                setUserToDelete(user);
                                                                setShowDeleteDialog(true);
                                                            }}
                                                            className="text-red-600 hover:text-red-900"
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

                        {/* Vista mobile - cards */}
                        <div className="lg:hidden">
                            {users.map((user) => (
                                <div key={user.id} className="p-4 border-b border-gray-200 last:border-b-0">
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
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                                                        {user.role}
                                                    </span>
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {user.isActive ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col space-y-1">
                                            {canEditUser(user) && (
                                                <button
                                                    onClick={() => navigate(`/users/${user.id}/edit`)}
                                                    className="text-blue-600 hover:text-blue-900 text-sm"
                                                >
                                                    Editar
                                                </button>
                                            )}
                                            {canDeleteUser(user) && (
                                                <button
                                                    onClick={() => {
                                                        setUserToDelete(user);
                                                        setShowDeleteDialog(true);
                                                    }}
                                                    className="text-red-600 hover:text-red-900 text-sm"
                                                >
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {user.lastLogin && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Último acceso: {new Date(user.lastLogin).toLocaleDateString('es-ES')}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente
                            </button>
                        </div>

                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Página <span className="font-medium">{currentPage}</span> de{' '}
                                    <span className="font-medium">{totalPages}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ←
                                    </button>

                                    {[...Array(totalPages)].map((_, i) => {
                                        const page = i + 1;
                                        const isCurrentPage = page === currentPage;

                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${isCurrentPage
                                                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        →
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Dialog de confirmación */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteUser}
                title="Eliminar Usuario"
                message={`¿Estás seguro de que quieres eliminar a ${userToDelete?.firstName} ${userToDelete?.lastName}? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />

            {/* Toast notifications */}
            {toast && (
                <Toast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};