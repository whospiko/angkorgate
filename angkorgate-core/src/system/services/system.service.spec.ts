import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemConfig } from '../entities/system-config.entity';
import { UsersService } from '../../users/services/users.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { AuthService } from '../../auth/services/auth.service';
import { AuditService } from '../../audit/services/audit.service';
import { UserRole } from '../../rbac/entities/user-role.entity';
import { Role } from '../../rbac/entities/role.entity';

describe('SystemService', () => {
    let service: SystemService;
    let configRepo: jest.Mocked<Partial<Repository<SystemConfig>>>;
    let usersService: jest.Mocked<Partial<UsersService>>;
    let rbacService: jest.Mocked<Partial<RbacService>>;
    let authService: jest.Mocked<Partial<AuthService>>;
    let auditService: jest.Mocked<Partial<AuditService>>;
    let dataSource: any;

    const mockConfig: SystemConfig = {
        id: 'default',
        isInitialized: false,
        appName: 'AngkorGate',
        appDescription: 'Identity & Access Management',
        logoUrl: null,
        faviconUrl: null,
        organizationName: null,
        supportEmail: null,
        footerText: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        configRepo = {
            findOne: jest.fn().mockResolvedValue({ ...mockConfig }),
            create: jest.fn().mockImplementation((val) => ({ ...mockConfig, ...val })),
            save: jest.fn().mockImplementation((val) => Promise.resolve({ ...mockConfig, ...val })),
        };

        usersService = {};
        rbacService = {};
        authService = {
            issueTokensForUser: jest.fn().mockResolvedValue({
                accessToken: 'test-access-token',
                refreshToken: 'test-refresh-token',
                tokenType: 'Bearer',
                expiresIn: 900,
            } as any),
        };
        auditService = {
            log: jest.fn().mockResolvedValue(undefined as any),
        };

        const mockQueryBuilder = {
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getCount: jest.fn().mockResolvedValue(0),
        };

        const mockUserRepo = {
            create: jest.fn().mockImplementation((u) => ({ id: 'admin-user-id', ...u })),
            save: jest.fn().mockImplementation((u) => Promise.resolve({ id: 'admin-user-id', ...u })),
        };

        const mockUserRoleRepo = {
            create: jest.fn().mockImplementation((ur) => ({ id: 'ur-id', ...ur })),
            save: jest.fn().mockImplementation((ur) => Promise.resolve({ id: 'ur-id', ...ur })),
        };

        const mockConfigRepoInTx = {
            findOne: jest.fn().mockResolvedValue({ ...mockConfig }),
            create: jest.fn().mockImplementation((c) => ({ ...mockConfig, ...c })),
            save: jest.fn().mockImplementation((c) => Promise.resolve({ ...mockConfig, ...c })),
        };

        const mockQr = {
            connect: jest.fn().mockResolvedValue(undefined),
            startTransaction: jest.fn().mockResolvedValue(undefined),
            commitTransaction: jest.fn().mockResolvedValue(undefined),
            rollbackTransaction: jest.fn().mockResolvedValue(undefined),
            release: jest.fn().mockResolvedValue(undefined),
            manager: {
                getRepository: jest.fn().mockImplementation((entity) => {
                    if (entity.name === 'User') return mockUserRepo;
                    if (entity.name === 'UserRole') return mockUserRoleRepo;
                    if (entity.name === 'SystemConfig') return mockConfigRepoInTx;
                    return {};
                }),
            },
        };

        dataSource = {
            getRepository: jest.fn().mockImplementation((entity) => {
                if (entity === UserRole) {
                    return { createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder) };
                }
                if (entity === Role) {
                    return {
                        findOne: jest.fn().mockResolvedValue({ id: 'admin-role-id', code: 'ADMIN' }),
                    };
                }
                return {};
            }),
            createQueryRunner: jest.fn().mockReturnValue(mockQr),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SystemService,
                { provide: getRepositoryToken(SystemConfig), useValue: configRepo },
                { provide: UsersService, useValue: usersService },
                { provide: RbacService, useValue: rbacService },
                { provide: AuthService, useValue: authService },
                { provide: AuditService, useValue: auditService },
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        service = module.get<SystemService>(SystemService);
    });

    describe('getSetupStatus', () => {
        it('returns isInitialized: false when not initialized and no admin exists', async () => {
            const status = await service.getSetupStatus();
            expect(status.isInitialized).toBe(false);
            expect(status.requiresAdmin).toBe(true);
            expect(status.appName).toBe('AngkorGate');
        });

        it('returns isInitialized: true if config has isInitialized: true', async () => {
            configRepo.findOne = jest.fn().mockResolvedValue({ ...mockConfig, isInitialized: true });
            const status = await service.getSetupStatus();
            expect(status.isInitialized).toBe(true);
        });
    });

    describe('executeInitialSetup', () => {
        it('throws ForbiddenException if already initialized', async () => {
            configRepo.findOne = jest.fn().mockResolvedValue({ ...mockConfig, isInitialized: true });

            await expect(
                service.executeInitialSetup({
                    adminEmail: 'admin@angkorgate.local',
                    adminPassword: 'SuperSecretPassword123!',
                    appName: 'MyCustomIAM',
                }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('executes setup successfully, sets initialized=true and returns tokens', async () => {
            const result = await service.executeInitialSetup({
                adminEmail: 'admin@angkorgate.local',
                adminPassword: 'SuperSecretPassword123!',
                appName: 'Acme IAM',
                logoUrl: 'https://example.com/logo.png',
            });

            expect(result.success).toBe(true);
            expect(result.user.email).toBe('admin@angkorgate.local');
            expect(result.user.roles).toContain('ADMIN');
            expect(result.tokens.accessToken).toBe('test-access-token');
            expect(result.branding.appName).toBe('Acme IAM');
            expect(result.branding.logoUrl).toBe('https://example.com/logo.png');
            expect(auditService.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'system.setup.completed' }),
            );
        });
    });

    describe('branding operations', () => {
        it('returns public branding', async () => {
            const branding = await service.getBranding();
            expect(branding.appName).toBe('AngkorGate');
            expect(branding.appDescription).toBe('Identity & Access Management');
        });

        it('updates branding successfully', async () => {
            const updated = await service.updateBranding(
                { appName: 'BrandNewName', logoUrl: 'https://logo.svg' },
                'admin-1',
            );

            expect(updated.appName).toBe('BrandNewName');
            expect(updated.logoUrl).toBe('https://logo.svg');
            expect(auditService.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'system.branding.updated' }),
            );
        });
    });
});
