import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OauthConfigService } from './oauth-config.service';
import { OauthProvider } from './entities/oauth-provider.entity';
import { createMockRepository } from '../../test/mocks/repository.mock';

describe('OauthConfigService', () => {
    let service: OauthConfigService;
    let config: { get: jest.Mock };
    let repo: ReturnType<typeof createMockRepository>;

    beforeEach(async () => {
        config = { get: jest.fn() };
        repo = createMockRepository<OauthProvider>();

        const module = await Test.createTestingModule({
            providers: [
                OauthConfigService,
                { provide: ConfigService, useValue: config },
                { provide: getRepositoryToken(OauthProvider), useValue: repo },
            ],
        }).compile();

        service = module.get(OauthConfigService);
    });

    describe('isGlobalEnabled', () => {
        it('true when OAUTH_ENABLED=true', () => {
            config.get!.mockReturnValue(true);
            expect(service.isGlobalEnabled()).toBe(true);
        });

        it('false when OAUTH_ENABLED=false', () => {
            config.get!.mockReturnValue(false);
            expect(service.isGlobalEnabled()).toBe(false);
        });
    });

    describe('isProviderEnabled — three-gate logic', () => {
        beforeEach(() => {
            config.get!.mockReturnValue(true); // global on
        });

        it('false when global disabled (kill switch)', async () => {
            config.get!.mockReturnValue(false);
            const enabled = await service.isProviderEnabled('google', {
                oauthEnabled: true,
                enabledProviders: ['google'],
            } as never);
            expect(enabled).toBe(false);
        });

        it('false when app disabled', async () => {
            const enabled = await service.isProviderEnabled('google', {
                oauthEnabled: false,
                enabledProviders: ['google'],
            } as never);
            expect(enabled).toBe(false);
        });

        it('false when provider not in app whitelist', async () => {
            const enabled = await service.isProviderEnabled('google', {
                oauthEnabled: true,
                enabledProviders: ['apple'], // google missing
            } as never);
            expect(enabled).toBe(false);
        });

        it('false when provider inactive in DB', async () => {
            repo.findOne.mockResolvedValue({ isActive: false, clientId: 'x' } as never);
            const enabled = await service.isProviderEnabled('google', {
                oauthEnabled: true,
                enabledProviders: ['google'],
            } as never);
            expect(enabled).toBe(false);
        });

        it('false when provider has no clientId', async () => {
            repo.findOne.mockResolvedValue({ isActive: true, clientId: null } as never);
            const enabled = await service.isProviderEnabled('google', {
                oauthEnabled: true,
                enabledProviders: ['google'],
            } as never);
            expect(enabled).toBe(false);
        });

        it('true when all three gates pass', async () => {
            repo.findOne.mockResolvedValue({ isActive: true, clientId: 'x' } as never);
            const enabled = await service.isProviderEnabled('google', {
                oauthEnabled: true,
                enabledProviders: ['google'],
            } as never);
            expect(enabled).toBe(true);
        });
    });
});