const NodeCache = require('node-cache');

/**
 * High-Performance In-Memory Cache Service
 * Optimized for Render 512 MB dynos and TiDB Cloud Serverless.
 * Prevents redundant SQL round-trips for high-frequency read endpoints
 * (questions, active sessions, department directory).
 */
const cache = new NodeCache({
  stdTTL: 600,         // Default: 10 minutes
  checkperiod: 120,    // Garbage-collect expired keys every 2 minutes
  maxKeys: 500,        // Strict memory ceiling (<5 MB RAM usage)
  useClones: false     // Zero-copy returns for maximum throughput
});

const cacheService = {
  /**
   * Retrieve item from memory cache
   * @param {string} key 
   * @returns {any}
   */
  get: (key) => {
    return cache.get(key);
  },

  /**
   * Set item in memory cache with optional custom TTL
   * @param {string} key 
   * @param {any} val 
   * @param {number} [ttlSeconds] 
   * @returns {boolean}
   */
  set: (key, val, ttlSeconds) => {
    if (ttlSeconds !== undefined) {
      return cache.set(key, val, ttlSeconds);
    }
    return cache.set(key, val);
  },

  /**
   * Delete specific key
   * @param {string|string[]} key 
   * @returns {number} count of deleted keys
   */
  del: (key) => {
    return cache.del(key);
  },

  /**
   * Delete all keys matching a prefix or wildcard pattern (e.g. 'questions:*')
   * @param {string} patternPrefix 
   * @returns {number} count of deleted keys
   */
  delPattern: (patternPrefix) => {
    try {
      const keys = cache.keys();
      const prefix = patternPrefix.replace('*', '');
      const matched = keys.filter(k => k.startsWith(prefix));
      if (matched.length > 0) {
        const deleted = cache.del(matched);
        console.log(`🧹 [Cache Invalidation] Purged ${deleted} keys matching '${patternPrefix}'`);
        return deleted;
      }
      return 0;
    } catch (err) {
      console.warn("Cache pattern deletion warning:", err.message);
      return 0;
    }
  },

  /**
   * Clear entire cache
   */
  flush: () => {
    return cache.flushAll();
  },

  /**
   * Observability metrics
   */
  getStats: () => {
    return {
      keys: cache.keys().length,
      stats: cache.getStats()
    };
  }
};

module.exports = cacheService;
