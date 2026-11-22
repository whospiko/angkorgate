import { SetMetadata } from '@nestjs/common';

export const CACHEABLE_METADATA = 'CACHEABLE_METADATA';
export const CACHE_EVICT_METADATA = 'CACHE_EVICT_METADATA';

export interface CacheableOptions {
    key: string | ((...args: any[]) => string);
    ttl?: number; // TTL in seconds
}

export interface CacheEvictOptions {
    key?: string | ((...args: any[]) => string);
    pattern?: string | ((...args: any[]) => string);
}

/**
 * Decorator to indicate that a method result should be cached.
 */
export const Cacheable = (options: CacheableOptions) =>
    SetMetadata(CACHEABLE_METADATA, options);

/**
 * Decorator to invalidate cache entries when a mutating method is called.
 */
export const CacheEvict = (options: CacheEvictOptions) =>
    SetMetadata(CACHE_EVICT_METADATA, options);
