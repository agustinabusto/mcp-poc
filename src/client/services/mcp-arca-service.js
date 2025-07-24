// src/client/services/mcp-arca-service.js
/**
 * Servicio especializado para integración con ARCA usando MCP
 */

import { getMCPClient } from './mcp-client.js';

class MCPArcaService {
    constructor() {
        this.mcpClient = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            this.mcpClient = await getMCPClient();
            this.initialized = true;
            console.log('✅ MCP ARCA Service inicializado');
        } catch (error) {
            console.error('❌ Error inicializando MCP ARCA Service:', error);
            throw error;
        }
    }

    /**
     * Envía una factura a ARCA usando el protocolo MCP
     */
    async sendInvoiceToArca(invoiceData) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Formatear datos según protocolo ARCA
            const arcaPayload = this.formatInvoiceForArca(invoiceData);

            // Llamar herramienta MCP para envío a ARCA
            const result = await this.mcpClient.callTool('send_to_arca', {
                ...arcaPayload,
                timestamp: new Date().toISOString()
            });

            return {
                success: true,
                arcaId: result.arcaId,
                message: result.message,
                timestamp: result.timestamp,
                status: 'Enviado'
            };

        } catch (error) {
            console.error('Error enviando factura a ARCA:', error);
            throw new Error(`Error en envío a ARCA: ${error.message}`);
        }
    }

    /**
     * Procesa un lote de facturas para envío a ARCA
     */
    async sendBatchToArca(invoices) {
        if (!this.initialized) {
            await this.initialize();
        }

        const results = [];
        const errors = [];

        for (const invoice of invoices) {
            try {
                const result = await this.sendInvoiceToArca(invoice);
                results.push({
                    invoiceId: invoice.id,
                    ...result
                });
            } catch (error) {
                errors.push({
                    invoiceId: invoice.id,
                    error: error.message
                });
            }
        }

        return {
            success: results.length,
            errors: errors.length,
            results,
            errors
        };
    }

    /**
     * Formatea una factura según las especificaciones de ARCA
     */
    formatInvoiceForArca(invoice) {
        return {
            // Campos requeridos por ARCA
            Auth: {
                Token: process.env.ARCA_TOKEN || 'test_token',
                Sign: this.generateSign(invoice),
                Cuit: invoice.cuit.replace(/[-]/g, '') // Remover guiones
            },
            Cmp: {
                Id: this.generateRequestId(),
                Tipo_doc: this.mapInvoiceType(invoice.type),
                Nro_doc: invoice.businessName,
                Tipo_cbte: this.mapInvoiceType(invoice.type),
                Punto_vta: this.extractPuntoVenta(invoice.number),
                Cbte_nro: this.extractInvoiceNumber(invoice.number),
                Imp_total: parseFloat(invoice.total),
                Imp_tot_conc: 0, // Conceptos no gravados
                Imp_neto: this.calculateNetAmount(invoice.total, invoice.type),
                Impto_liq: this.calculateTax(invoice.total, invoice.type),
                Impto_liq_rni: 0,
                Imp_op_ex: 0,
                Imp_perc: 0,
                Imp_iibb: 0,
                Imp_perc_mun: 0,
                Imp_internos: 0,
                Imp_moneda_Id: 'PES', // Pesos argentinos
                Imp_moneda_ctz: 1,
                Fecha_cbte: this.formatDateForArca(invoice.date),
                Fecha_vto_pago: this.formatDateForArca(invoice.date),
                CondicionIVAReceptorId: this.determineIVACondition(invoice.type),
                CanMisMonExt: '',
                Opcionales: []
            },
            Items: this.formatInvoiceItems(invoice)
        };
    }

    /**
     * Genera una firma para la autenticación con ARCA
     */
    generateSign(invoice) {
        // En producción, esto debe usar certificados digitales reales
        const data = `${invoice.cuit}${invoice.number}${invoice.total}`;
        return btoa(data); // Base64 simple para testing
    }

    /**
     * Genera un ID único para la solicitud
     */
    generateRequestId() {
        return Math.floor(Math.random() * 1000000000);
    }

    /**
     * Mapea tipos de factura del sistema interno a códigos ARCA
     */
    mapInvoiceType(type) {
        const mapping = {
            'A': 1,  // Factura A
            'B': 6,  // Factura B
            'C': 11  // Factura C
        };
        return mapping[type] || 1;
    }

    /**
     * Extrae el punto de venta del número de factura
     */
    extractPuntoVenta(invoiceNumber) {
        const parts = invoiceNumber.split('-');
        return parseInt(parts[0]) || 1;
    }

    /**
     * Extrae el número de comprobante del número de factura
     */
    extractInvoiceNumber(invoiceNumber) {
        const parts = invoiceNumber.split('-');
        return parseInt(parts[1]) || 1;
    }

    /**
     * Calcula el importe neto según el tipo de factura
     */
    calculateNetAmount(total, type) {
        if (type === 'A') {
            // Factura A: el total incluye IVA, calcular neto
            return parseFloat((total / 1.21).toFixed(2));
        }
        // Factura B y C: el total ya es el importe final
        return parseFloat(total);
    }

    /**
     * Calcula el IVA según el tipo de factura
     */
    calculateTax(total, type) {
        if (type === 'A') {
            const net = this.calculateNetAmount(total, type);
            return parseFloat((net * 0.21).toFixed(2));
        }
        return 0; // Facturas B y C no discriminan IVA
    }

    /**
     * Formatea fecha para ARCA (YYYYMMDD)
     */
    formatDateForArca(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    /**
     * Determina la condición de IVA del receptor
     */
    determineIVACondition(invoiceType) {
        // Simplificado: en producción se debe consultar AFIP
        return invoiceType === 'A' ? 1 : 5; // 1: IVA Responsable Inscripto, 5: Consumidor Final
    }

    /**
     * Formatea los ítems de la factura
     */
    formatInvoiceItems(invoice) {
        return [
            {
                Pro_codigo_ncm: '',
                Pro_codigo_sec: '',
                Pro_ds: invoice.description || 'Servicios profesionales',
                Pro_qty: 1,
                Pro_umed: 7, // Unidad
                Pro_precio_uni: this.calculateNetAmount(invoice.total, invoice.type),
                Imp_bonif: 0,
                Imp_total: parseFloat(invoice.total),
                Iva_id: this.getIVAId(invoice.type)
            }
        ];
    }

    /**
     * Obtiene el ID de IVA según el tipo de factura
     */
    getIVAId(type) {
        return type === 'A' ? 5 : 3; // 5: 21%, 3: 0%
    }

    /**
     * Consulta el estado de una factura en ARCA
     */
    async checkArcaStatus(invoiceId, arcaId) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const result = await this.mcpClient.callTool('check_arca_status', {
                invoiceId,
                arcaId
            });

            return result;
        } catch (error) {
            console.error('Error consultando estado en ARCA:', error);
            throw error;
        }
    }

    /**
     * Reenvía una factura a ARCA (en caso de error)
     */
    async resendToArca(invoice) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Marcar como reenvío
            const invoiceData = {
                ...invoice,
                isRetry: true,
                retryTimestamp: new Date().toISOString()
            };

            return await this.sendInvoiceToArca(invoiceData);
        } catch (error) {
            console.error('Error en reenvío a ARCA:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de envíos a ARCA
     */
    async getArcaStats() {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const result = await this.mcpClient.callTool('get_arca_stats');
            return result;
        } catch (error) {
            console.error('Error obteniendo estadísticas de ARCA:', error);
            throw error;
        }
    }

    /**
     * Valida una factura antes del envío a ARCA
     */
    validateInvoiceForArca(invoice) {
        const errors = [];

        // Validaciones requeridas
        if (!invoice.cuit || invoice.cuit.length < 11) {
            errors.push('CUIT inválido o faltante');
        }

        if (!invoice.businessName || invoice.businessName.trim().length === 0) {
            errors.push('Razón social requerida');
        }

        if (!invoice.number || !invoice.number.includes('-')) {
            errors.push('Número de factura inválido');
        }

        if (!invoice.total || isNaN(parseFloat(invoice.total)) || parseFloat(invoice.total) <= 0) {
            errors.push('Importe total inválido');
        }

        if (!invoice.date || isNaN(new Date(invoice.date).getTime())) {
            errors.push('Fecha inválida');
        }

        if (!['A', 'B', 'C'].includes(invoice.type)) {
            errors.push('Tipo de factura inválido');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Obtiene la configuración de ARCA desde el servidor MCP
     */
    async getArcaConfig() {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const result = await this.mcpClient.callTool('get_arca_config');
            return result;
        } catch (error) {
            console.error('Error obteniendo configuración de ARCA:', error);
            throw error;
        }
    }
}

// Instancia singleton
let mcpArcaServiceInstance = null;

export const getMCPArcaService = async () => {
    if (!mcpArcaServiceInstance) {
        mcpArcaServiceInstance = new MCPArcaService();
        await mcpArcaServiceInstance.initialize();
    }
    return mcpArcaServiceInstance;
};

export default MCPArcaService;