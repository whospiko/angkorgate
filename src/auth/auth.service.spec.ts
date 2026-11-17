import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RbacService } from '../rbac/rbac.service';
import { MailService } from '../notifications/mail.service';
import { CustomersService } from '../customers/customers.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { createMockRepository } from '../../test/mocks/repository.mock';
import { AuditService } from '../audit/audit.service';

describe('AuthService', () => {
    let service: AuthService;
    let users: Record<string, jest.Mock>;
    let rbac: Record<string, jest.Mock>;
    let jwt: Record<string, jest.Mock>;
    let config: Record<string, jest.Mock>;
    let audit: { log: jest.Mock };
    let refreshRepo: ReturnType<typeof createMockRepository>;
    let attemptRepo: ReturnType<typeof createMockRepository>;

    beforeEach(async () => {
        audit = { log: jest.fn().mockResolvedValue(undefined) };
        users = {
            findAuthRecordByEmail: jest.fn(),
            findAuthRecordByPhone: jest.fn(),
            findByIdOrFail: jest.fn(),
            findById: jest.fn(),
            setLastLogin: jest.fn(),
            setFailedAttempts: jest.fn(),
            create: jest.fn(),
            setPasswordHash: jest.fn(),
            getPasswordHashForAuth: jest.fn(),
            findByEmail: jest.fn(),
            findByPhone: jest.fn(),
        };
        rbac = {
            getUserRoleCodes: jest.fn().mockResolvedValue(['CUSTOMER']),
            assignRoleToUser: jest.fn(),
        };
        jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
        config = {
            get: jest.fn((key: string) => {
                const m: Record<string, unknown> = {
                    'JWT_ACCESS_SECRET': 'a'.repeat(32),
                    'JWT_ACCESS_TTL': 900,
                    'JWT_REFRESH_TTL': 604800,
                    'APP_WEB_URL': 'http://localhost:5173',
                };
                return m[key];
            }),
        };

        refreshRepo = createMockRepository<RefreshToken>();
        attemptRepo = createMockRepository<LoginAttempt>();
        const evtRepo = createMockRepository<EmailVerificationToken>();
        const prtRepo = createMockRepository<PasswordResetToken>();

        const module = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: users },
                { provide: RbacService, useValue: rbac },
                { provide: JwtService, useValue: jwt },
                { provide: ConfigService, useValue: config },
                { provide: MailService, useValue: { send: jest.fn() } },
                { provide: CustomersService, useValue: { create: jest.fn() } },
                { provide: AuditService, useValue: audit },
                { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
                { provide: getRepositoryToken(LoginAttempt), useValue: attemptRepo },
                { provide: getRepositoryToken(EmailVerificationToken), useValue: evtRepo },
                { provide: getRepositoryToken(PasswordResetToken), useValue: prtRepo },
            ],
        }).compile();

        service = module.get(AuthService);
    });

    // ─────────── LOGIN ───────────

    describe('login', () => {
        const goodPassword = 'GoodPass123!';
        let goodHash: string;

        beforeAll(async () => {
            goodHash = await bcrypt.hash(goodPassword, 4); // low cost for speed
        });

        function baseRecord(overrides: Partial<Record<string, unknown>> = {}) {
            return {
                id: 'u1',
                email: 'test@example.com',
                phone: null,
                passwordHash: goodHash,
                isActive: true,
                isEmailVerified: true,
                failedAttempts: 0,
                lockedUntil: null,
                mustChangePassword: false,
                ...overrides,
            };
        }

        it('returns tokens on valid credentials', async () => {
            users.findAuthRecordByEmail!.mockResolvedValue(baseRecord() as never);
            users.findByIdOrFail!.mockResolvedValue({
                id: 'u1',
                email: 'test@example.com',
                phone: null,
                mustChangePassword: false,
            } as never);
            refreshRepo.create.mockImplementation((d) => d);
            refreshRepo.save.mockResolvedValue({});

            const result = await service.login(
                { email: 'test@example.com', password: goodPassword },
                {},
            );

            expect(result.accessToken).toBe('signed.jwt.token');
            expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{64}$/);
            expect(result.user.roles).toEqual(['CUSTOMER']);
        });

        it('throws UnauthorizedException on wrong password', async () => {
            users.findAuthRecordByEmail!.mockResolvedValue(baseRecord() as never);

            await expect(
                service.login(
                    { email: 'test@example.com', password: 'wrong' },
                    {},
                ),
            ).rejects.toThrow(UnauthorizedException);
            expect(users.setFailedAttempts).toHaveBeenCalledWith('u1', 1, null);
        });

        it('throws UnauthorizedException for nonexistent user (no enumeration)', async () => {
            users.findAuthRecordByEmail!.mockResolvedValue(null);

            await expect(
                service.login({ email: 'ghost@x.com', password: 'x' }, {}),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws ForbiddenException for disabled account', async () => {
            users.findAuthRecordByEmail!.mockResolvedValue(
                baseRecord({ isActive: false }) as never,
            );

            await expect(
                service.login(
                    { email: 'test@example.com', password: goodPassword },
                    {},
                ),
            ).rejects.toThrow(ForbiddenException);
        });

        it('locks account after 5 failed attempts', async () => {
            users.findAuthRecordByEmail!.mockResolvedValue(
                baseRecord({ failedAttempts: 4 }) as never,
            );

            await expect(
                service.login(
                    { email: 'test@example.com', password: 'wrong' },
                    {},
                ),
            ).rejects.toThrow(UnauthorizedException);

            expect(users.setFailedAttempts).toHaveBeenCalledWith(
                'u1',
                5,
                expect.any(Date),
            );
        });

        it('rejects login while locked', async () => {
            const future = new Date(Date.now() + 60_000);
            users.findAuthRecordByEmail!.mockResolvedValue(
                baseRecord({ lockedUntil: future }) as never,
            );

            await expect(
                service.login(
                    { email: 'test@example.com', password: goodPassword },
                    {},
                ),
            ).rejects.toThrow(ForbiddenException);
        });

        it('rejects login when email unverified', async () => {
            users.findAuthRecordByEmail!.mockResolvedValue(
                baseRecord({ isEmailVerified: false }) as never,
            );

            await expect(
                service.login(
                    { email: 'test@example.com', password: goodPassword },
                    {},
                ),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    // ─────────── REFRESH ───────────

    describe('refresh', () => {
        it('rotates token on valid refresh', async () => {
            const stored = {
                id: 't1',
                userId: 'u1',
                tokenHash: 'H',
                revokedAt: null,
                expiresAt: new Date(Date.now() + 100_000),
            };
            refreshRepo.findOne.mockResolvedValue(stored as never);
            refreshRepo.update.mockResolvedValue({} as never);
            refreshRepo.create.mockImplementation((d) => d);
            refreshRepo.save.mockResolvedValue({} as never);
            users.findByIdOrFail!.mockResolvedValue({
                id: 'u1',
                email: 'x@y.com',
                phone: null,
                isActive: true,
                mustChangePassword: false,
            } as never);

            const result = await service.refresh('any-refresh-token', {});

            expect(refreshRepo.update).toHaveBeenCalledWith('t1', {
                revokedAt: expect.any(Date),
            });
            expect(result.accessToken).toBeDefined();
        });

        it('revokes ALL user tokens when a revoked token is reused', async () => {
            refreshRepo.findOne.mockResolvedValue({
                id: 't1',
                userId: 'u1',
                revokedAt: new Date(),
            } as never);

            await expect(
                service.refresh('reused-token', {}),
            ).rejects.toThrow(UnauthorizedException);

            expect(refreshRepo.update).toHaveBeenCalledWith(
                { userId: 'u1' },
                { revokedAt: expect.any(Date) },
            );
        });

        it('rejects expired refresh token', async () => {
            refreshRepo.findOne.mockResolvedValue({
                id: 't1',
                userId: 'u1',
                revokedAt: null,
                expiresAt: new Date(Date.now() - 1000),
            } as never);

            await expect(
                service.refresh('expired', {}),
            ).rejects.toThrow(UnauthorizedException);
        });
    });
});