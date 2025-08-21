/**
 * FECAE Solicitar Tool - Autorización de comprobantes electrónicos CAE
 * Implementa el método FECAESolicitar de WSFEV1
 */

import { Logger } from '../../../utils/logger.js';

const logger = new Logger('FECAESolicitarTool');

export class FECAESolicitarTool {
    constructor(arcaService, validationService) {
        this.arcaService = arcaService;
        this.validationService = validationService;
        this.name = 'arca_fecae_solicitar';
    }

    /**
     * Get tool definitions for MCP registration
     */
    getToolDefinitions() {
        return [{
            name: this.name,
            description: 'Solicita autorización CAE para comprobantes electrónicos en ARCA/AFIP',
            inputSchema: {
                type: 'object',
                properties: {
                    FeCAEReq: {
                        type: 'object',
                        description: 'Request completo para autorización CAE',
                        properties: {
                            FeCabReq: {
                                type: 'object',
                                description: 'Cabecera del request',
                                properties: {
                                    CantReg: {
                                        type: 'integer',
                                        description: 'Cantidad de registros',
                                        minimum: 1,
                                        maximum: 250
                                    },
                                    PtoVta: {
                                        type: 'integer',
                                        description: 'Punto de venta',
                                        minimum: 1,
                                        maximum: 99999
                                    },
                                    CbteTipo: {
                                        type: 'integer',
                                        description: 'Tipo de comprobante',
                                        enum: [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 15, 19, 20, 21]
                                    }
                                },
                                required: ['CantReg', 'PtoVta', 'CbteTipo']
                            },
                            FeDetReq: {
                                type: 'array',
                                description: 'Detalle de comprobantes',
                                minItems: 1,
                                maxItems: 250,
                                items: {
                                    type: 'object',
                                    properties: {
                                        Concepto: {
                                            type: 'integer',
                                            description: '1=Productos, 2=Servicios, 3=Productos y Servicios',
                                            enum: [1, 2, 3]
                                        },
                                        DocTipo: {
                                            type: 'integer',
                                            description: 'Tipo de documento del receptor',
                                            enum: [80, 86, 87, 89, 90, 91, 92, 93, 94, 95, 96, 99]
                                        },
                                        DocNro: {
                                            type: 'string',
                                            description: 'Número de documento del receptor',
                                            maxLength: 20
                                        },
                                        CbteDesde: {
                                            type: 'integer',
                                            description: 'Número de comprobante desde',
                                            minimum: 1
                                        },
                                        CbteHasta: {
                                            type: 'integer',
                                            description: 'Número de comprobante hasta',
                                            minimum: 1
                                        },
                                        CbteFch: {
                                            type: 'string',
                                            description: 'Fecha del comprobante (YYYYMMDD)',
                                            pattern: '^\\d{8}$'
                                        },
                                        ImpTotal: {
                                            type: 'number',
                                            description: 'Importe total del comprobante',
                                            minimum: 0,
                                            maximum: 999999999.99
                                        },
                                        ImpTotConc: {
                                            type: 'number',
                                            description: 'Importe total conceptos no gravados',
                                            minimum: 0,
                                            default: 0
                                        },
                                        ImpNeto: {
                                            type: 'number',
                                            description: 'Importe neto gravado',
                                            minimum: 0
                                        },
                                        ImpOpEx: {
                                            type: 'number',
                                            description: 'Importe operaciones exentas',
                                            minimum: 0,
                                            default: 0
                                        },
                                        ImpTrib: {
                                            type: 'number',
                                            description: 'Importe tributos',
                                            minimum: 0,
                                            default: 0
                                        },
                                        ImpIVA: {
                                            type: 'number',
                                            description: 'Importe IVA',
                                            minimum: 0
                                        },
                                        MonId: {
                                            type: 'string',
                                            description: 'Código de moneda',
                                            minLength: 3,
                                            maxLength: 3,
                                            default: 'PES'
                                        },
                                        MonCotiz: {
                                            type: 'number',
                                            description: 'Cotización de moneda',
                                            minimum: 0.01,
                                            default: 1
                                        },
                                        Iva: {
                                            type: 'array',
                                            description: 'Array de alícuotas de IVA',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    Id: {
                                                        type: 'integer',
                                                        description: 'ID de alícuota IVA',
                                                        enum: [3, 4, 5, 6, 8, 9]
                                                    },
                                                    BaseImp: {
                                                        type: 'number',
                                                        description: 'Base imponible',
                                                        minimum: 0
                                                    },
                                                    Importe: {
                                                        type: 'number',
                                                        description: 'Importe de IVA',
                                                        minimum: 0
                                                    }
                                                },
                                                required: ['Id', 'BaseImp', 'Importe']
                                            }
                                        },
                                        Tributos: {
                                            type: 'array',
                                            description: 'Array de tributos',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    Id: {
                                                        type: 'integer',
                                                        description: 'ID del tributo',
                                                        minimum: 1
                                                    },
                                                    Desc: {
                                                        type: 'string',
                                                        description: 'Descripción del tributo',
                                                        maxLength: 100
                                                    },
                                                    BaseImp: {
                                                        type: 'number',
                                                        description: 'Base imponible del tributo',
                                                        minimum: 0
                                                    },
                                                    Alic: {
                                                        type: 'number',
                                                        description: 'Alícuota del tributo',
                                                        minimum: 0
                                                    },
                                                    Importe: {
                                                        type: 'number',
                                                        description: 'Importe del tributo',
                                                        minimum: 0
                                                    }
                                                },
                                                required: ['Id', 'Desc', 'BaseImp', 'Alic', 'Importe']
                                            }
                                        }
                                    },
                                    required: [
                                        'Concepto', 'DocTipo', 'DocNro', 'CbteDesde', 'CbteHasta',
                                        'CbteFch', 'ImpTotal', 'ImpNeto', 'ImpIVA', 'MonId', 'MonCotiz'
                                    ]
                                }
                            }
                        },
                        required: ['FeCabReq', 'FeDetReq']
                    }
                },
                required: ['FeCAEReq']
            }
        }];
    }

    /**
     * Execute the FECAE Solicitar tool
     */
    async execute(args) {
        try {
            logger.info('Executing FECAE Solicitar', {
                cantReg: args.FeCAEReq?.FeCabReq?.CantReg,
                ptoVta: args.FeCAEReq?.FeCabReq?.PtoVta,
                cbteTipo: args.FeCAEReq?.FeCabReq?.CbteTipo
            });

            // Sanitize input
            const sanitizedArgs = this.validationService.sanitizeInput(args);

            // Validate request
            const validation = this.validationService.validateFECAERequest(sanitizedArgs);
            if (!validation.valid) {
                logger.error('FECAE request validation failed', { errors: validation.errors });
                return {
                    content: [{
                        type: 'text',
                        text: `❌ **Error de Validación**\n\nLos siguientes errores fueron encontrados:\n\n${validation.errors.map(e => `• ${e}`).join('\n')}\n\nPor favor corrige estos errores y vuelve a intentar.`
                    }],
                    isError: true
                };
            }

            // Execute CAE request
            const response = await this.arcaService.solicitarCAE(sanitizedArgs);

            // Format response
            return this.formatResponse(response, sanitizedArgs.FeCAEReq.FeCabReq);

        } catch (error) {
            logger.error('FECAE Solicitar execution failed', {
                error: error.message,
                stack: error.stack
            });

            return {
                content: [{
                    type: 'text',
                    text: `❌ **Error en Solicitud CAE**\n\n**Error:** ${error.message}\n\n**Recomendaciones:**\n• Verifica tu conectividad con ARCA\n• Confirma que tus certificados sean válidos\n• Revisa que el CUIT esté habilitado para facturación electrónica\n• Consulta los logs del sistema para más detalles`
                }],
                isError: true
            };
        }
    }

    /**
     * Format FECAE response for MCP
     */
    formatResponse(response, cabecera) {
        const { FeCabResp, FeDetResp, Errors } = response;

        // Check for errors
        if (Errors && Errors.length > 0) {
            const errorText = Errors.map(err => `• **${err.Code}:** ${err.Msg}`).join('\n');
            return {
                content: [{
                    type: 'text',
                    text: `❌ **Errores en Autorización CAE**\n\n${errorText}\n\n**Información del Request:**\n• Punto de Venta: ${cabecera.PtoVta}\n• Tipo de Comprobante: ${cabecera.CbteTipo}\n• Cantidad de Registros: ${cabecera.CantReg}`
                }],
                isError: true
            };
        }

        // Success response
        let responseText = `✅ **Autorización CAE Exitosa**\n\n`;

        // Header information
        responseText += `**Información General:**\n`;
        responseText += `• CUIT: ${FeCabResp.Cuit}\n`;
        responseText += `• Punto de Venta: ${FeCabResp.PtoVta}\n`;
        responseText += `• Tipo de Comprobante: ${FeCabResp.CbteTipo}\n`;
        responseText += `• Fecha de Proceso: ${this.formatDate(FeCabResp.FchProceso)}\n`;
        responseText += `• Cantidad de Registros: ${FeCabResp.CantReg}\n`;
        responseText += `• Resultado: ${FeCabResp.Resultado}\n\n`;

        // Detail information
        if (FeDetResp && FeDetResp.length > 0) {
            responseText += `**Comprobantes Autorizados:**\n\n`;

            FeDetResp.forEach((detalle, index) => {
                responseText += `**Comprobante ${index + 1}:**\n`;
                responseText += `• Desde: ${detalle.CbteDesde} - Hasta: ${detalle.CbteHasta}\n`;
                responseText += `• Fecha: ${this.formatDate(detalle.CbteFch)}\n`;
                responseText += `• Documento: ${detalle.DocTipo} - ${detalle.DocNro}\n`;
                responseText += `• Resultado: ${detalle.Resultado}\n`;

                if (detalle.CAE) {
                    responseText += `• **CAE: ${detalle.CAE}**\n`;
                    responseText += `• **Vencimiento CAE: ${this.formatDate(detalle.CAEFchVto)}**\n`;
                }

                // Observaciones
                if (detalle.Observaciones && detalle.Observaciones.length > 0) {
                    responseText += `• **Observaciones:**\n`;
                    detalle.Observaciones.forEach(obs => {
                        responseText += `  - ${obs.Code}: ${obs.Msg}\n`;
                    });
                }

                responseText += `\n`;
            });
        }

        // Summary for multiple invoices
        const totalCAEs = FeDetResp?.filter(d => d.CAE).length || 0;
        const totalObservaciones = FeDetResp?.reduce((acc, d) => acc + (d.Observaciones?.length || 0), 0) || 0;

        responseText += `**Resumen:**\n`;
        responseText += `• Total Comprobantes Procesados: ${FeDetResp?.length || 0}\n`;
        responseText += `• CAEs Otorgados: ${totalCAEs}\n`;
        if (totalObservaciones > 0) {
            responseText += `• Total Observaciones: ${totalObservaciones}\n`;
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

    /**
     * Get usage examples for documentation
     */
    getUsageExamples() {
        return [
            {
                title: "Factura Simple - Tipo A",
                description: "Ejemplo de factura tipo A con IVA 21%",
                request: {
                    FeCAEReq: {
                        FeCabReq: {
                            CantReg: 1,
                            PtoVta: 1,
                            CbteTipo: 1
                        },
                        FeDetReq: [{
                            Concepto: 1,
                            DocTipo: 80,
                            DocNro: "20123456789",
                            CbteDesde: 1,
                            CbteHasta: 1,
                            CbteFch: "20241225",
                            ImpTotal: 121.00,
                            ImpTotConc: 0,
                            ImpNeto: 100.00,
                            ImpOpEx: 0,
                            ImpTrib: 0,
                            ImpIVA: 21.00,
                            MonId: "PES",
                            MonCotiz: 1,
                            Iva: [{
                                Id: 5,
                                BaseImp: 100.00,
                                Importe: 21.00
                            }]
                        }]
                    }
                }
            },
            {
                title: "Factura con Múltiples Alícuotas",
                description: "Factura con IVA 21% y 10.5%",
                request: {
                    FeCAEReq: {
                        FeCabReq: {
                            CantReg: 1,
                            PtoVta: 1,
                            CbteTipo: 1
                        },
                        FeDetReq: [{
                            Concepto: 1,
                            DocTipo: 80,
                            DocNro: "20123456789",
                            CbteDesde: 2,
                            CbteHasta: 2,
                            CbteFch: "20241225",
                            ImpTotal: 131.50,
                            ImpTotConc: 0,
                            ImpNeto: 120.00,
                            ImpOpEx: 0,
                            ImpTrib: 0,
                            ImpIVA: 11.50,
                            MonId: "PES",
                            MonCotiz: 1,
                            Iva: [{
                                Id: 5, // 21%
                                BaseImp: 50.00,
                                Importe: 10.50
                            }, {
                                Id: 4, // 10.5%
                                BaseImp: 70.00,
                                Importe: 7.35
                            }]
                        }]
                    }
                }
            },
            {
                title: "Lote de Facturas",
                description: "Procesamiento de múltiples facturas en un lote",
                request: {
                    FeCAEReq: {
                        FeCabReq: {
                            CantReg: 2,
                            PtoVta: 1,
                            CbteTipo: 6
                        },
                        FeDetReq: [{
                            Concepto: 1,
                            DocTipo: 96,
                            DocNro: "12345678",
                            CbteDesde: 1,
                            CbteHasta: 1,
                            CbteFch: "20241225",
                            ImpTotal: 100.00,
                            ImpTotConc: 0,
                            ImpNeto: 100.00,
                            ImpOpEx: 0,
                            ImpTrib: 0,
                            ImpIVA: 0,
                            MonId: "PES",
                            MonCotiz: 1
                        }, {
                            Concepto: 2,
                            DocTipo: 96,
                            DocNro: "87654321",
                            CbteDesde: 2,
                            CbteHasta: 2,
                            CbteFch: "20241225",
                            ImpTotal: 200.00,
                            ImpTotConc: 0,
                            ImpNeto: 200.00,
                            ImpOpEx: 0,
                            ImpTrib: 0,
                            ImpIVA: 0,
                            MonId: "PES",
                            MonCotiz: 1
                        }]
                    }
                }
            }
        ];
    }
}