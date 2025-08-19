/**
 * Cache Manager - Central system for coordinated cache invalidation
 * Phase 3 implementation for AFIP Monitor MCP
 */

class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.subscribers = new Set();
        this.businessEventPatterns = this.initBusinessEventPatterns();
    }

    /**
     * Initialize mapping of business events to cache patterns
     */
    initBusinessEventPatterns() {
        return {
            'compliance_check_completed': (data) => [
                `compliance_${data.cuit}`, 
                'compliance_dashboard',
                `compliance_check_${data.cuit}`
            ],
            'contributor_updated': (data) => [
                `contributor_${data.cuit}`, 
                'contributors_list',
                `contributors_search_${data.cuit}`
            ],
            'user_logout': () => [
                'user_',
                'auth_',
                'session_',
                'preferences_'
            ],
            'user_login': (data) => [
                `auth_session_${data.userId}`,
                'auth_tokens',
                `user_preferences_${data.userId}`,
                'stale_auth_data'
            ],
            'user_registered': (data) => [
                'auth_signup_data',
                `temp_user_${data.email}`,
                'registration_cache'
            ],
            'daily_sync': () => [
                'compliance_',
                'metrics_',
                'dashboard_',
                'contributors_list'
            ],
            'invoice_processed': (data) => [
                `invoice_${data.invoiceId}`,
                `invoices_${data.cuit}`,
                'invoices_dashboard'
            ],
            'notification_read': (data) => [
                `notifications_${data.userId}`,
                'notifications_count'
            ],
            'settings_updated': (data) => [
                `user_preferences_${data.userId}`,
                'app_settings'
            ]
        };
    }

    /**
     * Clear memory cache entries matching a pattern
     */
    clearMemoryPattern(pattern) {
        const keysToDelete = [];
        for (const [key] of this.memoryCache) {
            if (this.matchesPattern(key, pattern)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.memoryCache.delete(key);
            console.debug(`CacheManager: Cleared memory cache for ${key}`);
        });
        
        return keysToDelete.length;
    }

    /**
     * Clear localStorage entries matching a pattern
     */
    clearStoragePattern(pattern) {
        if (typeof window === 'undefined' || !window.localStorage) {
            return 0;
        }
        
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && this.matchesPattern(key, pattern)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            localStorage.removeItem(key);
            console.debug(`CacheManager: Cleared localStorage for ${key}`);
        });
        
        return keysToDelete.length;
    }

    /**
     * Check if a key matches a pattern (supports wildcards)
     */
    matchesPattern(key, pattern) {
        if (pattern.endsWith('_')) {
            return key.startsWith(pattern);
        }
        return key === pattern || key.includes(pattern);
    }

    /**
     * Send message to Service Worker for cache invalidation
     */
    async sendToServiceWorker(message) {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                navigator.serviceWorker.controller.postMessage(message);
                console.debug('CacheManager: Message sent to Service Worker', message);
            } catch (error) {
                console.warn('CacheManager: Failed to send message to Service Worker', error);
            }
        }
    }

    /**
     * Notify all subscribers about cache invalidation
     */
    notifySubscribers(type, pattern, data = null) {
        const message = { type, pattern, data, timestamp: Date.now() };
        
        this.subscribers.forEach(callback => {
            try {
                callback(message);
            } catch (error) {
                console.error('CacheManager: Error notifying subscriber', error);
            }
        });
        
        console.debug(`CacheManager: Notified ${this.subscribers.size} subscribers`, message);
    }

    /**
     * Subscribe to cache invalidation events
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Get cache patterns for a business event
     */
    getInvalidationPatternsForEvent(event, data) {
        const patternGenerator = this.businessEventPatterns[event];
        if (!patternGenerator) {
            console.warn(`CacheManager: No patterns defined for event "${event}"`);
            return [];
        }
        
        return patternGenerator(data || {});
    }

    /**
     * Invalidate cache by pattern across all layers
     */
    async invalidatePattern(pattern) {
        console.info(`CacheManager: Invalidating pattern "${pattern}"`);
        
        try {
            // 1. Clear memory cache
            const memoryCleared = this.clearMemoryPattern(pattern);
            
            // 2. Send message to Service Worker
            await this.sendToServiceWorker({
                type: 'INVALIDATE_PATTERN',
                pattern: pattern,
                timestamp: Date.now()
            });
            
            // 3. Clear localStorage selectively
            const storageCleared = this.clearStoragePattern(pattern);
            
            // 4. Notify subscribers (React components)
            this.notifySubscribers('invalidate', pattern);
            
            console.info(`CacheManager: Pattern "${pattern}" invalidated. Memory: ${memoryCleared}, Storage: ${storageCleared}`);
            
            return {
                pattern,
                memoryCleared,
                storageCleared,
                timestamp: Date.now()
            };
            
        } catch (error) {
            console.error(`CacheManager: Error invalidating pattern "${pattern}"`, error);
            throw error;
        }
    }

    /**
     * Invalidate cache based on business event
     */
    async invalidateByBusinessEvent(event, data = null) {
        console.info(`CacheManager: Processing business event "${event}"`, data);
        
        const patterns = this.getInvalidationPatternsForEvent(event, data);
        const results = [];
        
        for (const pattern of patterns) {
            try {
                const result = await this.invalidatePattern(pattern);
                results.push(result);
            } catch (error) {
                console.error(`CacheManager: Failed to invalidate pattern "${pattern}" for event "${event}"`, error);
                results.push({ pattern, error: error.message });
            }
        }
        
        // Notify about business event completion
        this.notifySubscribers('business_event', event, { originalData: data, results });
        
        return results;
    }

    /**
     * Force clear all caches (nuclear option)
     */
    async clearAll() {
        console.warn('CacheManager: Clearing ALL caches');
        
        try {
            // Clear memory cache
            this.memoryCache.clear();
            
            // Clear all localStorage (if available)
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.clear();
            }
            
            // Clear sessionStorage (if available)
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.clear();
            }
            
            // Send message to Service Worker to clear all
            await this.sendToServiceWorker({
                type: 'CLEAR_ALL_CACHES',
                timestamp: Date.now()
            });
            
            // Notify subscribers
            this.notifySubscribers('clear_all', '*');
            
            console.info('CacheManager: All caches cleared');
            
        } catch (error) {
            console.error('CacheManager: Error clearing all caches', error);
            throw error;
        }
    }

    /**
     * Get cache statistics for debugging
     */
    getStats() {
        const localStorageLength = (typeof window !== 'undefined' && window.localStorage) 
            ? localStorage.length 
            : 0;
            
        return {
            memoryCacheSize: this.memoryCache.size,
            subscriberCount: this.subscribers.size,
            localStorageKeys: localStorageLength,
            businessEvents: Object.keys(this.businessEventPatterns),
            timestamp: Date.now()
        };
    }

    /**
     * Set cache entry in memory
     */
    setMemoryCache(key, value, ttl = 300000) { // 5 min default
        const expiry = Date.now() + ttl;
        this.memoryCache.set(key, { value, expiry });
    }

    /**
     * Get cache entry from memory
     */
    getMemoryCache(key) {
        const cached = this.memoryCache.get(key);
        if (!cached) return null;
        
        if (Date.now() > cached.expiry) {
            this.memoryCache.delete(key);
            return null;
        }
        
        return cached.value;
    }

    /**
     * Check if cache entry exists and is valid
     */
    hasValidCache(key) {
        const cached = this.memoryCache.get(key);
        return cached && Date.now() <= cached.expiry;
    }
}

// Create singleton instance
export const cacheManager = new CacheManager();

// Export class for testing
export { CacheManager };

// Initialize Service Worker message listener (only in browser environment)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, pattern, data } = event.data;
        
        if (type === 'CACHE_INVALIDATED') {
            console.debug('CacheManager: Received cache invalidation from SW', pattern);
            cacheManager.notifySubscribers('sw_invalidate', pattern, data);
        }
    });
}