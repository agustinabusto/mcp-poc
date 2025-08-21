import React, { useState, useEffect } from 'react';
import { FileText, Eye, Download, Trash2, Calendar, Filter, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOCR } from '../../hooks/useOCR';
import DocumentDetailViewer from './DocumentDetailViewer';

const DocumentHistory = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        documentType: 'all',
        status: 'all',
        search: ''
    });
    
    const { getOCRHistory } = useOCR();
    const itemsPerPage = 10;

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const response = await getOCRHistory(
                'default-client', // TODO: usar clientId real del contexto
                currentPage,
                itemsPerPage
            );
            
            if (response.success) {
                setDocuments(response.data.items || []);
                setTotalPages(response.data.totalPages || 1);
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            // Usar datos de ejemplo si falla la carga
            setDocuments(generateSampleDocuments());
            setTotalPages(3);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDocuments();
    }, [currentPage]);

    const generateSampleDocuments = () => [
        {
            id: 1,
            processId: '550e8400-e29b-41d4-a716-446655440000',
            fileName: 'factura_ejemplo.pdf',
            documentType: 'invoice',
            confidence: 94.2,
            status: 'completed',
            processedAt: new Date(Date.now() - 3600000).toISOString(),
            fileSize: 245760,
            extractedData: {
                numero: 'A-001-00001234',
                fecha: '2024-01-15',
                cuit: '30-12345678-9',
                razonSocial: 'Empresa de Prueba S.A.',
                total: 12100.50
            }
        },
        {
            id: 2,
            processId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            fileName: 'extracto_bancario.pdf',
            documentType: 'bank_statement',
            confidence: 87.8,
            status: 'completed',
            processedAt: new Date(Date.now() - 7200000).toISOString(),
            fileSize: 156432,
            extractedData: {
                banco: 'Banco Nación',
                cuenta: '****-1234',
                movimientos: 15,
                periodo: '01/01/2024 - 31/01/2024'
            }
        },
        {
            id: 3,
            processId: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
            fileName: 'recibo_servicios.jpg',
            documentType: 'receipt',
            confidence: 91.5,
            status: 'completed',
            processedAt: new Date(Date.now() - 10800000).toISOString(),
            fileSize: 98765,
            extractedData: {
                concepto: 'Servicios públicos',
                monto: 8500.00,
                fecha: '2024-01-10'
            }
        }
    ];

    const getStatusBadge = (status) => {
        const styles = {
            completed: 'bg-green-100 text-green-800',
            processing: 'bg-yellow-100 text-yellow-800',
            failed: 'bg-red-100 text-red-800',
            pending: 'bg-gray-100 text-gray-800'
        };
        
        const labels = {
            completed: 'Completado',
            processing: 'Procesando',
            failed: 'Error',
            pending: 'Pendiente'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
                {labels[status] || 'Desconocido'}
            </span>
        );
    };

    const getDocumentTypeIcon = (type) => {
        switch (type) {
            case 'invoice':
                return <FileText className="h-5 w-5 text-blue-500" />;
            case 'bank_statement':
                return <FileText className="h-5 w-5 text-green-500" />;
            case 'receipt':
                return <FileText className="h-5 w-5 text-purple-500" />;
            default:
                return <FileText className="h-5 w-5 text-gray-500" />;
        }
    };

    const getDocumentTypeLabel = (type) => {
        const labels = {
            invoice: 'Factura',
            bank_statement: 'Extracto Bancario',
            receipt: 'Recibo',
            other: 'Otro'
        };
        return labels[type] || 'Desconocido';
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('es-AR');
    };

    const viewDocument = (document) => {
        setSelectedDocument(document);
    };

    const closeDocumentViewer = () => {
        setSelectedDocument(null);
    };

    if (selectedDocument) {
        return (
            <DocumentDetailViewer 
                document={selectedDocument} 
                onBack={closeDocumentViewer} 
            />
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Historial de Documentos Procesados
                </h2>
                <p className="text-gray-600">
                    Documentos procesados con OCR y sus resultados de extracción
                </p>
            </div>

            {/* Filtros y búsqueda */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    {/* Buscador */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Buscar documentos..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                        />
                    </div>

                    {/* Filtro por tipo */}
                    <select
                        value={filters.documentType}
                        onChange={(e) => setFilters(prev => ({ ...prev, documentType: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="invoice">Facturas</option>
                        <option value="bank_statement">Extractos Bancarios</option>
                        <option value="receipt">Recibos</option>
                        <option value="other">Otros</option>
                    </select>

                    {/* Filtro por estado */}
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="completed">Completados</option>
                        <option value="processing">Procesando</option>
                        <option value="failed">Con errores</option>
                        <option value="pending">Pendientes</option>
                    </select>

                    {/* Botón refrescar */}
                    <button
                        onClick={loadDocuments}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refrescar
                    </button>
                </div>
            </div>

            {/* Lista de documentos */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                        <p className="text-gray-500">Cargando documentos...</p>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="p-8 text-center">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay documentos procesados
                        </h3>
                        <p className="text-gray-500">
                            Los documentos que proceses aparecerán aquí
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Documento
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Confianza
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Procesado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {documents.map((document) => (
                                    <tr key={document.id || document.processId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {getDocumentTypeIcon(document.documentType)}
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {document.fileName}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {formatFileSize(document.fileSize)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {getDocumentTypeLabel(document.documentType)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {document.confidence}%
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                <div 
                                                    className="bg-blue-600 h-1.5 rounded-full"
                                                    style={{ width: `${document.confidence}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(document.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(document.processedAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => viewDocument(document)}
                                                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                                                    title="Descargar"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginación */}
                {!loading && documents.length > 0 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Mostrando{' '}
                                    <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                                    {' '}a{' '}
                                    <span className="font-medium">
                                        {Math.min(currentPage * itemsPerPage, documents.length)}
                                    </span>
                                    {' '}de{' '}
                                    <span className="font-medium">{documents.length}</span>
                                    {' '}documentos
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    
                                    {/* Números de página */}
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                page === currentPage
                                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentHistory;