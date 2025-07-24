/**
 * FE Param Get Tool - Obtiene parámetros de configuración de ARCA/AFIP
 * Implementa los métodos FEParamGet* de WSFEV1
 */

import { Logger } from '../../../../utils/logger.js';

const logger = new Logger('FEParamGetTool');

export class FEParamGetTool {
    constructor(arcaService, cacheService) {
        this.arcaService = arcaService;
        this.cacheService = cacheService;
        this.methods = {
            'arca_fe_param_get_tipos_cbte': 'FEParamGetTiposCbte',
            'arca_fe_param_get_tipos_iva': 'FEParamGetTiposIva',
            'arca_fe_param_get_tipos_doc': 'FEParamGetTiposDoc',
            'arca_fe_param_get_tipos_monedas': 'FEParamGetTiposMonedas',
            'arca_fe_param_get_cotizacion': 'FEParamGetCotizacion',
            'arca_fe_param_get_puntos_venta': 'FEParamGetPtosVenta',
            'arca_fe_param_get_actividades': 'FEParamGetActividades'
        };
    }

    /**
     * Get tool definitions for MCP registration
     */
    getToolDefinitions() {
        return [
            {
                name: 'arca_fe_param_get_tipos_cbte',
                description: 'Obtiene los tipos de comprobantes válidos para facturación electrónica',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    additionalProperties: false
                }
            },
            {
                name: 'arca_fe_param_get_tipos_iva',
                description: 'Obtiene las alícuotas de IVA válidas',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    additionalProperties: false
                }
            },
            {
                name: 'arca_fe_param_get_tipos_doc',
                description: 'Obtiene los tipos de documentos válidos',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    additionalProperties: false
                }
            },
            {
                name: 'arca_fe_param_get_tipos_monedas',
                description: 'Obtiene las monedas válidas para facturación',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    additionalProperties: false
                }
            },
            {
                name: 'arca_fe_param_get_cotizacion',
                description: 'Obtiene la cotización de una moneda específica',
                inputSchema: {
                    type: 'object',
                    properties: {
                        MonId: {
                            type: 'string',
                            description: 'Código de moneda (ej: USD, EUR)',
                            minLength: 3,
                            maxLength: 3
                        }
                    },
                    required: ['MonId']
                }
            },
            {
                name: 'arca_fe_param_get_puntos_venta',
                description: 'Obtiene los puntos de venta habilitados para facturación electrónica',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    additionalProperties: false
                }
            },
            {
                name: 'arca_fe_param_get_actividades',
                description: 'Obtiene las actividades vigentes del contribuyente',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    additionalProperties: false
                }
            }
        ];
    }

    /**
     * Execute parameter retrieval tool
     */
    async execute(toolName, args = {}) {
        try {
            logger.info(`Executing FE parameter tool: ${toolName}`, { args });

            const methodName = this.methods[toolName];
            if (!methodName) {
                throw new Error(`Unknown parameter method: ${toolName}`);
            }

            // Get parameters from ARCA service
            const response = await this.arcaService.getParametros(methodName, args);

            // Format response based on tool type
            return this.formatResponse(toolName, response, args);

        } catch (error) {
            logger.error(`FE parameter tool execution failed: ${toolName}`, {
                error: error.message,
                args
            });

            return {
                content: [{
                    type: 'text',
                    text: `❌ **Error obteniendo parámetros**\n\n**Método:** ${toolName}\n**Error:** ${error.message}\n\n**Posibles causas:**\n• Problemas de conectividad con ARCA\n• Token de autenticación expirado\n• Servicio ARCA no disponible`
                }],
                isError: true
            };
        }
    }

    /**
     * Format response based on tool type
     */
    formatResponse(toolName, response, args) {
        const { ResultGet, Errors } = response;

        // Check for errors
        if (Errors && Errors.length > 0) {
            const errorText = Errors.map(err => `• **${err.Code}:** ${err.Msg}`).join('\n');
            return {
                content: [{
                    type: 'text',
                    text: `❌ **Error en consulta de parámetros**\n\n${errorText}`
                }],
                isError: true
            };
        }

        // Format based on specific tool
        switch (toolName) {
            case 'arca_fe_param_get_tipos_cbte':
                return this.formatTiposComprobante(ResultGet);

            case 'arca_fe_param_get_tipos_iva':
                return this.formatTiposIva(ResultGet);

            case 'arca_fe_param_get_tipos_doc':
                return this.formatTiposDocumento(ResultGet);

            case 'arca_fe_param_get_tipos_monedas':
                return this.formatTiposMonedas(ResultGet);

            case 'arca_fe_param_get_cotizacion':
                return this.formatCotizacion(ResultGet, args.MonId);

            case 'arca_fe_param_get_puntos_venta':
                return this.formatPuntosVenta(ResultGet);

            case 'arca_fe_param_get_actividades':
                return this.formatActividades(ResultGet);

            default:
                return this.formatGeneric(toolName, ResultGet);
        }
    }

    /**
     * Format tipos de comprobante
     */
    formatTiposComprobante(data) {
        if (!data || !Array.isArray(data)) {
            return {
                content: [{
                    type: 'text',
                    text: '⚠️ **No se encontraron tipos de comprobantes**'
                }]
            };
        }

        let responseText = `📄 **Tipos de Comprobantes Disponibles**\n\n`;
        responseText += `Total encontrados: ${data.length}\n\n`;

        // Group by common types
        const facturas = data.filter(item => item.Desc?.toLowerCase().includes('factura'));
        const notasCredito = data.filter(item => item.Desc?.toLowerCase().includes('nota') && item.Desc?.toLowerCase().includes('crédito'));
        const notasDebito = data.filter(item => item.Desc?.toLowerCase().includes('nota') && item.Desc?.toLowerCase().includes('débito'));
        const otros = data.filter(item =>
            !item.Desc?.toLowerCase().includes('factura') &&
            !item.Desc?.toLowerCase().includes('nota')
        );

        if (facturas.length > 0) {
            responseText += `**📋 Facturas:**\n`;
            facturas.forEach(item => {
                responseText += `• **${item.Id}** - ${item.Desc}\n`;
            });
            responseText += `\n`;
        }

        if (notasCredito.length > 0) {
            responseText += `**💰 Notas de Crédito:**\n`;
            notasCredito.forEach(item => {
                responseText += `• **${item.Id}** - ${item.Desc}\n`;
            });
            responseText += `\n`;
        }

        if (notasDebito.length > 0) {
            responseText += `**📈 Notas de Débito:**\n`;
            notasDebito.forEach(item => {
                responseText += `• **${item.Id}** - ${item.Desc}\n`;
            });
            responseText += `\n`;
        }

        if (otros.length > 0) {
            responseText += `**📝 Otros Comprobantes:**\n`;
            otros.forEach(item => {
                responseText += `• **${item.Id}** - ${item.Desc}\n`;
            });
        }

        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    }

    /**
     * Format tipos de IVA
     */
    formatTiposIva(data) {
        if (!data || !Array.isArray(data)) {
            return {
                content: [{
                    type: 'text',
                    text: '⚠️ **No se encontraron alícuotas de IVA**'
                }]
            };
        }

        let responseText = `💹 **Alícuotas de IVA Disponibles**\n\n`;
        responseText += `Total encontradas: ${data.length}\n\n`;

        data.forEach(item => {
            responseText += `• **${item.Id}** - ${item.Desc}`;
            if (item.FchDesde) {
                responseText += ` (Vigente desde: ${this.formatDate(item.FchDesde)})`;
            }
            responseText += `\n`;
        });

        responseText += `\n**Alícuotas más comunes:**\n`;
        responseText += `• **5** - 21% (Alícuota general)\n`;
        responseText += `• **4** - 10.5% (Alícuota reducida)\n`;
        responseText += `• **6** - 27% (Alícuota especial)\n`;
        responseText += `• **8** - 5% (Alícuota mínima)\n`;
        responseText += `• **9** - 2.5% (Alícuota específica)\n`;

        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    }

    /**
     * Format tipos de documento
     */
    formatTiposDocumento(data) {
        if (!data || !Array.isArray(data)) {
            return {
                content: [{
                    type: 'text',
                    text: '⚠️ **No se encontraron tipos de documentos**'
                }]
            };
        }

        let responseText = `🆔 **Tipos de Documentos Válidos**\n\n`;
        responseText += `Total encontrados: ${data.length}\n\n`;

        // Group by common types
        const principales = data.filter(item => [80, 86, 87, 96].includes(parseInt(item.Id)));
        const otros = data.filter(item => ![80, 86, 87, 96].includes(parseInt(item.Id)));

        if (principales.length > 0) {
            responseText += `**📋 Documentos Principales:**\n`;
            principales.forEach(item => {
                let emoji = '';
                switch (parseInt(item.Id)) {
                    case 80: emoji = '🏢'; break;
                    case 86: emoji = '👤'; break;
                    case 87: emoji = '🌍'; break;
                    case 96: emoji = '📄'; break;
                }
                responseText += `• **${item.Id}** ${emoji} - ${item.Desc}\n`;
            });
            responseText += `\n`;
        }

        if (otros.length > 0) {
            responseText += `**📝 Otros Documentos:**\n`;
            otros.forEach(item => {
                responseText += `• **${item.Id}** - ${item.Desc}\n`;
            });
        }

        responseText += `\n**Documentos más utilizados:**\n`;
        responseText += `• **80** - CUIT (Personas jurídicas)\n`;
        responseText += `• **86** - CUIL (Personas físicas)\n`;
        responseText += `• **87** - CDI (Extranjeros)\n`;
        responseText += `• **96** - DNI (Consumidor final)\n`;

        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    }

    /**
     * Format tipos de monedas
     */
    formatTiposMonedas(data) {
        if (!data || !Array.isArray(data)) {
            return {
                content: [{
                    type: 'text',
                    text: '⚠️ **No se encontraron tipos de monedas**'
                }]
            };
        }

        let responseText = `💱 **Monedas Disponibles para Facturación**\n\n`;
        responseText += `Total encontradas: ${data.length}\n\n`;

        // Separate peso from foreign currencies
        const peso = data.filter(item => item.Id === 'PES');
        const extranjeras = data.filter(item => item.Id !== 'PES').sort((a, b) => a.Id.localeCompare(b.Id));

        if (peso.length > 0) {
            responseText += `**💰 Moneda Nacional:**\n`;
            peso.forEach(item => {
                responseText += `• **${item.Id}** - ${item.Desc}`;
                if (item.FchDesde) {
                    responseText += ` (Vigente desde: ${this.formatDate(item.FchDesde)})`;
                }
                responseText += `\n`;
            });
            responseText += `\n`;
        }

        if (extranjeras.length > 0) {
            responseText += `**🌍 Monedas Extranjeras:**\n`;
            extranjeras.forEach(item => {
                responseText += `• **${item.Id}** - ${item.Desc}`;
                if (item.FchDesde) {
                    responseText += ` (Vigente desde: ${this.formatDate(item.FchDesde)})`;
                }
                responseText += `\n`;
            });
        }

        responseText += `\n**Nota:** Para monedas extranjeras, debes obtener la cotización usando \`arca_fe_param_get_cotizacion\``;

        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    }

    /**
     * Format cotización de moneda
     */
    formatCotizacion(data, monId) {
        if (!data) {
            return {
                content: [{
                    type: 'text',
                    text: `⚠️ **No se encontró cotización para la moneda: ${monId}**`
                }]
            };
        }

        let responseText = `💱 **Cotización de Moneda**\n\n`;
        responseText += `**Moneda:** ${monId}\n`;
        responseText += `**Cotización:** $${data.MonCotiz || 'No disponible'}\n`;

        if (data.FchCotiz) {
            responseText += `**Fecha de Cotización:** ${this.formatDate(data.FchCotiz)}\n`;
        }

        responseText += `\n**Importante:** Esta cotización es orientativa y debe usarse para la facturación electrónica.`;

        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    }

    /**
     * Format puntos de venta
     */
    formatPuntosVenta(data) {
        if (!data || !Array.isArray(data)) {
            return {
                content: [{
                    type: 'text',
                    text: '⚠️ **No se encontraron puntos de venta habilitados**'
                }]
            };
        }

        let responseText = `🏪 **Puntos de Venta Habilitados**\n\n`;
        responseText += `Total encontrados: ${data.length}\n\n`;

        data.forEach(item => {
            responseText += `• **Punto de Venta ${item.Nro}**`;
            if (item.EmisionTipo) {
                responseText += ` - Tipo: ${item.EmisionTipo}`;
            }
            if (item.Bloqueado) {
                responseText += ` ⚠️ (Bloqueado)`;
            }
            if (item.FchBaja) {
                responseText += ` 🚫 (Dado de baja: ${this.formatDate(item.FchBaja)})`;
            }
            responseText += `\n`;
        });

        const activos = data.filter(item => !item.Bloqueado && !item.FchBaja);
        responseText += `\n**Resumen:**\n`;
        responseText += `• Puntos de venta activos: ${activos.length}\n`;
        responseText += `• Total configurados: ${data.length}`;

        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    }

    /**
     * Format actividades del contribuyente
     */
    formatActividades(data) {
        if (!data || !Array.isArray(data)) {
            return {
                content: [{
                    type: 'text',
                    text: '⚠️ **No se encontraron actividades del contribuyente**'
                }]
            };
        }

        let responseText = `🏭 **Actividades del Contribuyente**\n\n`;
        responseText += `Total encontradas: ${data.length}\n\n`;

        data.forEach((item, index) => {
            responseText += `**${index + 1}.** Código: **${item.IdActividad}**\n`;
            responseText += `   Descripción: ${item.DescActividad}\n`;
            if (item.Nomenclador) {
                responseText += `   Nomenclador: ${item.Nomenclador}\n`;
            }
            if (item.Orden) {
                responseText += `   Orden: ${item.Orden}\n`;
            }
            responseText += `\n`;
        });

        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    }

    /**
     * Format generic response
     */
    formatGeneric(toolName, data) {
        let responseText = `📊 **Parámetros obtenidos - ${toolName}**\n\n`;

        if (Array.isArray(data)) {
            responseText += `Total de elementos: ${data.length}\n\n`;
            data.forEach((item, index) => {
                responseText += `**${index + 1}.** `;
                if (item.Id !== undefined) responseText += `ID: ${item.Id} - `;
                if (item.Desc) responseText += `${item.Desc}`;
                if (item.Descripcion) responseText += `${item.Descripcion}`;
                responseText += `\n`;
            });
        } else {
            responseText += JSON.stringify(data, null, 2);
        }

        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    }

    /**
     * Format date from YYYYMMDD to readable format
     */
    formatDate(dateStr) {
        if (!dateStr || dateStr.length !== 8) return dateStr;

        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);

        return `${day}/${month}/${year}`;
    }
}