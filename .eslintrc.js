export default {
    env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    plugins: [
        'react'
    ],
    rules: {
        // Allow unused vars for now
        'no-unused-vars': 'warn',
        // Allow console statements
        'no-console': 'off'
    },
    globals: {
        React: 'readonly'
    }
};