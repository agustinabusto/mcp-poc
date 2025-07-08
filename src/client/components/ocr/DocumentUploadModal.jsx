// src/client/components/ocr/DocumentUploadModal.jsx
import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, Image, File, AlertCircle, CheckCircle } from 'lucide-react';

const DocumentUploadModal = ({ onClose, onUpload, loading = false }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [documentType, setDocumentType] = useState('auto');
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const documentTypes = [
        { value: 'auto', label: 'Detección automática' },
        { value: 'invoice', label: 'Factura' },
        { value: 'bank_statement', label: 'Extracto bancario' },
        { value: 'receipt', label: 'Recibo' },
        { value: 'other', label: 'Otro documento' }
    ];

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        try {
            await onUpload(selectedFile, documentType);
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    };

    const getFileIcon = (file) => {
        if (!file) return <File className="w-8 h-8 text-gray-400" />;

        if (file.type.startsWith('image/')) {
            return <Image className="w-8 h-8 text-blue-500" />;
        } else if (file.type === 'application/pdf') {
            return <FileText className="w-8 h-8 text-red-500" />;
        }
        return <File className="w-8 h-8 text-gray-400" />;
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Subir Documento para OCR
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Tipo de documento */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de documento
                        </label>
                        <select
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {documentTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Zona de arrastre */}
                    <div
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={loading}
                        />

                        {selectedFile ? (
                            <div className="space-y-2">
                                {getFileIcon(selectedFile)}
                                <p className="text-sm font-medium text-gray-900">
                                    {selectedFile.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                                <p className="text-sm text-gray-600">
                                    Arrastra un archivo aquí o haz clic para seleccionar
                                </p>
                                <p className="text-xs text-gray-500">
                                    PDF, JPG, PNG (máx. 10MB)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Información adicional */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-800">
                                <p className="font-medium">Procesamiento con IA</p>
                                <p>El documento será procesado automáticamente con OCR y los datos extraídos serán categorizados usando inteligencia artificial.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                <span>Subir y Procesar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentUploadModal;