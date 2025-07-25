// src/client/utils/invoiceUtils.js

/**
 * Utilidades para el manejo de facturas ARCA
 * Siguiendo principios de Clean Code y funciones puras
 */

/**
 * Formatea un número como moneda argentina
 * @param {number} amount - Monto a formatear
 * @returns {string} Monto formateado
 */
export const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '$0,00';

    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
    }).format(amount);
};

/**
 * Formatea una fecha en formato argentino
 * @param {string|Date} date - Fecha a formatear
 * @param {boolean} includeTime - Si incluir la hora
 * @returns {string} Fecha formateada
 */
export const formatDate = (date, includeTime = false) => {
    if (!date) return 'Fecha no disponible';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Fecha inválida';

    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires'
    };

    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.second = '2-digit';
    }

    return dateObj.toLocaleDateString('es-AR', options);
};

/**
 * Obtiene la configuración de color para un estado de factura
 * @param {string} status - Estado de la factura
 * @returns {Object} Configuración de colores y clases CSS
 */
export const getStatusConfig = (status) => {
    const configs = {
        'OK': {
            bgColor: 'bg-green-50',
            textColor: 'text-green-800',
            borderColor: 'border-green-200',
            dotColor: 'bg-green-500',
            icon: 'CheckCircle',
            label: 'Autorizada'
        },
        'ERROR': {
            bgColor: 'bg-red-50',
            textColor: 'text-red-800',
            borderColor: 'border-red-200',
            dotColor: 'bg-red-500',
            icon: 'AlertTriangle',
            label: 'Error'
        },
        'PENDING': {
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-800',
            borderColor: 'border-yellow-200',
            dotColor: 'bg-yellow-500',
            icon: 'Clock',
            label: 'Pendiente'
        },
        'PROCESSING': {
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-800',
            borderColor: 'border-blue-200',
            dotColor: 'bg-blue-500',
            icon: 'RefreshCw',
            label: 'Procesando'
        }
    };

    return configs[status] || configs['PENDING'];
};

/**
 * Valida el formato de un CUIT argentino
 * @param {string} cuit - CUIT a validar
 * @returns {boolean} true si es válido
 */
export const isValidCUIT = (cuit) => {
    if (!cuit || typeof cuit !== 'string') return false;

    // Remover guiones y espacios
    const cleanCuit = cuit.replace(/[-\s]/g, '');

    // Verificar que tenga 11 dígitos
    if (!/^\d{11}$/.test(cleanCuit)) return false;

    // Algoritmo de verificación del CUIT
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const digits = cleanCuit.split('').map(Number);

    let sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += digits[i] * weights[i];
    }

    const remainder = sum % 11;
    const verificationDigit = remainder < 2 ? remainder : 11 - remainder;

    return verificationDigit === digits[10];
};

/**
 * Formatea un CUIT con guiones
 * @param {string} cuit - CUIT a formatear
 * @returns {string} CUIT formateado
 */
export const formatCUIT = (cuit) => {
    if (!cuit) return '';

    const cleanCuit = cuit.replace(/[-\s]/g, '');

    if (cleanCuit.length === 11) {
        return `${cleanCuit.slice(0, 2)}-${cleanCuit.slice(2, 10)}-${cleanCuit.slice(10)}`;
    }

    return cuit;
};

/**
 * Valida el formato de un número de factura
 * @param {string} invoiceNumber - Número de factura
 * @returns {boolean} true si es válido
 */
export const isValidInvoiceNumber = (invoiceNumber) => {
    if (!invoiceNumber || typeof invoiceNumber !== 'string') return false;

    // Formato: XXXX-XXXXXXXX (punto de venta - número)
    return /^\d{4}-\d{8}$/.test(invoiceNumber);
};

/**
 * Extrae el punto de venta de un número de factura
 * @param {string} invoiceNumber - Número de factura
 * @returns {number} Punto de venta
 */
export const extractPuntoVenta = (invoiceNumber) => {
    if (!isValidInvoiceNumber(invoiceNumber)) return null;

    return parseInt(invoiceNumber.split('-')[0], 10);
};

/**
 * Extrae el número de comprobante de un número de factura
 * @param {string} invoiceNumber - Número de factura
 * @returns {number} Número de comprobante
 */
export const extractComprobanteNumber = (invoiceNumber) => {
    if (!isValidInvoiceNumber(invoiceNumber)) return null;

    return parseInt(invoiceNumber.split('-')[1], 10);
};

/**
 * Calcula el IVA según el tipo de factura
 * @param {number} total - Total de la factura
 * @param {string} type - Tipo de factura (A, B, C)
 * @returns {Object} Objeto con neto, iva y total
 */
