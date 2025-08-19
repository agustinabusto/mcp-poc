/**
 * Cache Invalidation Hook - Phase 3 implementation
 * Provides React components with cache invalidation capabilities
 */

import { useCallback, useEffect, useRef } from 'react';
import { cacheManager } from '../services/cache-manager.js';

export const useCacheInvalidation = (options = {}) => {
    // Accept optional navigate function from parent component
    const navigate = options.navigate;
    const unsubscribeRef = useRef(null);
    const invalidationCallbacksRef = useRef(new Map());

    /**
     * Subscribe to cache invalidation events
     */
    useEffect(() => {
        const handleCacheInvalidation = (message) => {
            const { type, pattern, data } = message;
            
            // Execute registered callbacks for this pattern
            invalidationCallbacksRef.current.forEach((callback, callbackPattern) => {
                if (pattern.includes(callbackPattern) || callbackPattern === '*') {
                    try {
                        callback(message);
                    } catch (error) {
                        console.error('useCacheInvalidation: Callback error', error);
                    }
                }
            });
            
            console.debug('useCacheInvalidation: Cache invalidation event', message);
        };

        // Subscribe to cache manager events
        unsubscribeRef.current = cacheManager.subscribe(handleCacheInvalidation);

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    /**
     * Invalidate cache based on business event
     */
    const invalidateOnEvent = useCallback(async (event, data) => {
        try {
            console.log(`useCacheInvalidation: Triggering business event "${event}"`, data);
            const results = await cacheManager.invalidateByBusinessEvent(event, data);
            return results;
        } catch (error) {
            console.error(`useCacheInvalidation: Error processing event "${event}"`, error);
            throw error;
        }
    }, []);

    /**
     * Invalidate cache by pattern
     */
    const invalidatePattern = useCallback(async (pattern) => {
        try {
            console.log(`useCacheInvalidation: Invalidating pattern "${pattern}"`);
            const result = await cacheManager.invalidatePattern(pattern);
            return result;
        } catch (error) {
            console.error(`useCacheInvalidation: Error invalidating pattern "${pattern}"`, error);
            throw error;
        }
    }, []);

    /**
     * Complete logout with comprehensive cache cleanup (without navigation)
     * Components should handle navigation separately
     */
    const logoutWithCacheCleanup = useCallback(async () => {
        try {
            console.log('useCacheInvalidation: Performing logout with cache cleanup');
            
            // Trigger user logout business event
            await cacheManager.invalidateByBusinessEvent('user_logout');
            
            // Clear all local storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear Service Worker caches
            await cacheManager.clearAll();
            
            console.log('useCacheInvalidation: Logout and cache cleanup completed');
            
            return { success: true, message: 'Cache cleanup completed' };
        } catch (error) {
            console.error('useCacheInvalidation: Error during logout cleanup', error);
            throw error;
        }
    }, []);

    /**
     * Complete logout with navigation (for components that can provide navigate function)
     */
    const logoutWithNavigation = useCallback(async (navigateFunction) => {
        try {
            await logoutWithCacheCleanup();
            
            if (navigateFunction) {
                navigateFunction('/login');
            } else if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        } catch (error) {
            // Even if cache cleanup fails, still navigate
            if (navigateFunction) {
                navigateFunction('/login');
            } else if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
            throw error;
        }
    }, [logoutWithCacheCleanup]);

    /**
     * Register callback for specific cache invalidation patterns
     */
    const onCacheInvalidated = useCallback((pattern, callback) => {
        invalidationCallbacksRef.current.set(pattern, callback);
        
        // Return cleanup function
        return () => {
            invalidationCallbacksRef.current.delete(pattern);
        };
    }, []);

    /**
     * Force refresh data after cache invalidation
     */
    const refreshAfterInvalidation = useCallback(async (pattern, refreshCallback) => {
        try {
            await cacheManager.invalidatePattern(pattern);
            if (refreshCallback && typeof refreshCallback === 'function') {
                await refreshCallback();
            }
        } catch (error) {
            console.error('useCacheInvalidation: Error during refresh after invalidation', error);
            throw error;
        }
    }, []);

    /**
     * Get cache statistics for debugging
     */
    const getCacheStats = useCallback(async () => {
        try {
            const stats = cacheManager.getStats();
            
            // Also get Service Worker stats if available
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                return new Promise((resolve) => {
                    const channel = new MessageChannel();
                    
                    channel.port1.onmessage = (event) => {
                        resolve({
                            ...stats,
                            serviceWorker: event.data.stats || null
                        });
                    };
                    
                    navigator.serviceWorker.controller.postMessage({
                        type: 'GET_CACHE_STATS'
                    }, [channel.port2]);
                    
                    // Timeout fallback
                    setTimeout(() => {
                        resolve(stats);
                    }, 1000);
                });
            }
            
            return stats;
        } catch (error) {
            console.error('useCacheInvalidation: Error getting cache stats', error);
            return null;
        }
    }, []);

    /**
     * Invalidate specific contributor data
     */
    const invalidateContributor = useCallback(async (cuit) => {
        return invalidateOnEvent('contributor_updated', { cuit });
    }, [invalidateOnEvent]);

    /**
     * Invalidate compliance data for specific contributor
     */
    const invalidateCompliance = useCallback(async (cuit) => {
        return invalidateOnEvent('compliance_check_completed', { cuit });
    }, [invalidateOnEvent]);

    /**
     * Invalidate invoice data
     */
    const invalidateInvoice = useCallback(async (invoiceId, cuit) => {
        return invalidateOnEvent('invoice_processed', { invoiceId, cuit });
    }, [invalidateOnEvent]);

    /**
     * Mark notifications as read and invalidate
     */
    const markNotificationsRead = useCallback(async (userId) => {
        return invalidateOnEvent('notification_read', { userId });
    }, [invalidateOnEvent]);

    /**
     * Invalidate user settings
     */
    const invalidateSettings = useCallback(async (userId) => {
        return invalidateOnEvent('settings_updated', { userId });
    }, [invalidateOnEvent]);

    /**
     * Trigger daily sync invalidation
     */
    const triggerDailySync = useCallback(async () => {
        return invalidateOnEvent('daily_sync');
    }, [invalidateOnEvent]);

    return {
        // Core invalidation methods
        invalidateOnEvent,
        invalidatePattern,
        logoutWithCacheCleanup,
        logoutWithNavigation,
        
        // Callback registration
        onCacheInvalidated,
        refreshAfterInvalidation,
        
        // Utilities
        getCacheStats,
        
        // Business-specific invalidation helpers
        invalidateContributor,
        invalidateCompliance,
        invalidateInvoice,
        markNotificationsRead,
        invalidateSettings,
        triggerDailySync
    };
};

/**
 * Higher-order component to provide cache invalidation context
 */
export const withCacheInvalidation = (Component) => {
    return function CacheInvalidationWrapper(props) {
        const cacheInvalidation = useCacheInvalidation();
        return React.createElement(Component, { ...props, cacheInvalidation });
    };
};