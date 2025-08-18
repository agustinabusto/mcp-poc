// tests/jest.setup.react.js
require('@testing-library/jest-dom');

// Mock de APIs del navegador que React Testing Library necesita
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Mock de IntersectionObserver si es necesario
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Mock de matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock de scrollTo
Object.defineProperty(window, 'scrollTo', {
    value: jest.fn(),
    writable: true
});

// Mock para fetch (si no está disponible en jsdom)
if (!global.fetch) {
    global.fetch = jest.fn();
}

// Configurar timeouts más altos para tests de hooks con efectos async
jest.setTimeout(10000);