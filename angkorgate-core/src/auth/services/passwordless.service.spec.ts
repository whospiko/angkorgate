import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
    ForbiddenException,
    HttpException,
    UnauthorizedException,
} from '@nestjs/common';

import { PasswordlessService } from './passwordless.service';
import { AuthService } from './auth.service';
import { UsersService } from '../../users/services/users.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { CustomersService } from '../../customers/services/customers.service';
import { MailService } from '../../notifications/services/mail.service';
import { SmsService } from '../../notifications/services/sms.service';
import { AuditService } from '../../audit/services/audit.service';
import { PasswordlessToken } from '../entities/passwordless-token.entity';
import { LoginAttempt } from '../entities/login-attempt.entity';
import { hashSha256 } from '../../common/utils/crypto.util';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('PasswordlessService', () => {
    let service: PasswordlessService;

    let tokenRepo: ReturnType<typeof createMockRepository>;
    let attemptRepo: ReturnType<typeof createMockRepository>;
    let users: Record<string, jest.Mock>;
    let rbac: Record<string, jest.Mock>;
    let customers: Record<string, jest.Mock>;
    let jwt: Record<string, jest.Mock>;
    let config: Record<string, jest.Mock>;
    let mail: { send: jest.Mock };
    let sms: { send: jest.Mock };
    let audit: { log: jest.Mock };
    let authService: Record<string, jest.Mock>;

    const baseUser = {
        id: 'user-1',
        email: 'alice@example.com',
        phone: '+85512345678',
        isActive: true,
        isEmailVerified: false,
        isPhoneVerified: false,
        lockedUntil: null,
    };

    const authResponse = {
        accessToken: 'access.jwt',
        refreshToken: 'refresh.tok',
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: 604800,
        user: {
            id: 'user-1',
            email: 'alice@example.com',
            phone: '+85512345678',
            roles: ['CUSTOMER'],
            mustChangePassword: false,
        },
    };

    beforeEach(async () => {
        tokenRepo = createMockRepository();
        tokenRepo.create.mockImplementation((entity: any) => entity);
        attemptRepo = createMockRepository();
        attemptRepo.create.mockImplementation((entity: any) => entity);

        users = {
            findByEmail: jest.fn().mockResolvedValue(baseUser),
            findByPhone: jest.fn().mockResolvedValue(baseUser),
            findByIdOrFail: jest.fn().mockResolvedValue(baseUser),
            create: jest.fn(),
            setEmailVerified: jest.fn().mockResolvedValue(undefined),
            setPhoneVerified: jest.fn().mockResolvedValue(undefined),
            setFailedAttempts: jest.fn().mockResolvedValue(undefined),
            setLastLogin: jest.fn().mockResolvedValue(undefined),
        };

        rbac = {
            assignRoleToUser: jest.fn().mockResolvedValue(undefined),
        };

        customers = {
            create: jest.fn().mockResolvedValue({ id: 'cust-1' }),
        };

        jwt = {
            signAsync: jest.fn().mockResolvedValue('signed.magic.jwt'),
            verifyAsync: jest.fn(),
        };

        const configMap: Record<string, unknown> = {
            JWT_ACCESS_SECRET: 'a'.repeat(32),
            'oauth.webUrl': 'http://localhost:4000',
            'passwordless.magicLinkTtlMinutes': 15,
            'passwordless.otpTtlMinutes': 10,
            'passwordless.resendCooldownSeconds': 60,
            'passwordless.maxOtpAttempts': 5,
            'passwordless.autoRegister': false,
        };

        config = {
            get: jest.fn((key: string) => configMap[key]),
        };

        mail = { send: jest.fn().mockResolvedValue(undefined) };
        sms = { send: jest.fn().mockResolvedValue(undefined) };
        audit = { log: jest.fn().mockResolvedValue(undefined) };
        authService = {
            issueTokensForUser: jest.fn().mockResolvedValue(authResponse),
            hashPassword: jest.fn().mockResolvedValue('$2b$12$hashed'),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                PasswordlessService,
                { provide: getRepositoryToken(PasswordlessToken), useValue: tokenRepo },
                { provide: getRepositoryToken(LoginAttempt), useValue: attemptRepo },
                { provide: UsersService, useValue: users },
                { provide: RbacService, useValue: rbac },
                { provide: CustomersService, useValue: customers },
                { provide: JwtService, useValue: jwt },
                { provide: ConfigService, useValue: config },
                { provide: MailService, useValue: mail },
                { provide: SmsService, useValue: sms },
                { provide: AuditService, useValue: audit },
                { provide: AuthService, useValue: authService },
            ],
        }).compile();

        service = moduleRef.get(PasswordlessService);
    });

    describe('requestMagicLink', () => {
        it('sends a signed magic link email for an active user and sanitizes redirectUrl', async () => {
            tokenRepo.findOne.mockResolvedValue(null);
            tokenRepo.save.mockResolvedValue({ id: 'tok-id-1' });

            const res = await service.requestMagicLink(
                { email: 'Alice@Example.com', redirectUrl: '/account' },
                { ip: '127.0.0.1', userAgent: 'jest' },
            );

            expect(res.channel).toBe('magic_link');
            expect(res.expiresInSeconds).toBe(900);
            expect(jwt.signAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    sub: 'user-1',
                    jti: 'tok-id-1',
                    email: 'alice@example.com',
                    type: 'magic_link',
                }),
                expect.objectContaining({
                    audience: 'angkorgate-magic-link',
                }),
            );
            expect(mail.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'alice@example.com',
                    html: expect.stringContaining('/auth/magic-link?token=signed.magic.jwt&redirect=%2Faccount'),
                }),
            );
        });

        it('returns generic success without sending email when user does not exist (no enumeration)', async () => {
            users.findByEmail.mockResolvedValue(null);

            const res = await service.requestMagicLink(
                { email: 'unknown@example.com' },
                {},
            );

            expect(res.channel).toBe('magic_link');
            expect(mail.send).not.toHaveBeenCalled();
            expect(tokenRepo.save).not.toHaveBeenCalled();
        });

        it('enforces resend cooldown', async () => {
            tokenRepo.findOne.mockResolvedValue({
                id: 'recent-1',
                createdAt: new Date(Date.now() - 10_000), // 10s ago < 60s
            });

            await expect(
                service.requestMagicLink({ email: 'alice@example.com' }, {}),
            ).rejects.toThrow(HttpException);
        });
    });

    describe('verifyMagicLink', () => {
        it('verifies a valid signed magic link, marks email verified, and issues tokens', async () => {
            const rawTok = 'raw-secret-token';
            jwt.verifyAsync.mockResolvedValue({
                sub: 'user-1',
                jti: 'tok-id-1',
                tok: rawTok,
                email: 'alice@example.com',
                type: 'magic_link',
            });
            tokenRepo.findOne.mockResolvedValue({
                id: 'tok-id-1',
                userId: 'user-1',
                channel: 'magic_link',
                identifier: 'alice@example.com',
                tokenHash: hashSha256(rawTok),
                redirectUrl: '/account',
                expiresAt: new Date(Date.now() + 60_000),
                usedAt: null,
            });

            const res = await service.verifyMagicLink('signed.magic.jwt', { ip: '127.0.0.1' });

            expect(res.accessToken).toBe('access.jwt');
            expect(res.redirectUrl).toBe('/account');
            expect(users.setEmailVerified).toHaveBeenCalledWith('user-1', true);
            expect(users.setFailedAttempts).toHaveBeenCalledWith('user-1', 0, null);
            expect(users.setLastLogin).toHaveBeenCalledWith('user-1');
            expect(authService.issueTokensForUser).toHaveBeenCalledWith(
                'user-1',
                'alice@example.com',
                '+85512345678',
                { ip: '127.0.0.1' },
            );
        });

        it('rejects already-used magic link', async () => {
            jwt.verifyAsync.mockResolvedValue({
                sub: 'user-1',
                jti: 'tok-id-1',
                tok: 'raw',
                email: 'alice@example.com',
                type: 'magic_link',
            });
            tokenRepo.findOne.mockResolvedValue({
                id: 'tok-id-1',
                userId: 'user-1',
                channel: 'magic_link',
                tokenHash: hashSha256('raw'),
                expiresAt: new Date(Date.now() + 60_000),
                usedAt: new Date(),
            });

            await expect(service.verifyMagicLink('signed.magic.jwt', {})).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('rejects tampered JWT signature', async () => {
            jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));

            await expect(service.verifyMagicLink('bad.jwt', {})).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });

    describe('requestOtp & verifyOtp', () => {
        it('sends a 6-digit OTP via email (SMTP) and verifies it', async () => {
            tokenRepo.findOne.mockResolvedValue(null);
            let savedHash = '';
            tokenRepo.save.mockImplementation((entity: any) => {
                savedHash = entity.tokenHash;
                return Promise.resolve({ ...entity, id: 'otp-1' });
            });

            const reqRes = await service.requestOtp(
                { channel: 'email', email: 'alice@example.com' },
                {},
            );
            expect(reqRes.channel).toBe('email_otp');
            expect(mail.send).toHaveBeenCalledTimes(1);

            const sentText: string = mail.send.mock.calls[0][0].text;
            const match = sentText.match(/\b(\d{6})\b/);
            expect(match).not.toBeNull();
            const code = match![1];

            tokenRepo.findOne.mockResolvedValue({
                id: 'otp-1',
                userId: 'user-1',
                channel: 'email_otp',
                identifier: 'alice@example.com',
                tokenHash: savedHash,
                attempts: 0,
                maxAttempts: 5,
                expiresAt: new Date(Date.now() + 60_000),
                usedAt: null,
            });

            const verifyRes = await service.verifyOtp(
                { channel: 'email', email: 'alice@example.com', code },
                {},
            );
            expect(verifyRes.accessToken).toBe('access.jwt');
            expect(users.setEmailVerified).toHaveBeenCalledWith('user-1', true);
        });

        it('sends a 6-digit OTP via SMS and marks phone verified on verify', async () => {
            tokenRepo.findOne.mockResolvedValue(null);
            let savedHash = '';
            tokenRepo.save.mockImplementation((entity: any) => {
                savedHash = entity.tokenHash;
                return Promise.resolve({ ...entity, id: 'otp-sms-1' });
            });

            const reqRes = await service.requestOtp(
                { channel: 'sms', phone: '+85512345678' },
                {},
            );
            expect(reqRes.channel).toBe('sms_otp');
            expect(sms.send).toHaveBeenCalledTimes(1);

            const smsMsg: string = sms.send.mock.calls[0][1];
            const code = smsMsg.match(/\b(\d{6})\b/)![1];

            tokenRepo.findOne.mockResolvedValue({
                id: 'otp-sms-1',
                userId: 'user-1',
                channel: 'sms_otp',
                identifier: '+85512345678',
                tokenHash: savedHash,
                attempts: 0,
                maxAttempts: 5,
                expiresAt: new Date(Date.now() + 60_000),
                usedAt: null,
            });

            const verifyRes = await service.verifyOtp(
                { channel: 'sms', phone: '+85512345678', code },
                {},
            );
            expect(verifyRes.accessToken).toBe('access.jwt');
            expect(users.setPhoneVerified).toHaveBeenCalledWith('user-1', true);
        });

        it('increments attempts and invalidates OTP after max attempts', async () => {
            const record = {
                id: 'otp-1',
                userId: 'user-1',
                channel: 'email_otp',
                identifier: 'alice@example.com',
                tokenHash: hashSha256('123456'),
                attempts: 4,
                maxAttempts: 5,
                expiresAt: new Date(Date.now() + 60_000),
                usedAt: null as Date | null,
            };
            tokenRepo.findOne.mockResolvedValue(record);

            await expect(
                service.verifyOtp(
                    { channel: 'email', email: 'alice@example.com', code: '999999' },
                    {},
                ),
            ).rejects.toThrow(UnauthorizedException);

            expect(record.attempts).toBe(5);
            expect(record.usedAt).toBeInstanceOf(Date);
        });

        it('rejects disabled user on verification', async () => {
            users.findByIdOrFail.mockResolvedValue({ ...baseUser, isActive: false });
            tokenRepo.findOne.mockResolvedValue({
                id: 'otp-1',
                userId: 'user-1',
                channel: 'email_otp',
                identifier: 'alice@example.com',
                tokenHash: hashSha256('123456'),
                attempts: 0,
                maxAttempts: 5,
                expiresAt: new Date(Date.now() + 60_000),
                usedAt: null,
            });

            await expect(
                service.verifyOtp(
                    { channel: 'email', email: 'alice@example.com', code: '123456' },
                    {},
                ),
            ).rejects.toThrow(ForbiddenException);
        });

        it('blocks magic link and OTP when disabled by RuntimeConfigService', async () => {
            const disabledRuntimeConfig = {
                getBoolean: jest.fn().mockReturnValue(false),
                getNumber: jest.fn((_: string, fb: number) => fb),
                get: jest.fn(),
            };
            const gatedService = new PasswordlessService(
                tokenRepo as any,
                attemptRepo as any,
                users as any,
                rbac as any,
                customers as any,
                jwt as any,
                config as any,
                mail as any,
                sms as any,
                audit as any,
                authService as any,
                disabledRuntimeConfig as any,
            );

            await expect(
                gatedService.requestMagicLink({ email: 'alice@example.com' }, {}),
            ).rejects.toThrow(ForbiddenException);
            await expect(
                gatedService.requestOtp({ channel: 'email', email: 'alice@example.com' }, {}),
            ).rejects.toThrow(ForbiddenException);
            await expect(
                gatedService.requestOtp({ channel: 'sms', phone: '+85512345678' }, {}),
            ).rejects.toThrow(ForbiddenException);
        });
    });
});
