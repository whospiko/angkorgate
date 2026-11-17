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
import { MfaService } from './mfa.service';
import { UsersService } from '../../users/services/users.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { MailService } from '../../notifications/services/mail.service';
import { CustomersService } from '../../customers/services/customers.service';
import { AuditService } from '../../audit/services/audit.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { LoginAttempt } from '../entities/login-attempt.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { AuthResponseDto, MfaChallengeDto } from '../dto/auth-response.dto';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('AuthService', () => {
    let service: AuthService;

    // Collaborators
    let users: Record<string, jest.Mock>;
    let rbac: Record<string, jest.Mock>;
    let jwt: Record<string, jest.Mock>;
    let config: Record<string, jest.Mock>;
    let audit: { log: jest.Mock };
    let mfa: Record<string, jest.Mock>;

    // Repositories
    let refreshRepo: ReturnType<typeof createMockRepository>;
    let attemptRepo: ReturnType<typeof createMockRepository>;
    let evtRepo: ReturnType<typeof createMockRepository>;
    let prtRepo: ReturnType<typeof createMockRepository>;

    // Shared fixtures
    const goodPassword = 'GoodPass123!';
    let goodHash: string;

    beforeAll(async () => {
        goodHash = await bcrypt.hash(goodPassword, 4);
    });

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
            setEmailVerified: jest.fn(),
            setPhoneVerified: jest.fn(),
        };

        rbac = {
            getUserRoleCodes: jest.fn().mockResolvedValue(['CUSTOMER']),
            assignRoleToUser: jest.fn(),
        };

        jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

        config = {
            get: jest.fn((key: string) => {
                const m: Record<string, unknown> = {
                    JWT_ACCESS_SECRET: 'a'.repeat(32),
                    JWT_ACCESS_TTL: '900',
                    JWT_REFRESH_TTL: '604800',
                    JWT_REFRESH_SECRET: 'b'.repeat(32),
                    APP_WEB_URL: 'http://localhost:5173',
                };
                return m[key];
            }),
        };

        mfa = {
            isEnabled: jest.fn().mockResolvedValue(false), // default: no MFA
            getStatus: jest
                .fn()
                .mockResolvedValue({ remainingBackupCodes: 10 }),
            verifyCodeOrBackup: jest.fn(),
        };

        refreshRepo = createMockRepository<RefreshToken>();
        attemptRepo = createMockRepository<LoginAttempt>();
        evtRepo = createMockRepository<EmailVerificationToken>();
        prtRepo = createMockRepository<PasswordResetToken>();

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
                { provide: MfaService, useValue: mfa },
                { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
                { provide: getRepositoryToken(LoginAttempt), useValue: attemptRepo },
                { provide: getRepositoryToken(EmailVerificationToken), useValue: evtRepo },
                { provide: getRepositoryToken(PasswordResetToken), useValue: prtRepo },
            ],
        }).compile();

        service = module.get(AuthService);
    });

    // ─────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────

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

    /** Type guard — narrows the union returned by login() */
    function isMfaChallenge(
        r: AuthResponseDto | MfaChallengeDto,
    ): r is MfaChallengeDto {
        return (r as MfaChallengeDto).mfaRequired === true;
    }

    /** Stubs the token-issuance path so `login()` success can be asserted */
    function stubTokenIssuance() {
        refreshRepo.create.mockImplementation((d) => d);
        refreshRepo.save.mockResolvedValue({});
        users.findByIdOrFail.mockResolvedValue({
            id: 'u1',
            email: 'test@example.com',
            phone: null,
            isActive: true,
            mustChangePassword: false,
        });
    }

    // ─────────────────────────────────────────────────────────────
    //  LOGIN
    // ─────────────────────────────────────────────────────────────

    describe('login', () => {
        it('returns tokens on valid credentials (MFA off)', async () => {
            users.findAuthRecordByEmail.mockResolvedValue(baseRecord());
            stubTokenIssuance();
            mfa.isEnabled.mockResolvedValue(false);

            const result = await service.login(
                { email: 'test@example.com', password: goodPassword },
                {},
            );

            expect(isMfaChallenge(result)).toBe(false);
            if (isMfaChallenge(result)) return; // narrow

            expect(result.accessToken).toBe('signed.jwt.token');
            expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{64}$/);
            expect(result.user.roles).toEqual(['CUSTOMER']);
            expect(users.setLastLogin).toHaveBeenCalledWith('u1');
        });

        it('returns MFA challenge when user has MFA enabled', async () => {
            users.findAuthRecordByEmail.mockResolvedValue(baseRecord());
            mfa.isEnabled.mockResolvedValue(true);
            mfa.getStatus.mockResolvedValue({ remainingBackupCodes: 7 });

            const result = await service.login(
                { email: 'test@example.com', password: goodPassword },
                {},
            );

            expect(isMfaChallenge(result)).toBe(true);
            if (!isMfaChallenge(result)) return;

            expect(result.mfaRequired).toBe(true);
            expect(result.mfaToken).toBe('signed.jwt.token'); // mocked JWT
            expect(result.backupCodesRemaining).toBe(7);

            // MFA challenge MUST NOT reset lastLogin (auth not complete)
            expect(users.setLastLogin).not.toHaveBeenCalled();
            // But it clears lockout so user can proceed to MFA
            expect(users.setFailedAttempts).toHaveBeenCalledWith('u1', 0, null);
        });

        it('throws UnauthorizedException on wrong password', async () => {
            users.findAuthRecordByEmail.mockResolvedValue(baseRecord());

            await expect(
                service.login({ email: 'test@example.com', password: 'wrong' }, {}),
            ).rejects.toThrow(UnauthorizedException);

            expect(users.setFailedAttempts).toHaveBeenCalledWith('u1', 1, null);
        });

        it('throws UnauthorizedException for nonexistent user (no enumeration)', async () => {
            users.findAuthRecordByEmail.mockResolvedValue(null);

            await expect(
                service.login({ email: 'ghost@x.com', password: 'x' }, {}),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws ForbiddenException for disabled account', async () => {
            users.findAuthRecordByEmail.mockResolvedValue(
                baseRecord({ isActive: false }),
            );

            await expect(
                service.login(
                    { email: 'test@example.com', password: goodPassword },
                    {},
                ),
            ).rejects.toThrow(ForbiddenException);
        });

        it('locks account after 5 failed attempts', async () => {
            users.findAuthRecordByEmail.mockResolvedValue(
                baseRecord({ failedAttempts: 4 }),
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
            users.findAuthRecordByEmail.mockResolvedValue(
                baseRecord({ lockedUntil: future }),
            );

            await expect(
                service.login(
                    { email: 'test@example.com', password: goodPassword },
                    {},
                ),
            ).rejects.toThrow(ForbiddenException);
        });

        it('rejects login when email unverified — BEFORE MFA check', async () => {
            users.findAuthRecordByEmail.mockResolvedValue(
                baseRecord({ isEmailVerified: false }),
            );

            await expect(
                service.login(
                    { email: 'test@example.com', password: goodPassword },
                    {},
                ),
            ).rejects.toThrow(ForbiddenException);

            // MFA lookup should never happen — email verification gates first
            expect(mfa.isEnabled).not.toHaveBeenCalled();
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  MFA LOGIN COMPLETION
    // ─────────────────────────────────────────────────────────────

    describe('completeMfaLogin', () => {
        it('issues tokens on valid TOTP', async () => {
            mfa.verifyCodeOrBackup.mockResolvedValue({
                valid: true,
                method: 'totp',
                remaining: 10,
            });
            users.findByIdOrFail.mockResolvedValue({
                id: 'u1',
                email: 'test@example.com',
                phone: null,
                isActive: true,
                mustChangePassword: false,
            });
            stubTokenIssuance();

            const result = await service.completeMfaLogin('u1', '123456', {});

            expect(result.accessToken).toBe('signed.jwt.token');
            expect(result.user.roles).toEqual(['CUSTOMER']);
            expect(users.setLastLogin).toHaveBeenCalledWith('u1');
            expect(audit.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'auth.login.mfa.success.totp',
                }),
            );
        });

        it('issues tokens on valid backup code and warns when low', async () => {
            mfa.verifyCodeOrBackup.mockResolvedValue({
                valid: true,
                method: 'backup_code',
                remaining: 1,
            });
            users.findByIdOrFail.mockResolvedValue({
                id: 'u1',
                email: 'test@example.com',
                phone: null,
                isActive: true,
                mustChangePassword: false,
            });
            stubTokenIssuance();

            const result = await service.completeMfaLogin('u1', 'ABCDEFGHIJ', {});

            expect(result.accessToken).toBeDefined();
            expect((result as AuthResponseDto & { warning?: string }).warning).toMatch(
                /Only 1 backup codes remaining/,
            );
        });

        it('rejects invalid MFA code and increments failed attempts', async () => {
            mfa.verifyCodeOrBackup.mockResolvedValue({
                valid: false,
                method: null,
                remaining: 10,
            });
            users.findByIdOrFail.mockResolvedValue({
                id: 'u1',
                failedAttempts: 2,
            });

            await expect(
                service.completeMfaLogin('u1', '000000', {}),
            ).rejects.toThrow(UnauthorizedException);

            expect(users.setFailedAttempts).toHaveBeenCalledWith('u1', 3, null);
            expect(audit.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'auth.login.mfa.failed' }),
            );
        });

        it('rejects if account became inactive between challenge and completion', async () => {
            mfa.verifyCodeOrBackup.mockResolvedValue({
                valid: true,
                method: 'totp',
                remaining: 10,
            });
            users.findByIdOrFail.mockResolvedValue({
                id: 'u1',
                email: 'x@y.com',
                phone: null,
                isActive: false,
                mustChangePassword: false,
            });

            await expect(
                service.completeMfaLogin('u1', '123456', {}),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  REFRESH
    // ─────────────────────────────────────────────────────────────

    describe('refresh', () => {
        it('rotates token on valid refresh', async () => {
            const stored = {
                id: 't1',
                userId: 'u1',
                tokenHash: 'H',
                revokedAt: null,
                expiresAt: new Date(Date.now() + 100_000),
            };
            refreshRepo.findOne.mockResolvedValue(stored);
            refreshRepo.update.mockResolvedValue({} as never);
            stubTokenIssuance();

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
            });

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
            });

            await expect(
                service.refresh('expired', {}),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  PASSWORD CHANGE
    // ─────────────────────────────────────────────────────────────

    describe('changePassword', () => {
        it('updates hash and revokes all sessions', async () => {
            users.getPasswordHashForAuth.mockResolvedValue(goodHash);
            refreshRepo.update.mockResolvedValue({} as never);

            await service.changePassword('u1', goodPassword, 'NewPass1!');

            expect(users.setPasswordHash).toHaveBeenCalledWith(
                'u1',
                expect.any(String),
            );
            // Should revoke all
            expect(refreshRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'u1' }),
                { revokedAt: expect.any(Date) },
            );
        });

        it('rejects wrong current password', async () => {
            users.getPasswordHashForAuth.mockResolvedValue(goodHash);

            await expect(
                service.changePassword('u1', 'wrong', 'NewPass1!'),
            ).rejects.toThrow('Old password is incorrect');
        });
    });
});