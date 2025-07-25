// src/client/hooks/useContributors.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { contributorsService } from '../services/contributors-service.js';

export const useContributors = () => {
    // Estados principales
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Estados de métricas y estadísticas
    const [metrics, setMetrics] = useState({
        totalClients: 0,
        compliantClients: 0,
        nonCompliantClients: 0,
        pendingClients: 0,
        lastUpdate: null
    });

    // Estados de filtros y paginación
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        compliance: 'all',
        category: 'all'
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    });

    // Referencias para evitar requests duplicados
    const abortControllerRef = useRef(null);
    const loadingRef = useRef(false);

    // Cargar lista de clientes
    const loadClients = useCallback(async (options = {}) => {
        if (loadingRef.current) return;

        // Cancelar request anterior si existe
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        loadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const params = {
                ...filters,
                ...pagination,
                ...options,
                signal: abortControllerRef.current.signal
            };

            const response = await contributorsService.getClients(params);

            setClients(response.clients);
            setMetrics(response.metrics);
            setPagination(prev => ({
                ...prev,
                total: response.total,
                totalPages: response.totalPages
            }));

        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error loading clients:', err);
                setError(err.message || 'Error cargando clientes');
            }
        } finally {
            loadingRef.current = false;
            setLoading(false);
            abortControllerRef.current = null;
        }
    }, [filters, pagination.page, pagination.limit]);

    // Crear nuevo cliente
    const createClient = useCallback(async (clientData) => {
        setLoading(true);
        setError(null);

        try {
            const newClient = await contributorsService.createClient(clientData);

            // Actualizar lista local
            setClients(prev => [newClient, ...prev]);

            // Actualizar métricas
            setMetrics(prev => ({
                ...prev,
                totalClients: prev.totalClients + 1
            }));

            return newClient;
        } catch (err) {
            console.error('Error creating client:', err);
            setError(err.message || 'Error creando cliente');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Actualizar cliente existente
    const updateClient = useCallback(async (clientData) => {
        setLoading(true);
        setError(null);

        try {
            const updatedClient = await contributorsService.updateClient(clientData);

            // Actualizar en la lista local
            setClients(prev =>
                prev.map(client =>
                    client.id === updatedClient.id ? updatedClient : client
                )
            );

            return updatedClient;
        } catch (err) {
            console.error('Error updating client:', err);
            setError(err.message || 'Error actualizando cliente');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Eliminar cliente
    const deleteClient = useCallback(async (clientId) => {
        setLoading(true);
        setError(null);

        try {
            await contributorsService.deleteClient(clientId);

            // Remover de la lista local
            setClients(prev => prev.filter(client => client.id !== clientId));

            // Actualizar métricas
            setMetrics(prev => ({
                ...prev,
                totalClients: prev.totalClients - 1
            }));

            return true;
        } catch (err) {
            console.error('Error deleting client:', err);
            setError(err.message || 'Error eliminando cliente');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Importar clientes en lote
    const importClients = useCallback(async (importData) => {
        setLoading(true);
        setError(null);

        try {
            const result = await contributorsService.importClients(importData);

            // Recargar lista completa después de la importación
            await loadClients();

            return result;
        } catch (err) {
            console.error('Error importing clients:', err);
            setError(err.message || 'Error importando clientes');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [loadClients]);

    // Actualizar datos de ARCA para un cliente específico
    const refreshClient = useCallback(async (cuit) => {
        setError(null);

        try {
            const updatedClient = await contributorsService.refreshClientData(cuit);

            // Actualizar en la lista local
            setClients(prev =>
                prev.map(client =>
                    client.cuit === cuit ? { ...client, ...updatedClient } : client
                )
            );

            return updatedClient;
        } catch (err) {
            console.error('Error refreshing client:', err);
            setError(err.message || 'Error actualizando datos del cliente');
            throw err;
        }
    }, []);

    // Buscar cliente por CUIT
    const searchClientByCuit = useCallback(async (cuit) => {
        setError(null);

        try {
            return await contributorsService.searchByCuit(cuit);
        } catch (err) {
            console.error('Error searching client:', err);
            setError(err.message || 'Error buscando cliente');
            throw err;
        }
    }, []);

    // Obtener facturas de un cliente
    const getClientInvoices = useCallback(async (clientId, options = {}) => {
        try {
            return await contributorsService.getClientInvoices(clientId, options);
        } catch (err) {
            console.error('Error getting client invoices:', err);
            throw err;
        }
    }, []);

    // Obtener estadísticas de compliance
    const getComplianceStats = useCallback(async () => {
        try {
            return await contributorsService.getComplianceStats();
        } catch (err) {
            console.error('Error getting compliance stats:', err);
            throw err;
        }
    }, []);

    // Actualizar filtros
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset page cuando cambian filtros
    }, []);

    // Cambiar página
    const changePage = useCallback((newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    }, []);

    // Cambiar límite por página
    const changeLimit = useCallback((newLimit) => {
        setPagination(prev => ({
            ...prev,
            limit: newLimit,
            page: 1 // Reset page cuando cambia límite
        }));
    }, []);

    // Limpiar errores
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Recargar métricas
    const refreshMetrics = useCallback(async () => {
        try {
            const newMetrics = await contributorsService.getMetrics();
            setMetrics(newMetrics);
        } catch (err) {
            console.error('Error refreshing metrics:', err);
        }
    }, []);

    // Exportar datos de clientes
    const exportClients = useCallback(async (format = 'csv', options = {}) => {
        try {
            return await contributorsService.exportClients(format, {
                ...filters,
                ...options
            });
        } catch (err) {
            console.error('Error exporting clients:', err);
            throw err;
        }
    }, [filters]);

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Cargar datos iniciales
    useEffect(() => {
        loadClients();
    }, [filters, pagination.page, pagination.limit]);

    // Auto-refresh cada 5 minutos
    useEffect(() => {
        const interval = setInterval(() => {
            refreshMetrics();
        }, 5 * 60 * 1000); // 5 minutos

        return () => clearInterval(interval);
    }, [refreshMetrics]);

    return {
        // Estados
        clients,
        loading,
        error,
        metrics,
        filters,
        pagination,

        // Acciones principales
        loadClients,
        createClient,
        updateClient,
        deleteClient,
        importClients,
        refreshClient,

        // Búsqueda y consultas
        searchClientByCuit,
        getClientInvoices,
        getComplianceStats,

        // Navegación y filtros
        updateFilters,
        changePage,
        changeLimit,

        // Utilidades
        clearError,
        refreshMetrics,
        exportClients
    };
};

export default useContributors;