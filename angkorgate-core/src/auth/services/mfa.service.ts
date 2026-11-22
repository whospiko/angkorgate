import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { IsNull, Repository } from 'typeorm';
import { generateSecret, generate, verify, generateURI } from 'otplib';
import * as qrcode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { UserMfa } from '../entities/user-mfa.entity';
import { MfaBackupCode } from '../entities/mfa-backup-code.entity';
import { EncryptionService } from './encryption.service';
import { MfaSetupResponseDto } from '../dto/mfa-response.dto';
import { UsersService } from '../../users/services/users.service';
import { AuditService } from '../../audit/services/audit.service';

const BCRYPT_ROUNDS = 10;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 10;

@Injectable()
export class MfaService {
    private readonly logger = new Logger(MfaService.name);

    constructor(
        @InjectRepository(UserMfa)
        private readonly mfaRepo: Repository<UserMfa>,
        @InjectRepository(MfaBackupCode)
        private readonly backupRepo: Repository<MfaBackupCode>,
        private readonly encryption: EncryptionService,
        private readonly users: UsersService,
        private readonly audit: AuditService,
        private readonly config: ConfigService,
    ) { }

    /** Check if MFA is enabled for user */
    async isEnabled(userId: string): Promise<boolean> {
        const mfa = await this.mfaRepo.findOne({ where: { userId } });
        return mfa?.isEnabled === true;
    }

    async getStatus(userId: string) {
        const mfa = await this.mfaRepo.findOne({ where: { userId } });
        const remaining = await this.backupRepo.count({
            where: { userId, usedAt: IsNull() },
        });

        return {
            isEnabled: mfa?.isEnabled ?? false,
            enabledAt: mfa?.enabledAt ?? null,
            lastUsedAt: mfa?.lastUsedAt ?? null,
            remainingBackupCodes: remaining,
        };
    }

    /** Setup step 1: generate secret, QR code, and backup codes */
    async setup(
        userId: string,
        password: string,
        ip?: string,
    ): Promise<MfaSetupResponseDto> {
        const user = await this.users.findByIdOrFail(userId);
        if (!user.email) {
            throw new BadRequestException(
                'MFA requires an email address on the account',
            );
        }

        // Verify password — prevents enabling MFA on a stolen session
        const hash = await this.users.getPasswordHashForAuth(userId);
        if (!hash || !(await bcrypt.compare(password, hash))) {
            throw new UnauthorizedException('Password is incorrect');
        }

        // If already enabled, require the disable flow first (prevents overwrite)
        const existing = await this.mfaRepo.findOne({ where: { userId } });
        if (existing?.isEnabled) {
            throw new BadRequestException(
                'MFA is already enabled. Disable it first to re-enroll.',
            );
        }

        // Generate new TOTP secret
        const secret = generateSecret();
        const encrypted = this.encryption.encrypt(secret);

        const otpauthUrl = generateURI({ issuer: 'ClinicAuth', label: user.email, secret });

        // Save (or overwrite previous unverified attempt)
        if (existing) {
            existing.secretEncrypted = encrypted;
            existing.isEnabled = false;
            existing.enabledAt = null;
            await this.mfaRepo.save(existing);
        } else {
            await this.mfaRepo.save(
                this.mfaRepo.create({
                    userId,
                    secretEncrypted: encrypted,
                    isEnabled: false,
                }),
            );
        }

        // Generate backup codes (return plaintext; store hash)
        const backupCodes = this.generateBackupCodes(BACKUP_CODE_COUNT);
        await this.replaceBackupCodes(userId, backupCodes);

        // QR as data URL for direct <img> embed
        const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

        void this.audit.log({
            actorId: userId,
            action: 'auth.mfa.setup.started',
            entity: 'user',
            entityId: userId,
            ipAddress: ip ?? null,
        });

        return { secret, otpauthUrl, qrCodeDataUrl, backupCodes };
    }

    /** Setup step 2: verify first TOTP code to activate MFA */
    async verifySetup(
        userId: string,
        code: string,
        ip?: string,
    ): Promise<{ message: string }> {
        const mfa = await this.mfaRepo.findOne({ where: { userId } });
        if (!mfa) {
            throw new BadRequestException('Run setup first');
        }
        if (mfa.isEnabled) {
            throw new BadRequestException('MFA is already enabled');
        }

        const secret = this.encryption.decrypt(mfa.secretEncrypted);
        const result = await verify({ secret, token: code });
        const valid = result.valid;
        if (!valid) {
            throw new UnauthorizedException('Invalid code');
        }

        mfa.isEnabled = true;
        mfa.enabledAt = new Date();
        mfa.lastUsedAt = new Date();
        await this.mfaRepo.save(mfa);

        void this.audit.log({
            actorId: userId,
            action: 'auth.mfa.enabled',
            entity: 'user',
            entityId: userId,
            ipAddress: ip ?? null,
        });

        return { message: 'MFA enabled successfully' };
    }

