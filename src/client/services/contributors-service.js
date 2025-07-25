// src/client/services/contributors-service.js
import { getMCPClient } from './mcp-client.js';

class ContributorsService {
    constructor() {
        this.baseUrl = '/api/contributors';
        this.mcpClient = null;
    }

    // Inicializar cliente MCP
    async initializeMCP() {
        if (!this.mcpClient) {
            this.mcpClient = await getMCPClient();
        }
        return this.mcpClient;
    }

    // Obtener lista de clientes
    async getClients(params = {}) {
        try {
            const queryParams = new URLSearchParams({
                page: params.page || 1,
                limit: params.limit || 50,
                search: params.search || '',
                status: params.status || 'all',
                compliance: params.compliance || 'all',
                category: params.category || 'all'
            });

            const response = await fetch(`${this.baseUrl}?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: params.signal
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Procesar datos para asegurar formato consistente
            const processedClients = data.clients.map(client => ({
                ...client,
                complianceStatus: this.normalizeComplianceStatus(client),
                arcaStatus: this.normalizeArcaStatus(client),
                lastUpdate: client.lastUpdate || new Date().toISOString()
            }));

            return {
                clients: processedClients,
                total: data.total || processedClients.length,
                totalPages: Math.ceil((data.total || processedClients.length) / (params.limit || 50)),
                metrics: data.metrics || this.calculateMetrics(processedClients)
            };

        } catch (error) {
            console.error('Error fetching clients:', error);

            // Fallback con datos de prueba si falla la API
            if (process.env.NODE_ENV === 'development') {
                return this.getMockClients(params);
            }

            throw error;
        }
    }

    // Crear nuevo cliente
    async createClient(clientData) {
        try {
            // Validar datos antes de enviar
            this.validateClientData(clientData);

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(clientData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error creando cliente');
            }

            const newClient = await response.json();

            // Consultar datos de ARCA inmediatamente después de crear
            try {
                await this.refreshClientData(newClient.cuit);
            } catch (arcaError) {
                console.warn('Error consultando ARCA para nuevo cliente:', arcaError);
            }

            return newClient;

        } catch (error) {
            console.error('Error creating client:', error);
            throw error;
        }
    }

    // Actualizar cliente existente
    async updateClient(clientData) {
        try {
            this.validateClientData(clientData);

            const response = await fetch(`${this.baseUrl}/${clientData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(clientData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error actualizando cliente');
            }

            return await response.json();

        } catch (error) {
            console.error('Error updating client:', error);
            throw error;
        }
    }

    // Eliminar cliente
    async deleteClient(clientId) {
        try {
            const response = await fetch(`${this.baseUrl}/${clientId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error eliminando cliente');
            }

            return true;

        } catch (error) {
            console.error('Error deleting client:', error);
            throw error;
        }
    }

    // Importar clientes en lote
    async importClients(importData) {
        try {
            const response = await fetch(`${this.baseUrl}/import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(importData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error importando clientes');
            }

            const result = await response.json();

            // Consultar ARCA para los clientes importados exitosamente
            if (result.success && result.imported.length > 0) {
                this.refreshMultipleClientsData(result.imported.map(c => c.cuit));
            }

            return result;

        } catch (error) {
            console.error('Error importing clients:', error);
            throw error;
        }
    }

    // Actualizar datos de ARCA para un cliente
    async refreshClientData(cuit) {
        try {
            await this.initializeMCP();

            // Consultar estado fiscal en ARCA via MCP
            const arcaData = await this.queryARCA(cuit);

            // Actualizar cliente con nuevos datos
            const response = await fetch(`${this.baseUrl}/refresh/${cuit}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(arcaData)
            });

            if (!response.ok) {
                throw new Error('Error actualizando datos del cliente');
            }

            return await response.json();

        } catch (error) {
            console.error('Error refreshing client data:', error);
            throw error;
        }
    }

    // Buscar cliente por CUIT
    async searchByCuit(cuit) {
        try {
            const response = await fetch(`${this.baseUrl}/search/${cuit}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error('Error buscando cliente');
            }

            return await response.json();

        } catch (error) {
            console.error('Error searching client:', error);
            throw error;
        }
    }

    // Obtener facturas de un cliente
    async getClientInvoices(clientId, options = {}) {
        try {
            const queryParams = new URLSearchParams({
                page: options.page || 1,
                limit: options.limit || 20,
                status: options.status || 'all',
                dateFrom: options.dateFrom || '',
                dateTo: options.dateTo || ''
            });

            const response = await fetch(`${this.baseUrl}/${clientId}/invoices?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Error obteniendo facturas del cliente');
            }

            return await response.json();

        } catch (error) {
            console.error('Error getting client invoices:', error);
            throw error;
        }
    }

    // Obtener estadísticas de compliance
    async getComplianceStats() {
        try {
            const response = await fetch(`${this.baseUrl}/compliance/stats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Error obteniendo estadísticas de compliance');
            }

            return await response.json();

        } catch (error) {
            console.error('Error getting compliance stats:', error);
            throw error;
        }
    }

    // Obtener métricas generales
    async getMetrics() {
        try {
            const response = await fetch(`${this.baseUrl}/metrics`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Error obteniendo métricas');
            }

            return await response.json();

        } catch (error) {
            console.error('Error getting metrics:', error);
            throw error;
        }
    }

    // Exportar clientes
    async exportClients(format = 'csv', filters = {}) {
        try {
            const queryParams = new URLSearchParams({
                format,
                ...filters
            });

            const response = await fetch(`${this.baseUrl}/export?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Accept': format === 'csv' ? 'text/csv' : 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Error exportando clientes');
            }

            if (format === 'csv') {
                const blob = await response.blob();
                return URL.createObjectURL(blob);
            }

            return await response.json();

        } catch (error) {
            console.error('Error exporting clients:', error);
            throw error;
        }
    }

    // Consultar ARCA via MCP
    async queryARCA(cuit) {
        try {
            const mcpClient = await this.initializeMCP();

            // Usar el servicio MCP de ARCA
            const result = await mcpClient.callTool('arca_query', {
                cuit: cuit,
                queries: [
                    'estado_fiscal',
                    'regimen_iva',
                    'monotributo',
                    'ganancias',
                    'seguridad_social'
                ]
            });

            return this.processARCAResponse(result);

        } catch (error) {
            console.error('Error querying ARCA:', error);

            // Devolver datos por defecto si falla ARCA
            return {
                arcaStatus: 'unknown',
                ivaStatus: 'No disponible',
                monotributoStatus: 'No disponible',
                gananciasStatus: 'No disponible',
                socialSecurityStatus: 'No disponible',
                lastARCACheck: new Date().toISOString(),
                arcaError: error.message
            };
        }
    }

    // Procesar respuesta de ARCA
    processARCAResponse(arcaResult) {
        const data = arcaResult.data || {};

        return {
            arcaStatus: this.determineARCAStatus(data),
            ivaStatus: data.regimen_iva || 'No disponible',
            monotributoStatus: data.monotributo || 'No disponible',
            gananciasStatus: data.ganancias || 'No disponible',
            socialSecurityStatus: data.seguridad_social || 'No disponible',
            lastARCACheck: new Date().toISOString(),
            arcaDetails: data
        };
    }

    // Determinar estado general de ARCA
    determineARCAStatus(arcaData) {
        if (!arcaData || Object.keys(arcaData).length === 0) {
            return 'unknown';
        }

        const hasProblems = Object.values(arcaData).some(status =>
            status && (
                status.toLowerCase().includes('inactivo') ||
                status.toLowerCase().includes('error') ||
                status.toLowerCase().includes('suspendido')
            )
        );

        const hasWarnings = Object.values(arcaData).some(status =>
            status && (
                status.toLowerCase().includes('pendiente') ||
                status.toLowerCase().includes('vencido')
            )
        );

        if (hasProblems) return 'red';
        if (hasWarnings) return 'yellow';
        return 'green';
    }

    // Normalizar estado de compliance
    normalizeComplianceStatus(client) {
        if (!client) return 'unknown';

        const arcaStatus = this.normalizeArcaStatus(client);

        // Si hay problemas en ARCA, compliance es problemático
        if (arcaStatus === 'red') return 'non_compliant';
        if (arcaStatus === 'yellow') return 'partial';
        if (arcaStatus === 'green') return 'compliant';

        return 'pending';
    }

    // Normalizar estado de ARCA
    normalizeArcaStatus(client) {
        if (client.arcaStatus) {
            // Ya está normalizado
            return client.arcaStatus;
        }

        // Inferir del estado fiscal
        const statuses = [
            client.ivaStatus,
            client.monotributoStatus,
            client.gananciasStatus,
            client.socialSecurityStatus
        ].filter(Boolean);

        if (statuses.length === 0) return 'unknown';

        const hasProblems = statuses.some(status =>
            status.toLowerCase().includes('inactivo') ||
            status.toLowerCase().includes('error') ||
            status.toLowerCase().includes('suspendido')
        );

        const hasWarnings = statuses.some(status =>
            status.toLowerCase().includes('pendiente') ||
            status.toLowerCase().includes('vencido')
        );

        if (hasProblems) return 'red';
        if (hasWarnings) return 'yellow';
        return 'green';
    }

    // Validar datos del cliente
    validateClientData(clientData) {
        if (!clientData.cuit) {
            throw new Error('CUIT es requerido');
        }

        if (!this.validateCuit(clientData.cuit)) {
            throw new Error('CUIT inválido');
        }

        if (!clientData.businessName || clientData.businessName.trim().length === 0) {
            throw new Error('Razón social es requerida');
        }

        if (clientData.email && !this.validateEmail(clientData.email)) {
            throw new Error('Email inválido');
        }
    }

    // Validar CUIT
    validateCuit(cuit) {
        if (!cuit) return false;

        const cleanCuit = cuit.replace(/[^\d]/g, '');
        if (cleanCuit.length !== 11) return false;

        const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        let sum = 0;

        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCuit[i]) * multipliers[i];
        }

        const remainder = sum % 11;
        const expectedDigit = remainder < 2 ? remainder : 11 - remainder;

        return parseInt(cleanCuit[10]) === expectedDigit;
    }

    // Validar email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Calcular métricas
    calculateMetrics(clients) {
        const total = clients.length;
        const compliant = clients.filter(c => c.complianceStatus === 'compliant').length;
        const nonCompliant = clients.filter(c => c.complianceStatus === 'non_compliant').length;
        const pending = clients.filter(c => c.complianceStatus === 'pending' || c.complianceStatus === 'partial').length;

        return {
            totalClients: total,
            compliantClients: compliant,
            nonCompliantClients: nonCompliant,
            pendingClients: pending,
            lastUpdate: new Date().toISOString()
        };
    }

    // Actualizar múltiples clientes (para importación)
    async refreshMultipleClientsData(cuits) {
        const promises = cuits.map(cuit =>
            this.refreshClientData(cuit).catch(error => {
                console.warn(`Error refreshing ${cuit}:`, error);
                return null;
            })
        );

        return Promise.allSettled(promises);
    }

    // Datos de prueba para desarrollo
    getMockClients(params = {}) {
        const mockClients = [
            {
                id: 1,
                cuit: '20-12345678-9',
                businessName: 'Empresa Ejemplo SRL',
                email: 'contacto@ejemplo.com',
                phone: '11-1234-5678',
                address: 'Av. Corrientes 1234, CABA',
                category: 'Servicios',
                arcaStatus: 'green',
                complianceStatus: 'compliant',
                ivaStatus: 'Responsable Inscripto',
                monotributoStatus: 'No aplica',
                gananciasStatus: 'Activo',
                socialSecurityStatus: 'Al día',
                lastUpdate: '2025-01-20T10:00:00Z',
                invoiceStats: { total: 15, pending: 2, errors: 0 }
            },
            {
                id: 2,
                cuit: '27-87654321-3',
                businessName: 'Consultora ABC SA',
                email: 'info@consultoraabc.com',
                phone: '11-8765-4321',
                address: 'Av. Santa Fe 5678, CABA',
                category: 'Consultoría',
                arcaStatus: 'yellow',
                complianceStatus: 'partial',
                ivaStatus: 'Responsable Inscripto',
                monotributoStatus: 'No aplica',
                gananciasStatus: 'Pendiente',
                socialSecurityStatus: 'Al día',
                lastUpdate: '2025-01-19T15:30:00Z',
                invoiceStats: { total: 8, pending: 1, errors: 1 }
            },
            {
                id: 3,
                cuit: '30-55555555-5',
                businessName: 'Servicios Integrales SRL',
                email: 'admin@servicios.com',
                phone: '11-5555-5555',
                address: 'Av. Rivadavia 9876, CABA',
                category: 'Servicios',
                arcaStatus: 'red',
                complianceStatus: 'non_compliant',
                ivaStatus: 'Responsable Inscripto',
                monotributoStatus: 'No aplica',
                gananciasStatus: 'Inactivo',
                socialSecurityStatus: 'Deuda',
                lastUpdate: '2025-01-18T09:15:00Z',
                invoiceStats: { total: 3, pending: 0, errors: 2 }
            }
        ];

        // Filtrar según parámetros
        let filteredClients = mockClients;

        if (params.search) {
            const search = params.search.toLowerCase();
            filteredClients = filteredClients.filter(client =>
                client.businessName.toLowerCase().includes(search) ||
                client.cuit.includes(search)
            );
        }

        if (params.status !== 'all') {
            filteredClients = filteredClients.filter(client =>
                client.status === params.status
            );
        }

        if (params.compliance !== 'all') {
            filteredClients = filteredClients.filter(client =>
                client.complianceStatus === params.compliance
            );
        }

        return {
            clients: filteredClients,
            total: filteredClients.length,
            totalPages: 1,
            metrics: this.calculateMetrics(filteredClients)
        };
    }
}

// Crear instancia singleton
export const contributorsService = new ContributorsService();

export default contributorsService;