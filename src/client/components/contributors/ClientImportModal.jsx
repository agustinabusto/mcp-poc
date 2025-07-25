// src/client/components/contributors/ClientImportModal.jsx
import React, { useState, useRef, useCallback } from 'react';
import {
    X,
    Upload,
    FileText,
    AlertTriangle,
    CheckCircle,
    Download,
    Plus,
    Trash2,
    FileSpreadsheet,
    User,
    Building,
    Loader2,
    AlertCircle,
    Info
} from 'lucide-react';

const ClientImportModal = ({
    isOpen,
    onClose,
    onImport,
    importType = 'individual'
}) => {
    // Estados para importación individual
    const [individualClient, setIndividualClient] = useState({
        cuit: '',
        businessName: '',
        email: '',
        phone: '',
        address: '',
        category: '',
        notes: ''
    });

    // Estados para importación en lote
    const [batchFile, setBatchFile] = useState(null);
    const [batchData, setBatchData] = useState([]);
    const [batchPreview, setBatchPreview] = useState([]);
    const [showPreview, setShowPreview] = useState(false);

    // Estados generales
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [dragActive, setDragActive] = useState(false);

    const fileInputRef = useRef(null);

    // Validación de CUIT
    const validateCuit = (cuit) => {
        const cleanCuit = cuit.replace(/[^\d]/g, '');
        if (cleanCuit.length !== 11) return false;

        // Validación básica de CUIT
        const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        let sum = 0;

        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCuit[i]) * multipliers[i];
        }

        const remainder = sum % 11;
        const expectedDigit = remainder < 2 ? remainder : 11 - remainder;

        return parseInt(cleanCuit[10]) === expectedDigit;
    };

    // Validar formulario individual
    const validateIndividualForm = () => {
        const errors = {};

        if (!individualClient.cuit.trim()) {
            errors.cuit = 'CUIT es requerido';
        } else if (!validateCuit(individualClient.cuit)) {
            errors.cuit = 'CUIT inválido';
        }

        if (!individualClient.businessName.trim()) {
            errors.businessName = 'Razón social es requerida';
        }

        if (individualClient.email && !/\S+@\S+\.\S+/.test(individualClient.email)) {
            errors.email = 'Email inválido';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Manejar cambios en el formulario individual
    const handleIndividualChange = (field, value) => {
        setIndividualClient(prev => ({
            ...prev,
            [field]: value
        }));

        // Limpiar error del campo modificado
        if (validationErrors[field]) {
            setValidationErrors(prev => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

    // Formatear CUIT mientras se escribe
    const formatCuit = (value) => {
        const numbers = value.replace(/[^\d]/g, '');
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 10) {
            return `${numbers.slice(0, 2)}-${numbers.slice(2, 10)}-${numbers.slice(10)}`;
        }
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 10)}-${numbers.slice(10, 11)}`;
    };

    // Manejar drag & drop
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    }, []);

    // Procesar archivo seleccionado
    const handleFileSelection = async (file) => {
        if (!file) return;

        const validTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (!validTypes.includes(file.type)) {
            setError('Formato de archivo no válido. Solo se permiten CSV y Excel.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB
            setError('El archivo es demasiado grande. Máximo 5MB.');
            return;
        }

        setBatchFile(file);
        setError(null);

        // Procesar archivo
        try {
            setLoading(true);
            const data = await processFile(file);
            setBatchData(data);
            setBatchPreview(data.slice(0, 5)); // Mostrar primeras 5 filas
            setShowPreview(true);
        } catch (err) {
            setError(`Error procesando archivo: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Procesar archivo CSV/Excel
    const processFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const text = e.target.result;

                    if (file.type === 'text/csv') {
                        const lines = text.split('\n');
                        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

                        const data = lines.slice(1)
                            .filter(line => line.trim())
                            .map(line => {
                                const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                                const row = {};
                                headers.forEach((header, index) => {
                                    row[header.toLowerCase()] = values[index] || '';
                                });
                                return row;
                            });

                        resolve(data);
                    } else {
                        // Para Excel, necesitarías una librería como SheetJS
                        reject(new Error('Soporte de Excel en desarrollo'));
                    }
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error('Error leyendo archivo'));
            reader.readAsText(file);
        });
    };

    // Validar datos del lote
    const validateBatchData = (data) => {
        const errors = [];
        const seenCuits = new Set();

        data.forEach((row, index) => {
            const rowErrors = [];

            // Validar CUIT
            if (!row.cuit || !validateCuit(row.cuit)) {
                rowErrors.push('CUIT inválido');
            } else if (seenCuits.has(row.cuit)) {
                rowErrors.push('CUIT duplicado');
            } else {
                seenCuits.add(row.cuit);
            }

            // Validar razón social
            if (!row.businessname && !row['razon_social'] && !row['business_name']) {
                rowErrors.push('Razón social requerida');
            }

            // Validar email si está presente
            if (row.email && !/\S+@\S+\.\S+/.test(row.email)) {
                rowErrors.push('Email inválido');
            }

            if (rowErrors.length > 0) {
                errors.push({
                    row: index + 1,
                    errors: rowErrors
                });
            }
        });

        return errors;
    };

    // Manejar envío
    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            if (importType === 'individual') {
                if (!validateIndividualForm()) {
                    setLoading(false);
                    return;
                }

                await onImport({
                    type: 'individual',
                    data: [individualClient]
                });
            } else {
                if (!batchData.length) {
                    setError('No hay datos para importar');
                    setLoading(false);
                    return;
                }

                const validationErrors = validateBatchData(batchData);
                if (validationErrors.length > 0) {
                    setError(`Errores de validación en ${validationErrors.length} filas`);
                    setLoading(false);
                    return;
                }

                await onImport({
                    type: 'batch',
                    data: batchData
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Descargar template
    const downloadTemplate = () => {
        const csvContent = 'cuit,business_name,email,phone,address,category,notes\n20-12345678-9,"Empresa Ejemplo SRL",ejemplo@email.com,11-1234-5678,"Av. Ejemplo 123","Servicios","Notas adicionales"';
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_clientes.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

                <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">
                            {importType === 'individual' ? 'Agregar Cliente' : 'Importar Clientes en Lote'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
                                    <span className="text-red-800">{error}</span>
                                </div>
                            </div>
                        )}

                        {importType === 'individual' ? (
                            // Formulario Individual
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            CUIT *
                                        </label>
                                        <input
                                            type="text"
                                            value={individualClient.cuit}
                                            onChange={(e) => handleIndividualChange('cuit', formatCuit(e.target.value))}
                                            placeholder="20-12345678-9"
                                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.cuit ? 'border-red-300' : 'border-gray-300'
                                                }`}
                                            maxLength="13"
                                        />
                                        {validationErrors.cuit && (
                                            <p className="mt-1 text-sm text-red-600">{validationErrors.cuit}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Razón Social *
                                        </label>
                                        <input
                                            type="text"
                                            value={individualClient.businessName}
                                            onChange={(e) => handleIndividualChange('businessName', e.target.value)}
                                            placeholder="Empresa Ejemplo SRL"
                                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.businessName ? 'border-red-300' : 'border-gray-300'
                                                }`}
                                        />
                                        {validationErrors.businessName && (
                                            <p className="mt-1 text-sm text-red-600">{validationErrors.businessName}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={individualClient.email}
                                            onChange={(e) => handleIndividualChange('email', e.target.value)}
                                            placeholder="contacto@empresa.com"
                                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.email ? 'border-red-300' : 'border-gray-300'
                                                }`}
                                        />
                                        {validationErrors.email && (
                                            <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Teléfono
                                        </label>
                                        <input
                                            type="text"
                                            value={individualClient.phone}
                                            onChange={(e) => handleIndividualChange('phone', e.target.value)}
                                            placeholder="11-1234-5678"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Dirección
                                        </label>
                                        <input
                                            type="text"
                                            value={individualClient.address}
                                            onChange={(e) => handleIndividualChange('address', e.target.value)}
                                            placeholder="Av. Ejemplo 123, CABA"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Categoría
                                        </label>
                                        <select
                                            value={individualClient.category}
                                            onChange={(e) => handleIndividualChange('category', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Seleccionar categoría</option>
                                            <option value="Comercio">Comercio</option>
                                            <option value="Servicios">Servicios</option>
                                            <option value="Industria">Industria</option>
                                            <option value="Construcción">Construcción</option>
                                            <option value="Agropecuario">Agropecuario</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Notas
                                        </label>
                                        <textarea
                                            value={individualClient.notes}
                                            onChange={(e) => handleIndividualChange('notes', e.target.value)}
                                            placeholder="Notas adicionales sobre el cliente"
                                            rows="3"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Importación en Lote
                            <div className="space-y-6">
                                {/* Template Download */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <Info className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-blue-800 mb-1">
                                                Formato requerido
                                            </h4>
                                            <p className="text-sm text-blue-700 mb-3">
                                                Descarga el template para ver el formato correcto del archivo CSV.
                                            </p>
                                            <button
                                                onClick={downloadTemplate}
                                                className="inline-flex items-center px-3 py-1 border border-blue-300 rounded text-sm text-blue-700 hover:bg-blue-100 transition-colors"
                                            >
                                                <Download className="h-4 w-4 mr-1" />
                                                Descargar Template
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* File Upload Area */}
                                <div
                                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                                            ? 'border-blue-400 bg-blue-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Subir archivo de clientes
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Arrastra el archivo aquí o haz clic para seleccionar
                                    </p>
                                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Seleccionar archivo
                                        </button>
                                        <span className="text-sm text-gray-500">
                                            CSV o Excel (máx. 5MB)
                                        </span>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={(e) => handleFileSelection(e.target.files[0])}
                                        className="hidden"
                                    />
                                </div>

                                {/* File Info */}
                                {batchFile && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <FileText className="h-5 w-5 text-gray-400 mr-3" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {batchFile.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {(batchFile.size / 1024).toFixed(1)} KB
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setBatchFile(null);
                                                    setBatchData([]);
                                                    setBatchPreview([]);
                                                    setShowPreview(false);
                                                }}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Preview */}
                                {showPreview && batchPreview.length > 0 && (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                            <h4 className="text-sm font-medium text-gray-900">
                                                Vista previa ({batchData.length} registros)
                                            </h4>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CUIT</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Razón Social</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {batchPreview.map((row, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-2 text-sm text-gray-900 font-mono">
                                                                {row.cuit}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm text-gray-900">
                                                                {row.business_name || row.businessname || row['razon_social'] || 'N/A'}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm text-gray-500">
                                                                {row.email || 'N/A'}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm text-gray-500">
                                                                {row.phone || row.telefono || 'N/A'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {batchData.length > 5 && (
                                            <div className="bg-gray-50 px-4 py-2 text-center text-sm text-gray-600">
                                                Y {batchData.length - 5} registros más...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                        <div className="text-sm text-gray-500">
                            {importType === 'individual' ? (
                                <span>* Campos requeridos</span>
                            ) : (
                                <span>
                                    {batchData.length > 0 && `${batchData.length} registros listos para importar`}
                                </span>
                            )}
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={handleSubmit}
                                disabled={loading || (importType === 'batch' && !batchData.length)}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        {importType === 'individual' ? 'Agregando...' : 'Importando...'}
                                    </>
                                ) : (
                                    <>
                                        {importType === 'individual' ? (
                                            <>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Agregar Cliente
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-4 w-4 mr-2" />
                                                Importar {batchData.length} Clientes
                                            </>
                                        )}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientImportModal;