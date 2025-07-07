// src/server/services/config/afip-config.js
// CONFIGURACIÓN OFICIAL DE AFIP CORREGIDA

export const afipConfig = {
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',

    // Certificados para servicios SOAP (para uso futuro)
    certificates: {
        cert: process.env.AFIP_CERT_PATH,
        key: process.env.AFIP_KEY_PATH,
        passphrase: process.env.AFIP_PASSPHRASE
    },

    cuitRepresentada: process.env.AFIP_CUIT_REPRESENTADA,

    // SERVICIOS OFICIALES SEGÚN DOCUMENTACIÓN AFIP
    services: {
        // WSAA - Autenticación (obligatorio para SOAP)
        wsaa: {
            development: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl',
            production: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl'
        },

        // SOAP Services oficiales
        constanciaInscripcion: {
            development: 'https://wswhomo.afip.gov.ar/ws_sr_constancia_inscripcion/service.asmx?wsdl',
            production: 'https://servicios1.afip.gov.ar/ws_sr_constancia_inscripcion/service.asmx?wsdl'
        },

        padronA4: {
            development: 'https://wswhomo.afip.gov.ar/ws_sr_padron_a4/service.asmx?wsdl',
            production: 'https://servicios1.afip.gov.ar/ws_sr_padron_a4/service.asmx?wsdl'
        },

        padronA10: {
            development: 'https://wswhomo.afip.gov.ar/ws_sr_padron_a10/service.asmx?wsdl',
            production: 'https://servicios1.afip.gov.ar/ws_sr_padron_a10/service.asmx?wsdl'
        },

        // FACTURACIÓN ELECTRÓNICA (para uso futuro)
        wsfev1: {
            development: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?wsdl',
            production: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?wsdl'
        }
    },

    // API REST (no oficial pero funcional)
    restApi: {
        // URL CORREGIDA - API REST oficial
        baseURL: 'https://soa.afip.gob.ar/sr-padron/v2',
        endpoints: {
            persona: '/persona/{cuit}',
            constancia: '/constancia/{cuit}',
            parametros: '/parametros/v1/{tabla}'
        },
        timeout: 15000,
        maxRetries: 3,
        warning: 'API experimental - solo funciona desde Argentina'
    },

    // Configuración de timeouts
    timeouts: {
        soap: 30000,
        rest: 15000,
        healthCheck: 10000
    },

    // Configuración de cache
    cache: {
        enabled: true,
        ttl: 300000, // 5 minutos
        maxSize: 1000
    },

    // Rate limiting
    rateLimit: {
        enabled: true,
        delay: 1000, // 1 segundo entre requests
        maxConcurrent: 5
    }
};

// Función helper para obtener URL según entorno
export function getServiceUrl(serviceName, environment = null) {
    const env = environment || afipConfig.environment;
    const service = afipConfig.services[serviceName];

    if (!service) {
        throw new Error(`Servicio no encontrado: ${serviceName}`);
    }

    if (typeof service === 'string') {
        return service;
    }

    return service[env] || service.development;
}

// Función helper para validar configuración
export function validateAfipConfig() {
    const errors = [];

    // Validar certificados para producción
    if (afipConfig.environment === 'production') {
        if (!afipConfig.certificates.cert) {
            errors.push('AFIP_CERT_PATH es requerido para producción');
        }
        if (!afipConfig.certificates.key) {
            errors.push('AFIP_KEY_PATH es requerido para producción');
        }
        if (!afipConfig.cuitRepresentada) {
            errors.push('AFIP_CUIT_REPRESENTADA es requerido para producción');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Configuración por defecto para el cliente
export const defaultAfipClientConfig = {
    // Usar API REST por defecto (más rápida para testing)
    baseURL: afipConfig.restApi.baseURL,
    timeout: afipConfig.restApi.timeout,
    maxRetries: afipConfig.restApi.maxRetries,

    // Configuración de mock
    mockMode: process.env.AFIP_MOCK_MODE === 'true' || false,

    // Cache
    cacheTimeout: afipConfig.cache.ttl,

    // Rate limiting
    rateLimitDelay: afipConfig.rateLimit.delay,

    // Headers por defecto
    headers: {
        'User-Agent': 'AFIP-Monitor-MCP/1.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
};

// Exportar todo junto para fácil importación
export default {
    afipConfig,
    getServiceUrl,
    validateAfipConfig,
    defaultAfipClientConfig
};