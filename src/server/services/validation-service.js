/**
 * Validation Service - Valida datos para ARCA/AFIP
 * Implementa reglas de negocio según documentación oficial
 */

import { Logger } from '../../../../utils/logger.js';

const logger = new Logger('ValidationService');

export class ValidationService {
    constructor() {
        // ARCA validation rules
        this.rules = {
            cuit: {
                length: 11,
                pattern: /^\d{11}$/
            },
            amounts: {
                max: 999999999.99,
                min: 0,
                decimals: 2
            },
            dates: {
                format: /^\d{8}$/, // YYYYMMDD
                maxFutureMonths: 12,
                maxPastMonths: 24
            },
            comprobantes: {
                maxBatch: 250,
                tipos: [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 15, 19, 20, 21], // Tipos válidos
                conceptos: [1, 2, 3], // 1=Productos, 2=Servicios, 3=Productos y Servicios
                documentos: [80, 86, 87, 89, 90, 91, 92, 93, 94, 95, 96, 99] // Tipos de documento
            },
            iva: {
                alicuotas: [3, 4, 5, 6, 8, 9], // IDs de alícuotas válidas
                maxDecimalPlaces: 2
            }
        };

        logger.info('ValidationService initialized');
    }

    /**
     * Validate CUIT
     */
    validateCUIT(cuit) {
        const errors = [];

        if (!cuit) {
            errors.push('CUIT es requerido');
            return { valid: false, errors };
        }

        const cuitStr = cuit.toString();

        // Check format
        if (!this.rules.cuit.pattern.test(cuitStr)) {
            errors.push('CUIT debe tener exactamente 11 dígitos numéricos');
            return { valid: false, errors };
        }

        // Validate check digit
        if (!this.validateCUITCheckDigit(cuitStr)) {
            errors.push('CUIT inválido - dígito verificador incorrecto');
            return { valid: false, errors };
        }

        return { valid: true, errors: [] };
    }

    /**
     * Validate CUIT check digit using official algorithm
     */
    validateCUITCheckDigit(cuit) {
        const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        const digits = cuit.split('').map(Number);
        const checkDigit = digits[10];

        let sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += digits[i] * weights[i];
        }

        const remainder = sum % 11;
        const calculatedCheckDigit = remainder < 2 ? remainder : 11 - remainder;

