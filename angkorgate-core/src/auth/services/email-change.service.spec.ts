import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
    BadRequestException,
    ConflictException,
    UnauthorizedException,
} from '@nestjs/common';
import { EmailChangeService } from './email-change.service';
import { EmailChangeToken } from '../entities/email-change-token.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { UsersService } from '../../users/services/users.service';
import { MfaService } from './mfa.service';
import { MailService } from '../../notifications/services/mail.service';
import { AuditService } from '../../audit/services/audit.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';
import { IsNull } from 'typeorm';

describe('EmailChangeService', () => {
    let service: EmailChangeService;
    let tokenRepo: ReturnType<typeof createMockRepository>;
    let refreshRepo: ReturnType<typeof createMockRepository>;
    let users: Record<string, jest.Mock>;
    let mfa: Record<string, jest.Mock>;
    let mail: Record<string, jest.Mock>;

    beforeEach(async () => {
        tokenRepo = createMockRepository<EmailChangeToken>();
        refreshRepo = createMockRepository<RefreshToken>();

        users = {
            findByIdOrFail: jest.fn(),
            findByEmail: jest.fn(),
            updateEmail: jest.fn(),
        };

        mfa = {
            isEnabled: jest.fn().mockResolvedValue(false),
            verifyCodeOrBackup: jest.fn().mockResolvedValue({ valid: true }),
        };

        mail = { send: jest.fn().mockResolvedValue(undefined) };

        const module = await Test.createTestingModule({
            providers: [
                EmailChangeService,
                { provide: getRepositoryToken(EmailChangeToken), useValue: tokenRepo },
                { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
                { provide: UsersService, useValue: users },
                { provide: MfaService, useValue: mfa },
                { provide: MailService, useValue: mail },
                { provide: AuditService, useValue: { log: jest.fn() } },
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:5173') } },
            ],
        }).compile();

        service = module.get(EmailChangeService);
    });

    // ─────────── REQUEST CHANGE ───────────

    describe('requestChange', () => {
        const userId = 'u1';
        const dto = { newEmail: 'new@example.com' };

        beforeEach(() => {
            users.findByIdOrFail.mockResolvedValue({ id: userId, email: 'old@example.com' });
        });

        it('sends alert to old email and confirmation to new email', async () => {
            tokenRepo.findOne.mockResolvedValue(null);
            tokenRepo.create.mockImplementation((d) => d);
            tokenRepo.save.mockResolvedValue({});

            await service.requestChange(userId, dto, {});

            // 2 emails sent: alert to old, confirm to new
            expect(mail.send).toHaveBeenCalledTimes(2);
            expect(mail.send).toHaveBeenNthCalledWith(1, expect.objectContaining({ to: 'old@example.com' }));
            expect(mail.send).toHaveBeenNthCalledWith(2, expect.objectContaining({ to: 'new@example.com' }));

            // Token saved
            expect(tokenRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ userId, newEmail: 'new@example.com' })
            );
        });

        it('rejects if newEmail === current email', async () => {
            await expect(
                service.requestChange(userId, { newEmail: 'old@example.com' }, {})
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects if new email is already taken by another user', async () => {
            users.findByEmail.mockResolvedValue({ id: 'someone-else' });
            await expect(service.requestChange(userId, dto, {})).rejects.toThrow(ConflictException);
        });

        it('enforces 60s cooldown', async () => {
            tokenRepo.findOne.mockResolvedValue({
                createdAt: new Date(), // just created
                expiresAt: new Date(Date.now() + 100000)
            });

            await service.requestChange(userId, dto, {});

            // Should return generic response, no emails sent
            expect(mail.send).not.toHaveBeenCalled();
        });

        it('requires MFA code if MFA is enabled', async () => {
            mfa.isEnabled.mockResolvedValue(true);

            await expect(
                service.requestChange(userId, { newEmail: 'new@example.com' }, {})
            ).rejects.toThrow(UnauthorizedException);

            // With bad code
            mfa.verifyCodeOrBackup.mockResolvedValue({ valid: false });
            await expect(
                service.requestChange(userId, { newEmail: 'new@example.com', mfaCode: '000000' }, {})
            ).rejects.toThrow(UnauthorizedException);

            // With good code
            mfa.verifyCodeOrBackup.mockResolvedValue({ valid: true });
            tokenRepo.findOne.mockResolvedValue(null); // no cooldown
            users.findByEmail.mockResolvedValue(null); // no conflict
            tokenRepo.create.mockImplementation((d) => d);
            tokenRepo.save.mockResolvedValue({});

            await expect(
                service.requestChange(userId, { newEmail: 'new@example.com', mfaCode: '123456' }, {})
            ).resolves.toBeDefined();
        });
    });

    // ─────────── CONFIRM CHANGE ───────────

    describe('confirmChange', () => {
        it('applies email change and revokes all sessions', async () => {
            const record = {
                id: 't1',
                userId: 'u1',
                newEmail: 'new@example.com',
                usedAt: null,
                expiresAt: new Date(Date.now() + 100000),
            };

            // findByEmail for the conflict re-check
            users.findByEmail.mockResolvedValue(null);

            tokenRepo.findOne.mockResolvedValue(record);
            tokenRepo.update.mockResolvedValue({ affected: 1 }); // atomic consume succeeds

            await service.confirmChange('raw-token', {});

            // Email updated
            expect(users.updateEmail).toHaveBeenCalledWith('u1', 'new@example.com');

            // Sessions revoked
            expect(refreshRepo.update).toHaveBeenCalledWith(
                { userId: 'u1', revokedAt: IsNull() },
                { revokedAt: expect.any(Date) }
            );
        });

        it('rejects invalid token', async () => {
            tokenRepo.findOne.mockResolvedValue(null);
            await expect(service.confirmChange('bad-token', {})).rejects.toThrow(BadRequestException);
        });

        it('rejects already used token', async () => {
            tokenRepo.findOne.mockResolvedValue({ usedAt: new Date() });
            await expect(service.confirmChange('token', {})).rejects.toThrow('Token already used');
        });

        it('rejects expired token', async () => {
            tokenRepo.findOne.mockResolvedValue({
                usedAt: null,
                expiresAt: new Date(Date.now() - 1000)
            });
            await expect(service.confirmChange('token', {})).rejects.toThrow('Token has expired');
        });

        it('rejects if email was taken by someone else in the meantime', async () => {
            tokenRepo.findOne.mockResolvedValue({
                userId: 'u1',
                newEmail: 'new@example.com',
                usedAt: null,
                expiresAt: new Date(Date.now() + 100000)
            });
            // Someone else registered this email while the token was pending
            users.findByEmail.mockResolvedValue({ id: 'someone-else' });

            await expect(service.confirmChange('token', {})).rejects.toThrow(ConflictException);
        });
    });
});