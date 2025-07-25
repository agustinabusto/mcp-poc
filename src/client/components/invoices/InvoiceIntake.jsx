// 1. src/client/components/invoices/InvoiceIntake.jsx
import React, { useState, useRef } from 'react';
import { Upload, FileText, Camera, AlertCircle, CheckCircle, X } from 'lucide-react';

const InvoiceIntake = () => {
    const [dragOver, setDragOver] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [processing, setProcessing] = useState(false);
    const fileInputRef = useRef(null);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    };

    const handleFiles = (files) => {
        const validFiles = files.filter(file =>
            file.type.includes('pdf') || file.type.includes('image')
        );

        const newFiles = validFiles.map(file => ({
            id: Date.now() + Math.random(),
            file,
            name: file.name,
            size: file.size,
            status: 'pending'
        }));

        setUploadedFiles(prev => [...prev, ...newFiles]);
    };

    const removeFile = (id) => {
        setUploadedFiles(prev => prev.filter(file => file.id !== id));
    };

    const processFiles = async () => {
        setProcessing(true);
        // Simular procesamiento
        for (let i = 0; i < uploadedFiles.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            setUploadedFiles(prev => prev.map(file =>
                file.status === 'pending' ? { ...file, status: 'processed' } : file
            ));
        }
        setProcessing(false);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Ingreso de Facturas</h2>
                <p className="text-gray-600">Sube facturas para procesamiento automático con OCR</p>
            </div>

            {/* Zona de drag & drop */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
                    }`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Arrastra facturas aquí o haz clic para seleccionar
                </h3>
                <p className="text-gray-500 mb-4">Soporta PDF, JPG, PNG (máx. 10MB)</p>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                >
                    Seleccionar Archivos
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* Lista de archivos */}
            {uploadedFiles.length > 0 && (
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">Archivos Cargados ({uploadedFiles.length})</h3>
                        {uploadedFiles.some(f => f.status === 'pending') && (
                            <button
                                onClick={processFiles}
                                disabled={processing}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {processing ? 'Procesando...' : 'Procesar Todos'}
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {uploadedFiles.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-4 bg-white border rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <FileText className="h-8 w-8 text-blue-500" />
                                    <div>
                                        <p className="font-medium">{file.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {file.status === 'pending' && (
                                        <span className="text-yellow-600 text-sm">Pendiente</span>
                                    )}
                                    {file.status === 'processed' && (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                    )}
                                    <button
                                        onClick={() => removeFile(file.id)}
                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceIntake;