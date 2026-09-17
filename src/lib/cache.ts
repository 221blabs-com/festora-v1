/**
 * Server-side in-memory TTL cache for Firestore query results.
 * Dramatically reduces Firestore reads by caching hot data.
 * 
 * Usage:
 *   import { cache } from '@/lib/cache';
 *   
 *   const events = cache.get('events:all');
 *   if (!events) {
 *     const fresh = await db.collection('events').get();
 *     cache.set('events:all', fresh, 300); // cache 5 min
 *   }
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  /**
   * Get a cached value. Returns undefined if not found or expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Set a cached value with a TTL in seconds.
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    // Evict oldest entries if we're at capacity
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000),
    });
  }

  /**
   * Invalidate a specific cache key.
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix (e.g., 'participants:')
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear entire cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache stats for debugging.
   */
  stats(): { size: number; keys: string[] } {
    // Prune expired entries first
    for (const [key, entry] of this.store.entries()) {
      if (Date.now() > entry.expiry) {
        this.store.delete(key);
      }
    }
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

// Singleton instance shared across all API routes in the same server process
export const cache = new MemoryCache();

// Predefined TTLs (in seconds)
export const CACHE_TTL = {
  EVENTS_LIST: 5 * 60,       // 5 minutes — events rarely change
  ORGANIZER_EVENTS: 5 * 60,  // 5 minutes
  PARTICIPANTS: 2 * 60,      // 2 minutes — may change with new registrations
  EVENT_STATS: 60,           // 1 minute — changes with check-ins
  EVENT_DOC: 5 * 60,         // 5 minutes — single event doc
} as const;
