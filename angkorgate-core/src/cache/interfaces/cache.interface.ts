export interface CacheStatus {
    provider: 'redis' | 'memory';
    connected: boolean;
    enabled: boolean;
    prefix: string;
    itemCount?: number;
}

export interface CacheOptions {
    ttl?: number; // in seconds
}

export interface CacheSetOptions {
    ttl?: number; // in seconds
}
