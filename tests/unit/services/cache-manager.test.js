/**
 * Cache Manager Tests - Phase 3 validation
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { CacheManager } from '../../../src/client/services/cache-manager.js';

// Mock localStorage
const localStorageMock = {
    data: {},
    getItem: jest.fn((key) => localStorageMock.data[key] || null),
    setItem: jest.fn((key, value) => { localStorageMock.data[key] = value; }),
    removeItem: jest.fn((key) => { delete localStorageMock.data[key]; }),
    clear: jest.fn(() => { localStorageMock.data = {}; }),
    get length() { return Object.keys(localStorageMock.data).length; },
    key: jest.fn((index) => Object.keys(localStorageMock.data)[index] || null)
};

// Mock navigator.serviceWorker
const serviceWorkerMock = {
    controller: {
        postMessage: jest.fn()
    },
    addEventListener: jest.fn()
};

// Setup global mocks
global.localStorage = localStorageMock;
global.navigator = { serviceWorker: serviceWorkerMock };

describe('CacheManager - Phase 3 Implementation', () => {
    let cacheManager;

    beforeEach(() => {
        cacheManager = new CacheManager();
        jest.clearAllMocks();
        localStorageMock.data = {};
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Core Functionality', () => {
        test('should initialize with correct business event patterns', () => {
            expect(cacheManager.businessEventPatterns).toBeDefined();
            expect(cacheManager.businessEventPatterns.compliance_check_completed).toBeDefined();
            expect(cacheManager.businessEventPatterns.user_logout).toBeDefined();
            expect(cacheManager.businessEventPatterns.contributor_updated).toBeDefined();
        });

        test('should manage memory cache correctly', () => {
            const testKey = 'test_key';
            const testValue = { data: 'test_data' };
            const ttl = 5000; // 5 seconds

            // Set cache
            cacheManager.setMemoryCache(testKey, testValue, ttl);
            
            // Get valid cache
            const retrieved = cacheManager.getMemoryCache(testKey);
            expect(retrieved).toEqual(testValue);
            
            // Check that cache exists and has valid structure
            expect(cacheManager.memoryCache.has(testKey)).toBe(true);
            const cacheEntry = cacheManager.memoryCache.get(testKey);
            expect(cacheEntry.value).toEqual(testValue);
            expect(cacheEntry.expiry).toBeGreaterThan(Date.now());
        });

        test('should handle expired memory cache', async () => {
            const testKey = 'expired_key';
            const testValue = { data: 'expired_data' };
            const shortTtl = 1; // 1ms

            cacheManager.setMemoryCache(testKey, testValue, shortTtl);
            
            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 5));
            
            // Should return null for expired cache
            const retrieved = cacheManager.getMemoryCache(testKey);
            expect(retrieved).toBeNull();
            
            // Check that cache was actually cleared
            expect(cacheManager.memoryCache.has(testKey)).toBe(false);
        });

        test('should manage subscribers correctly', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            // Subscribe
            const unsubscribe1 = cacheManager.subscribe(callback1);
            const unsubscribe2 = cacheManager.subscribe(callback2);

            expect(cacheManager.subscribers.size).toBe(2);

            // Notify subscribers
            const message = { type: 'test', pattern: 'test_pattern' };
            cacheManager.notifySubscribers(message.type, message.pattern);

            expect(callback1).toHaveBeenCalledWith({
                type: 'test',
                pattern: 'test_pattern',
                data: null,
                timestamp: expect.any(Number)
            });
            expect(callback2).toHaveBeenCalledWith(expect.any(Object));

            // Unsubscribe
            unsubscribe1();
            expect(cacheManager.subscribers.size).toBe(1);
            
            unsubscribe2();
            expect(cacheManager.subscribers.size).toBe(0);
        });
    });

    describe('Pattern Matching', () => {
        test('should match patterns with wildcards correctly', () => {
            expect(cacheManager.matchesPattern('compliance_dashboard', 'compliance_')).toBe(true);
            expect(cacheManager.matchesPattern('compliance_check_123', 'compliance_')).toBe(true);
            expect(cacheManager.matchesPattern('user_preferences', 'user_')).toBe(true);
            expect(cacheManager.matchesPattern('other_data', 'compliance_')).toBe(false);
        });

        test('should match exact patterns', () => {
            expect(cacheManager.matchesPattern('exact_key', 'exact_key')).toBe(true);
            expect(cacheManager.matchesPattern('partial_match', 'match')).toBe(true);
            expect(cacheManager.matchesPattern('no_match', 'different')).toBe(false);
        });
    });

    describe('Cache Invalidation', () => {
        test('should clear memory cache by pattern', () => {
            // Set up test data
            cacheManager.setMemoryCache('compliance_dashboard', { data: 'dashboard' });
            cacheManager.setMemoryCache('compliance_check_123', { data: 'check' });
            cacheManager.setMemoryCache('user_preferences', { data: 'prefs' });

            // Clear compliance cache
            const cleared = cacheManager.clearMemoryPattern('compliance_');
            expect(cleared).toBe(2);

            // Check remaining cache
            expect(cacheManager.getMemoryCache('compliance_dashboard')).toBeNull();
            expect(cacheManager.getMemoryCache('compliance_check_123')).toBeNull();
            expect(cacheManager.getMemoryCache('user_preferences')).not.toBeNull();
        });

        test('should clear localStorage by pattern', () => {
            // Set up test localStorage data
            localStorageMock.data = {
                'compliance_dashboard': 'dashboard_data',
                'compliance_check_456': 'check_data',
                'user_settings': 'settings_data'
            };
            
            // Mock window object
            global.window = {
                localStorage: localStorageMock
            };

            const cleared = cacheManager.clearStoragePattern('compliance_');
            expect(cleared).toBe(2);

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('compliance_dashboard');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('compliance_check_456');
            expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('user_settings');
        });

        test('should invalidate pattern across all layers', async () => {
            const pattern = 'compliance_';
            const subscriber = jest.fn();
            
            // Mock window object
            global.window = {
                localStorage: localStorageMock
            };
            
            cacheManager.subscribe(subscriber);
            cacheManager.setMemoryCache('compliance_test', { data: 'test' });

            const result = await cacheManager.invalidatePattern(pattern);

            expect(result.pattern).toBe(pattern);
            expect(result.memoryCleared).toBe(1);
            // Service Worker is not available in test environment, so we don't test it
            expect(subscriber).toHaveBeenCalledWith({
                type: 'invalidate',
                pattern: pattern,
                data: null,
                timestamp: expect.any(Number)
            });
        });
    });

    describe('Business Event Invalidation', () => {
        test('should get correct patterns for compliance_check_completed event', () => {
            const cuit = '20123456789';
            const patterns = cacheManager.getInvalidationPatternsForEvent(
                'compliance_check_completed', 
                { cuit }
            );

            expect(patterns).toEqual([
                `compliance_${cuit}`,
                'compliance_dashboard',
                `compliance_check_${cuit}`
            ]);
        });

        test('should get correct patterns for contributor_updated event', () => {
            const cuit = '20987654321';
            const patterns = cacheManager.getInvalidationPatternsForEvent(
                'contributor_updated',
                { cuit }
            );

            expect(patterns).toEqual([
                `contributor_${cuit}`,
                'contributors_list',
                `contributors_search_${cuit}`
            ]);
        });

        test('should get correct patterns for user_logout event', () => {
            const patterns = cacheManager.getInvalidationPatternsForEvent('user_logout');

            expect(patterns).toEqual([
                'user_',
                'auth_',
                'session_',
                'preferences_'
            ]);
        });

        test('should process business events correctly', async () => {
            const subscriber = jest.fn();
            cacheManager.subscribe(subscriber);

            const cuit = '20111222333';
            const results = await cacheManager.invalidateByBusinessEvent(
                'compliance_check_completed',
                { cuit }
            );

            expect(results).toHaveLength(3);
            expect(results[0].pattern).toBe(`compliance_${cuit}`);
            expect(results[1].pattern).toBe('compliance_dashboard');
            expect(results[2].pattern).toBe(`compliance_check_${cuit}`);

            // Should notify about business event completion
            expect(subscriber).toHaveBeenLastCalledWith({
                type: 'business_event',
                pattern: 'compliance_check_completed',
                data: {
                    originalData: { cuit },
                    results: expect.any(Array)
                },
                timestamp: expect.any(Number)
            });
        });

        test('should handle unknown business events gracefully', () => {
            const patterns = cacheManager.getInvalidationPatternsForEvent('unknown_event');
            expect(patterns).toEqual([]);
        });
    });

    describe('Cache Statistics', () => {
        test('should provide accurate cache statistics', () => {
            cacheManager.setMemoryCache('key1', 'value1');
            cacheManager.setMemoryCache('key2', 'value2');
            
            const callback = jest.fn();
            cacheManager.subscribe(callback);

            localStorageMock.data = { 'test1': 'value1', 'test2': 'value2' };
            
            // Mock window object with localStorage
            global.window = {
                localStorage: localStorageMock
            };

            const stats = cacheManager.getStats();

            expect(stats).toEqual({
                memoryCacheSize: 2,
                subscriberCount: 1,
                localStorageKeys: 2,
                businessEvents: expect.arrayContaining([
                    'compliance_check_completed',
                    'contributor_updated',
                    'user_logout',
                    'daily_sync',
                    'invoice_processed',
                    'notification_read',
                    'settings_updated'
                ]),
                timestamp: expect.any(Number)
            });
        });
    });

    describe('Nuclear Clear All', () => {
        test('should clear all caches and notify', async () => {
            const subscriber = jest.fn();
            cacheManager.subscribe(subscriber);
            
            // Mock window object
            global.window = {
                localStorage: localStorageMock,
                sessionStorage: localStorageMock // Use same mock
            };
            
            cacheManager.setMemoryCache('test1', 'value1');
            localStorageMock.data = { 'test2': 'value2' };

            await cacheManager.clearAll();

            expect(cacheManager.memoryCache.size).toBe(0);
            expect(localStorageMock.clear).toHaveBeenCalled();
            // Service Worker is not available in test environment
            expect(subscriber).toHaveBeenCalledWith({
                type: 'clear_all',
                pattern: '*',
                data: null,
                timestamp: expect.any(Number)
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle Service Worker errors gracefully', async () => {
            serviceWorkerMock.controller.postMessage.mockImplementation(() => {
                throw new Error('SW not available');
            });

            // Should not throw error
            const result = await cacheManager.invalidatePattern('test_pattern');
            expect(result.pattern).toBe('test_pattern');
        });

        test('should handle subscriber callback errors', () => {
            const goodCallback = jest.fn();
            const errorCallback = jest.fn(() => { throw new Error('Callback error'); });

            cacheManager.subscribe(goodCallback);
            cacheManager.subscribe(errorCallback);

            // Should not throw error
            expect(() => {
                cacheManager.notifySubscribers('test', 'test_pattern');
            }).not.toThrow();

            expect(goodCallback).toHaveBeenCalled();
            expect(errorCallback).toHaveBeenCalled();
        });
    });
});