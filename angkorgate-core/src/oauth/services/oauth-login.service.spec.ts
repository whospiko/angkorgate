import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../../test/mocks/repository.mock';
import { AuditService } from '../../audit/services/audit.service';
import { AuthService } from '../../auth/services/auth.service';
import { CustomersService } from '../../customers/services/customers.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { UsersService } from '../../users/services/users.service';
import { OauthAccount } from '../entities/oauth-account.entity';
import { OauthLoginService } from './oauth-login.service';

describe('OauthLoginService', () => {
    let service: OauthLoginService;
    let accountsRepo: ReturnType<typeof createMockRepository<OauthAccount>>;
    let users: {
        findById: jest.Mock;
        findByIdOrFail: jest.Mock;
        findByEmail: jest.Mock;
        create: jest.Mock;
    };
    let customers: { create: jest.Mock };
    let rbac: { assignRoleToUser: jest.Mock };
    let auth: { issueTokensForUser: jest.Mock };

    beforeEach(async () => {
        accountsRepo = createMockRepository<OauthAccount>();
        users = {
            findById: jest.fn(),
            findByIdOrFail: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn().mockResolvedValue({
                id: 'user-1',
                email: null,
                phone: null,
            }),
        };
        customers = { create: jest.fn().mockResolvedValue({ id: 'cust-1' }) };
        rbac = { assignRoleToUser: jest.fn().mockResolvedValue(undefined) };
        auth = {
            issueTokensForUser: jest.fn().mockResolvedValue({
                accessToken: 'at',
                refreshToken: 'rt',
            }),
        };

        const module = await Test.createTestingModule({
            providers: [
                OauthLoginService,
                { provide: getRepositoryToken(OauthAccount), useValue: accountsRepo },
                { provide: UsersService, useValue: users },
                { provide: CustomersService, useValue: customers },
                { provide: RbacService, useValue: rbac },
                { provide: AuditService, useValue: { log: jest.fn() } },
                { provide: AuthService, useValue: auth },
            ],
        }).compile();

        service = module.get(OauthLoginService);
    });

    it('creates user and customer without email for Telegram logins', async () => {
        accountsRepo.findOne.mockResolvedValue(null);
        accountsRepo.create.mockImplementation((x) => x);
        accountsRepo.save.mockImplementation(async (x) => x);

        const res = await service.loginWithProfile(
            {
                provider: 'telegram',
                providerUserId: '777888999',
                email: null,
                emailVerified: false,
                username: 'piko_tg',
                fullName: 'Piko Telegram',
                raw: {},
            },
            { ip: '127.0.0.1' },
        );

        expect(res.userId).toBe('user-1');
        expect(users.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: undefined,
                isEmailVerified: false,
            }),
        );
        expect(customers.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'user-1',
                fullName: 'Piko Telegram',
                email: undefined,
            }),
            'user-1',
        );
    });

    it('cleans up stale oauth link when linked user was soft-deleted and re-provisions', async () => {
        accountsRepo.findOne
            .mockResolvedValueOnce({
                id: 'link-old',
                userId: 'deleted-user-id',
                provider: 'telegram',
                providerUserId: '777888999',
            } as never)
            .mockResolvedValueOnce(null);
        accountsRepo.delete.mockResolvedValue({ affected: 1 } as never);
        accountsRepo.create.mockImplementation((x) => x);
        accountsRepo.save.mockImplementation(async (x) => x);
        users.findById.mockResolvedValue(null);

        const res = await service.loginWithProfile(
            {
                provider: 'telegram',
                providerUserId: '777888999',
                email: null,
                emailVerified: false,
                username: 'piko_tg',
                fullName: 'Piko Telegram',
                raw: {},
            },
            { ip: '127.0.0.1' },
        );

        expect(accountsRepo.delete).toHaveBeenCalledWith('link-old');
        expect(res.userId).toBe('user-1');
    });

    it('rejects auto-registration without email for non-Telegram providers', async () => {
        accountsRepo.findOne.mockResolvedValue(null);

        await expect(
            service.loginWithProfile(
                {
                    provider: 'github',
                    providerUserId: 'gh-123',
                    email: null,
                    emailVerified: false,
                    raw: {},
                },
                {},
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });
});
