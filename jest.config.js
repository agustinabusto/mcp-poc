export default {
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: [
        '**/tests/unit/services/**/*.test.js',
        '**/tests/unit/routes/**/*.test.js',
        '**/tests/unit/tools/**/*.test.js'
      ],
      extensionsToTreatAsEsm: ['.jsx'],
      globals: {
        'ts-jest': {
          useESM: true
        }
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.(js|jsx)$': '$1'
      },
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
      },
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js']
    },
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: [
        '**/tests/unit/hooks/**/*.test.js',
        '**/tests/unit/components/**/*.test.js'
      ],
      extensionsToTreatAsEsm: ['.jsx'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.(js|jsx)$': '$1'
      },
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
      },
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.react.js']
    }
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  maxWorkers: '50%'
};