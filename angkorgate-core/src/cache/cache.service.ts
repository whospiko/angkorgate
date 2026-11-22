import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';
import { CacheStatus } from './interfaces/cache.interface';

interface MemoryCacheEntry {
    value: string;
    expiresAt: number | null;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);
    private redisClient: RedisClient | null = null;
    private readonly memoryCache = new Map<string, MemoryCacheEntry>();
    private cleanupTimer: NodeJS.Timeout | null = null;

    private readonly isEnabled: boolean;
    private readonly prefix: string;
    private readonly defaultTtl: number;
    private isRedisConnected = false;

    constructor(private readonly config: ConfigService) {
        this.isEnabled = this.config.get<boolean>('redis.enabled', false);
        this.prefix = this.config.get<string>('redis.keyPrefix', 'angkorgate:');
        this.defaultTtl = this.config.get<number>('redis.defaultTtl', 300);
    }

    async onModuleInit(): Promise<void> {
        this.initMemoryCleanup();

        if (!this.isEnabled) {
            this.logger.log('Redis cache disabled by configuration (using in-memory cache engine)');
            return;
        }

        try {
            const host = this.config.get<string>('redis.host', 'localhost');
            const port = this.config.get<number>('redis.port', 6379);
            const password = this.config.get<string>('redis.password');
            const db = this.config.get<number>('redis.db', 0);

            this.redisClient = new Redis({
                host,
                port,
                password: password || undefined,
                db,
                lazyConnect: true,
                maxRetriesPerRequest: 1,
                connectTimeout: 3000,
                retryStrategy: (times) => {
                    if (times > 5) {
                        return null; // Stop reconnecting after 5 consecutive failures
                    }
                    return Math.min(times * 200, 2000);
                },
            });

            this.redisClient.on('connect', () => {
                this.isRedisConnected = true;
                this.logger.log(`Redis connected to ${host}:${port}/${db}`);
            });

            this.redisClient.on('ready', () => {
                this.isRedisConnected = true;
            });

            this.redisClient.on('error', (err) => {
                this.isRedisConnected = false;
                this.logger.warn(`Redis connection error: ${err.message}. Operating in memory fallback mode.`);
            });

            this.redisClient.on('close', () => {
                this.isRedisConnected = false;
            });

            await this.redisClient.connect().catch((err) => {
                this.isRedisConnected = false;
                this.logger.warn(`Failed initial Redis connection: ${err.message}. Using in-memory fallback.`);
            });
        } catch (err) {
            this.isRedisConnected = false;
            this.logger.warn(`Failed to initialize Redis client: ${(err as Error).message}. Using in-memory fallback.`);
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        if (this.redisClient) {
            try {
                this.redisClient.disconnect();
            } catch {
                // Ignore disconnect errors on shutdown
            }
            this.redisClient = null;
        }

        this.memoryCache.clear();
    }

    /**
     * Get a cached value by key.
     */
    async get<T>(key: string): Promise<T | null> {
        const fullKey = this.formatKey(key);

        if (this.isRedisConnected && this.redisClient) {
            try {
                const data = await this.redisClient.get(fullKey);
                if (data === null || data === undefined) return null;
                return JSON.parse(data) as T;
            } catch (err) {
                this.logger.warn(`Redis GET error for "${key}": ${(err as Error).message}`);
            }
        }

        // In-Memory Fallback
        const entry = this.memoryCache.get(fullKey);
        if (!entry) return null;

        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            this.memoryCache.delete(fullKey);
            return null;
        }

        try {
            return JSON.parse(entry.value) as T;
        } catch {
            return null;
        }
    }

    /**
     * Set a cached value with TTL in seconds.
     */
    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        const fullKey = this.formatKey(key);
        const ttl = ttlSeconds !== undefined ? ttlSeconds : this.defaultTtl;
        const serialized = JSON.stringify(value);

        // Always update in-memory cache as resilient backup
        this.memoryCache.set(fullKey, {
            value: serialized,
            expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : null,
        });

        if (this.isRedisConnected && this.redisClient) {
            try {
                if (ttl > 0) {
                    await this.redisClient.set(fullKey, serialized, 'EX', ttl);
                } else {
                    await this.redisClient.set(fullKey, serialized);
                }
                return;
            } catch (err) {
                this.logger.warn(`Redis SET error for "${key}": ${(err as Error).message}`);
            }
        }
    }

    /**
     * Delete a cached value by key.
     */
    async del(key: string): Promise<void> {
        const fullKey = this.formatKey(key);

        this.memoryCache.delete(fullKey);

        if (this.isRedisConnected && this.redisClient) {
            try {
                await this.redisClient.del(fullKey);
            } catch (err) {
                this.logger.warn(`Redis DEL error for "${key}": ${(err as Error).message}`);
            }
        }
    }

    /**
     * Delete keys matching a glob pattern (e.g. "rbac:*").
     * Uses non-blocking SCAN in Redis.
     */
    async delByPattern(pattern: string): Promise<void> {
        const fullPattern = this.formatKey(pattern);

        // In-Memory deletion
        const regex = this.globToRegex(fullPattern);
        for (const k of this.memoryCache.keys()) {
            if (regex.test(k)) {
                this.memoryCache.delete(k);
            }
        }

        // Redis deletion via SCAN
        if (this.isRedisConnected && this.redisClient) {
            try {
                let cursor = '0';
                do {
                    const [nextCursor, keys] = await this.redisClient.scan(
                        cursor,
                        'MATCH',
                        fullPattern,
                        'COUNT',
                        100,
                    );
                    cursor = nextCursor;
                    if (keys.length > 0) {
                        await this.redisClient.unlink(...keys);
                    }
                } while (cursor !== '0');
            } catch (err) {
                this.logger.warn(`Redis delByPattern error for "${pattern}": ${(err as Error).message}`);
            }
        }
    }

    /**
     * Cache-aside wrapper: reads from cache or executes fn and caches result.
     */
    async wrap<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const fresh = await fn();
        if (fresh !== undefined && fresh !== null) {
            await this.set(key, fresh, ttlSeconds);
        }
        return fresh;
    }

    /**
     * Check if a key exists in cache.
     */
    async has(key: string): Promise<boolean> {
        const fullKey = this.formatKey(key);

        if (this.isRedisConnected && this.redisClient) {
            try {
                const count = await this.redisClient.exists(fullKey);
                return count > 0;
            } catch (err) {
                this.logger.warn(`Redis EXISTS error for "${key}": ${(err as Error).message}`);
            }
        }

        return (await this.get(key)) !== null;
    }

    /**
     * Reset / flush all keys belonging to this application prefix.
     */
    async reset(): Promise<void> {
        this.memoryCache.clear();

        if (this.isRedisConnected && this.redisClient) {
            try {
                await this.delByPattern('*');
            } catch (err) {
                this.logger.warn(`Redis reset error: ${(err as Error).message}`);
            }
        }
    }

    /**
     * Get operational status and health of the cache engine.
     */
    getStatus(): CacheStatus {
        return {
            provider: this.isRedisConnected ? 'redis' : 'memory',
            connected: this.isRedisConnected,
            enabled: this.isEnabled,
            prefix: this.prefix,
            itemCount: this.isRedisConnected ? undefined : this.memoryCache.size,
        };
    }

    /**
     * Get raw Redis client instance if connected.
     */
    getClient(): RedisClient | null {
        return this.redisClient;
    }

    private formatKey(key: string): string {
        if (key.startsWith(this.prefix)) {
            return key;
        }
        return `${this.prefix}${key}`;
    }

    private initMemoryCleanup(): void {
        // Run cleanup every 60 seconds
        this.cleanupTimer = setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.memoryCache.entries()) {
                if (entry.expiresAt !== null && now > entry.expiresAt) {
                    this.memoryCache.delete(key);
                }
            }
        }, 60_000);

        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref(); // Do not prevent process termination
        }
    }

    private globToRegex(glob: string): RegExp {
        const escaped = glob
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${escaped}$`);
    }
}
