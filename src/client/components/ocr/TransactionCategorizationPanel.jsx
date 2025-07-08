// src/client/components/ocr/TransactionCategorizationPanel.jsx
import React, { useState, useEffect } from 'react';
import {
    Bot,
    Tag,
    CheckCircle,
    AlertCircle,
    Edit,
    Trash2,
    Filter,
    Search,
    RefreshCw,
    TrendingUp
} from 'lucide-react';
import { useTransactionCategorization } from '../../hooks/useTransactionCategorization.js';

const TransactionCategorizationPanel = () => {
    const {
        categorizations,
        categories,
        categorizeTransactions,
        updateCategorization,
        deleteCategorization,
        loadCategorizations,
        loading,
        error
    } = useTransactionCategorization();

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [newCategory, setNewCategory] = useState('');

    const filteredCategorizations = categorizations.filter(cat => {
        const matchesCategory = selectedCategory === 'all' || cat.category === selectedCategory;
        const matchesSearch = cat.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-AR');
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.9) return 'text-green-600 bg-green-100';
        if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const handleEditSave = async (categorizationId) => {
        try {
            await updateCategorization(categorizationId, newCategory, 1.0);
            setEditingId(null);
            setNewCategory('');
        } catch (err) {
            console.error('Error updating categorization:', err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Categorización de Transacciones</h2>
                <button
                    onClick={loadCategorizations}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                </button>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Categorizadas</p>
                            <p className="text-2xl font-bold text-gray-900">{categorizations.length}</p>
                        </div>
                        <Tag className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Automáticas</p>
                            <p className="text-2xl font-bold text-green-600">
                                {categorizations.filter(c => !c.manuallyReviewed).length}
                            </p>
                        </div>
                        <Bot className="w-8 h-8 text-green-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Revisadas</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {categorizations.filter(c => c.manuallyReviewed).length}
                            </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-orange-500" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Confianza Promedio</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {categorizations.length > 0
                                    ? `${(categorizations.reduce((acc, c) => acc + c.confidence, 0) / categorizations.length * 100).toFixed(1)}%`
                                    : '0%'
                                }
                            </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-purple-500" />
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por descripción..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">Todas las categorías</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.name}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Lista de categorizaciones */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Transacciones Categorizadas</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Descripción
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Monto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Categoría
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Confianza
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredCategorizations.map((categorization) => (
                                <tr key={categorization.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                            {categorization.description}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-sm font-medium ${categorization.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {formatCurrency(categorization.amount)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {editingId === categorization.id ? (
                                            <select
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                className="text-sm border border-gray-300 rounded px-2 py-1"
                                            >
                                                <option value="">Seleccionar...</option>
                                                {categories.map(category => (
                                                    <option key={category.id} value={category.name}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {categorization.category}
                                                </div>
                                                {categorization.subcategory && (
                                                    <div className="text-xs text-gray-500">
                                                        {categorization.subcategory}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(categorization.confidence)
                                            }`}>
                                            {(categorization.confidence * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {categorization.manuallyReviewed ? (
                                                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                            ) : (
                                                <Bot className="w-4 h-4 text-blue-500 mr-1" />
                                            )}
                                            <span className="text-xs text-gray-500">
                                                {categorization.manuallyReviewed ? 'Manual' : 'Automática'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(categorization.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            {editingId === categorization.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleEditSave(categorization.id)}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(null);
                                                            setNewCategory('');
                                                        }}
                                                        className="text-gray-600 hover:text-gray-900"
                                                    >
                                                        <AlertCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(categorization.id);
                                                            setNewCategory(categorization.category);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCategorization(categorization.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TransactionCategorizationPanel;