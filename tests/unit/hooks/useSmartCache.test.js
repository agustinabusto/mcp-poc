// tests/unit/hooks/useSmartCache.test.js
/**
 * Tests para useSmartCache hook
 * Nota: Tests básicos sin React Testing Library debido a configuración ES modules
 */

// Mock básico de React hooks
const mockUseState = jest.fn();
const mockUseCallback = jest.fn();
const mockUseMemo = jest.fn();
const mockUseRef = jest.fn();
const mockUseEffect = jest.fn();

jest.mock('react', () => ({
    useState: (...args) => mockUseState(...args),
    useCallback: (...args) => mockUseCallback(...args),
    useMemo: (...args) => mockUseMemo(...args),
    useRef: (...args) => mockUseRef(...args),
    useEffect: (...args) => mockUseEffect(...args)
}));

// Mock Storage APIs
const createMockStorage = () => {
    const storage = {};
    return {
        getItem: jest.fn((key) => storage[key] || null),
        setItem: jest.fn((key, value) => {
            storage[key] = value;
        }),
        removeItem: jest.fn((key) => {
            delete storage[key];
        }),
        clear: jest.fn(() => {
            Object.keys(storage).forEach(key => delete storage[key]);
        })
    };
};

// Setup mocks
const mockSessionStorage = createMockStorage();
const mockLocalStorage = createMockStorage();

Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage
});

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage
});

