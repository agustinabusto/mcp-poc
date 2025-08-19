// src/client/components/ContributorManagement/ContributorForm.jsx
import React, { useState, useEffect } from 'react';
// Import condicional para evitar errores cuando no hay Router
let useNavigate, useParams;
try {
    const routerDom = require('react-router-dom');
    useNavigate = routerDom.useNavigate;
    useParams = routerDom.useParams;
} catch (e) {
    // Fallback si react-router-dom no está disponible
    useNavigate = () => () => console.warn('Navigation not available');
    useParams = () => ({});
}
import { ContributorService } from '../../services/contributorService';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Toast } from '../common/Toast';

export const ContributorForm = ({ 
    contributorId = null, 
    onCancel = null, 
    onSave = null,
    contributor = null 
}) => {
    const { id: routeId } = useParams?.() || {};
    const navigate = useNavigate?.();
    const { user: currentUser } = useAuth?.() || { user: null };
    
    // Usar props si están disponibles, sino usar router params
    const id = contributorId || routeId;
    const isEdit = !!(id || contributor);

    const [formData, setFormData] = useState({
        cuit: contributor?.cuit || '',
        razonSocial: contributor?.razonSocial || '',
        nombreFantasia: contributor?.nombreFantasia || '',
        email: contributor?.email || '',
        telefono: contributor?.telefono || '',
        categoriaFiscal: contributor?.categoriaFiscal || 'Monotributista',
        estado: contributor?.estado || 'Activo',
        domicilioFiscal: {
            calle: contributor?.domicilioFiscal?.calle || '',
            numero: contributor?.domicilioFiscal?.numero || '',
            ciudad: contributor?.domicilioFiscal?.ciudad || '',
            provincia: contributor?.domicilioFiscal?.provincia || '',
            codigoPostal: contributor?.domicilioFiscal?.codigoPostal || ''
        }
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState(null);
    const [cuitValidation, setCuitValidation] = useState({ valid: null, loading: false });

    const categories = ['Monotributista', 'Responsable Inscripto', 'Exento'];
    const states = ['Activo', 'Suspendido', 'Dado de baja'];
    const provinces = [
        'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 
        'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 
        'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 
        'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 
        'Tierra del Fuego', 'Tucumán'
    ];

    useEffect(() => {
        if (isEdit && id && !contributor) {
            loadContributor();
        }
    }, [id]);

    const loadContributor = async () => {
        try {
            setLoading(true);
            const response = await ContributorService.getContributor(id);
            setFormData(response.data);
        } catch (error) {
            setToast({
                type: 'error',
                message: 'Error al cargar contribuyente'
            });
            if (navigate) navigate('/contributors');
        } finally {
            setLoading(false);
        }
    };

    const validateCuit = (cuit) => {
        // Eliminar guiones y espacios
        const cleanCuit = cuit.replace(/[-\s]/g, '');
        
        // Verificar longitud
        if (cleanCuit.length !== 11) {
            return false;
        }

        // Verificar que sean todos números
        if (!/^\d{11}$/.test(cleanCuit)) {
            return false;
        }

        // Verificar dígito verificador
        const digits = cleanCuit.split('').map(Number);
        const checkDigit = digits[10];
        const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        
        let sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += digits[i] * multipliers[i];
        }
        
        const remainder = sum % 11;
        let expectedCheckDigit = 11 - remainder;
        
        if (expectedCheckDigit === 11) expectedCheckDigit = 0;
        if (expectedCheckDigit === 10) expectedCheckDigit = 9;
        
        return checkDigit === expectedCheckDigit;
    };

    const formatCuit = (cuit) => {
        const cleanCuit = cuit.replace(/[-\s]/g, '');
        if (cleanCuit.length >= 2) {
            let formatted = cleanCuit.substring(0, 2);
            if (cleanCuit.length > 2) {
                formatted += '-' + cleanCuit.substring(2, 10);
                if (cleanCuit.length > 10) {
                    formatted += '-' + cleanCuit.substring(10, 11);
                }
            }
            return formatted;
        }
        return cleanCuit;
    };

    const handleCuitChange = async (e) => {
        const value = e.target.value;
        const formattedCuit = formatCuit(value);
        
        setFormData(prev => ({
            ...prev,
            cuit: formattedCuit
        }));

        // Limpiar error del campo
        if (errors.cuit) {
            setErrors(prev => ({
                ...prev,
                cuit: ''
            }));
        }

        // Validar CUIT si está completo
        if (formattedCuit.length === 13 && validateCuit(formattedCuit)) {
            try {
                setCuitValidation({ valid: null, loading: true });
                
                // Simular validación AFIP (reemplazar con servicio real)
                setTimeout(() => {
                    setCuitValidation({ 
                        valid: true, 
                        loading: false,
                        data: {
                            razonSocial: 'DATOS DESDE AFIP',
                            estado: 'ACTIVO'
                        }
                    });
                }, 1000);
                
            } catch (error) {
                setCuitValidation({ valid: false, loading: false });
            }
        } else {
            setCuitValidation({ valid: null, loading: false });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name.startsWith('domicilio.')) {
            const fieldName = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                domicilioFiscal: {
                    ...prev.domicilioFiscal,
                    [fieldName]: value
                }
            }));
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

        if (!formData.cuit.trim()) {
            newErrors.cuit = 'El CUIT es requerido';
        } else if (!validateCuit(formData.cuit)) {
            newErrors.cuit = 'El CUIT no es válido';
        }

        if (!formData.razonSocial.trim()) {
            newErrors.razonSocial = 'La razón social es requerida';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'El email es requerido';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'El email no es válido';
        }

        if (!formData.categoriaFiscal) {
            newErrors.categoriaFiscal = 'La categoría fiscal es requerida';
        }

        if (!formData.domicilioFiscal.calle.trim()) {
            newErrors['domicilio.calle'] = 'La calle es requerida';
        }

        if (!formData.domicilioFiscal.numero.trim()) {
            newErrors['domicilio.numero'] = 'El número es requerido';
        }

        if (!formData.domicilioFiscal.ciudad.trim()) {
            newErrors['domicilio.ciudad'] = 'La ciudad es requerida';
        }

        if (!formData.domicilioFiscal.provincia.trim()) {
            newErrors['domicilio.provincia'] = 'La provincia es requerida';
        }

        if (!formData.domicilioFiscal.codigoPostal.trim()) {
            newErrors['domicilio.codigoPostal'] = 'El código postal es requerido';
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

            // Si hay un callback onSave, usarlo (modo standalone)
            if (onSave) {
                await onSave(formData);
                return;
            }

            // Si no hay callback, usar servicios normales (modo router)
            if (isEdit) {
                await ContributorService.updateContributor(id, formData);
                setToast({
                    type: 'success',
                    message: 'Contribuyente actualizado correctamente'
                });
            } else {
                await ContributorService.createContributor(formData);
                setToast({
                    type: 'success',
                    message: 'Contribuyente creado correctamente'
                });
            }

            setTimeout(() => {
                if (navigate) {
                    navigate('/contributors');
                }
            }, 1500);

        } catch (error) {
            setToast({
                type: 'error',
                message: error.response?.data?.message || 'Error al guardar contribuyente'
            });
        } finally {
            setSaving(false);
        }
    };

    const canEdit = () => {
        return currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <button
                            onClick={() => onCancel ? onCancel() : navigate?.('/contributors')}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            ← Volver
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {isEdit ? 'Editar Contribuyente' : 'Nuevo Contribuyente'}
                        </h1>
                    </div>
                </div>

                {/* Formulario */}
                <div className="bg-white rounded-lg shadow-sm">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Información básica */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Información Básica
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="cuit" className="block text-sm font-medium text-gray-700 mb-2">
                                        CUIT *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            id="cuit"
                                            name="cuit"
                                            value={formData.cuit}
                                            onChange={handleCuitChange}
                                            maxLength={13}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.cuit ? 'border-red-300' : 'border-gray-300'
                                                }`}
                                            placeholder="20-12345678-9"
                                        />
                                        {cuitValidation.loading && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            </div>
                                        )}
                                    </div>
                                    {errors.cuit && (
                                        <p className="mt-1 text-sm text-red-600">{errors.cuit}</p>
                                    )}
                                    {cuitValidation.valid === true && (
                                        <p className="mt-1 text-sm text-green-600">✓ CUIT válido</p>
                                    )}
                                    {cuitValidation.valid === false && (
                                        <p className="mt-1 text-sm text-red-600">✗ CUIT no encontrado en AFIP</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="categoriaFiscal" className="block text-sm font-medium text-gray-700 mb-2">
                                        Categoría Fiscal *
                                    </label>
                                    <select
                                        id="categoriaFiscal"
                                        name="categoriaFiscal"
                                        value={formData.categoriaFiscal}
                                        onChange={handleChange}
                                        disabled={!canEdit()}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.categoriaFiscal ? 'border-red-300' : 'border-gray-300'
                                            } ${!canEdit() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    >
                                        {categories.map(category => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                    {errors.categoriaFiscal && (
                                        <p className="mt-1 text-sm text-red-600">{errors.categoriaFiscal}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label htmlFor="razonSocial" className="block text-sm font-medium text-gray-700 mb-2">
                                        Razón Social *
                                    </label>
                                    <input
                                        type="text"
                                        id="razonSocial"
                                        name="razonSocial"
                                        value={formData.razonSocial}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.razonSocial ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="EMPRESA EJEMPLO SA"
                                    />
                                    {errors.razonSocial && (
                                        <p className="mt-1 text-sm text-red-600">{errors.razonSocial}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="nombreFantasia" className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre Fantasía
                                    </label>
                                    <input
                                        type="text"
                                        id="nombreFantasia"
                                        name="nombreFantasia"
                                        value={formData.nombreFantasia}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Empresa Ejemplo"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div>
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
                                        placeholder="contacto@empresa.com"
                                    />
                                    {errors.email && (
                                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        id="telefono"
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="011-1234-5678"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Domicilio fiscal */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Domicilio Fiscal
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                    <label htmlFor="domicilio.calle" className="block text-sm font-medium text-gray-700 mb-2">
                                        Calle *
                                    </label>
                                    <input
                                        type="text"
                                        id="domicilio.calle"
                                        name="domicilio.calle"
                                        value={formData.domicilioFiscal.calle}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors['domicilio.calle'] ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="Av. Corrientes"
                                    />
                                    {errors['domicilio.calle'] && (
                                        <p className="mt-1 text-sm text-red-600">{errors['domicilio.calle']}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="domicilio.numero" className="block text-sm font-medium text-gray-700 mb-2">
                                        Número *
                                    </label>
                                    <input
                                        type="text"
                                        id="domicilio.numero"
                                        name="domicilio.numero"
                                        value={formData.domicilioFiscal.numero}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors['domicilio.numero'] ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="1234"
                                    />
                                    {errors['domicilio.numero'] && (
                                        <p className="mt-1 text-sm text-red-600">{errors['domicilio.numero']}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                                <div>
                                    <label htmlFor="domicilio.ciudad" className="block text-sm font-medium text-gray-700 mb-2">
                                        Ciudad *
                                    </label>
                                    <input
                                        type="text"
                                        id="domicilio.ciudad"
                                        name="domicilio.ciudad"
                                        value={formData.domicilioFiscal.ciudad}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors['domicilio.ciudad'] ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="CABA"
                                    />
                                    {errors['domicilio.ciudad'] && (
                                        <p className="mt-1 text-sm text-red-600">{errors['domicilio.ciudad']}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="domicilio.provincia" className="block text-sm font-medium text-gray-700 mb-2">
                                        Provincia *
                                    </label>
                                    <select
                                        id="domicilio.provincia"
                                        name="domicilio.provincia"
                                        value={formData.domicilioFiscal.provincia}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors['domicilio.provincia'] ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                    >
                                        <option value="">Seleccionar provincia</option>
                                        {provinces.map(province => (
                                            <option key={province} value={province}>{province}</option>
                                        ))}
                                    </select>
                                    {errors['domicilio.provincia'] && (
                                        <p className="mt-1 text-sm text-red-600">{errors['domicilio.provincia']}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="domicilio.codigoPostal" className="block text-sm font-medium text-gray-700 mb-2">
                                        Código Postal *
                                    </label>
                                    <input
                                        type="text"
                                        id="domicilio.codigoPostal"
                                        name="domicilio.codigoPostal"
                                        value={formData.domicilioFiscal.codigoPostal}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors['domicilio.codigoPostal'] ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="C1043AAZ"
                                    />
                                    {errors['domicilio.codigoPostal'] && (
                                        <p className="mt-1 text-sm text-red-600">{errors['domicilio.codigoPostal']}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Estado */}
                        {isEdit && (
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    Estado
                                </h3>

                                <div>
                                    <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-2">
                                        Estado del Contribuyente
                                    </label>
                                    <select
                                        id="estado"
                                        name="estado"
                                        value={formData.estado}
                                        onChange={handleChange}
                                        disabled={!canEdit()}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!canEdit() ? 'bg-gray-100 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        {states.map(estado => (
                                            <option key={estado} value={estado}>{estado}</option>
                                        ))}
                                    </select>
                                    {!canEdit() && (
                                        <p className="mt-1 text-sm text-gray-500">
                                            No tienes permisos para cambiar el estado
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Botones */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => onCancel ? onCancel() : navigate?.('/contributors')}
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
                                    isEdit ? 'Actualizar Contribuyente' : 'Crear Contribuyente'
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