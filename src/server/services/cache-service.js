/**
 * Cache Service - Maneja cache en memoria para el módulo ARCA
 * Optimizado para tokens WSAA y parámetros de AFIP
 */

import { Logger } from '../../../../utils/logger.js';

const logger = new Logger('CacheService');

export class CacheService {
    constructor(options = {}) {
        this.ttlSeconds = options.ttlSeconds || 3600; // 1 hour default
        this.maxKeys = options.maxKeys || 1000;
        this.checkPeriod = options.checkPeriod || 120; // 2 minutes

        // In-memory cache storage
        this.cache = new Map();
        this.timers = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0
        };

        // Start cleanup interval
        this.startCleanup();

        logger.info('CacheService initialized', {
            ttlSeconds: this.ttlSeconds,
            maxKeys: this.maxKeys,
            checkPeriod: this.checkPeriod
        });
    }

    /**
     * Set a value in cache
     */
    set(key, value, ttl) {
        try {
            const expiryTtl = ttl || this.ttlSeconds;
            const expiresAt = Date.now() + (expiryTtl * 1000);

            // Check if we need to evict old entries
            if (this.cache.size >= this.maxKeys) {
                this.evictOldest();
            }

            // Clear existing timer if key exists
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
            }

            // Set the value
            this.cache.set(key, {
                value,
                expiresAt,
                createdAt: Date.now()
            });

            // Set expiry timer
            const timer = setTimeout(() => {
                this.delete(key);
            }, expiryTtl * 1000);

            this.timers.set(key, timer);
            this.stats.sets++;

            logger.debug('Cache SET', { key, ttl: expiryTtl, hasValue: !!value });
            return true;
        } catch (error) {
            logger.error('Cache SET failed', { key, error: error.message });
            return false;
        }
    }

    /**
     * Get a value from cache
     */
    get(key) {
        try {
            const item = this.cache.get(key);

            if (!item) {
                this.stats.misses++;
                logger.debug('Cache MISS', { key });
                return undefined;
            }

            // Check if expired
            if (Date.now() > item.expiresAt) {
                this.delete(key);
                this.stats.misses++;
                logger.debug('Cache EXPIRED', { key });
                return undefined;
            }

            this.stats.hits++;
            logger.debug('Cache HIT', { key });
            return item.value;
        } catch (error) {
            logger.error('Cache GET failed', { key, error: error.message });
            return undefined;
        }
    }

    /**
     * Delete a key from cache
     */
    delete(key) {
        try {
            const existed = this.cache.has(key);

            if (existed) {
                this.cache.delete(key);

                // Clear timer
                if (this.timers.has(key)) {
                    clearTimeout(this.timers.get(key));
                    this.timers.delete(key);
                }

                this.stats.deletes++;
                logger.debug('Cache DELETE', { key });
            }

            return existed ? 1 : 0;
        } catch (error) {
            logger.error('Cache DELETE failed', { key, error: error.message });
            return 0;
        }
    }

    /**
     * Check if key exists in cache
     */
    has(key) {
        try {
            const item = this.cache.get(key);

            if (!item) {
                return false;
            }

            // Check if expired
            if (Date.now() > item.expiresAt) {
                this.delete(key);
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Cache HAS failed', { key, error: error.message });
            return false;
        }
    }

    /**
     * Get multiple values from cache
     */
    mget(keys) {
        const result = {};

        keys.forEach(key => {
            const value = this.get(key);
            if (value !== undefined) {
                result[key] = value;
            }
        });

        return result;
    }

    /**
     * Set multiple values in cache
     */
    mset(keyValues) {
        let success = true;

        keyValues.forEach(({ key, val, ttl }) => {
            if (!this.set(key, val, ttl)) {
                success = false;
            }
        });

        return success;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;

        return {
            keys: this.cache.size,
            hits: this.stats.hits,
            misses: this.stats.misses,
            sets: this.stats.sets,
            deletes: this.stats.deletes,
            evictions: this.stats.evictions,
            hitRate: Math.round(hitRate * 100) / 100,
            maxKeys: this.maxKeys,
            memorySize: this.getMemorySize()
        };
    }

    /**
     * Get approximate memory size of cache
     */
    getMemorySize() {
        let size = 0;

        this.cache.forEach((item, key) => {
            size += JSON.stringify(key).length;
            size += JSON.stringify(item.value).length;
            size += 24; // Approximate overhead per entry
        });

        return size;
    }

    /**
     * Clear all cached data
     */
    flush() {
        try {
            // Clear all timers
            this.timers.forEach(timer => clearTimeout(timer));
            this.timers.clear();

            // Clear cache
            this.cache.clear();

            // Reset stats
            this.stats = {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                evictions: 0
            };

            logger.info('Cache FLUSHED');
        } catch (error) {
            logger.error('Cache FLUSH failed', { error: error.message });
        }
    }

    /**
     * Get all keys in cache
     */
    keys() {
        try {
            return Array.from(this.cache.keys());
        } catch (error) {
            logger.error('Cache KEYS failed', { error: error.message });
            return [];
        }
    }

    /**
     * Set TTL for existing key
     */
    ttl(key, ttlSeconds) {
        try {
            const item = this.cache.get(key);

            if (!item) {
                return false;
            }

            // Update expiry time
            item.expiresAt = Date.now() + (ttlSeconds * 1000);

            // Clear existing timer
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
            }

            // Set new timer
            const timer = setTimeout(() => {
                this.delete(key);
            }, ttlSeconds * 1000);

            this.timers.set(key, timer);

            return true;
        } catch (error) {
            logger.error('Cache TTL failed', { key, ttl: ttlSeconds, error: error.message });
            return false;
        }
    }

    /**
     * Get TTL for key (in milliseconds)
     */
    getTtl(key) {
        try {
            const item = this.cache.get(key);

            if (!item) {
                return undefined;
            }

            const ttl = item.expiresAt - Date.now();
            return ttl > 0 ? ttl : 0;
        } catch (error) {
            logger.error('Cache GET_TTL failed', { key, error: error.message });
            return undefined;
        }
    }

    /**
     * Cache with fallback pattern
     */
    async getOrSet(key, fallbackFn, ttl) {
        const cached = this.get(key);

        if (cached !== undefined) {
            return cached;
        }

        try {
            logger.debug('Cache miss, executing fallback', { key });
            const value = await fallbackFn();
            this.set(key, value, ttl);
            return value;
        } catch (error) {
            logger.error('Cache fallback failed', { key, error: error.message });
            throw error;
        }
    }

    /**
     * Cache with refresh pattern (returns cached value but refreshes in background)
     */
    async getWithRefresh(key, refreshFn, ttl, refreshThreshold) {
        const cached = this.get(key);

        if (cached !== undefined) {
            // Check if we should refresh in background
            const keyTtl = this.getTtl(key);
            const threshold = (refreshThreshold || ttl || this.ttlSeconds) * 1000;

            if (keyTtl && keyTtl < (threshold * 0.2)) {
                // Refresh in background if TTL is less than 20% of original
                setImmediate(async () => {
                    try {
                        const freshValue = await refreshFn();
                        this.set(key, freshValue, ttl);
                        logger.debug('Background cache refresh completed', { key });
                    } catch (error) {
                        logger.error('Background cache refresh failed', { key, error: error.message });
                    }
                });
            }

            return cached;
        }

        // No cached value, fetch synchronously
        return this.getOrSet(key, refreshFn, ttl);
    }

    /**
     * Namespace support for cache keys
     */
    namespace(ns) {
        return {
            set: (key, value, ttl) => this.set(`${ns}:${key}`, value, ttl),
            get: (key) => this.get(`${ns}:${key}`),
            delete: (key) => this.delete(`${ns}:${key}`),
            has: (key) => this.has(`${ns}:${key}`),
            flush: () => {
                const nsKeys = this.keys().filter(k => k.startsWith(`${ns}:`));
                nsKeys.forEach(k => this.delete(k));
            },
            getOrSet: (key, fallbackFn, ttl) =>
                this.getOrSet(`${ns}:${key}`, fallbackFn, ttl),
            getWithRefresh: (key, refreshFn, ttl, refreshThreshold) =>
                this.getWithRefresh(`${ns}:${key}`, refreshFn, ttl, refreshThreshold)
        };
    }

    /**
     * Evict oldest entries when cache is full
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();

        this.cache.forEach((item, key) => {
            if (item.createdAt < oldestTime) {
                oldestTime = item.createdAt;
                oldestKey = key;
            }
        });

        if (oldestKey) {
            this.delete(oldestKey);
            this.stats.evictions++;
            logger.debug('Cache EVICTED oldest entry', { key: oldestKey });
        }
    }

    /**
     * Start cleanup interval for expired entries
     */
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            const keysToDelete = [];

            this.cache.forEach((item, key) => {
                if (now > item.expiresAt) {
                    keysToDelete.push(key);
                }
            });

            keysToDelete.forEach(key => {
                this.delete(key);
            });

            if (keysToDelete.length > 0) {
                logger.debug('Cache cleanup completed', {
                    expiredKeys: keysToDelete.length,
                    remainingKeys: this.cache.size
                });
            }
        }, this.checkPeriod * 1000);
    }

    /**
     * Shutdown cache service
     */
    shutdown() {
        logger.info('Shutting down CacheService...');

        // Clear all timers
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();

        // Clear cache
        this.cache.clear();

        logger.info('CacheService shutdown complete');
    }
}