describe('useSmartCache', () => {
    let mockFetcher;
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetcher = jest.fn();
        mockSessionStorage.clear();
        mockLocalStorage.clear();
        
        // Reset console warnings
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Basic Functionality', () => {
        test('should initialize with default state', () => {
            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher)
            );

            expect(result.current.data).toBeNull();
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.hasData).toBe(false);
            expect(result.current.hasError).toBe(false);
        });

        test('should fetch data on first call', async () => {
            const testData = { id: 1, name: 'test' };
            mockFetcher.mockResolvedValue(testData);

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher)
            );

            let fetchPromise;
            act(() => {
                fetchPromise = result.current.refetch();
            });

            expect(result.current.loading).toBe(true);
            
            await act(async () => {
                await fetchPromise;
            });

            expect(result.current.data).toEqual(testData);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.hasData).toBe(true);
            expect(mockFetcher).toHaveBeenCalledTimes(1);
        });

        test('should handle fetch errors', async () => {
            const error = new Error('Fetch failed');
            mockFetcher.mockRejectedValue(error);

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher)
            );

            let fetchPromise;
            act(() => {
                fetchPromise = result.current.refetch();
            });

            await act(async () => {
                try {
                    await fetchPromise;
                } catch (e) {
                    // Expected error
                }
            });

            expect(result.current.data).toBeNull();
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBe('Fetch failed');
            expect(result.current.hasError).toBe(true);
        });
    });

    describe('Caching Behavior', () => {
        test('should return cached data on subsequent calls', async () => {
            const testData = { id: 1, name: 'test' };
            mockFetcher.mockResolvedValue(testData);

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher)
            );

            // First fetch
            await act(async () => {
                await result.current.refetch();
            });

            expect(mockFetcher).toHaveBeenCalledTimes(1);

            // Second fetch should use cache
            await act(async () => {
                await result.current.refetch();
            });

            expect(mockFetcher).toHaveBeenCalledTimes(1); // No additional call
            expect(result.current.data).toEqual(testData);
        });

        test('should respect TTL and refetch expired data', async () => {
            const testData1 = { id: 1, name: 'test1' };
            const testData2 = { id: 2, name: 'test2' };
            
            mockFetcher
                .mockResolvedValueOnce(testData1)
                .mockResolvedValueOnce(testData2);

            const shortTTL = 100; // 100ms

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher, { ttl: shortTTL })
            );

            // First fetch
            await act(async () => {
                await result.current.refetch();
            });

            expect(result.current.data).toEqual(testData1);
            expect(mockFetcher).toHaveBeenCalledTimes(1);

            // Wait for TTL to expire
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, shortTTL + 50));
            });

            // Second fetch should refetch due to expired cache
            await act(async () => {
                await result.current.refetch();
            });

            expect(mockFetcher).toHaveBeenCalledTimes(2);
            expect(result.current.data).toEqual(testData2);
        });

        test('should handle different cache keys for different arguments', async () => {
            const testData1 = { id: 1, name: 'user1' };
            const testData2 = { id: 2, name: 'user2' };
            
            mockFetcher
                .mockImplementation((userId) => 
                    Promise.resolve(userId === 1 ? testData1 : testData2)
                );

            const { result } = renderHook(() => 
                useSmartCache('user-data', mockFetcher)
            );

            // Fetch user 1
            await act(async () => {
                await result.current.refetch(1);
            });

            expect(result.current.data).toEqual(testData1);

            // Fetch user 2
            await act(async () => {
                await result.current.refetch(2);
            });

            expect(result.current.data).toEqual(testData2);
            expect(mockFetcher).toHaveBeenCalledTimes(2);

            // Fetch user 1 again (should use cache)
            await act(async () => {
                await result.current.refetch(1);
            });

            expect(mockFetcher).toHaveBeenCalledTimes(2); // No additional call
        });
    });

    describe('Stale While Revalidate', () => {
        test('should return stale data immediately and update in background', async () => {
            const staleData = { id: 1, name: 'stale' };
            const freshData = { id: 1, name: 'fresh' };
            
            mockFetcher
                .mockResolvedValueOnce(staleData)
                .mockResolvedValueOnce(freshData);

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher, { 
                    ttl: 100,
                    staleWhileRevalidate: true 
                })
            );

            // First fetch to populate cache
            await act(async () => {
                await result.current.refetch();
            });

            expect(result.current.data).toEqual(staleData);

            // Wait for TTL to expire
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 150));
            });

            // This should return stale data immediately and fetch fresh in background
            await act(async () => {
                const data = await result.current.refetch();
                expect(data).toEqual(staleData); // Returns stale immediately
            });

            // Wait for background update
            await waitFor(() => {
                expect(result.current.data).toEqual(freshData);
            }, { timeout: 1000 });

            expect(mockFetcher).toHaveBeenCalledTimes(2);
        });
    });

    describe('Cache Storage Levels', () => {
        test('should use memory cache by default', async () => {
            const testData = { id: 1, name: 'test' };
            mockFetcher.mockResolvedValue(testData);

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher)
            );

            await act(async () => {
                await result.current.refetch();
            });

            expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
            expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
        });

        test('should use session storage when specified', async () => {
            const testData = { id: 1, name: 'test' };
            mockFetcher.mockResolvedValue(testData);

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher, { cacheLevel: 'session' })
            );

            await act(async () => {
                await result.current.refetch();
            });

            expect(mockSessionStorage.setItem).toHaveBeenCalled();
            expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
        });

        test('should use local storage when specified', async () => {
            const testData = { id: 1, name: 'test' };
            mockFetcher.mockResolvedValue(testData);

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher, { cacheLevel: 'local' })
            );

            await act(async () => {
                await result.current.refetch();
            });

            expect(mockLocalStorage.setItem).toHaveBeenCalled();
            expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
        });
    });

    describe('Cache Management', () => {
        test('should clear cache for specific pattern', async () => {
            const testData = { id: 1, name: 'test' };
            mockFetcher.mockResolvedValue(testData);

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher)
            );

            await act(async () => {
                await result.current.refetch();
            });

            expect(result.current.data).toEqual(testData);

            // Clear cache
            act(() => {
                result.current.clearCache();
            });

            // Next fetch should call the fetcher again
            mockFetcher.mockResolvedValue({ id: 2, name: 'new' });
            
            await act(async () => {
                await result.current.refetch();
            });

            expect(mockFetcher).toHaveBeenCalledTimes(2);
        });

        test('should invalidate and refetch data', async () => {
            const oldData = { id: 1, name: 'old' };
            const newData = { id: 1, name: 'new' };
            
            mockFetcher
                .mockResolvedValueOnce(oldData)
                .mockResolvedValueOnce(newData);

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher)
            );

            // First fetch
            await act(async () => {
                await result.current.refetch();
            });

            expect(result.current.data).toEqual(oldData);

            // Invalidate and refetch
            await act(async () => {
                await result.current.invalidateAndRefetch();
            });

            expect(result.current.data).toEqual(newData);
            expect(mockFetcher).toHaveBeenCalledTimes(2);
        });

        test('should provide cache statistics', async () => {
            const testData = { id: 1, name: 'test' };
            mockFetcher.mockResolvedValue(testData);

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher, { ttl: 300000 })
            );

            await act(async () => {
                await result.current.refetch();
            });

            const stats = result.current.getCacheStats();
            
            expect(stats).toMatchObject({
                totalEntries: 1,
                cacheLevel: 'memory',
                ttl: 300000
            });
            expect(stats.entries).toHaveLength(1);
            expect(stats.entries[0]).toHaveProperty('key');
            expect(stats.entries[0]).toHaveProperty('timestamp');
            expect(stats.entries[0]).toHaveProperty('age');
            expect(stats.entries[0]).toHaveProperty('expired');
        });
    });

    describe('Dependency Tracking', () => {
        test('should recalculate cache key when dependencies change', async () => {
            const testData1 = { id: 1, name: 'test1' };
            const testData2 = { id: 2, name: 'test2' };
            
            mockFetcher
                .mockResolvedValueOnce(testData1)
                .mockResolvedValueOnce(testData2);

            let dependency = 'dep1';

            const { result, rerender } = renderHook(() => 
                useSmartCache('test-key', mockFetcher, { dependsOn: [dependency] })
            );

            // First fetch
            await act(async () => {
                await result.current.refetch();
            });

            expect(result.current.data).toEqual(testData1);
            expect(mockFetcher).toHaveBeenCalledTimes(1);

            // Change dependency and rerender
            dependency = 'dep2';
            rerender();

            // Should refetch due to dependency change
            await act(async () => {
                await result.current.refetch();
            });

            expect(mockFetcher).toHaveBeenCalledTimes(2);
        });
    });

    describe('Error Handling', () => {
        test('should handle storage errors gracefully', async () => {
            const testData = { id: 1, name: 'test' };
            mockFetcher.mockResolvedValue(testData);

            // Mock storage error
            mockSessionStorage.setItem.mockImplementation(() => {
                throw new Error('Storage full');
            });

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher, { cacheLevel: 'session' })
            );

            // Should not throw error
            await act(async () => {
                await result.current.refetch();
            });

            expect(result.current.data).toEqual(testData);
            expect(console.warn).toHaveBeenCalledWith(
                'Session storage full, falling back to memory cache'
            );
        });

        test('should handle invalid JSON in storage', async () => {
            const testData = { id: 1, name: 'test' };
            mockFetcher.mockResolvedValue(testData);

            // Mock invalid JSON
            mockSessionStorage.getItem.mockReturnValue('invalid json');

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher, { cacheLevel: 'session' })
            );

            // Should fetch fresh data
            await act(async () => {
                await result.current.refetch();
            });

            expect(result.current.data).toEqual(testData);
            expect(mockFetcher).toHaveBeenCalledTimes(1);
        });
    });

    describe('Request Deduplication', () => {
        test('should deduplicate concurrent requests', async () => {
            const testData = { id: 1, name: 'test' };
            let resolveCount = 0;
            
            mockFetcher.mockImplementation(() => {
                resolveCount++;
                return new Promise(resolve => {
                    setTimeout(() => resolve(testData), 100);
                });
            });

            const { result } = renderHook(() => 
                useSmartCache('test-key', mockFetcher)
            );

            // Start multiple concurrent requests
            const promises = [
                result.current.refetch(),
                result.current.refetch(),
                result.current.refetch()
            ];

            await act(async () => {
                await Promise.all(promises);
            });

            // Should only make one actual fetch call
            expect(mockFetcher).toHaveBeenCalledTimes(1);
            expect(resolveCount).toBe(1);
        });
    });
});