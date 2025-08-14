// src/client/components/UserManagementView.jsx
import React, { useState } from 'react';
import { Users, Plus, Settings } from 'lucide-react';
import { UserManagement } from './index.jsx';
import SimpleUserForm from './SimpleUserForm.jsx';
import RoleConfiguration from './RoleConfiguration.jsx';

const UserManagementView = ({ config }) => {
    console.log('🔍 UserManagementView renderizando con config:', config);
    
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showRoleConfig, setShowRoleConfig] = useState(false);
    const [roles, setRoles] = useState(null);

    const handleCreateUser = () => {
        console.log('🔵 Botón Crear Usuario clickeado');
        setShowCreateForm(true);
    };

    const handleConfigureRoles = () => {
        console.log('🟠 Botón Configurar Roles clickeado');
        setShowRoleConfig(true);
    };

    const handleCloseCreateForm = () => {
        console.log('🔵 Cerrando formulario de creación');
        setShowCreateForm(false);
    };

    const handleCloseRoleConfig = () => {
        console.log('🟠 Cerrando configuración de roles');
        setShowRoleConfig(false);
    };

    const handleSaveUser = async (userData) => {
        console.log('🔵 Guardando usuario:', userData);
        try {
            // Aquí se puede agregar la lógica de guardado real
            alert('Usuario creado exitosamente: ' + userData.firstName + ' ' + userData.lastName);
            setShowCreateForm(false);
        } catch (error) {
            console.error('Error al crear usuario:', error);
            alert('Error al crear usuario: ' + error.message);
        }
    };

    const handleSaveRoles = (updatedRoles) => {
        setRoles(updatedRoles);
        console.log('🟠 Roles actualizados:', updatedRoles);
        setShowRoleConfig(false);
    };

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

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Acciones Rápidas</h2>
                
                <div className="flex space-x-3">
                    <button 
                        onClick={handleCreateUser}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Crear Usuario
                    </button>
                    <button 
                        onClick={handleConfigureRoles}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center transition-colors"
                    >
                        <Settings className="h-4 w-4 mr-1" />
                        Configurar Roles
                    </button>
                </div>
            </div>

            {/* Integrar el componente UserManagement completo */}
            <UserManagement />

            {/* Modal de creación de usuario */}
            {showCreateForm && (
                <SimpleUserForm 
                    onSave={handleSaveUser}
                    onCancel={handleCloseCreateForm}
                    title="Crear Nuevo Usuario"
                />
            )}

            {/* Modal de configuración de roles */}
            {showRoleConfig && (
                <RoleConfiguration 
                    onClose={handleCloseRoleConfig}
                    onSave={handleSaveRoles}
                />
            )}
        </div>
    );
};

export default UserManagementView;