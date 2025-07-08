// src/server/config/ocr-config.js
export const ocrConfig = {
    // Configuración de archivos
    upload: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        uploadPath: 'data/uploads/',
        cleanupAfter: 24 * 60 * 60 * 1000, // 24 horas
    },

    // Configuración de procesamiento
    processing: {
        timeout: 30000, // 30 segundos
        retries: 3,
        concurrency: 5,
        confidenceThreshold: 70, // Mínima confianza aceptable
    },

    // Configuración de simulación (para desarrollo)
    simulation: {
        enabled: true, // Cambiar a false cuando tengas OCR real
        processingDelay: {
            min: 100,
            max: 2000
        },
        confidenceRange: {
            min: 80,
            max: 98
        },
        successRate: 0.95 // 95% de éxito en simulación
    },

    // Configuración de almacenamiento
    storage: {
        retentionDays: 30,
        compressResults: true,
        backupEnabled: false
    },

    // Configuración de logs
    logging: {
        level: 'info', // debug, info, warn, error
        logUploads: true,
        logProcessing: true,
        logErrors: true
    },

    // Límites de rate limiting
    rateLimiting: {
        uploadsPerMinute: 20,
        uploadsPerHour: 100,
        uploadsPerDay: 500
    },

    // Configuración por tipo de documento
    documentTypes: {
        invoice: {
            expectedFields: ['numero', 'fecha', 'cuit', 'razonSocial', 'total'],
            validation: {
                cuitFormat: true,
                dateFormat: true,
                amountFormat: true
            },
            extractionTimeout: 15000
        },
        bank_statement: {
            expectedFields: ['banco', 'cuenta', 'periodo', 'movimientos'],
            validation: {
                cbuFormat: true,
                dateRange: true,
                balanceConsistency: true
            },
            extractionTimeout: 25000
        },
        receipt: {
            expectedFields: ['fecha', 'concepto', 'monto'],
            validation: {
                dateFormat: true,
                amountFormat: true
            },
            extractionTimeout: 10000
        },
        other: {
            expectedFields: ['text'],
            validation: {},
            extractionTimeout: 20000
        }
    },

    // Configuración de respuestas de error
    errorMessages: {
        FILE_TOO_LARGE: 'El archivo es demasiado grande. Máximo permitido: 10MB',
        UNSUPPORTED_FORMAT: 'Formato de archivo no soportado. Use PDF, JPG o PNG',
        PROCESSING_FAILED: 'Error al procesar el documento. Intente nuevamente',
        CONFIDENCE_TOO_LOW: 'La confianza del OCR es muy baja. Verifique la calidad del documento',
        TIMEOUT: 'El procesamiento tardó demasiado tiempo. Intente con un archivo más pequeño',
        RATE_LIMIT: 'Ha excedido el límite de archivos. Intente más tarde',
        NO_FILE: 'No se recibió ningún archivo para procesar',
        MISSING_FILEPATH: 'Ruta de archivo requerida',
        EXTRACTION_ERROR: 'Error extrayendo datos del documento',
        VALIDATION_ERROR: 'Los datos extraídos no pasaron la validación'
    }
};

// Configuración específica para Argentina (AFIP)
export const afipOcrConfig = {
    // Patrones de validación para documentos argentinos
    validation: {
        cuit: {
            pattern: /^\d{2}-?\d{8}-?\d{1}$/,
            multipliers: [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
        },
        cbu: {
            pattern: /^\d{22}$/,
            length: 22
        },
        invoiceNumber: {
            pattern: /^[A-Z]-\d{4}-\d{8}$/
        }
    },

    // Tipos de comprobantes AFIP
    invoiceTypes: {
        'A': 'Factura A',
        'B': 'Factura B',
        'C': 'Factura C',
        'M': 'Factura M',
        'E': 'Factura E'
    },

    // Condiciones ante el IVA
    ivaConditions: [
        'Responsable Inscripto',
        'Exento',
        'Consumidor Final',
        'Monotributo',
        'No Responsable'
    ],

    // Bancos argentinos conocidos
    banks: [
        'Banco de la Nación Argentina',
        'Banco Santander Río',
        'BBVA Argentina',
        'Banco Galicia',
        'Banco Macro',
        'Banco Supervielle',
        'Banco Patagonia',
        'Banco Hipotecario',
        'Banco Ciudad',
        'Banco Provincia'
    ]
};

// Función para validar CUIT
export function validateCUIT(cuit) {
    if (!cuit) return false;

    const cleanCuit = cuit.replace(/[-\s]/g, '');
    if (!/^\d{11}$/.test(cleanCuit)) return false;

    const multipliers = afipOcrConfig.validation.cuit.multipliers;
    let sum = 0;

    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCuit[i]) * multipliers[i];
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;

    return parseInt(cleanCuit[10]) === checkDigit;
}

// Función para validar CBU
export function validateCBU(cbu) {
    if (!cbu) return false;
    return afipOcrConfig.validation.cbu.pattern.test(cbu.replace(/[-\s]/g, ''));
}

// Función para formatear CUIT
export function formatCUIT(cuit) {
    if (!cuit) return '';
    const clean = cuit.replace(/[-\s]/g, '');
    if (clean.length !== 11) return cuit;
    return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
}

// Función para detectar tipo de factura
export function detectInvoiceType(text) {
    const upperText = text.toUpperCase();
    for (const [code, description] of Object.entries(afipOcrConfig.invoiceTypes)) {
        if (upperText.includes(`FACTURA ${code}`) || upperText.includes(`FACT ${code}`)) {
            return { code, description };
        }
    }
    return { code: 'X', description: 'Tipo no identificado' };
}

// Configuración de entorno
export const getOcrEnvironmentConfig = () => {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    return {
        ...ocrConfig,
        simulation: {
            ...ocrConfig.simulation,
            enabled: isDevelopment || process.env.OCR_SIMULATION === 'true'
        },
        logging: {
            ...ocrConfig.logging,
            level: isDevelopment ? 'debug' : 'info'
        },
        upload: {
            ...ocrConfig.upload,
            uploadPath: process.env.OCR_UPLOAD_PATH || ocrConfig.upload.uploadPath
        }
    };
};

export default {
    ocrConfig,
    afipOcrConfig,
    validateCUIT,
    validateCBU,
    formatCUIT,
    detectInvoiceType,
    getOcrEnvironmentConfig
};