        return calculatedCheckDigit === checkDigit;
    }

    /**
     * Validate monetary amount
     */
    validateAmount(amount, fieldName = 'Importe') {
        const errors = [];

        if (amount === null || amount === undefined) {
            errors.push(`${fieldName} es requerido`);
            return { valid: false, errors };
        }

        const numAmount = parseFloat(amount);

        if (isNaN(numAmount)) {
            errors.push(`${fieldName} debe ser un número válido`);
            return { valid: false, errors };
        }

        if (numAmount < this.rules.amounts.min) {
            errors.push(`${fieldName} no puede ser negativo`);
        }

        if (numAmount > this.rules.amounts.max) {
            errors.push(`${fieldName} excede el máximo permitido (${this.rules.amounts.max})`);
        }

        // Check decimal places
        const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
        if (decimalPlaces > this.rules.amounts.decimals) {
            errors.push(`${fieldName} no puede tener más de ${this.rules.amounts.decimals} decimales`);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate date in YYYYMMDD format
     */
    validateDate(dateStr, fieldName = 'Fecha') {
        const errors = [];

        if (!dateStr) {
            errors.push(`${fieldName} es requerida`);
            return { valid: false, errors };
        }

        // Check format
        if (!this.rules.dates.format.test(dateStr)) {
            errors.push(`${fieldName} debe tener formato YYYYMMDD`);
            return { valid: false, errors };
        }

        // Parse date
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6));
        const day = parseInt(dateStr.substring(6, 8));

        const date = new Date(year, month - 1, day);

        // Check if date is valid
        if (date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day) {
            errors.push(`${fieldName} no es una fecha válida`);
            return { valid: false, errors };
        }

        // Check date range
        const now = new Date();
        const maxFuture = new Date();
        maxFuture.setMonth(now.getMonth() + this.rules.dates.maxFutureMonths);

        const maxPast = new Date();
        maxPast.setMonth(now.getMonth() - this.rules.dates.maxPastMonths);

        if (date > maxFuture) {
            errors.push(`${fieldName} no puede ser más de ${this.rules.dates.maxFutureMonths} meses en el futuro`);
        }

        if (date < maxPast) {
            errors.push(`${fieldName} no puede ser más de ${this.rules.dates.maxPastMonths} meses en el pasado`);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate FECAE Request
     */
    validateFECAERequest(request) {
        const errors = [];

        if (!request.FeCAEReq) {
            errors.push('FeCAEReq es requerido');
            return { valid: false, errors };
        }

        const { FeCabReq, FeDetReq } = request.FeCAEReq;

        // Validate header
        const headerValidation = this.validateFECAEHeader(FeCabReq);
        if (!headerValidation.valid) {
            errors.push(...headerValidation.errors);
        }

        // Validate details
        if (!FeDetReq || !Array.isArray(FeDetReq)) {
            errors.push('FeDetReq debe ser un array');
            return { valid: false, errors };
        }

        if (FeDetReq.length === 0) {
            errors.push('FeDetReq no puede estar vacío');
            return { valid: false, errors };
        }

        if (FeDetReq.length > this.rules.comprobantes.maxBatch) {
            errors.push(`No se pueden procesar más de ${this.rules.comprobantes.maxBatch} comprobantes por lote`);
        }

        // Validate each detail
        FeDetReq.forEach((detalle, index) => {
            const detalleValidation = this.validateFECAEDetalle(detalle, index + 1);
            if (!detalleValidation.valid) {
                errors.push(...detalleValidation.errors);
            }
        });

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate FECAE Header
     */
    validateFECAEHeader(header) {
        const errors = [];

        if (!header) {
            errors.push('FeCabReq es requerido');
            return { valid: false, errors };
        }

        // Validate CantReg
        if (!header.CantReg || header.CantReg <= 0) {
            errors.push('CantReg debe ser mayor a 0');
        }

        // Validate PtoVta
        if (!header.PtoVta || header.PtoVta <= 0 || header.PtoVta > 99999) {
            errors.push('PtoVta debe estar entre 1 y 99999');
        }

        // Validate CbteTipo
        if (!this.rules.comprobantes.tipos.includes(header.CbteTipo)) {
            errors.push(`CbteTipo ${header.CbteTipo} no es válido`);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate FECAE Detail
     */
    validateFECAEDetalle(detalle, index) {
        const errors = [];
        const prefix = `Comprobante ${index}`;

        if (!detalle) {
            errors.push(`${prefix}: Detalle es requerido`);
            return { valid: false, errors };
        }

        // Validate Concepto
        if (!this.rules.comprobantes.conceptos.includes(detalle.Concepto)) {
            errors.push(`${prefix}: Concepto ${detalle.Concepto} no es válido`);
        }

        // Validate DocTipo
        if (!this.rules.comprobantes.documentos.includes(detalle.DocTipo)) {
            errors.push(`${prefix}: DocTipo ${detalle.DocTipo} no es válido`);
        }

        // Validate DocNro
        if (!detalle.DocNro || detalle.DocNro.toString().length > 20) {
            errors.push(`${prefix}: DocNro es requerido y no puede exceder 20 caracteres`);
        }

        // Validate document number for CUIT types
        if ([80, 86, 87].includes(detalle.DocTipo)) {
            const cuitValidation = this.validateCUIT(detalle.DocNro);
            if (!cuitValidation.valid) {
                errors.push(`${prefix}: ${cuitValidation.errors.join(', ')}`);
            }
        }

        // Validate comprobante numbers
        if (!detalle.CbteDesde || detalle.CbteDesde <= 0) {
            errors.push(`${prefix}: CbteDesde debe ser mayor a 0`);
        }

        if (!detalle.CbteHasta || detalle.CbteHasta < detalle.CbteDesde) {
            errors.push(`${prefix}: CbteHasta debe ser mayor o igual a CbteDesde`);
        }

        // Validate date
        const dateValidation = this.validateDate(detalle.CbteFch, `${prefix}: CbteFch`);
        if (!dateValidation.valid) {
            errors.push(...dateValidation.errors);
        }

        // Validate amounts
        const amountFields = [
            'ImpTotal', 'ImpTotConc', 'ImpNeto', 'ImpOpEx', 'ImpTrib', 'ImpIVA'
        ];

        amountFields.forEach(field => {
            if (detalle[field] !== undefined) {
                const amountValidation = this.validateAmount(detalle[field], `${prefix}: ${field}`);
                if (!amountValidation.valid) {
                    errors.push(...amountValidation.errors);
                }
            }
        });

        // Validate currency
        if (!detalle.MonId || detalle.MonId.length !== 3) {
            errors.push(`${prefix}: MonId debe ser un código de 3 caracteres`);
        }

        if (!detalle.MonCotiz || detalle.MonCotiz <= 0) {
            errors.push(`${prefix}: MonCotiz debe ser mayor a 0`);
        }

        // Validate IVA array if present
        if (detalle.Iva && Array.isArray(detalle.Iva)) {
            detalle.Iva.forEach((iva, ivaIndex) => {
                const ivaValidation = this.validateIVAItem(iva, `${prefix}: IVA ${ivaIndex + 1}`);
                if (!ivaValidation.valid) {
                    errors.push(...ivaValidation.errors);
                }
            });
        }

        // Validate totals consistency
        const totalsValidation = this.validateTotalsConsistency(detalle, prefix);
        if (!totalsValidation.valid) {
            errors.push(...totalsValidation.errors);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate IVA item
     */
    validateIVAItem(iva, prefix) {
        const errors = [];

        if (!iva.Id || !this.rules.iva.alicuotas.includes(iva.Id)) {
            errors.push(`${prefix}: ID de alícuota IVA inválido`);
        }

        const baseImpValidation = this.validateAmount(iva.BaseImp, `${prefix}: BaseImp`);
        if (!baseImpValidation.valid) {
            errors.push(...baseImpValidation.errors);
        }

        const importeValidation = this.validateAmount(iva.Importe, `${prefix}: Importe`);
        if (!importeValidation.valid) {
            errors.push(...importeValidation.errors);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate totals consistency
     */
    validateTotalsConsistency(detalle, prefix) {
        const errors = [];

        try {
            const impNeto = parseFloat(detalle.ImpNeto) || 0;
            const impOpEx = parseFloat(detalle.ImpOpEx) || 0;
            const impTrib = parseFloat(detalle.ImpTrib) || 0;
            const impIVA = parseFloat(detalle.ImpIVA) || 0;
            const impTotal = parseFloat(detalle.ImpTotal) || 0;

            const calculatedTotal = impNeto + impOpEx + impTrib + impIVA;
            const difference = Math.abs(calculatedTotal - impTotal);

            // Allow small floating point differences
            if (difference > 0.01) {
                errors.push(`${prefix}: ImpTotal no coincide con la suma de los componentes (diferencia: ${difference.toFixed(2)})`);
            }

            // Validate IVA consistency if IVA array is present
            if (detalle.Iva && Array.isArray(detalle.Iva)) {
                const ivaSum = detalle.Iva.reduce((sum, iva) => sum + (parseFloat(iva.Importe) || 0), 0);
                const ivaDifference = Math.abs(ivaSum - impIVA);

                if (ivaDifference > 0.01) {
                    errors.push(`${prefix}: ImpIVA no coincide con la suma de alícuotas (diferencia: ${ivaDifference.toFixed(2)})`);
                }
            }
        } catch (error) {
            errors.push(`${prefix}: Error validando consistencia de totales: ${error.message}`);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate WSMTx CA Request (complex invoices)
     */
    validateWSMTXCARequest(request) {
        const errors = [];

        // Basic required fields
        const requiredFields = [
            'codigoTipoComprobante', 'numeroPuntoVenta', 'numeroComprobante',
            'fechaEmision', 'codigoTipoDocumento', 'numeroDocumento',
            'importeTotal', 'importeGravado', 'codigoMoneda', 'cotizacionMoneda'
        ];

        requiredFields.forEach(field => {
            if (request[field] === undefined || request[field] === null) {
                errors.push(`${field} es requerido`);
            }
        });

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        // Validate specific fields
        const dateValidation = this.validateDate(request.fechaEmision, 'fechaEmision');
        if (!dateValidation.valid) {
            errors.push(...dateValidation.errors);
        }

        const docValidation = this.validateCUIT(request.numeroDocumento);
        if ([80, 86, 87].includes(request.codigoTipoDocumento) && !docValidation.valid) {
            errors.push(...docValidation.errors);
        }

        const totalValidation = this.validateAmount(request.importeTotal, 'importeTotal');
        if (!totalValidation.valid) {
            errors.push(...totalValidation.errors);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Sanitize input data
     */
    sanitizeInput(data) {
        if (typeof data === 'string') {
            return data.trim().substring(0, 1000); // Prevent extremely long strings
        }

        if (typeof data === 'number') {
            return isFinite(data) ? data : 0;
        }

        if (Array.isArray(data)) {
            return data.slice(0, 1000).map(item => this.sanitizeInput(item)); // Limit array size
        }

        if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            Object.keys(data).slice(0, 100).forEach(key => { // Limit object keys
                sanitized[key] = this.sanitizeInput(data[key]);
            });
            return sanitized;
        }

        return data;
    }
}