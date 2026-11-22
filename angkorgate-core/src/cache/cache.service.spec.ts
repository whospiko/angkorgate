import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

describe('CacheService', () => {
    let service: CacheService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CacheService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultValue?: any) => {
                            if (key === 'redis.enabled') return false; // In-memory mode for unit tests
                            if (key === 'redis.keyPrefix') return 'test:';
                            if (key === 'redis.defaultTtl') return 300;
                            return defaultValue;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<CacheService>(CacheService);
        configService = module.get<ConfigService>(ConfigService);
        await service.onModuleInit();
    });

    afterEach(async () => {
        await service.onModuleDestroy();
    });

    it('should be defined and initialized in memory fallback mode', () => {
        expect(service).toBeDefined();
        const status = service.getStatus();
        expect(status.provider).toBe('memory');
        expect(status.connected).toBe(false);
        expect(status.prefix).toBe('test:');
    });

    describe('get and set', () => {
        it('stores and retrieves primitive values', async () => {
            await service.set('test-string', 'hello world');
            expect(await service.get<string>('test-string')).toBe('hello world');

            await service.set('test-number', 42);
            expect(await service.get<number>('test-number')).toBe(42);

            await service.set('test-boolean', true);
            expect(await service.get<boolean>('test-boolean')).toBe(true);
        });

        it('stores and retrieves complex objects and arrays', async () => {
            const user = { id: 'u1', name: 'Alice', roles: ['ADMIN', 'USER'] };
            await service.set('user:u1', user);

            const cachedUser = await service.get<typeof user>('user:u1');
            expect(cachedUser).toEqual(user);
        });

        it('returns null for non-existent key', async () => {
            expect(await service.get('non-existent')).toBeNull();
        });
    });

    describe('del and has', () => {
        it('deletes a key from cache', async () => {
            await service.set('temp-key', 'data');
            expect(await service.has('temp-key')).toBe(true);

            await service.del('temp-key');
            expect(await service.get('temp-key')).toBeNull();
            expect(await service.has('temp-key')).toBe(false);
        });
    });

    describe('TTL expiration', () => {
        it('expires entries after specified TTL', async () => {
            // Set with 0.05 second TTL (50ms)
            await service.set('expiring-key', 'ephemeral', 0.05);
            expect(await service.get('expiring-key')).toBe('ephemeral');

            // Wait 60ms
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(await service.get('expiring-key')).toBeNull();
        });
    });

    describe('wrap (cache-aside)', () => {
        it('invokes callback once and returns cached value on subsequent calls', async () => {
            const factory = jest.fn().mockResolvedValue(['perm:read', 'perm:write']);

            const firstCall = await service.wrap('perms:u1', factory, 60);
            expect(firstCall).toEqual(['perm:read', 'perm:write']);
            expect(factory).toHaveBeenCalledTimes(1);

            const secondCall = await service.wrap('perms:u1', factory, 60);
            expect(secondCall).toEqual(['perm:read', 'perm:write']);
            expect(factory).toHaveBeenCalledTimes(1); // Not called again!
        });
    });

    describe('delByPattern', () => {
        it('deletes keys matching glob pattern while leaving others intact', async () => {
            await service.set('rbac:perms:user1', ['read']);
            await service.set('rbac:roles:user1', ['ADMIN']);
            await service.set('rbac:perms:user2', ['write']);
            await service.set('other:data', 'preserved');

            // Invalidate all rbac entries for user1
            await service.delByPattern('rbac:*:user1');

            expect(await service.get('rbac:perms:user1')).toBeNull();
            expect(await service.get('rbac:roles:user1')).toBeNull();
            expect(await service.get('rbac:perms:user2')).toEqual(['write']);
            expect(await service.get('other:data')).toBe('preserved');
        });
    });

    describe('reset', () => {
        it('wipes all stored keys', async () => {
            await service.set('k1', 'v1');
            await service.set('k2', 'v2');
            expect(service.getStatus().itemCount).toBe(2);

            await service.reset();
            expect(service.getStatus().itemCount).toBe(0);
            expect(await service.get('k1')).toBeNull();
        });
    });
});