    /** Disable MFA */
    async disable(
        userId: string,
        password: string,
        code: string,
        ip?: string,
    ): Promise<void> {
        // 1. Verify password
        const hash = await this.users.getPasswordHashForAuth(userId);
        if (!hash || !(await bcrypt.compare(password, hash))) {
            throw new UnauthorizedException('Password is incorrect');
        }

        // 2. Verify TOTP or backup code
        const verified = await this.verifyCodeOrBackup(userId, code);
        if (!verified.valid) {
            throw new UnauthorizedException('Invalid MFA code');
        }

        // 3. Delete MFA record + all backup codes
        await this.mfaRepo.delete({ userId });
        await this.backupRepo.delete({ userId });

        void this.audit.log({
            actorId: userId,
            action: 'auth.mfa.disabled',
            entity: 'user',
            entityId: userId,
            ipAddress: ip ?? null,
            newValue: { method: verified.method },
        });
    }

    /**
     * Verify TOTP code or backup code during login challenge.
     * Returns verification result, method ('totp' | 'backup_code'), and remaining codes.
     */
    async verifyCodeOrBackup(
        userId: string,
        code: string,
    ): Promise<
        | { valid: true; method: 'totp' | 'backup_code'; remaining: number }
        | { valid: false; method: null; remaining: number }
    > {
        const mfa = await this.mfaRepo.findOne({ where: { userId } });
        if (!mfa?.isEnabled) {
            return { valid: false, method: null, remaining: 0 };
        }

        const remaining = await this.backupRepo.count({
            where: { userId, usedAt: IsNull() },
        });

        // Try TOTP first (fast path)
        if (/^\d{6}$/.test(code)) {
            try {
                const secret = this.encryption.decrypt(mfa.secretEncrypted);
                const result = await verify({ secret, token: code });
                const valid = result.valid;
                if (valid) {
                    mfa.lastUsedAt = new Date();
                    await this.mfaRepo.save(mfa);
                    return { valid: true, method: 'totp', remaining };
                }
            } catch (err) {
                this.logger.error(
                    `TOTP decrypt/verify failed for user ${userId}`,
                    err instanceof Error ? err.stack : String(err),
                );
            }
        }

        // Fall back to backup codes (10-char alphanumeric)
        if (/^[A-Z0-9]{8,12}$/i.test(code)) {
            const candidates = await this.backupRepo.find({
                where: { userId, usedAt: IsNull() },
            });

            for (const candidate of candidates) {
                if (await bcrypt.compare(code.toUpperCase(), candidate.codeHash)) {
                    candidate.usedAt = new Date();
                    await this.backupRepo.save(candidate);
                    mfa.lastUsedAt = new Date();
                    await this.mfaRepo.save(mfa);

                    return {
                        valid: true,
                        method: 'backup_code',
                        remaining: remaining - 1,
                    };
                }
            }
        }

        return { valid: false, method: null, remaining };
    }

    /** Regenerate emergency one-time backup codes */
    async regenerateBackupCodes(
        userId: string,
        password: string,
        code: string,
        ip?: string,
    ): Promise<{ backupCodes: string[] }> {
        // Same security gate as disable
        const hash = await this.users.getPasswordHashForAuth(userId);
        if (!hash || !(await bcrypt.compare(password, hash))) {
            throw new UnauthorizedException('Password is incorrect');
        }
        const verified = await this.verifyCodeOrBackup(userId, code);
        if (!verified.valid) {
            throw new UnauthorizedException('Invalid MFA code');
        }

        const backupCodes = this.generateBackupCodes(BACKUP_CODE_COUNT);
        await this.replaceBackupCodes(userId, backupCodes);

        void this.audit.log({
            actorId: userId,
            action: 'auth.mfa.backup_codes.regenerated',
            entity: 'user',
            entityId: userId,
            ipAddress: ip ?? null,
        });

        return { backupCodes };
    }

    /** Internal Helper Methods */

    private generateBackupCodes(count: number): string[] {
        // 10 chars, base32-ish alphabet (no 0/O/1/I confusion)
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            let code = '';
            const bytes = randomBytes(BACKUP_CODE_LENGTH);
            for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
                code += alphabet[bytes[j] % alphabet.length];
            }
            codes.push(code);
        }
        return codes;
    }

    private async replaceBackupCodes(
        userId: string,
        plaintextCodes: string[],
    ): Promise<void> {
        await this.backupRepo.delete({ userId });
        const hashed = await Promise.all(
            plaintextCodes.map(async (code) => ({
                userId,
                codeHash: await bcrypt.hash(code, BCRYPT_ROUNDS),
            })),
        );
        await this.backupRepo.save(
            hashed.map((h) => this.backupRepo.create(h)),
        );
    }
}