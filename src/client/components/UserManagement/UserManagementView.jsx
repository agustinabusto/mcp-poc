// src/client/components/UserManagementView.jsx
import React from 'react';
import { Users, Plus, Settings } from 'lucide-react';

const UserManagementView = ({ config }) => {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Users className="h-6 w-6 mr-2" />
                    Gestión de Usuarios
                </h1>
                <p className="text-gray-600 mt-1">
                    Administra usuarios, roles y permisos del sistema
                </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Panel de Usuarios</h2>
                <p className="text-gray-500">
                    Funcionalidad de gestión de usuarios en desarrollo...
                </p>

                <div className="mt-4 flex space-x-3">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                        <Plus className="h-4 w-4 mr-1" />
                        Crear Usuario
                    </button>
                    <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center">
                        <Settings className="h-4 w-4 mr-1" />
                        Configurar Roles
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserManagementView;