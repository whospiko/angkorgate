import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
    BadRequestException,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { UsersService } from '../../users/services/users.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { MailService } from '../../notifications/services/mail.service';
import { CustomersService } from '../../customers/services/customers.service';
import { EmployeesService } from '../../employees/services/employees.service';
import { AuditService } from '../../audit/services/audit.service';
import { CacheService } from '../../cache/cache.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { LoginAttempt } from '../entities/login-attempt.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { UserPasskey } from '../entities/user-passkey.entity';
import { AuthResponseDto, MfaChallengeDto } from '../dto/auth-response.dto';
import { createMockRepository } from '../../../test/mocks/repository.mock';
import { hashSha256 } from '../../common/utils/crypto.util';

describe('AuthService', () => {
    let service: AuthService;

    // Collaborators
    let users: Record<string, jest.Mock>;
    let rbac: Record<string, jest.Mock>;
    let jwt: Record<string, jest.Mock>;
    let config: Record<string, jest.Mock>;
    let audit: { log: jest.Mock };
    let mfa: Record<string, jest.Mock>;
    let customers: Record<string, jest.Mock>;
    let employees: Record<string, jest.Mock>;
    let cacheStore: Map<string, unknown>;
    let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

    // Repositories
    let refreshRepo: ReturnType<typeof createMockRepository>;
    let attemptRepo: ReturnType<typeof createMockRepository>;
    let evtRepo: ReturnType<typeof createMockRepository>;
    let prtRepo: ReturnType<typeof createMockRepository>;
    let passkeyRepo: ReturnType<typeof createMockRepository>;

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
            update: jest.fn(),
        };

        rbac = {
            getUserRoleCodes: jest.fn().mockResolvedValue(['CUSTOMER']),
            getUserPermissions: jest.fn().mockResolvedValue([]),
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

        customers = {
            create: jest.fn(),
            findByUserId: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
        };

        employees = {
            create: jest.fn(),
            findByUserId: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
        };

        refreshRepo = createMockRepository<RefreshToken>();
        attemptRepo = createMockRepository<LoginAttempt>();
        evtRepo = createMockRepository<EmailVerificationToken>();
        prtRepo = createMockRepository<PasswordResetToken>();
        passkeyRepo = createMockRepository<UserPasskey>();
        passkeyRepo.count = jest.fn().mockResolvedValue(0);

        cacheStore = new Map<string, unknown>();
        cache = {
            get: jest.fn(async (key: string) => cacheStore.get(key) ?? null),
            set: jest.fn(async (key: string, val: unknown) => {
                cacheStore.set(key, val);
            }),
            del: jest.fn(async (key: string) => {
                cacheStore.delete(key);
            }),
        };

        const module = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: users },
                { provide: RbacService, useValue: rbac },
                { provide: JwtService, useValue: jwt },
                { provide: ConfigService, useValue: config },
                { provide: MailService, useValue: { send: jest.fn() } },
                { provide: CustomersService, useValue: customers },
                { provide: EmployeesService, useValue: employees },
                { provide: AuditService, useValue: audit },
                { provide: MfaService, useValue: mfa },
                { provide: CacheService, useValue: cache },
                { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
                { provide: getRepositoryToken(LoginAttempt), useValue: attemptRepo },
                { provide: getRepositoryToken(EmailVerificationToken), useValue: evtRepo },
                { provide: getRepositoryToken(PasswordResetToken), useValue: prtRepo },
                { provide: getRepositoryToken(UserPasskey), useValue: passkeyRepo },
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
        it('rotates token within the same family and updates Redis family state', async () => {
            const stored = {
                id: 't1',
                userId: 'u1',
                familyId: 'fam-1',
                tokenHash: hashSha256('any-refresh-token'),
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/131.0.0.0',
                ipAddress: '10.0.0.1',
                revokedAt: null,
                expiresAt: new Date(Date.now() + 100_000),
            };
            refreshRepo.findOne.mockResolvedValue(stored);
            refreshRepo.update.mockResolvedValue({ affected: 1 } as never);
            refreshRepo.create.mockImplementation((d) => ({ id: 't2', ...d }));
            refreshRepo.save.mockImplementation(async (d) => d);
            users.findByIdOrFail.mockResolvedValue({
                id: 'u1',
                email: 'test@example.com',
                phone: null,
                isActive: true,
                mustChangePassword: false,
            });

            const result = await service.refresh('any-refresh-token', {});

            expect(refreshRepo.update).toHaveBeenCalledWith(
                { id: 't1', revokedAt: IsNull() },
                { revokedAt: expect.any(Date), revokedReason: 'rotated' },
            );
            expect(refreshRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'u1',
                    familyId: 'fam-1',
                    lastUsedAt: expect.any(Date),
                }),
            );
            expect(refreshRepo.update).toHaveBeenCalledWith('t1', {
                replacedById: 't2',
            });
            expect(cacheStore.get('auth:rt:family:fam-1')).toMatchObject({
                familyId: 'fam-1',
                userId: 'u1',
                revoked: false,
                currentTokenHash: hashSha256(result.refreshToken),
            });
            expect(result.accessToken).toBeDefined();
        });

        it('revokes ONLY the compromised token family when a rotated token is replayed', async () => {
            refreshRepo.findOne.mockResolvedValue({
                id: 't1',
                userId: 'u1',
                familyId: 'fam-compromised',
                tokenHash: hashSha256('reused-token'),
                revokedAt: new Date(),
                revokedReason: 'rotated',
            });

            await expect(
                service.refresh('reused-token', {
                    ip: '192.0.2.55',
                    userAgent: 'curl/8.7.1',
                }),
            ).rejects.toThrow(UnauthorizedException);

            expect(refreshRepo.update).toHaveBeenCalledWith(
                { familyId: 'fam-compromised', revokedAt: IsNull() },
                { revokedAt: expect.any(Date), revokedReason: 'reuse_detected' },
            );
            expect(cacheStore.get('auth:rt:family:fam-compromised')).toMatchObject({
                familyId: 'fam-compromised',
                revoked: true,
                revokedReason: 'reuse_detected',
            });
            expect(audit.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    actorId: 'u1',
                    action: 'auth.refresh.reuse_detected',
                    entityId: 'fam-compromised',
                }),
            );
        });

        it('detects token replay via Redis family state mismatch even before DB revokedAt', async () => {
            cacheStore.set('auth:rt:family:fam-redis', {
                familyId: 'fam-redis',
                userId: 'u1',
                currentTokenHash: hashSha256('newer-token'),
                revoked: false,
                lastActiveAt: new Date().toISOString(),
            });
            refreshRepo.findOne.mockResolvedValue({
                id: 't1',
                userId: 'u1',
                familyId: 'fam-redis',
                tokenHash: hashSha256('stale-token'),
                revokedAt: null,
                expiresAt: new Date(Date.now() + 100_000),
            });

            await expect(
                service.refresh('stale-token', {}),
            ).rejects.toThrow(UnauthorizedException);

            expect(refreshRepo.update).toHaveBeenCalledWith(
                { familyId: 'fam-redis', revokedAt: IsNull() },
                { revokedAt: expect.any(Date), revokedReason: 'reuse_detected' },
            );
            expect(cacheStore.get('auth:rt:family:fam-redis')).toMatchObject({
                revoked: true,
                revokedReason: 'reuse_detected',
            });
        });

        it('revokes entire token family on concurrent rotation race condition', async () => {
            refreshRepo.findOne.mockResolvedValue({
                id: 't1',
                userId: 'u1',
                familyId: 'fam-race',
                tokenHash: hashSha256('race-token'),
                revokedAt: null,
                expiresAt: new Date(Date.now() + 100_000),
            });
            users.findByIdOrFail.mockResolvedValue({
                id: 'u1',
                email: 'test@example.com',
                phone: null,
                isActive: true,
            });
            refreshRepo.update.mockResolvedValue({ affected: 0 } as never);

            await expect(
                service.refresh('race-token', {}),
            ).rejects.toThrow(UnauthorizedException);

            expect(refreshRepo.update).toHaveBeenCalledWith(
                { familyId: 'fam-race', revokedAt: IsNull() },
                { revokedAt: expect.any(Date), revokedReason: 'reuse_detected' },
            );
        });

        it('rejects expired refresh token', async () => {
            refreshRepo.findOne.mockResolvedValue({
                id: 't1',
                userId: 'u1',
                familyId: 'fam-exp',
                tokenHash: hashSha256('expired'),
                revokedAt: null,
                expiresAt: new Date(Date.now() - 1000),
            });

            await expect(
                service.refresh('expired', {}),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  SESSIONS (ENRICHED METADATA & REVOKE OTHERS)
    // ─────────────────────────────────────────────────────────────

    describe('sessions', () => {
        it('returns enriched OS, Browser, IP, and Last Active metadata', async () => {
            const currentToken = 'current-rt';
            const now = new Date();
            refreshRepo.find.mockResolvedValue([
                {
                    id: 's1',
                    userId: 'u1',
                    familyId: 'fam-1',
                    tokenHash: hashSha256(currentToken),
                    userAgent:
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    ipAddress: '203.0.113.10',
                    lastUsedAt: now,
                    createdAt: new Date(now.getTime() - 3600_000),
                    expiresAt: new Date(now.getTime() + 86400_000),
                },
                {
                    id: 's2',
                    userId: 'u1',
                    familyId: 'fam-2',
                    tokenHash: hashSha256('other-rt'),
                    userAgent:
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Version/18.1 Mobile/15E148 Safari/604.1',
                    ipAddress: '198.51.100.42',
                    lastUsedAt: new Date(now.getTime() - 60_000),
                    createdAt: new Date(now.getTime() - 7200_000),
                    expiresAt: new Date(now.getTime() + 86400_000),
                },
            ]);

            const sessions = await service.listSessions('u1', currentToken);

            expect(sessions).toHaveLength(2);
            expect(sessions[0]).toMatchObject({
                id: 's1',
                familyId: 'fam-1',
                browser: 'Chrome 131',
                os: 'macOS 10.15',
                deviceType: 'desktop',
                ipAddress: '203.0.113.10',
                lastActiveAt: now,
                isCurrent: true,
            });
            expect(sessions[1]).toMatchObject({
                id: 's2',
                familyId: 'fam-2',
                browser: 'Safari 18',
                os: 'iOS 18.1',
                deviceType: 'mobile',
                ipAddress: '198.51.100.42',
                isCurrent: false,
            });
        });

        it('revokes all other sessions while preserving the current session', async () => {
            const currentToken = 'keep-this-rt';
            const future = new Date(Date.now() + 100_000);
            refreshRepo.findOne.mockResolvedValue({
                id: 's1',
                userId: 'u1',
                familyId: 'fam-keep',
                tokenHash: hashSha256(currentToken),
                expiresAt: future,
                revokedAt: null,
            });
            refreshRepo.find.mockResolvedValue([
                { id: 's1', userId: 'u1', familyId: 'fam-keep', expiresAt: future },
                { id: 's2', userId: 'u1', familyId: 'fam-other-1', expiresAt: future },
                { id: 's3', userId: 'u1', familyId: 'fam-other-2', expiresAt: future },
            ]);
            refreshRepo.update.mockResolvedValue({ affected: 2 } as never);

            const res = await service.revokeOtherSessions('u1', {
                currentRefreshToken: currentToken,
            });

            expect(res.revokedCount).toBe(2);
            expect(refreshRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'u1',
                    revokedAt: IsNull(),
                }),
                {
                    revokedAt: expect.any(Date),
                    revokedReason: 'revoke_other_sessions',
                },
            );
            expect(cacheStore.get('auth:rt:family:fam-other-1')).toMatchObject({
                revoked: true,
                revokedReason: 'revoke_other_sessions',
            });
            expect(cacheStore.get('auth:rt:family:fam-other-2')).toMatchObject({
                revoked: true,
                revokedReason: 'revoke_other_sessions',
            });
            expect(cacheStore.get('auth:rt:family:fam-keep')).toBeUndefined();
        });

        it('rejects revokeOtherSessions without currentRefreshToken or keepSessionId', async () => {
            await expect(service.revokeOtherSessions('u1', {})).rejects.toThrow(
                BadRequestException,
            );
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
                { revokedAt: expect.any(Date), revokedReason: 'password_changed' },
            );
        });

        it('rejects wrong current password', async () => {
            users.getPasswordHashForAuth.mockResolvedValue(goodHash);

            await expect(
                service.changePassword('u1', 'wrong', 'NewPass1!'),
            ).rejects.toThrow('Old password is incorrect');
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  PROFILE & SELF-SERVICE (GET/PATCH /auth/me)
    // ─────────────────────────────────────────────────────────────

    describe('getMeProfile & updateMeProfile', () => {
        it('returns rich profile with linked customer data and passkeys count', async () => {
            users.findByIdOrFail.mockResolvedValue({
                id: 'u1',
                email: 'dara@example.com',
                phone: '+85512345678',
                isEmailVerified: true,
                isPhoneVerified: true,
                createdAt: new Date('2026-01-01'),
            });
            rbac.getUserRoleCodes.mockResolvedValue(['CUSTOMER']);
            rbac.getUserPermissions.mockResolvedValue(['orders:read']);
            mfa.isEnabled.mockResolvedValue(false);
            passkeyRepo.count.mockResolvedValue(2);
            customers.findByUserId.mockResolvedValue({
                id: 'c1',
                customerCode: 'CUS-0001',
                fullName: 'Dara Sok',
                type: 'INDIVIDUAL',
                status: 'ACTIVE',
            });

            const profile = await service.getMeProfile('u1');

            expect(profile.id).toBe('u1');
            expect(profile.email).toBe('dara@example.com');
            expect(profile.fullName).toBe('Dara Sok');
            expect(profile.passkeysCount).toBe(2);
            expect(profile.customer?.customerCode).toBe('CUS-0001');
            expect(profile.employee).toBeNull();
        });

        it('updates profile full name and phone number on customer', async () => {
            users.findByIdOrFail.mockResolvedValue({
                id: 'u1',
                email: 'dara@example.com',
                phone: '+85512345678',
                isEmailVerified: true,
                isPhoneVerified: true,
                createdAt: new Date('2026-01-01'),
            });
            users.update.mockResolvedValue({});
            customers.findByUserId.mockResolvedValue({
                id: 'c1',
                customerCode: 'CUS-0001',
                fullName: 'Old Name',
                phone: '+85512345678',
            });
            customers.update.mockResolvedValue({});

            await service.updateMeProfile('u1', {
                fullName: 'New Name',
                phone: '+85598765432',
            });

            expect(users.update).toHaveBeenCalledWith('u1', { phone: '+85598765432' });
            expect(customers.update).toHaveBeenCalledWith('c1', {
                fullName: 'New Name',
                phone: '+85598765432',
            }, 'u1');
            expect(audit.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'auth.profile.updated',
                    entityId: 'u1',
                }),
            );
        });
    });
});