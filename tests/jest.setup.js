// Jest setup file
// Configure any global test settings here

// Increase timeout for slow operations
jest.setTimeout(10000);

// Mock console methods to reduce noise during tests
global.console = {
    ...console,
    // Uncomment to suppress logs during tests
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
};