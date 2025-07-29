// ===================================================
// 6. ERRORES PERSONALIZADOS
// src/errors/AuthErrors.js
// ===================================================

export class AuthenticationError extends Error {
    constructor(message, code = 'AUTH_ERROR') {
        super(message);
        this.name = 'AuthenticationError';
        this.code = code;
        this.statusCode = 401;
    }
}

export class AuthorizationError extends Error {
    constructor(message, code = 'AUTHZ_ERROR') {
        super(message);
        this.name = 'AuthorizationError';
        this.code = code;
        this.statusCode = 403;
    }
}

export class RateLimitError extends Error {
    constructor(message, retryAfter = 60) {
        super(message);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
        this.statusCode = 429;
    }
}