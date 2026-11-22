import { createMockRepository } from '../../../test/mocks/repository.mock';
import { TypeOrmOidcAdapter, OidcAdapterService } from './oidc.adapter';
import { OidcSession } from '../entities/oidc-session.entity';
import type { AppsService } from '../../apps/apps.service';

describe('TypeOrmOidcAdapter & OidcAdapterService', () => {
    let repo: ReturnType<typeof createMockRepository>;
    let appsService: { findByCode: jest.Mock };
    let adapter: TypeOrmOidcAdapter;
    let service: OidcAdapterService;

    beforeEach(() => {
        repo = createMockRepository<OidcSession>();
        appsService = { findByCode: jest.fn() };
        adapter = new TypeOrmOidcAdapter('Session', repo as any, appsService as any);
        service = new OidcAdapterService(repo as any, appsService as any);
    });

    describe('upsert', () => {
        it('saves a session with namespaced key and expiration', async () => {
            const payload = { accountId: 'user-123', uid: 'uid-456', grantId: 'grant-789' };
            await adapter.upsert('sess-1', payload as any, 3600);

            expect(repo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'Session:sess-1',
                    modelName: 'Session',
                    payload,
                    uid: 'uid-456',
                    grantId: 'grant-789',
                }),
            );
        });
    });

    describe('find', () => {
        it('returns payload when record is found and not expired', async () => {
            const payload = { accountId: 'user-123' };
            repo.findOne.mockResolvedValue({
                id: 'Session:sess-1',
                payload,
                expiresAt: new Date(Date.now() + 60000),
            });

            const result = await adapter.find('sess-1');
            expect(result).toEqual(payload);
        });

        it('returns parsed payload when stored as json string', async () => {
            const payload = { accountId: 'user-123' };
            repo.findOne.mockResolvedValue({
                id: 'Session:sess-1',
                payload: JSON.stringify(payload),
                expiresAt: new Date(Date.now() + 60000),
            });

            const result = await adapter.find('sess-1');
            expect(result).toEqual(payload);
        });

        it('returns undefined when record is expired', async () => {
            repo.findOne.mockResolvedValue({
                id: 'Session:sess-1',
                payload: { accountId: 'user-123' },
                expiresAt: new Date(Date.now() - 1000), // expired
            });

            const result = await adapter.find('sess-1');
            expect(result).toBeUndefined();
        });

        it('returns undefined when record does not exist', async () => {
            repo.findOne.mockResolvedValue(null);
            const result = await adapter.find('non-existent');
            expect(result).toBeUndefined();
        });

        it('resolves dynamic client metadata when model is Client', async () => {
            const clientAdapter = new TypeOrmOidcAdapter('Client', repo as any, appsService as any);
            appsService.findByCode.mockResolvedValue({
                appCode: 'clinic-prod',
                name: 'Clinic Production',
                clientSecret: 'secret-123',
                allowedRedirectUrls: ['https://clinic.local/callback'],
            });

            const client = await clientAdapter.find('clinic-prod');
            expect(client).toBeDefined();
            expect(client).toEqual(
                expect.objectContaining({
                    client_id: 'clinic-prod',
                    client_name: 'Clinic Production',
                    client_secret: 'secret-123',
                    token_endpoint_auth_method: 'client_secret_basic',
                    redirect_uris: ['https://clinic.local/callback'],
                }),
            );
        });

        it('resolves public client metadata when app has no secret', async () => {
            const clientAdapter = new TypeOrmOidcAdapter('Client', repo as any, appsService as any);
            appsService.findByCode.mockResolvedValue({
                appCode: 'mobile-app',
                name: 'Mobile App',
                clientSecret: null,
                allowedRedirectUrls: ['myapp://oauth'],
            });

            const client = await clientAdapter.find('mobile-app');
            expect(client).toBeDefined();
            expect(client).toEqual(
                expect.objectContaining({
                    client_id: 'mobile-app',
                    token_endpoint_auth_method: 'none',
                    client_secret: undefined,
                }),
            );
        });
    });

    describe('findByUid', () => {
        it('looks up record by modelName and uid', async () => {
            repo.findOne.mockResolvedValue({
                id: 'Session:sess-1',
                payload: { uid: 'uid-123' },
                expiresAt: new Date(Date.now() + 60000),
            });

            const result = await adapter.findByUid('uid-123');
            expect(result).toEqual({ uid: 'uid-123' });
            expect(repo.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ modelName: 'Session', uid: 'uid-123' }),
                }),
            );
        });
    });

    describe('findByUserCode', () => {
        it('looks up record by modelName and userCode', async () => {
            repo.findOne.mockResolvedValue({
                id: 'DeviceCode:code-1',
                payload: { userCode: 'ABCD-EFGH' },
                expiresAt: new Date(Date.now() + 60000),
            });

            const deviceAdapter = new TypeOrmOidcAdapter('DeviceCode', repo as any, appsService as any);
            const result = await deviceAdapter.findByUserCode('ABCD-EFGH');
            expect(result).toEqual({ userCode: 'ABCD-EFGH' });
        });
    });

    describe('destroy & consume & revokeByGrantId', () => {
        it('destroys record by namespaced key', async () => {
            await adapter.destroy('sess-1');
            expect(repo.delete).toHaveBeenCalledWith({ id: 'Session:sess-1' });
        });

        it('consumes record by setting consumedAt timestamp', async () => {
            await adapter.consume('sess-1');
            expect(repo.update).toHaveBeenCalledWith(
                { id: 'Session:sess-1' },
                expect.objectContaining({ consumedAt: expect.any(Date) }),
            );
        });

        it('revokes records by grantId', async () => {
            await adapter.revokeByGrantId('grant-xyz');
            expect(repo.delete).toHaveBeenCalledWith({ grantId: 'grant-xyz' });
        });
    });

    describe('OidcAdapterService', () => {
        it('creates a TypeOrmOidcAdapter', () => {
            const created = service.createAdapter('AccessToken');
            expect(created).toBeInstanceOf(TypeOrmOidcAdapter);
        });

        it('purges expired records', async () => {
            repo.delete.mockResolvedValue({ affected: 5 });
            await service.purgeExpired();
            expect(repo.delete).toHaveBeenCalled();
        });
    });
});
