import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { UserMfa } from '../entities/user-mfa.entity';
import { MfaBackupCode } from '../entities/mfa-backup-code.entity';
import { EncryptionService } from './encryption.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/services/users.service';
import { AuditService } from '../../audit/services/audit.service';

describe('MfaService', () => {
    let service: MfaService;
    let mfaRepo: ReturnType<typeof createMockRepository>;
    let backupRepo: ReturnType<typeof createMockRepository>;
    let users: Partial<jest.Mocked<UsersService>>;
    let encryption: jest.Mocked<EncryptionService>;

    beforeEach(async () => {
        mfaRepo = createMockRepository<UserMfa>();
        backupRepo = createMockRepository<MfaBackupCode>();
        users = {
            findByIdOrFail: jest.fn(),
            getPasswordHashForAuth: jest.fn(),
        };
        encryption = {
            encrypt: jest.fn((s) => `enc(${s})`),
            decrypt: jest.fn((s) => s.replace(/^enc\((.*)\)$/, '$1')),
        } as never;

        const module = await Test.createTestingModule({
            providers: [
                MfaService,
                { provide: getRepositoryToken(UserMfa), useValue: mfaRepo },
                { provide: getRepositoryToken(MfaBackupCode), useValue: backupRepo },
                { provide: EncryptionService, useValue: encryption },
                { provide: UsersService, useValue: users },
                { provide: AuditService, useValue: { log: jest.fn() } },
                { provide: ConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get(MfaService);
    });

    describe('isEnabled', () => {
        it('returns true when user has enabled MFA', async () => {
            mfaRepo.findOne.mockResolvedValue({ isEnabled: true } as never);
            expect(await service.isEnabled('u1')).toBe(true);
        });

        it('returns false when no MFA record', async () => {
            mfaRepo.findOne.mockResolvedValue(null);
            expect(await service.isEnabled('u1')).toBe(false);
        });
    });

    describe('setup', () => {
        it('rejects wrong password', async () => {
            users.findByIdOrFail!.mockResolvedValue({
                id: 'u1',
                email: 'a@b.com',
            } as never);
            users.getPasswordHashForAuth!.mockResolvedValue(
                await bcrypt.hash('Correct!', 4),
            );

            await expect(
                service.setup('u1', 'Wrong!'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('rejects if MFA already enabled', async () => {
            users.findByIdOrFail!.mockResolvedValue({ id: 'u1', email: 'a@b.com' } as never);
            users.getPasswordHashForAuth!.mockResolvedValue(
                await bcrypt.hash('Password!', 4),
            );
            mfaRepo.findOne.mockResolvedValue({ isEnabled: true } as never);

            await expect(
                service.setup('u1', 'Password!'),
            ).rejects.toThrow('already enabled');
        });
    });

    describe('verifyCodeOrBackup', () => {
        it('returns valid=false when MFA not enabled', async () => {
            mfaRepo.findOne.mockResolvedValue(null);
            const result = await service.verifyCodeOrBackup('u1', '123456');
            expect(result.valid).toBe(false);
        });
    });
});