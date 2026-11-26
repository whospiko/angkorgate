import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

import { RuntimeConfigService } from './runtime-config.service';
import { RuntimeSetting } from '../entities/runtime-setting.entity';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('RuntimeConfigService', () => {
    let service: RuntimeConfigService;
    let repo: ReturnType<typeof createMockRepository>;
    let store: Map<string, any>;

    beforeEach(async () => {
        store = new Map();
        repo = createMockRepository();
        repo.find.mockImplementation(async () => Array.from(store.values()));
        repo.create.mockImplementation((entity: any) => ({
            ...entity,
            updatedAt: new Date(),
        }));
        repo.save.mockImplementation(async (entity: any) => {
            const saved = { ...entity, updatedAt: new Date() };
            store.set(saved.key, saved);
            return saved;
        });
        repo.delete.mockImplementation(async ({ key }: { key: string }) => {
            store.delete(key);
            return { affected: 1 };
        });

        const moduleRef = await Test.createTestingModule({
            providers: [
                RuntimeConfigService,
                { provide: getRepositoryToken(RuntimeSetting), useValue: repo },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((k: string) =>
                            k === 'JWT_ACCESS_SECRET' ? 'test-secret-key-32-chars-minimum' : undefined,
                        ),
                    },
                },
            ],
        }).compile();

        service = moduleRef.get(RuntimeConfigService);
        await service.onModuleInit();
    });

    it('returns default values when neither DB nor env is set', () => {
        expect(service.get('MAIL_PROVIDER')).toBe('console');
        expect(service.getNumber('PASSWORDLESS_OTP_TTL_MINUTES', 10)).toBe(10);
        expect(service.getBoolean('PASSWORDLESS_AUTO_REGISTER', false)).toBe(false);
    });

    it('encrypts secrets at rest, masks them in getAllMasked, and returns plaintext via get()', async () => {
        await service.updateSettings(
            {
                MAIL_PROVIDER: 'smtp',
                MAIL_HOST: 'smtp.resend.com',
                MAIL_PASS: 're_super_secret_key',
                PASSWORDLESS_AUTO_REGISTER: true,
            },
            'admin-1',
        );

        // Stored row must be encrypted (not plaintext)
        const storedRow = store.get('MAIL_PASS');
        expect(storedRow).toBeDefined();
        expect(storedRow.value).not.toBe('re_super_secret_key');
        expect(storedRow.value.split(':')).toHaveLength(3);

        // Runtime getter returns decrypted plaintext
        expect(service.get('MAIL_PASS')).toBe('re_super_secret_key');
        expect(service.get('MAIL_PROVIDER')).toBe('smtp');
        expect(service.getBoolean('PASSWORDLESS_AUTO_REGISTER', false)).toBe(true);

        // Masked view hides secret
        const masked = await service.getAllMasked();
        const passView = masked.find((s) => s.key === 'MAIL_PASS')!;
        expect(passView.value).toBe('••••••••');
        expect(passView.hasSecret).toBe(true);
        expect(passView.source).toBe('database');
    });

    it('preserves existing secret when mask placeholder or empty string is submitted', async () => {
        await service.updateSettings({ MAIL_PASS: 'my-secret-123' }, 'admin-1');
        await service.updateSettings({ MAIL_PASS: '••••••••' }, 'admin-1');
        expect(service.get('MAIL_PASS')).toBe('my-secret-123');
    });

    it('resets a setting back to default when null is passed', async () => {
        await service.updateSettings({ MAIL_PROVIDER: 'smtp' }, 'admin-1');
        expect(service.get('MAIL_PROVIDER')).toBe('smtp');

        await service.updateSettings({ MAIL_PROVIDER: null }, 'admin-1');
        expect(service.get('MAIL_PROVIDER')).toBe('console');
    });

    it('rejects unknown setting keys and invalid select/number values', async () => {
        await expect(
            service.updateSettings({ UNKNOWN_KEY: 'abc' }, 'admin-1'),
        ).rejects.toThrow(BadRequestException);

        await expect(
            service.updateSettings({ MAIL_PROVIDER: 'invalid_provider' }, 'admin-1'),
        ).rejects.toThrow(BadRequestException);

        await expect(
            service.updateSettings({ MAIL_PORT: 'not-a-number' }, 'admin-1'),
        ).rejects.toThrow(BadRequestException);
    });
});
