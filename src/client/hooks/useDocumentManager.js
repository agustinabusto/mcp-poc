import { useState, useCallback, useEffect } from 'react';

export const useDocumentManager = () => {
    const [processedDocuments, setProcessedDocuments] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [sortBy, setSortBy] = useState('processedAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // Cargar documentos desde localStorage al inicializar
    useEffect(() => {
        const savedDocs = localStorage.getItem('processedDocuments');
        if (savedDocs) {
            try {
                const parsed = JSON.parse(savedDocs);
                setProcessedDocuments(parsed);
            } catch (error) {
                console.warn('Error loading saved documents:', error);
            }
        }
    }, []);

    // Guardar documentos en localStorage cuando cambien
    useEffect(() => {
        if (processedDocuments.length > 0) {
            localStorage.setItem('processedDocuments', JSON.stringify(processedDocuments));
        }
    }, [processedDocuments]);

    // Agregar nuevo documento
    const addDocument = useCallback((document) => {
        const newDoc = {
            ...document,
            id: document.id || crypto.randomUUID(),
            processedAt: document.processedAt || new Date().toISOString()
        };

        setProcessedDocuments(prev => [newDoc, ...prev]);
        return newDoc;
    }, []);

    // Eliminar documento
    const removeDocument = useCallback((documentId) => {
        setProcessedDocuments(prev => {
            const updated = prev.filter(doc => doc.id !== documentId);

            // Limpiar URL de preview si existe
            const docToRemove = prev.find(doc => doc.id === documentId);
            if (docToRemove?.previewUrl) {
                URL.revokeObjectURL(docToRemove.previewUrl);
            }

            return updated;
        });

        // Si el documento eliminado estaba seleccionado, deseleccionar
        if (selectedDocument?.id === documentId) {
            setSelectedDocument(null);
        }
    }, [selectedDocument]);

    // Actualizar documento
    const updateDocument = useCallback((documentId, updates) => {
        setProcessedDocuments(prev =>
            prev.map(doc =>
                doc.id === documentId
                    ? { ...doc, ...updates, updatedAt: new Date().toISOString() }
                    : doc
            )
        );

        // Actualizar documento seleccionado si es el mismo
        if (selectedDocument?.id === documentId) {
            setSelectedDocument(prev => ({ ...prev, ...updates }));
        }
    }, [selectedDocument]);

    // Filtrar y ordenar documentos
    const filteredAndSortedDocuments = useCallback(() => {
        let filtered = processedDocuments;

        // Aplicar búsqueda
        if (searchTerm) {
            filtered = filtered.filter(doc =>
                doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (doc.extractedData?.numero && doc.extractedData.numero.includes(searchTerm)) ||
                (doc.extractedData?.razonSocial && doc.extractedData.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Aplicar filtro por tipo
        if (filterType && filterType !== 'all') {
            filtered = filtered.filter(doc => doc.documentType === filterType);
        }

        // Aplicar ordenamiento
        filtered.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            if (sortBy === 'fileName') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (sortBy === 'processedAt' || sortBy === 'updatedAt') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [processedDocuments, searchTerm, filterType, sortBy, sortOrder]);

    // Limpiar todos los documentos
    const clearAllDocuments = useCallback(() => {
        // Limpiar URLs de preview
        processedDocuments.forEach(doc => {
            if (doc.previewUrl) {
                URL.revokeObjectURL(doc.previewUrl);
            }
        });

        setProcessedDocuments([]);
        setSelectedDocument(null);
        localStorage.removeItem('processedDocuments');
    }, [processedDocuments]);

    // Estadísticas
    const stats = useCallback(() => {
        const total = processedDocuments.length;
        const byType = processedDocuments.reduce((acc, doc) => {
            acc[doc.documentType] = (acc[doc.documentType] || 0) + 1;
            return acc;
        }, {});

        const avgConfidence = total > 0
            ? processedDocuments.reduce((sum, doc) => sum + doc.confidence, 0) / total
            : 0;

        const recent = processedDocuments.filter(doc => {
            const processedTime = new Date(doc.processedAt);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return processedTime > dayAgo;
        }).length;

        return {
            total,
            byType,
            avgConfidence: Math.round(avgConfidence * 10) / 10,
            recentCount: recent
        };
    }, [processedDocuments]);

    return {
        // Estado
        processedDocuments: filteredAndSortedDocuments(),
        allDocuments: processedDocuments,
        selectedDocument,
        searchTerm,
        filterType,
        sortBy,
        sortOrder,

        // Acciones
        addDocument,
        removeDocument,
        updateDocument,
        setSelectedDocument,
        setSearchTerm,
        setFilterType,
        setSortBy,
        setSortOrder,
        clearAllDocuments,

        // Utilidades
        stats: stats()
    };
};