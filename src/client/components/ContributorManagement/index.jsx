// src/client/components/ContributorManagement/index.jsx
import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, RefreshCw, AlertCircle, CheckCircle, Building, History } from 'lucide-react';
import SimpleContributorForm from './SimpleContributorForm.jsx';
import ComplianceHistoryView from '../compliance/ComplianceHistoryView.jsx';

// Mock de datos - reemplazar con API real
const mockContributors = [
    {
        id: 'contrib-001',
        cuit: '20-12345678-9',
        razonSocial: 'EMPRESA EJEMPLO SA',
        nombreFantasia: 'Empresa Ejemplo',
        domicilioFiscal: {
            calle: 'Av. Corrientes',
            numero: '1234',
            ciudad: 'CABA',
            provincia: 'CABA',
            codigoPostal: 'C1043AAZ'
        },
        email: 'contacto@ejemplo.com',
        telefono: '011-1234-5678',
        categoriaFiscal: 'Responsable Inscripto',
        estado: 'Activo',
        fechaInscripcion: '2024-01-15T09:00:00Z',
        ultimaActualizacion: '2025-01-28T15:45:00Z',
        complianceScore: 85,
        riskLevel: 'Low'
    },
    {
        id: 'contrib-002',
        cuit: '23-87654321-4',
        razonSocial: 'GARCIA MARIA',
        nombreFantasia: null,
        domicilioFiscal: {
            calle: 'San Martín',
            numero: '567',
            ciudad: 'La Plata',
            provincia: 'Buenos Aires',
            codigoPostal: 'B1900'
        },
        email: 'maria.garcia@email.com',
        telefono: '0221-456-7890',
        categoriaFiscal: 'Monotributista',
        estado: 'Activo',
        fechaInscripcion: '2024-03-20T14:30:00Z',
        ultimaActualizacion: '2025-01-29T08:20:00Z',
        complianceScore: 75,
        riskLevel: 'Medium'
    },
    {
        id: 'contrib-003',
        cuit: '30-98765432-1',
        razonSocial: 'LOPEZ CARLOS SRL',
        nombreFantasia: 'Servicios López',
        domicilioFiscal: {
            calle: 'Belgrano',
            numero: '890',
            ciudad: 'Rosario',
            provincia: 'Santa Fe',
            codigoPostal: 'S2000'
        },
        email: 'admin@servicioslopez.com',
        telefono: '0341-234-5678',
        categoriaFiscal: 'Responsable Inscripto',
        estado: 'Suspendido',
        fechaInscripcion: '2023-11-10T16:45:00Z',
        ultimaActualizacion: '2025-01-25T11:15:00Z',
        complianceScore: 45,
        riskLevel: 'High'
    }
];

export const ContributorManagement = () => {
    const [contributors, setContributors] = useState(mockContributors);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingContributor, setEditingContributor] = useState(null);
    const [showHistoryView, setShowHistoryView] = useState(null);
    const [notification, setNotification] = useState(null);

    const categories = ['Responsable Inscripto', 'Monotributista', 'Exento'];
    const states = ['Activo', 'Suspendido', 'Dado de baja'];

    // Filtrar contribuyentes
    const filteredContributors = contributors.filter(contributor => {
        const matchesSearch = searchTerm === '' ||
            contributor.cuit.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contributor.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contributor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (contributor.nombreFantasia && contributor.nombreFantasia.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = categoryFilter === '' || contributor.categoriaFiscal === categoryFilter;
        const matchesStatus = statusFilter === '' || contributor.estado === statusFilter;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    // Mostrar notificación
    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Crear contribuyente
    const handleCreateContributor = (contributorData) => {
        const newContributor = {
            id: `contrib-${Date.now()}`,
            ...contributorData,
            estado: 'Activo',
            fechaInscripcion: new Date().toISOString(),
            ultimaActualizacion: new Date().toISOString(),
            complianceScore: 100,
            riskLevel: 'Low'
        };

        setContributors(prev => [...prev, newContributor]);
        setShowCreateForm(false);
        showNotification('Contribuyente creado exitosamente');
    };

    // Editar contribuyente
    const handleEditContributor = (contributorData) => {
        setContributors(prev => prev.map(contributor =>
            contributor.id === editingContributor.id
                ? { ...contributor, ...contributorData, ultimaActualizacion: new Date().toISOString() }
                : contributor
        ));
        setEditingContributor(null);
        showNotification('Contribuyente actualizado exitosamente');
    };

    // Eliminar contribuyente
    const handleDeleteContributor = (contributorId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este contribuyente?')) {
            setContributors(prev => prev.filter(contributor => contributor.id !== contributorId));
            showNotification('Contribuyente eliminado exitosamente');
        }
    };

    // Toggle estado
    const handleToggleStatus = (contributorId) => {
        setContributors(prev => prev.map(contributor =>
            contributor.id === contributorId
                ? { 
                    ...contributor, 
                    estado: contributor.estado === 'Activo' ? 'Suspendido' : 'Activo',
                    ultimaActualizacion: new Date().toISOString()
                }
                : contributor
        ));
        showNotification('Estado del contribuyente actualizado');
    };

    // Ver historial de compliance
    const handleViewHistory = (contributor) => {
        setShowHistoryView(contributor);
    };

    // Cerrar historial de compliance
    const handleCloseHistory = () => {
        setShowHistoryView(null);
    };

    // Obtener color del compliance score
    const getComplianceColor = (score) => {
        if (score >= 90) return 'bg-green-100 text-green-800 border-green-200';
        if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };

    // Obtener color del estado
    const getStatusColor = (estado) => {
        const colors = {
            'Activo': 'bg-green-100 text-green-800 border-green-200',
            'Suspendido': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'Dado de baja': 'bg-red-100 text-red-800 border-red-200'
        };
        return colors[estado] || 'bg-gray-100 text-gray-800 border-gray-200';
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
            <SimpleContributorForm
                onSave={handleCreateContributor}
                onCancel={() => setShowCreateForm(false)}
                title="Crear Nuevo Contribuyente"
            />
        );
    }

    // Si está editando un contribuyente
    if (editingContributor) {
        return (
            <SimpleContributorForm
                contributor={editingContributor}
                onSave={handleEditContributor}
                onCancel={() => setEditingContributor(null)}
                title="Editar Contribuyente"
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
                            <Building className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
                            <p className="text-gray-600">Administra contribuyentes y su compliance fiscal</p>
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
                            Nuevo Contribuyente
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
                                placeholder="Buscar por CUIT, razón social o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Filtro por categoría fiscal */}
                    <div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Todas las categorías</option>
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
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
                            {states.map(estado => (
                                <option key={estado} value={estado}>{estado}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Lista de contribuyentes */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {filteredContributors.length === 0 ? (
                    <div className="p-12 text-center">
                        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron contribuyentes</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || categoryFilter || statusFilter
                                ? 'Intenta modificar los filtros de búsqueda'
                                : 'Comienza creando tu primer contribuyente'
                            }
                        </p>
                        {!searchTerm && !categoryFilter && !statusFilter && (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Contribuyente
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
                                            Contribuyente
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Categoría Fiscal
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Compliance
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Última Actualización
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredContributors.map((contributor) => (
                                        <tr key={contributor.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0">
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <span className="text-sm font-medium text-blue-600">
                                                                {contributor.razonSocial.charAt(0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {contributor.razonSocial}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            CUIT: {contributor.cuit}
                                                        </div>
                                                        {contributor.nombreFantasia && (
                                                            <div className="text-xs text-gray-400">
                                                                {contributor.nombreFantasia}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full border bg-gray-100 text-gray-800 border-gray-200">
                                                    {contributor.categoriaFiscal}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(contributor.estado)}`}>
                                                    {contributor.estado}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getComplianceColor(contributor.complianceScore)}`}>
                                                        {contributor.complianceScore}%
                                                    </span>
                                                    <span className={`ml-2 text-xs ${
                                                        contributor.riskLevel === 'Low' ? 'text-green-600' :
                                                        contributor.riskLevel === 'Medium' ? 'text-yellow-600' :
                                                        'text-red-600'
                                                    }`}>
                                                        {contributor.riskLevel === 'Low' ? 'Bajo' :
                                                         contributor.riskLevel === 'Medium' ? 'Medio' : 'Alto'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(contributor.ultimaActualizacion)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-3">
                                                    <button
                                                        onClick={() => handleViewHistory(contributor)}
                                                        className="text-purple-600 hover:text-purple-900 transition-colors flex items-center"
                                                        title="Ver historial de compliance"
                                                    >
                                                        <History className="h-4 w-4 mr-1" />
                                                        Historial
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingContributor(contributor)}
                                                        className="text-blue-600 hover:text-blue-900 transition-colors"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(contributor.id)}
                                                        className={`transition-colors ${contributor.estado === 'Activo'
                                                                ? 'text-yellow-600 hover:text-yellow-900'
                                                                : 'text-green-600 hover:text-green-900'
                                                            }`}
                                                    >
                                                        {contributor.estado === 'Activo' ? 'Suspender' : 'Activar'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteContributor(contributor.id)}
                                                        className="text-red-600 hover:text-red-900 transition-colors"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista Mobile - Cards */}
                        <div className="lg:hidden divide-y divide-gray-200">
                            {filteredContributors.map((contributor) => (
                                <div key={contributor.id} className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                                <span className="text-sm font-medium text-blue-600">
                                                    {contributor.razonSocial.charAt(0)}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">
                                                    {contributor.razonSocial}
                                                </h3>
                                                <p className="text-sm text-gray-500">CUIT: {contributor.cuit}</p>
                                                {contributor.nombreFantasia && (
                                                    <p className="text-xs text-gray-400">{contributor.nombreFantasia}</p>
                                                )}
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(contributor.estado)}`}>
                                                        {contributor.estado}
                                                    </span>
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getComplianceColor(contributor.complianceScore)}`}>
                                                        {contributor.complianceScore}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col space-y-1">
                                            <button
                                                onClick={() => handleViewHistory(contributor)}
                                                className="text-purple-600 hover:text-purple-900 text-sm transition-colors flex items-center"
                                            >
                                                <History className="h-3 w-3 mr-1" />
                                                Historial
                                            </button>
                                            <button
                                                onClick={() => setEditingContributor(contributor)}
                                                className="text-blue-600 hover:text-blue-900 text-sm transition-colors"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(contributor.id)}
                                                className={`text-sm transition-colors ${contributor.estado === 'Activo'
                                                        ? 'text-yellow-600 hover:text-yellow-900'
                                                        : 'text-green-600 hover:text-green-900'
                                                    }`}
                                            >
                                                {contributor.estado === 'Activo' ? 'Suspender' : 'Activar'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteContributor(contributor.id)}
                                                className="text-red-600 hover:text-red-900 text-sm transition-colors"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-2 text-xs text-gray-500">
                                        Última actualización: {formatDate(contributor.ultimaActualizacion)}
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
                            <Building className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Total Contribuyentes</p>
                            <p className="text-2xl font-semibold text-gray-900">{contributors.length}</p>
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
                                {contributors.filter(c => c.estado === 'Activo').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Compliance Alto</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {contributors.filter(c => c.complianceScore >= 90).length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Filter className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Filtrados</p>
                            <p className="text-2xl font-semibold text-gray-900">{filteredContributors.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de historial de compliance */}
            {showHistoryView && (
                <ComplianceHistoryView
                    cuit={showHistoryView.cuit}
                    businessName={showHistoryView.razonSocial}
                    onClose={handleCloseHistory}
                />
            )}

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