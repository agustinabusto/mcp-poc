/**
 * Hook para gestionar el estado de procesamiento OCR
 * Conecta con el backend para obtener documentos reales
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:8080/api';

export const useOCRProcessing = (clientId = 'test-client', autoRefresh = true) => {
    const [processingQueue, setProcessingQueue] = useState([]);
    const [recentDocuments, setRecentDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Obtener historial de documentos procesados
    const fetchDocuments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/ocr/history/${clientId}?limit=20`);
            const data = await response.json();
            
            if (data.success) {
                const documents = data.data.items || [];
                
                // Separar documentos en cola vs completados
                const queue = documents.filter(doc => 
                    doc.status === 'processing' || doc.status === 'queued'
                );
                
                const completed = documents.filter(doc => 
                    doc.status === 'completed'
                );
                
                setProcessingQueue(queue);
                setRecentDocuments(completed);
            } else {
                throw new Error(data.error || 'Error fetching documents');
            }
        } catch (err) {
            console.error('Error fetching OCR documents:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    // Obtener estadísticas de procesamiento
    const fetchProcessingStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/ocr/stats/${clientId}`);
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (err) {
            console.error('Error fetching processing stats:', err);
            return null;
        }
    }, [clientId]);

    // Obtener documento específico con validaciones AFIP
    const fetchDocumentWithValidations = useCallback(async (documentId) => {
        try {
            // Obtener datos del documento
            const docResponse = await fetch(`${API_BASE_URL}/ocr/history/${clientId}?documentId=${documentId}`);
            const docData = await docResponse.json();
            
            // Obtener validaciones AFIP
            const afipResponse = await fetch(`${API_BASE_URL}/afip/validate/${documentId}`);
            const afipData = await afipResponse.json();
            
            if (docData.success) {
                const document = docData.data.items?.[0];
                return {
                    ...document,
                    afipValidations: afipData.success ? afipData.validationResults : null
                };
            }
            
            return null;
        } catch (err) {
            console.error('Error fetching document with validations:', err);
            return null;
        }
    }, [clientId]);

    // Actualizar estado del documento
    const refreshDocument = useCallback(async (documentId) => {
        const updatedDocument = await fetchDocumentWithValidations(documentId);
        if (updatedDocument) {
            // Actualizar en la lista correspondiente
            if (updatedDocument.status === 'completed') {
                setRecentDocuments(prev => 
                    prev.map(doc => doc.id === documentId ? updatedDocument : doc)
                );
                // Remover de cola si estaba ahí
                setProcessingQueue(prev => 
                    prev.filter(doc => doc.id !== documentId)
                );
            } else {
                setProcessingQueue(prev => 
                    prev.map(doc => doc.id === documentId ? updatedDocument : doc)
                );
            }
        }
        return updatedDocument;
    }, [fetchDocumentWithValidations]);

    // Ejecutar validación AFIP manual
    const triggerAfipValidation = useCallback(async (documentId, options = {}) => {
        try {
            const response = await fetch(`${API_BASE_URL}/afip/validate/${documentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    priority: options.priority || 1,
                    forceRefresh: options.forceRefresh || false,
                    ...options
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Actualizar documento con nuevos resultados
                await refreshDocument(documentId);
                return data.validationResults;
            } else {
                throw new Error(data.error || 'Validation failed');
            }
        } catch (err) {
            console.error('Error triggering AFIP validation:', err);
            throw err;
        }
    }, [refreshDocument]);

    // Efecto inicial y auto-refresh
    useEffect(() => {
        fetchDocuments();
        
        if (autoRefresh) {
            const interval = setInterval(fetchDocuments, 30000); // Refresh cada 30s
            return () => clearInterval(interval);
        }
    }, [fetchDocuments, autoRefresh]);

    return {
        // Estados
        processingQueue,
        recentDocuments,
        loading,
        error,
        
        // Acciones
        refreshDocuments: fetchDocuments,
        refreshDocument,
        fetchDocumentWithValidations,
        fetchProcessingStats,
        triggerAfipValidation,
        
        // Utilidades
        totalDocuments: processingQueue.length + recentDocuments.length,
        hasProcessingItems: processingQueue.length > 0,
        isProcessing: processingQueue.some(doc => doc.status === 'processing')
    };
};

export default useOCRProcessing;