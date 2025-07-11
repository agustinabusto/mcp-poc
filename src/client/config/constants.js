// src/client/config/constants.js
// Configuración de la aplicación

// URLs base
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080';

// Endpoints de la API
export const API_ENDPOINTS = {
    // AFIP
    AFIP_TAXPAYER: '/afip/taxpayer',
    AFIP_PROBLEMATIC: '/afip/problematic-cuits',

    // Compliance
    COMPLIANCE_CHECK: '/compliance/check',

    // Alertas
    ALERTS_LIST: '/alerts',
    ALERTS_REFRESH: '/alerts/refresh',

    // Métricas
    METRICS_SYSTEM: '/metrics/system',
    METRICS_HEALTH: '/health',

    // Groq AI
    GROQ_CHAT: '/groq/chat',
    GROQ_STATUS: '/groq/status',

    // Notificaciones
    NOTIFICATIONS_SEND: '/notifications/send',
    NOTIFICATIONS_STATS: '/notifications/stats',

    // ✅ AGREGAR Nuevos endpoints HU-001
    fiscal: {
        verify: '/fiscal/verify',
        history: '/fiscal/history',
        stats: '/fiscal/stats',
        systemStatus: '/fiscal-system-status'
    }
};

// Configuración de búsqueda
export const SEARCH_CONFIG = {
    // Timeouts
    DEFAULT_TIMEOUT: 15000,
    MAX_TIMEOUT: 30000,

    // Reintentos
    DEFAULT_RETRIES: 2,
    MAX_RETRIES: 5,

    // Rate limiting
    RATE_LIMIT_DELAY: 1000,
    BATCH_SIZE: 3,
    BATCH_DELAY: 500,

    // Cache
    CACHE_TTL: 5 * 60 * 1000, // 5 minutos
    MAX_CACHE_SIZE: 100,

    // Historial
    MAX_HISTORY_ITEMS: 15,
    HISTORY_RETENTION_DAYS: 30
};

// Tipos de alertas
export const ALERT_TYPES = {
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    INFO: 'info'
};

// Severidades de alertas
export const ALERT_SEVERITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

// Estados de contribuyentes
export const TAXPAYER_STATUS = {
    ACTIVE: 'ACTIVO',
    INACTIVE: 'INACTIVO',
    SUSPENDED: 'SUSPENDIDO',
    UNKNOWN: 'DESCONOCIDO'
};

// Situaciones fiscales IVA
export const IVA_STATUS = {
    RESPONSIBLE: 'RESPONSABLE_INSCRIPTO',
    EXEMPT: 'EXENTO',
    MONOTAX: 'MONOTRIBUTO',
    NOT_REGISTERED: 'NO_INSCRIPTO',
    FINAL_CONSUMER: 'CONSUMIDOR_FINAL'
};

// Niveles de riesgo
export const RISK_LEVELS = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};

// Colores por tipo de alerta
export const ALERT_COLORS = {
    [ALERT_TYPES.SUCCESS]: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        icon: 'text-green-500'
    },
    [ALERT_TYPES.WARNING]: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        icon: 'text-yellow-500'
    },
    [ALERT_TYPES.ERROR]: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        icon: 'text-red-500'
    },
    [ALERT_TYPES.INFO]: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        icon: 'text-blue-500'
    }
};

// Colores por nivel de riesgo
export const RISK_COLORS = {
    [RISK_LEVELS.LOW]: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300'
    },
    [RISK_LEVELS.MEDIUM]: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300'
    },
    [RISK_LEVELS.HIGH]: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300'
    },
    [RISK_LEVELS.CRITICAL]: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300'
    }
};

// CUITs de prueba conocidos
export const KNOWN_TEST_CUITS = [
    {
        cuit: '30500010912',
        name: 'MERCADOLIBRE S.R.L.',
        type: 'success',
        category: 'empresa',
        description: 'Empresa activa con situación fiscal regular'
    },
    {
        cuit: '27230938607',
        name: 'RODRIGUEZ MARIA LAURA',
        type: 'success',
        category: 'persona',
        description: 'Persona física con actividad comercial'
    },
    {
        cuit: '20123456789',
        name: 'GARCIA CARLOS ALBERTO',
        type: 'success',
        category: 'persona',
        description: 'Contribuyente individual activo'
    },
    {
        cuit: '20111222333',
        name: 'LOPEZ JUAN CARLOS - SIN ACTIVIDADES',
        type: 'warning',
        category: 'problematico',
        description: 'Contribuyente sin actividades registradas'
    },
    {
        cuit: '27999888777',
        name: 'GOMEZ CARLOS ALBERTO - MONOTRIBUTO VENCIDO',
        type: 'warning',
        category: 'problematico',
        description: 'Recategorización de monotributo vencida'
    },
    {
        cuit: '30555666777',
        name: 'SERVICIOS DISCONTINUADOS S.R.L. - INACTIVO',
        type: 'error',
        category: 'problematico',
        description: 'Empresa inactiva con obligaciones pendientes'
    },
    {
        cuit: '30777888999',
        name: 'CONSTRUCTORA IRREGULAR S.A. - PROBLEMAS LABORALES',
        type: 'error',
        category: 'problematico',
        description: 'Empresa con empleados en negro detectados'
    }
];

// Configuración de validación CUIT
export const CUIT_VALIDATION = {
    // Patrón regex para CUIT
    PATTERN: /^\d{2}-?\d{8}-?\d{1}$/,

    // Multiplicadores para validación
    MULTIPLIERS: [5, 4, 3, 2, 7, 6, 5, 4, 3, 2],

    // Prefijos válidos para personas físicas
    PERSON_PREFIXES: ['20', '23', '24', '27'],

    // Prefijos válidos para personas jurídicas
    COMPANY_PREFIXES: ['30', '33', '34'],

    // Longitud esperada
    LENGTH: 11
};

// Configuración de la interfaz
export const UI_CONFIG = {
    // Timeouts para notificaciones
    NOTIFICATION_TIMEOUT: 5000,
    SUCCESS_TIMEOUT: 3000,
    ERROR_TIMEOUT: 8000,

    // Animaciones
    ANIMATION_DURATION: 300,

    // Paginación
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,

    // Refresh intervals
    METRICS_REFRESH_INTERVAL: 30000, // 30 segundos
    ALERTS_REFRESH_INTERVAL: 60000,  // 1 minuto

    // Breakpoints responsivos
    BREAKPOINTS: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
    }
};

// Mensajes de la aplicación
export const MESSAGES = {
    SEARCH: {
        PLACEHOLDER: 'Buscar por CUIT (ej: 30500010912)',
        SEARCHING: 'Buscando contribuyente...',
        NOT_FOUND: 'Contribuyente no encontrado',
        ERROR: 'Error en la búsqueda. Intente nuevamente.',
        SUCCESS: 'Contribuyente encontrado',
        INVALID_FORMAT: 'Formato de CUIT inválido'
    },

    COMPLIANCE: {
        CHECKING: 'Verificando compliance...',
        GOOD: 'Situación fiscal en orden',
        WARNING: 'Problemas de compliance detectados',
        ERROR: 'Error verificando compliance'
    },

    CONNECTION: {
        CONNECTED: 'Conectado',
        DISCONNECTED: 'Desconectado',
        CONNECTING: 'Conectando...',
        ERROR: 'Error de conexión'
    },

    SYSTEM: {
        INITIALIZING: 'Inicializando sistema...',
        READY: 'Sistema listo',
        ERROR: 'Error del sistema',
        MAINTENANCE: 'Sistema en mantenimiento'
    }
};

// Configuración de desarrollo
export const DEV_CONFIG = {
    ENABLE_LOGS: import.meta.env.MODE === 'development',
    ENABLE_DEBUG: import.meta.env.VITE_DEBUG === 'true',
    MOCK_RESPONSES: import.meta.env.VITE_MOCK_RESPONSES === 'true',
    SHOW_DEV_TOOLS: import.meta.env.MODE === 'development'
};

// Exportar configuración completa
export const APP_CONFIG = {
    api: {
        baseURL: API_BASE_URL,
        wsURL: WS_BASE_URL,
        endpoints: API_ENDPOINTS
    },
    search: SEARCH_CONFIG,
    ui: UI_CONFIG,
    validation: CUIT_VALIDATION,
    dev: DEV_CONFIG
};

export default APP_CONFIG;