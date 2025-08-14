// src/client/components/ContributorManagement/SimpleContributorForm.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

export const SimpleContributorForm = ({ 
    contributor = null,
    onSave, 
    onCancel, 
    title = 'Crear Contribuyente' 
}) => {
    const [formData, setFormData] = useState({
        cuit: contributor?.cuit || '',
        razonSocial: contributor?.razonSocial || '',
        nombreFantasia: contributor?.nombreFantasia || '',
        email: contributor?.email || '',
        telefono: contributor?.telefono || '',
        categoriaFiscal: contributor?.categoriaFiscal || 'Monotributista',
        domicilioFiscal: {
            calle: contributor?.domicilioFiscal?.calle || '',
            numero: contributor?.domicilioFiscal?.numero || '',
            ciudad: contributor?.domicilioFiscal?.ciudad || '',
            provincia: contributor?.domicilioFiscal?.provincia || '',
            codigoPostal: contributor?.domicilioFiscal?.codigoPostal || ''
        }
    });

    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const categories = ['Monotributista', 'Responsable Inscripto', 'Exento'];
    const provinces = [
        'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 
        'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 
        'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 
        'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 
        'Tierra del Fuego', 'Tucumán'
    ];

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

    const handleCuitChange = (e) => {
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
            if (onSave) {
                await onSave(formData);
            }
        } catch (error) {
            console.error('Error al guardar contribuyente:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {title}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="py-6 space-y-6">
                    {/* Información básica */}
                    <div>
                        <h4 className="text-md font-medium text-gray-900 mb-4">
                            Información Básica
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="cuit" className="block text-sm font-medium text-gray-700 mb-2">
                                    CUIT *
                                </label>
                                <input
                                    type="text"
                                    id="cuit"
                                    name="cuit"
                                    value={formData.cuit}
                                    onChange={handleCuitChange}
                                    maxLength={13}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors.cuit ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                    placeholder="20-12345678-9"
                                    required
                                />
                                {errors.cuit && (
                                    <p className="mt-1 text-sm text-red-600">{errors.cuit}</p>
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
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors.categoriaFiscal ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                    required
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

                        <div className="mt-4">
                            <label htmlFor="razonSocial" className="block text-sm font-medium text-gray-700 mb-2">
                                Razón Social *
                            </label>
                            <input
                                type="text"
                                id="razonSocial"
                                name="razonSocial"
                                value={formData.razonSocial}
                                onChange={handleChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.razonSocial ? 'border-red-300' : 'border-gray-300'
                                }`}
                                placeholder="EMPRESA EJEMPLO SA"
                                required
                            />
                            {errors.razonSocial && (
                                <p className="mt-1 text-sm text-red-600">{errors.razonSocial}</p>
                            )}
                        </div>

                        <div className="mt-4">
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

                    {/* Contacto */}
                    <div>
                        <h4 className="text-md font-medium text-gray-900 mb-4">
                            Información de Contacto
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors.email ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                    placeholder="contacto@empresa.com"
                                    required
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
                        <h4 className="text-md font-medium text-gray-900 mb-4">
                            Domicilio Fiscal
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="domicilio.calle" className="block text-sm font-medium text-gray-700 mb-2">
                                    Calle *
                                </label>
                                <input
                                    type="text"
                                    id="domicilio.calle"
                                    name="domicilio.calle"
                                    value={formData.domicilioFiscal.calle}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors['domicilio.calle'] ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                    placeholder="Av. Corrientes"
                                    required
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
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors['domicilio.numero'] ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                    placeholder="1234"
                                    required
                                />
                                {errors['domicilio.numero'] && (
                                    <p className="mt-1 text-sm text-red-600">{errors['domicilio.numero']}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors['domicilio.ciudad'] ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                    placeholder="CABA"
                                    required
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
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors['domicilio.provincia'] ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                    required
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
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors['domicilio.codigoPostal'] ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                    placeholder="C1043AAZ"
                                    required
                                />
                                {errors['domicilio.codigoPostal'] && (
                                    <p className="mt-1 text-sm text-red-600">{errors['domicilio.codigoPostal']}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Guardando...
                                </>
                            ) : (
                                contributor ? 'Actualizar Contribuyente' : 'Crear Contribuyente'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SimpleContributorForm;