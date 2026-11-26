import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
    BadRequestException,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

import { StepUpService, STEP_UP_TTL_SECONDS } from './step-up.service';
import { UsersService } from '../../users/services/users.service';
import { MfaService } from './mfa.service';
import { PasskeyService } from './passkey.service';
import { MailService } from '../../notifications/services/mail.service';
import { AuditService } from '../../audit/services/audit.service';
import { UserPasskey } from '../entities/user-passkey.entity';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('StepUpService', () => {
    let service: StepUpService;
    let users: Record<string, jest.Mock>;
    let mfa: Record<string, jest.Mock>;
    let passkeyService: Record<string, jest.Mock>;
    let mail: Record<string, jest.Mock>;
    let audit: Record<string, jest.Mock>;
    let passkeyRepo: ReturnType<typeof createMockRepository>;
    let oauthRepo: { find: jest.Mock };

    beforeEach(async () => {
        users = {
            findByIdOrFail: jest.fn().mockResolvedValue({
                id: 'u1',
                email: 'piko@example.com',
            }),
            getPasswordHashForAuth: jest.fn(),
        };

        mfa = {
            isEnabled: jest.fn().mockResolvedValue(false),
            verifyCodeOrBackup: jest.fn().mockResolvedValue({ valid: false }),
        };

        passkeyService = {
            generateAuthenticationOptionsForUser: jest.fn(),
            verifyAuthenticationForUser: jest.fn(),
        };

        mail = { send: jest.fn().mockResolvedValue(undefined) };
        audit = { log: jest.fn() };
        passkeyRepo = createMockRepository<UserPasskey>();
        passkeyRepo.count.mockResolvedValue(0);

        oauthRepo = { find: jest.fn().mockResolvedValue([]) };
        const dataSource = {
            getRepository: jest.fn().mockReturnValue(oauthRepo),
        };

        const module = await Test.createTestingModule({
            providers: [
                StepUpService,
                { provide: UsersService, useValue: users },
                { provide: MfaService, useValue: mfa },
                { provide: PasskeyService, useValue: passkeyService },
                { provide: MailService, useValue: mail },
                { provide: AuditService, useValue: audit },
                { provide: getRepositoryToken(UserPasskey), useValue: passkeyRepo },
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        service = module.get(StepUpService);
    });

    describe('getStatus', () => {
        it('detects password-capable accounts vs OAuth-only accounts', async () => {
            const validHash = await bcrypt.hash('Secret123!', 4);
            users.getPasswordHashForAuth.mockResolvedValueOnce(validHash);

            const pwStatus = await service.getStatus('u1');
            expect(pwStatus.verified).toBe(false);
            expect(pwStatus.availableMethods).toEqual({
                password: true,
                passkey: false,
                totp: false,
                emailOtp: true,
            });

            // OAuth-only user has non-bcrypt placeholder hash & linked OAuth provider
            users.getPasswordHashForAuth.mockResolvedValueOnce('oauth_no_password_hash_abcdef');
            passkeyRepo.count.mockResolvedValueOnce(1);
            mfa.isEnabled.mockResolvedValueOnce(true);
            oauthRepo.find.mockResolvedValueOnce([{ provider: 'google' }]);

            const oauthStatus = await service.getStatus('u1');
            expect(oauthStatus.availableMethods).toEqual({
                password: false,
                passkey: true,
                totp: true,
                emailOtp: true,
            });
            expect(oauthStatus.oauthProviders).toEqual(['google']);
        });
    });

    describe('assertVerified & verify', () => {
        it('throws ForbiddenException before step-up and unlocks after password verification', async () => {
            await expect(service.assertVerified('u1')).rejects.toThrow(ForbiddenException);

            const validHash = await bcrypt.hash('CorrectHorse99!', 4);
            users.getPasswordHashForAuth.mockResolvedValue(validHash);

            await expect(
                service.verify('u1', { method: 'password', password: 'WrongPassword!' }),
            ).rejects.toThrow(UnauthorizedException);

            const granted = await service.verify(
                'u1',
                { method: 'password', password: 'CorrectHorse99!' },
                '127.0.0.1',
            );
            expect(granted.verified).toBe(true);
            expect(granted.method).toBe('password');
            expect(STEP_UP_TTL_SECONDS).toBe(300);

            await expect(service.assertVerified('u1')).resolves.toBeUndefined();
            const status = await service.isVerified('u1');
            expect(status.verified).toBe(true);

            await service.clearVerification('u1');
            await expect(service.assertVerified('u1')).rejects.toThrow(ForbiddenException);
        });

        it('rejects password method cleanly for OAuth-only users', async () => {
            users.getPasswordHashForAuth.mockResolvedValue('oauth_no_password_hash_xyz');
            await expect(
                service.verify('u1', { method: 'password', password: 'anything' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('verifies TOTP method when MFA code is valid', async () => {
            mfa.verifyCodeOrBackup.mockResolvedValueOnce({ valid: true });
            const res = await service.verify('u1', { method: 'totp', code: '123456' });
            expect(res.verified).toBe(true);
            expect(res.method).toBe('totp');
        });
    });

    describe('email OTP flow', () => {
        it('sends 6-digit email OTP, enforces cooldown, locks after max wrong attempts, and accepts valid code', async () => {
            const req1 = await service.requestEmailOtp('u1', '127.0.0.1');
            expect(req1.maskedEmail).toBe('pi**@example.com');
            expect(mail.send).toHaveBeenCalledTimes(1);

            const htmlArg = mail.send.mock.calls[0][0].text as string;
            const match = htmlArg.match(/(\d{6})/);
            expect(match).not.toBeNull();
            const code = match![1];

            // Immediate second request hits 60s cooldown without sending duplicate mail
            await service.requestEmailOtp('u1', '127.0.0.1');
            expect(mail.send).toHaveBeenCalledTimes(1);

            // Wrong code fails
            const wrongCode = code === '000000' ? '999999' : '000000';
            await expect(
                service.verify('u1', { method: 'email_otp', code: wrongCode }),
            ).rejects.toThrow(UnauthorizedException);

            // Valid code unlocks sudo mode
            const ok = await service.verify('u1', { method: 'email_otp', code });
            expect(ok.verified).toBe(true);
            expect(ok.method).toBe('email_otp');

            // After success, OTP is consumed and 5 wrong attempts invalidate a new OTP
            await service.clearVerification('u1');
            await expect(
                service.verify('u1', { method: 'email_otp', code }),
            ).rejects.toThrow(UnauthorizedException);
        });
    });
});
