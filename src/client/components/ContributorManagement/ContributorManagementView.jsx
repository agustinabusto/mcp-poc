// src/client/components/ContributorManagement/ContributorManagementView.jsx
import React, { useState } from 'react';
import { Building, Plus, Settings } from 'lucide-react';
import { ContributorManagement } from './index.jsx';
import SimpleContributorForm from './SimpleContributorForm.jsx';

const ContributorManagementView = ({ config }) => {
    console.log('🔍 ContributorManagementView renderizando con config:', config);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const handleCreateContributor = () => {
        console.log('🔵 Botón Crear Contribuyente clickeado');
        setShowCreateForm(true);
    };

    const handleSettings = () => {
        console.log('🟠 Botón Configuración clickeado');
        setShowSettings(true);
    };

    const handleCloseCreateForm = () => {
        console.log('🔵 Cerrando formulario de creación');
        setShowCreateForm(false);
    };

    const handleCloseSettings = () => {
        console.log('🟠 Cerrando configuración');
        setShowSettings(false);
    };

    const handleSaveContributor = async (contributorData) => {
        console.log('🔵 Guardando contribuyente:', contributorData);
        try {
            // Aquí se puede agregar la lógica de guardado real
            alert('Contribuyente creado exitosamente: ' + contributorData.razonSocial);
            setShowCreateForm(false);
        } catch (error) {
            console.error('Error al crear contribuyente:', error);
            alert('Error al crear contribuyente: ' + error.message);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Building className="h-6 w-6 mr-2" />
                    Gestión de Clientes
                </h1>
                <p className="text-gray-600 mt-1">
                    Administra contribuyentes AFIP con validación en tiempo real y monitoreo de compliance
                </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Acciones Rápidas</h2>

                <div className="flex space-x-3">
                    <button
                        onClick={handleCreateContributor}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Crear Contribuyente
                    </button>
                    <button
                        onClick={handleSettings}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center transition-colors"
                    >
                        <Settings className="h-4 w-4 mr-1" />
                        Configuración AFIP
                    </button>
                </div>
            </div>

            {/* Integrar el componente ContributorManagement completo */}
            <ContributorManagement />

            {/* Modal de creación de contribuyente */}
            {showCreateForm && (
                <SimpleContributorForm
                    onSave={handleSaveContributor}
                    onCancel={handleCloseCreateForm}
                    title="Crear Nuevo Contribuyente"
                />
            )}

            {/* Modal de configuración */}
            {showSettings && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Configuración AFIP
                            </h3>
                            <button
                                onClick={handleCloseSettings}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                ×
                            </button>
                        </div>
                        <div className="py-6">
                            <p className="text-gray-600 mb-4">
                                Configuración de integración con servicios AFIP (próximamente).
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-2">Servicios disponibles:</h4>
                                <ul className="text-blue-800 space-y-1">
                                    <li>• Validación CUIT en tiempo real</li>
                                    <li>• Consulta estado contribuyente</li>
                                    <li>• Monitoreo de compliance</li>
                                    <li>• Alertas automáticas</li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-gray-200">
                            <button
                                onClick={handleCloseSettings}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContributorManagementView;