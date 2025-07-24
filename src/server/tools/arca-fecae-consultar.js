/**
 * ARCA FECAE Consultar Tool - Consulta comprobantes electrónicos autorizados
 * Implementa el método FECompConsultar de WSFEV1
 */

export class ARCAFECAEConsultarTool {
    constructor({ arcaService, logger }) {
        this.name = 'arca_fecae_consultar';
        this.arcaService = arcaService;
        this.logger = logger;
    }

    getDefinition() {
        return {
            name: this.name,
            description: 'Consulta el estado y datos de un comprobante electrónico específico en ARCA/AFIP',
            inputSchema: {
                type: 'object',
                properties: {
                    CbteTipo: {
                        type: 'integer',
                        description: 'Tipo de comprobante a consultar',
                        minimum: 1,
                        maximum: 999
                    },
                    PtoVta: {
                        type: 'integer',
                        description: 'Punto de venta del comprobante',
                        minimum: 1,
                        maximum: 99999
                    },
                    CbteNro: {
                        type: 'integer',
                        description: 'Número del comprobante a consultar',
                        minimum: 1
                    }
                },
                required: ['CbteTipo', 'PtoVta', 'CbteNro']
            }
        };
    }

    async execute(args) {
        try {
            this.logger.info('Executing ARCA FECAE Consultar', {
                CbteTipo: args.CbteTipo,
                PtoVta: args.PtoVta,
                CbteNro: args.CbteNro
            });

            // Validar argumentos
            const validation = this.validateArgs(args);
            if (!validation.valid) {
                return {
                    content: [{
                        type: 'text',
                        text: `❌ **Error de Validación**\n\n${validation.errors.join('\n')}`
                    }],
                    isError: true
                };
            }

            // Consultar comprobante en ARCA
            const response = await this.arcaService.consultarComprobante(args);

            // Formatear respuesta
            return this.formatResponse(response, args);

        } catch (error) {
            this.logger.error('ARCA FECAE Consultar execution failed', {
                error: error.message,
                args
            });

            return {
                content: [{
                    type: 'text',
                    text: `❌ **Error en Consulta de Comprobante**\n\n**Error:** ${error.message}\n\n**Recomendaciones:**\n• Verifica que el comprobante exista\n• Confirma los datos del tipo, punto de venta y número\n• Revisa la conectividad con ARCA`
                }],
                isError: true
            };
        }
    }

    validateArgs(args) {
        const errors = [];

        if (!args.CbteTipo || args.CbteTipo <= 0) {
            errors.push('• CbteTipo debe ser un número mayor a 0');
        }

        if (!args.PtoVta || args.PtoVta <= 0 || args.PtoVta > 99999) {
            errors.push('• PtoVta debe estar entre 1 y 99999');
        }

        if (!args.CbteNro || args.CbteNro <= 0) {
            errors.push('• CbteNro debe ser un número mayor a 0');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    formatResponse(response, request) {
        const { ResultGet, Errors } = response;

        // Check for errors
        if (Errors && Errors.length > 0) {
            const errorText = Errors.map(err => `• **${err.Code}:** ${err.Msg}`).join('\n');
            return {
                content: [{
                    type: 'text',
                    text: `❌ **Errores en Consulta**\n\n${errorText}\n\n**Comprobante consultado:**\n• Tipo: ${request.CbteTipo}\n• Punto de Venta: ${request.PtoVta}\n• Número: ${request.CbteNro}`
                }],
                isError: true
            };
        }

        // Check if comprobante was found
        if (!ResultGet) {
            return {
                content: [{
                    type: 'text',
                    text: `⚠️ **Comprobante No Encontrado**\n\n**Datos consultados:**\n• Tipo: ${request.CbteTipo}\n• Punto de Venta: ${request.PtoVta}\n• Número: ${request.CbteNro}\n\n**Posibles causas:**\n• El comprobante no existe\n• Los datos están incorrectos\n• El comprobante pertenece a otro CUIT`
                }]
            };
        }

        // Success response with comprobante data
        let responseText = `✅ **Comprobante Encontrado**\n\n`;

        // Basic information
        responseText += `**Información General:**\n`;
        responseText += `• Tipo de Comprobante: ${request.CbteTipo}\n`;
        responseText += `• Punto de Venta: ${request.PtoVta}\n`;
        responseText += `• Número: ${request.CbteNro}\n`;
        responseText += `• Concepto: ${this.getConceptoDescription(ResultGet.Concepto)}\n`;
        responseText += `• Fecha: ${this.formatDate(ResultGet.CbteFch)}\n\n`;

        // Receptor information
        responseText += `**Datos del Receptor:**\n`;
        responseText += `• Tipo de Documento: ${ResultGet.DocTipo}\n`;
        responseText += `• Número de Documento: ${ResultGet.DocNro}\n\n`;

        // Amounts
        responseText += `**Importes:**\n`;
        responseText += `• **Importe Total: $${this.formatAmount(ResultGet.ImpTotal)}**\n`;

        if (ResultGet.ImpTotConc && ResultGet.ImpTotConc > 0) {
            responseText += `• No Gravado: $${this.formatAmount(ResultGet.ImpTotConc)}\n`;
        }
        if (ResultGet.ImpNeto && ResultGet.ImpNeto > 0) {
            responseText += `• Neto Gravado: $${this.formatAmount(ResultGet.ImpNeto)}\n`;
        }
        if (ResultGet.ImpOpEx && ResultGet.ImpOpEx > 0) {
            responseText += `• Operaciones Exentas: $${this.formatAmount(ResultGet.ImpOpEx)}\n`;
        }
        if (ResultGet.ImpTrib && ResultGet.ImpTrib > 0) {
            responseText += `• Tributos: $${this.formatAmount(ResultGet.ImpTrib)}\n`;
        }
        if (ResultGet.ImpIVA && ResultGet.ImpIVA > 0) {
            responseText += `• IVA: $${this.formatAmount(ResultGet.ImpIVA)}\n`;
        }

        responseText += `\n`;

        // CAE information
        if (ResultGet.CAE) {
            responseText += `**Información de Autorización:**\n`;
            responseText += `• **CAE: ${ResultGet.CAE}**\n`;
            responseText += `• **Vencimiento CAE: ${this.formatDate(ResultGet.CAEFchVto)}**\n`;
            responseText += `• Tipo de Emisión: ${ResultGet.EmisionTipo || 'CAE'}\n\n`;

            // CAE status
            const isExpired = this.isCAEExpired(ResultGet.CAEFchVto);
            if (isExpired) {
                responseText += `⚠️ **CAE VENCIDO** - Este comprobante tiene el CAE vencido\n\n`;
            } else {
                responseText += `✅ **CAE Válido** - El CAE está vigente\n\n`;
            }
        }

        // Currency information
        if (ResultGet.MonId && ResultGet.MonId !== 'PES') {
            responseText += `**Información de Moneda:**\n`;
            responseText += `• Moneda: ${ResultGet.MonId}\n`;
            if (ResultGet.MonCotiz) {
                responseText += `• Cotización: ${ResultGet.MonCotiz}\n`;
            }
            responseText += `\n`;
        }

        // Additional ranges
        if (ResultGet.CbteDesde !== ResultGet.CbteHasta) {
            responseText += `**Rango de Comprobantes:**\n`;
            responseText += `• Desde: ${ResultGet.CbteDesde}\n`;
            responseText += `• Hasta: ${ResultGet.CbteHasta}\n\n`;
        }

        return {
            content: [{
                type: 'text',
                text: responseText
            }]
        };
    }

    getConceptoDescription(concepto) {
        const conceptos = {
            1: 'Productos',
            2: 'Servicios',
            3: 'Productos y Servicios'
        };
        return conceptos[concepto] || `Concepto ${concepto}`;
    }

    formatDate(dateStr) {
        if (!dateStr || dateStr.length !== 8) return dateStr;

        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);

        return `${day}/${month}/${year}`;
    }

    formatAmount(amount) {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    isCAEExpired(caeFchVto) {
        if (!caeFchVto || caeFchVto.length !== 8) return false;

        const year = parseInt(caeFchVto.substring(0, 4));
        const month = parseInt(caeFchVto.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(caeFchVto.substring(6, 8));

        const expiryDate = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day

        return expiryDate < today;
    }
}