export const calculateTaxes = (total, type) => {
    const amount = parseFloat(total) || 0;

    switch (type?.toUpperCase()) {
        case 'A':
            // Factura A: discrimina IVA
            const neto = amount / 1.21;
            const iva = amount - neto;
            return {
                neto: Math.round(neto * 100) / 100,
                iva: Math.round(iva * 100) / 100,
                total: amount
            };

        case 'B':
        case 'C':
            // Facturas B y C: no discriminan IVA
            return {
                neto: amount,
                iva: 0,
                total: amount
            };

        default:
            return {
                neto: amount,
                iva: 0,
                total: amount
            };
    }
};

/**
 * Genera un color consistente para un estado
 * @param {string} status - Estado
 * @returns {string} Clase CSS de color
 */
export const getStatusColor = (status) => {
    const config = getStatusConfig(status);
    return `${config.bgColor} ${config.textColor} ${config.borderColor}`;
};

/**
 * Filtra facturas según criterios de búsqueda
 * @param {Array} invoices - Lista de facturas
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Array} Facturas filtradas
 */
export const filterInvoices = (invoices, filters) => {
    if (!Array.isArray(invoices)) return [];

    const {
        searchTerm = '',
        status = 'all',
        dateFrom = null,
        dateTo = null,
        type = 'all'
    } = filters;

    return invoices.filter(invoice => {
        // Filtro por término de búsqueda
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                invoice.number?.toLowerCase().includes(term) ||
                invoice.businessName?.toLowerCase().includes(term) ||
                invoice.cuit?.includes(term);

            if (!matchesSearch) return false;
        }

        // Filtro por estado
        if (status !== 'all' && invoice.status !== status) {
            return false;
        }

        // Filtro por tipo
        if (type !== 'all' && invoice.type !== type) {
            return false;
        }

        // Filtro por rango de fechas
        if (dateFrom || dateTo) {
            const invoiceDate = new Date(invoice.date);

            if (dateFrom && invoiceDate < new Date(dateFrom)) {
                return false;
            }

            if (dateTo && invoiceDate > new Date(dateTo)) {
                return false;
            }
        }

        return true;
    });
};

/**
 * Ordena facturas según criterio
 * @param {Array} invoices - Lista de facturas
 * @param {string} sortBy - Campo por el cual ordenar
 * @param {string} sortOrder - Orden (asc, desc)
 * @returns {Array} Facturas ordenadas
 */
export const sortInvoices = (invoices, sortBy = 'sentAt', sortOrder = 'desc') => {
    if (!Array.isArray(invoices)) return [];

    return [...invoices].sort((a, b) => {
        let valueA = a[sortBy];
        let valueB = b[sortBy];

        // Manejar fechas
        if (sortBy.includes('date') || sortBy.includes('At')) {
            valueA = new Date(valueA);
            valueB = new Date(valueB);
        }

        // Manejar números
        if (sortBy === 'total') {
            valueA = parseFloat(valueA) || 0;
            valueB = parseFloat(valueB) || 0;
        }

        // Manejar strings
        if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }

        if (sortOrder === 'asc') {
            return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
            return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
    });
};

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} true si se copió exitosamente
 */
export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        // Fallback para navegadores que no soportan clipboard API
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (fallbackError) {
            console.error('Error copiando al portapapeles:', fallbackError);
            return false;
        }
    }
};

/**
 * Debounce function para optimizar búsquedas
 * @param {Function} func - Función a ejecutar
 * @param {number} delay - Delay en ms
 * @returns {Function} Función con debounce
 */
export const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
};

/**
 * Genera un ID único para elementos
 * @param {string} prefix - Prefijo opcional
 * @returns {string} ID único
 */
export const generateId = (prefix = 'id') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Calcula estadísticas de una lista de facturas
 * @param {Array} invoices - Lista de facturas
 * @returns {Object} Estadísticas calculadas
 */
export const calculateInvoiceStats = (invoices) => {
    if (!Array.isArray(invoices) || invoices.length === 0) {
        return {
            total: 0,
            sent: 0,
            authorized: 0,
            rejected: 0,
            pending: 0,
            totalAmount: 0,
            averageAmount: 0
        };
    }

    const stats = invoices.reduce((acc, invoice) => {
        acc.total += 1;
        acc.totalAmount += parseFloat(invoice.total) || 0;

        switch (invoice.status) {
            case 'OK':
                acc.authorized += 1;
                break;
            case 'ERROR':
                acc.rejected += 1;
                break;
            case 'PENDING':
                acc.pending += 1;
                break;
        }

        return acc;
    }, {
        total: 0,
        authorized: 0,
        rejected: 0,
        pending: 0,
        totalAmount: 0
    });

    stats.sent = stats.total;
    stats.averageAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;

    return stats;
};