export const contributorsConfig = {
    pagination: {
        defaultLimit: 50,
        maxLimit: 100
    },
    validation: {
        cuitRequired: true,
        businessNameRequired: true,
        emailOptional: true
    },
    arca: {
        autoRefreshInterval: 24 * 60 * 60 * 1000, // 24 horas
        retryAttempts: 3,
        retryDelay: 2000
    },
    export: {
        maxRecords: 10000,
        formats: ['csv', 'excel', 'json']
    }
};