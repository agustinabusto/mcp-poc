// Tipos de alertas disponibles en el sistema
export const ALERT_TYPES = {
  // Alertas de estado fiscal
  FISCAL_INACTIVE: 'fiscal_inactive',
  FISCAL_SUSPENDED: 'fiscal_suspended',

  // Alertas de IVA
  VAT_NOT_REGISTERED: 'vat_not_registered',
  MISSING_VAT_DECLARATIONS: 'missing_vat_declarations',
  LATE_VAT_PAYMENT: 'late_vat_payment',
  VAT_REGIME_CHANGE: 'vat_regime_change',

  // Alertas de Ganancias
  MISSING_INCOME_TAX_DECLARATIONS: 'missing_income_tax_declarations',
  LATE_INCOME_TAX_PAYMENT: 'late_income_tax_payment',
  INCOME_TAX_REGIME_CHANGE: 'income_tax_regime_change',

  // Alertas generales de declaraciones
  LATE_TAX_RETURNS: 'late_tax_returns',
  MISSING_MANDATORY_DECLARATIONS: 'missing_mandatory_declarations',
  DECLARATION_ERRORS: 'declaration_errors',

  // Alertas de compliance
  COMPLIANCE_SCORE_LOW: 'compliance_score_low',
  COMPLIANCE_SCORE_CRITICAL: 'compliance_score_critical',
  MULTIPLE_COMPLIANCE_ISSUES: 'multiple_compliance_issues',

  // Alertas de monitoreo
  MONITORING_SETUP_REQUIRED: 'monitoring_setup_required',
  MONITORING_DATA_STALE: 'monitoring_data_stale',

  // Alertas normativas
  REGULATION_UPDATE: 'regulation_update',
  REGULATION_DEADLINE: 'regulation_deadline',
  REGULATION_IMPACT_HIGH: 'regulation_impact_high',

  // Alertas de vencimientos
  UPCOMING_DUE_DATE: 'upcoming_due_date',
  OVERDUE_OBLIGATION: 'overdue_obligation',
  PAYMENT_DUE: 'payment_due',

  // Alertas de seguridad social
  SOCIAL_SECURITY_MISSING: 'social_security_missing',
  SOCIAL_SECURITY_LATE: 'social_security_late',

  // Alertas de trabajo
  LABOR_COMPLIANCE_ISSUE: 'labor_compliance_issue',
  EMPLOYEE_REGISTRATION_MISSING: 'employee_registration_missing',

  // Alertas del sistema
  SYSTEM_ERROR: 'system_error',
  CONNECTION_ERROR: 'connection_error',
  DATA_SYNC_ERROR: 'data_sync_error',

  // Alertas personalizadas
  CUSTOM_THRESHOLD: 'custom_threshold',
  CUSTOM_RULE: 'custom_rule'
};

// Niveles de severidad de las alertas
export const ALERT_SEVERITIES = {
  CRITICAL: 'critical',  // Requiere acción inmediata
  HIGH: 'high',         // Requiere acción pronto
  MEDIUM: 'medium',     // Requiere atención
  LOW: 'low',          // Informativo
  INFO: 'info'         // Solo información
};

// Estados posibles de las alertas
export const ALERT_STATUSES = {
  ACTIVE: 'active',           // Alerta activa, requiere atención
  ACKNOWLEDGED: 'acknowledged', // Alerta vista/confirmada
  RESOLVED: 'resolved',       // Alerta resuelta
  DISMISSED: 'dismissed',     // Alerta descartada
  ARCHIVED: 'archived',       // Alerta archivada
  EXPIRED: 'expired'          // Alerta expirada automáticamente
};

// Prioridades de notificación (para diferentes canales)
export const NOTIFICATION_PRIORITIES = {
  IMMEDIATE: 'immediate',     // Notificación inmediata (SMS, Push, Email)
  HIGH: 'high',              // Notificación prioritaria (Push, Email)
  NORMAL: 'normal',          // Notificación normal (Email, Dashboard)
  LOW: 'low',               // Solo dashboard
  SILENT: 'silent'          // No notificar
};

// Mapeo de severidades a prioridades de notificación
export const SEVERITY_TO_NOTIFICATION_PRIORITY = {
  [ALERT_SEVERITIES.CRITICAL]: NOTIFICATION_PRIORITIES.IMMEDIATE,
  [ALERT_SEVERITIES.HIGH]: NOTIFICATION_PRIORITIES.HIGH,
  [ALERT_SEVERITIES.MEDIUM]: NOTIFICATION_PRIORITIES.NORMAL,
  [ALERT_SEVERITIES.LOW]: NOTIFICATION_PRIORITIES.LOW,
  [ALERT_SEVERITIES.INFO]: NOTIFICATION_PRIORITIES.SILENT
};

// Configuración de colores para UI
export const ALERT_COLORS = {
  [ALERT_SEVERITIES.CRITICAL]: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    border: 'border-red-500',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-600',
    badge: 'bg-red-500'
  },
  [ALERT_SEVERITIES.HIGH]: {
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    border: 'border-orange-500',
    text: 'text-orange-800 dark:text-orange-200',
    icon: 'text-orange-600',
    badge: 'bg-orange-500'
  },
  [ALERT_SEVERITIES.MEDIUM]: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    border: 'border-yellow-500',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: 'text-yellow-600',
    badge: 'bg-yellow-500'
  },
  [ALERT_SEVERITIES.LOW]: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    border: 'border-blue-500',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-600',
    badge: 'bg-blue-500'
  },
  [ALERT_SEVERITIES.INFO]: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-400',
    text: 'text-gray-800 dark:text-gray-200',
    icon: 'text-gray-600',
    badge: 'bg-gray-500'
  }
};

// Iconos para cada tipo de alerta
export const ALERT_ICONS = {
  [ALERT_TYPES.FISCAL_INACTIVE]: '🔴',
  [ALERT_TYPES.FISCAL_SUSPENDED]: '⏸️',
  [ALERT_TYPES.VAT_NOT_REGISTERED]: '📋',
  [ALERT_TYPES.MISSING_VAT_DECLARATIONS]: '📄',
  [ALERT_TYPES.LATE_VAT_PAYMENT]: '⏰',
  [ALERT_TYPES.VAT_REGIME_CHANGE]: '🔄',
  [ALERT_TYPES.MISSING_INCOME_TAX_DECLARATIONS]: '📊',
  [ALERT_TYPES.LATE_INCOME_TAX_PAYMENT]: '💰',
  [ALERT_TYPES.INCOME_TAX_REGIME_CHANGE]: '🔄',
  [ALERT_TYPES.LATE_TAX_RETURNS]: '⌛',
  [ALERT_TYPES.MISSING_MANDATORY_DECLARATIONS]: '❗',
  [ALERT_TYPES.DECLARATION_ERRORS]: '⚠️',
  [ALERT_TYPES.COMPLIANCE_SCORE_LOW]: '📉',
  [ALERT_TYPES.COMPLIANCE_SCORE_CRITICAL]: '🚨',
  [ALERT_TYPES.MULTIPLE_COMPLIANCE_ISSUES]: '🔥',
  [ALERT_TYPES.MONITORING_SETUP_REQUIRED]: '🛠️',
  [ALERT_TYPES.MONITORING_DATA_STALE]: '🔄',
  [ALERT_TYPES.REGULATION_UPDATE]: '📜',
  [ALERT_TYPES.REGULATION_DEADLINE]: '📅',
  [ALERT_TYPES.REGULATION_IMPACT_HIGH]: '🎯',
  [ALERT_TYPES.UPCOMING_DUE_DATE]: '📅',
  [ALERT_TYPES.OVERDUE_OBLIGATION]: '🚫',
  [ALERT_TYPES.PAYMENT_DUE]: '💳',
  [ALERT_TYPES.SOCIAL_SECURITY_MISSING]: '🏥',
  [ALERT_TYPES.SOCIAL_SECURITY_LATE]: '⏱️',
  [ALERT_TYPES.LABOR_COMPLIANCE_ISSUE]: '👷',
  [ALERT_TYPES.EMPLOYEE_REGISTRATION_MISSING]: '👤',
  [ALERT_TYPES.SYSTEM_ERROR]: '💻',
  [ALERT_TYPES.CONNECTION_ERROR]: '🌐',
  [ALERT_TYPES.DATA_SYNC_ERROR]: '🔄',
  [ALERT_TYPES.CUSTOM_THRESHOLD]: '⚡',
  [ALERT_TYPES.CUSTOM_RULE]: '🎛️'
};

// Descripciones legibles para cada tipo de alerta
export const ALERT_DESCRIPTIONS = {
  [ALERT_TYPES.FISCAL_INACTIVE]: 'El contribuyente no está activo en AFIP',
  [ALERT_TYPES.FISCAL_SUSPENDED]: 'El contribuyente está suspendido en AFIP',
  [ALERT_TYPES.VAT_NOT_REGISTERED]: 'No está inscripto en el régimen de IVA',
  [ALERT_TYPES.MISSING_VAT_DECLARATIONS]: 'Faltan declaraciones juradas de IVA',
  [ALERT_TYPES.LATE_VAT_PAYMENT]: 'Pagos de IVA fuera de término',
  [ALERT_TYPES.VAT_REGIME_CHANGE]: 'Cambio en el régimen de IVA',
  [ALERT_TYPES.MISSING_INCOME_TAX_DECLARATIONS]: 'Faltan declaraciones de Ganancias',
  [ALERT_TYPES.LATE_INCOME_TAX_PAYMENT]: 'Pagos de Ganancias fuera de término',
  [ALERT_TYPES.INCOME_TAX_REGIME_CHANGE]: 'Cambio en el régimen de Ganancias',
  [ALERT_TYPES.LATE_TAX_RETURNS]: 'Declaraciones presentadas fuera de término',
  [ALERT_TYPES.MISSING_MANDATORY_DECLARATIONS]: 'Faltan declaraciones obligatorias',
  [ALERT_TYPES.DECLARATION_ERRORS]: 'Errores detectados en declaraciones',
  [ALERT_TYPES.COMPLIANCE_SCORE_LOW]: 'Score de compliance por debajo del umbral',
  [ALERT_TYPES.COMPLIANCE_SCORE_CRITICAL]: 'Score de compliance críticamente bajo',
  [ALERT_TYPES.MULTIPLE_COMPLIANCE_ISSUES]: 'Múltiples problemas de compliance detectados',
  [ALERT_TYPES.MONITORING_SETUP_REQUIRED]: 'Se requiere configurar el monitoreo',
  [ALERT_TYPES.MONITORING_DATA_STALE]: 'Los datos de monitoreo están desactualizados',
  [ALERT_TYPES.REGULATION_UPDATE]: 'Nueva normativa publicada',
  [ALERT_TYPES.REGULATION_DEADLINE]: 'Fecha límite de normativa se acerca',
  [ALERT_TYPES.REGULATION_IMPACT_HIGH]: 'Normativa con alto impacto detectada',
  [ALERT_TYPES.UPCOMING_DUE_DATE]: 'Vencimiento próximo',
  [ALERT_TYPES.OVERDUE_OBLIGATION]: 'Obligación vencida',
  [ALERT_TYPES.PAYMENT_DUE]: 'Pago pendiente',
  [ALERT_TYPES.SOCIAL_SECURITY_MISSING]: 'Faltan aportes de seguridad social',
  [ALERT_TYPES.SOCIAL_SECURITY_LATE]: 'Aportes de seguridad social tardíos',
  [ALERT_TYPES.LABOR_COMPLIANCE_ISSUE]: 'Problema de compliance laboral',
  [ALERT_TYPES.EMPLOYEE_REGISTRATION_MISSING]: 'Falta registración de empleados',
  [ALERT_TYPES.SYSTEM_ERROR]: 'Error del sistema',
  [ALERT_TYPES.CONNECTION_ERROR]: 'Error de conexión',
  [ALERT_TYPES.DATA_SYNC_ERROR]: 'Error sincronizando datos',
  [ALERT_TYPES.CUSTOM_THRESHOLD]: 'Umbral personalizado alcanzado',
  [ALERT_TYPES.CUSTOM_RULE]: 'Regla personalizada activada'
};

// Acciones disponibles para cada tipo de alerta
export const ALERT_ACTIONS = {
  ACKNOWLEDGE: 'acknowledge',
  RESOLVE: 'resolve',
  DISMISS: 'dismiss',
  ESCALATE: 'escalate',
  SNOOZE: 'snooze',
  ARCHIVE: 'archive',
  CREATE_TASK: 'create_task',
  SEND_NOTIFICATION: 'send_notification'
};

// Mapeo de tipos de alerta a acciones disponibles
export const ALERT_TYPE_ACTIONS = {
  [ALERT_TYPES.FISCAL_INACTIVE]: [
    ALERT_ACTIONS.ACKNOWLEDGE,
    ALERT_ACTIONS.CREATE_TASK,
    ALERT_ACTIONS.ESCALATE
  ],
  [ALERT_TYPES.MISSING_VAT_DECLARATIONS]: [
    ALERT_ACTIONS.ACKNOWLEDGE,
    ALERT_ACTIONS.RESOLVE,
    ALERT_ACTIONS.CREATE_TASK,
    ALERT_ACTIONS.SNOOZE
  ],
  [ALERT_TYPES.COMPLIANCE_SCORE_LOW]: [
    ALERT_ACTIONS.ACKNOWLEDGE,
    ALERT_ACTIONS.CREATE_TASK,
    ALERT_ACTIONS.DISMISS
  ],
  [ALERT_TYPES.REGULATION_UPDATE]: [
    ALERT_ACTIONS.ACKNOWLEDGE,
    ALERT_ACTIONS.ARCHIVE,
    ALERT_ACTIONS.CREATE_TASK
  ],
  [ALERT_TYPES.SYSTEM_ERROR]: [
    ALERT_ACTIONS.ACKNOWLEDGE,
    ALERT_ACTIONS.ESCALATE,
    ALERT_ACTIONS.RESOLVE
  ]
};

// Configuración de timeouts para auto-resolución
export const ALERT_AUTO_RESOLVE_TIMEOUTS = {
  [ALERT_TYPES.CONNECTION_ERROR]: 300000,      // 5 minutos
  [ALERT_TYPES.DATA_SYNC_ERROR]: 600000,       // 10 minutos
  [ALERT_TYPES.MONITORING_DATA_STALE]: 3600000, // 1 hora
  [ALERT_TYPES.SYSTEM_ERROR]: 1800000          // 30 minutos
};

// Filtros predefinidos para la UI
export const ALERT_FILTERS = {
  ACTIVE: {
    status: [ALERT_STATUSES.ACTIVE],
    label: 'Activas'
  },
  HIGH_PRIORITY: {
    severity: [ALERT_SEVERITIES.CRITICAL, ALERT_SEVERITIES.HIGH],
    status: [ALERT_STATUSES.ACTIVE],
    label: 'Alta Prioridad'
  },
  FISCAL: {
    type: [
      ALERT_TYPES.FISCAL_INACTIVE,
      ALERT_TYPES.FISCAL_SUSPENDED,
      ALERT_TYPES.VAT_NOT_REGISTERED,
      ALERT_TYPES.MISSING_VAT_DECLARATIONS,
      ALERT_TYPES.MISSING_INCOME_TAX_DECLARATIONS
    ],
    label: 'Fiscales'
  },
  COMPLIANCE: {
    type: [
      ALERT_TYPES.COMPLIANCE_SCORE_LOW,
      ALERT_TYPES.COMPLIANCE_SCORE_CRITICAL,
      ALERT_TYPES.MULTIPLE_COMPLIANCE_ISSUES
    ],
    label: 'Compliance'
  },
  RECENT: {
    createdSince: '24h',
    label: 'Últimas 24h'
  }
};

// Configuración de agregación de alertas similares
export const ALERT_AGGREGATION_RULES = {
  [ALERT_TYPES.MISSING_VAT_DECLARATIONS]: {
    groupBy: ['cuit', 'type'],
    timeWindow: 86400000, // 24 horas
    maxCount: 1
  },
  [ALERT_TYPES.SYSTEM_ERROR]: {
    groupBy: ['type', 'code'],
    timeWindow: 3600000, // 1 hora
    maxCount: 5
  },
  [ALERT_TYPES.CONNECTION_ERROR]: {
    groupBy: ['type'],
    timeWindow: 1800000, // 30 minutos
    maxCount: 3
  }
};