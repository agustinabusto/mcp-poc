// src/client/components/UserManagement/RoleConfiguration.jsx
import React, { useState } from 'react';
import { Settings, Save, X, Shield, Users, Eye, Edit } from 'lucide-react';

const RoleConfiguration = ({ onClose, onSave }) => {
    const [roles, setRoles] = useState([
        {
            id: 'admin',
            name: 'Admin',
            description: 'Acceso completo al sistema',
            permissions: [
                'users.read', 'users.write', 'users.delete',
                'reports.read', 'reports.write',
                'settings.read', 'settings.write',
                'afip.read', 'afip.write'
            ],
            color: 'red',
            icon: Shield
        },
        {
            id: 'manager',
            name: 'Manager',
            description: 'Gestión de operaciones y usuarios',
            permissions: [
                'users.read', 'users.write',
                'reports.read', 'reports.write',
                'settings.read',
                'afip.read', 'afip.write'
            ],
            color: 'blue',
            icon: Users
        },
        {
            id: 'operator',
            name: 'Operator',
            description: 'Operaciones diarias y consultas',
            permissions: [
                'reports.read',
                'afip.read', 'afip.write'
            ],
            color: 'green',
            icon: Edit
        },
        {
            id: 'viewer',
            name: 'Viewer',
            description: 'Solo lectura y consultas',
            permissions: [
                'reports.read',
                'afip.read'
            ],
            color: 'gray',
            icon: Eye
        }
    ]);

    const [editingRole, setEditingRole] = useState(null);

    const allPermissions = [
        { id: 'users.read', name: 'Leer usuarios', category: 'Usuarios' },
        { id: 'users.write', name: 'Crear/editar usuarios', category: 'Usuarios' },
        { id: 'users.delete', name: 'Eliminar usuarios', category: 'Usuarios' },
        { id: 'reports.read', name: 'Ver reportes', category: 'Reportes' },
        { id: 'reports.write', name: 'Crear/editar reportes', category: 'Reportes' },
        { id: 'settings.read', name: 'Ver configuración', category: 'Configuración' },
        { id: 'settings.write', name: 'Modificar configuración', category: 'Configuración' },
        { id: 'afip.read', name: 'Consultar AFIP', category: 'AFIP' },
        { id: 'afip.write', name: 'Modificar datos AFIP', category: 'AFIP' }
    ];

    const getColorClasses = (color) => {
        const colors = {
            red: 'bg-red-100 text-red-800 border-red-200',
            blue: 'bg-blue-100 text-blue-800 border-blue-200',
            green: 'bg-green-100 text-green-800 border-green-200',
            gray: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return colors[color] || colors.gray;
    };

    const handlePermissionToggle = (roleId, permissionId) => {
        setRoles(prev => prev.map(role => {
            if (role.id === roleId) {
                const hasPermission = role.permissions.includes(permissionId);
                const newPermissions = hasPermission
                    ? role.permissions.filter(p => p !== permissionId)
                    : [...role.permissions, permissionId];
                
                return { ...role, permissions: newPermissions };
            }
            return role;
        }));
    };

    const handleSave = () => {
        onSave(roles);
        onClose();
    };

    const groupedPermissions = allPermissions.reduce((acc, permission) => {
        if (!acc[permission.category]) {
            acc[permission.category] = [];
        }
        acc[permission.category].push(permission);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Settings className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Configuración de Roles
                            </h3>
                            <p className="text-sm text-gray-600">
                                Define permisos para cada rol del sistema
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="py-6 max-h-96 overflow-y-auto">
                    <div className="space-y-6">
                        {roles.map((role) => {
                            const IconComponent = role.icon;
                            return (
                                <div key={role.id} className="border border-gray-200 rounded-lg p-4">
                                    {/* Header del rol */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-lg ${getColorClasses(role.color).replace('text-', 'text-').replace('border-', 'bg-').replace('-800', '-100').replace('-200', '-600')}`}>
                                                <IconComponent className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-md font-semibold text-gray-900">
                                                    {role.name}
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    {role.description}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getColorClasses(role.color)}`}>
                                            {role.permissions.length} permisos
                                        </span>
                                    </div>

                                    {/* Permisos por categoría */}
                                    <div className="space-y-3">
                                        {Object.entries(groupedPermissions).map(([category, permissions]) => (
                                            <div key={category}>
                                                <h5 className="text-sm font-medium text-gray-700 mb-2">
                                                    {category}
                                                </h5>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {permissions.map((permission) => (
                                                        <label key={permission.id} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={role.permissions.includes(permission.id)}
                                                                onChange={() => handlePermissionToggle(role.id, permission.id)}
                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">
                                                                {permission.name}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleConfiguration;