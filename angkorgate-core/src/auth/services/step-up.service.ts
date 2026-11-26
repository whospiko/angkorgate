import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Optional,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';

import { AuditService } from '../../audit/services/audit.service';
import { CacheService } from '../../cache/cache.service';
import { generateNumericOtp, hashSha256 } from '../../common/utils/crypto.util';
import { MailService } from '../../notifications/services/mail.service';
import { OauthAccount } from '../../oauth/entities/oauth-account.entity';
import { UsersService } from '../../users/services/users.service';
import { StepUpPasskeyVerifyDto, StepUpVerifyDto, StepUpVerificationMethod } from '../dto/step-up.dto';
import { UserPasskey } from '../entities/user-passkey.entity';
import { MfaService } from './mfa.service';
import { PasskeyService } from './passkey.service';

export const STEP_UP_TTL_SECONDS = 300; // 5 minutes sudo window
const STEP_UP_OTP_TTL_SECONDS = 300;
const STEP_UP_OTP_COOLDOWN_SECONDS = 60;
const STEP_UP_OTP_MAX_ATTEMPTS = 5;
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

interface StepUpState {
    verified: boolean;
    method: StepUpVerificationMethod;
    verifiedAt: string;
    expiresAt: string;
}

interface StepUpOtpState {
    hash: string;
    attempts: number;
    createdAt: number;
}

export interface StepUpStatusResponse {
    verified: boolean;
    expiresAt: string | null;
    method: StepUpVerificationMethod | null;
    availableMethods: {
        password: boolean;
        passkey: boolean;
        totp: boolean;
        emailOtp: boolean;
    };
    oauthProviders: string[];
    email: string | null;
}

@Injectable()
export class StepUpService {
    private readonly fallbackCache = new Map<string, { value: unknown; expiresAt: number }>();

    constructor(
        private readonly users: UsersService,
        private readonly mfa: MfaService,
        private readonly passkeyService: PasskeyService,
        private readonly mail: MailService,
        private readonly audit: AuditService,
        @InjectRepository(UserPasskey)
        private readonly passkeyRepo: Repository<UserPasskey>,
        @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
        @Optional() private readonly cache?: CacheService,
    ) { }

    private stepUpKey(userId: string): string {
        return `auth:step_up:${userId}`;
    }

    private otpKey(userId: string): string {
        return `auth:step_up_otp:${userId}`;
    }

    private cooldownKey(userId: string): string {
        return `auth:step_up_otp_cd:${userId}`;
    }

    private async cacheGet<T>(key: string): Promise<T | null> {
        if (this.cache) {
            return this.cache.get<T>(key);
        }
        const entry = this.fallbackCache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.fallbackCache.delete(key);
            return null;
        }
        return entry.value as T;
    }

    private async cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        if (this.cache) {
            await this.cache.set(key, value, ttlSeconds);
            return;
        }
        this.fallbackCache.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    private async cacheDel(key: string): Promise<void> {
        if (this.cache) {
            await this.cache.del(key);
            return;
        }
        this.fallbackCache.delete(key);
    }

    async isVerified(userId: string): Promise<{
        verified: boolean;
        expiresAt: string | null;
        method: StepUpVerificationMethod | null;
    }> {
        const state = await this.cacheGet<StepUpState>(this.stepUpKey(userId));
        if (!state || !state.verified) {
            return { verified: false, expiresAt: null, method: null };
        }
        if (new Date(state.expiresAt).getTime() <= Date.now()) {
            await this.cacheDel(this.stepUpKey(userId));
            return { verified: false, expiresAt: null, method: null };
        }
        return {
            verified: true,
            expiresAt: state.expiresAt,
            method: state.method,
        };
    }

    async assertVerified(userId: string): Promise<void> {
        const state = await this.isVerified(userId);
        if (!state.verified) {
            throw new ForbiddenException(
                'Step-up verification required to reveal sensitive credentials.',
            );
        }
    }

    async getStatus(userId: string): Promise<StepUpStatusResponse> {
        const [user, passwordHash, hasMfa, passkeyCount, sudo] = await Promise.all([
            this.users.findByIdOrFail(userId),
            this.users.getPasswordHashForAuth(userId),
            this.mfa.isEnabled(userId),
            this.passkeyRepo.count({ where: { userId } }),
            this.isVerified(userId),
        ]);

        let oauthProviders: string[] = [];
        try {
            if (this.dataSource) {
                const accounts = await this.dataSource
                    .getRepository(OauthAccount)
                    .find({ where: { userId }, select: { provider: true } });
                oauthProviders = Array.from(new Set(accounts.map((a) => a.provider)));
            }
        } catch {
            oauthProviders = [];
        }

        const hasPassword = Boolean(passwordHash && BCRYPT_HASH_RE.test(passwordHash));

        return {
            verified: sudo.verified,
            expiresAt: sudo.expiresAt,
            method: sudo.method,
            availableMethods: {
                password: hasPassword,
                passkey: passkeyCount > 0,
                totp: hasMfa,
                emailOtp: Boolean(user.email),
            },
            oauthProviders,
            email: user.email,
        };
    }

    async verify(
        userId: string,
        dto: StepUpVerifyDto,
        ip?: string,
    ): Promise<{ verified: boolean; expiresAt: string; method: StepUpVerificationMethod }> {
        if (dto.method === 'password') {
            if (!dto.password) {
                throw new BadRequestException('Password is required.');
            }
            const hash = await this.users.getPasswordHashForAuth(userId);
            if (!hash || !BCRYPT_HASH_RE.test(hash)) {
                throw new BadRequestException(
                    'This account has no local password configured. Use Passkey, Authenticator, or Email OTP.',
                );
            }
            const ok = await bcrypt.compare(dto.password, hash);
            if (!ok) {
                void this.audit.log({
                    actorId: userId,
                    action: 'auth.step_up.failed',
                    entity: 'user',
                    entityId: userId,
                    ipAddress: ip ?? null,
                    newValue: { method: 'password' },
                });
                throw new UnauthorizedException('Incorrect password.');
            }
            return this.grantStepUp(userId, 'password', ip);
        }

        if (dto.method === 'totp') {
            if (!dto.code?.trim()) {
                throw new BadRequestException('Authenticator or backup code is required.');
            }
            const res = await this.mfa.verifyCodeOrBackup(userId, dto.code.trim());
            if (!res.valid) {
                void this.audit.log({
                    actorId: userId,
                    action: 'auth.step_up.failed',
                    entity: 'user',
                    entityId: userId,
                    ipAddress: ip ?? null,
                    newValue: { method: 'totp' },
                });
                throw new UnauthorizedException('Invalid MFA code.');
            }
            return this.grantStepUp(userId, 'totp', ip);
        }

        if (dto.method === 'email_otp') {
            const code = dto.code?.trim();
            if (!code || !/^\d{6}$/.test(code)) {
                throw new BadRequestException('A 6-digit email verification code is required.');
            }
            const otpState = await this.cacheGet<StepUpOtpState>(this.otpKey(userId));
            if (!otpState) {
                throw new UnauthorizedException('Verification code expired or not requested.');
            }
            if (otpState.attempts >= STEP_UP_OTP_MAX_ATTEMPTS) {
                await this.cacheDel(this.otpKey(userId));
                throw new UnauthorizedException('Too many invalid attempts. Request a new code.');
            }
            if (hashSha256(code) !== otpState.hash) {
                await this.cacheSet(
                    this.otpKey(userId),
                    { ...otpState, attempts: otpState.attempts + 1 },
                    STEP_UP_OTP_TTL_SECONDS,
                );
                void this.audit.log({
                    actorId: userId,
                    action: 'auth.step_up.failed',
                    entity: 'user',
                    entityId: userId,
                    ipAddress: ip ?? null,
                    newValue: { method: 'email_otp' },
                });
                throw new UnauthorizedException('Invalid verification code.');
            }

            await this.cacheDel(this.otpKey(userId));
            return this.grantStepUp(userId, 'email_otp', ip);
        }

        throw new BadRequestException('Unsupported step-up verification method.');
    }

    async requestEmailOtp(
        userId: string,
        ip?: string,
    ): Promise<{ message: string; maskedEmail: string }> {
        const user = await this.users.findByIdOrFail(userId);
        if (!user.email) {
            throw new BadRequestException('Account has no email address configured.');
        }

        const onCooldown = await this.cacheGet<boolean>(this.cooldownKey(userId));
        if (onCooldown) {
            return {
                message: 'Verification code already sent recently. Check your inbox.',
                maskedEmail: this.maskEmail(user.email),
            };
        }

        const code = generateNumericOtp(6);
        await this.cacheSet<StepUpOtpState>(
            this.otpKey(userId),
            {
                hash: hashSha256(code),
                attempts: 0,
                createdAt: Date.now(),
            },
            STEP_UP_OTP_TTL_SECONDS,
        );
        await this.cacheSet(this.cooldownKey(userId), true, STEP_UP_OTP_COOLDOWN_SECONDS);

        await this.mail.send({
            to: user.email,
            subject: 'AngkorGate Security Verification Code',
            text: `Your AngkorGate step-up verification code is: ${code}\n\nIt expires in 5 minutes. Use this code to reveal sensitive credentials in AngkorGate Console.`,
            html: `<p>Your AngkorGate step-up verification code is:</p><h2 style="letter-spacing:4px;font-family:monospace;">${code}</h2><p>This code expires in 5 minutes and unlocks sensitive credential viewing for 5 minutes.</p>`,
        });

        void this.audit.log({
            actorId: userId,
            action: 'auth.step_up.email_otp_requested',
            entity: 'user',
            entityId: userId,
            ipAddress: ip ?? null,
        });

        return {
            message: 'A 6-digit verification code has been sent to your email.',
            maskedEmail: this.maskEmail(user.email),
        };
    }

    async getPasskeyOptions(userId: string, reqHost?: string) {
        return this.passkeyService.generateAuthenticationOptionsForUser(userId, reqHost);
    }

    async verifyPasskey(
        userId: string,
        dto: StepUpPasskeyVerifyDto,
        reqOrigin?: string,
        reqHost?: string,
        ip?: string,
    ) {
        await this.passkeyService.verifyAuthenticationForUser(
            userId,
            dto.challengeId,
            dto.response,
            reqOrigin,
            reqHost,
        );
        return this.grantStepUp(userId, 'passkey', ip);
    }

    async clearVerification(userId: string): Promise<void> {
        await this.cacheDel(this.stepUpKey(userId));
    }

    private async grantStepUp(
        userId: string,
        method: StepUpVerificationMethod,
        ip?: string,
    ): Promise<{ verified: boolean; expiresAt: string; method: StepUpVerificationMethod }> {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + STEP_UP_TTL_SECONDS * 1000).toISOString();
        await this.cacheSet<StepUpState>(
            this.stepUpKey(userId),
            {
                verified: true,
                method,
                verifiedAt: now.toISOString(),
                expiresAt,
            },
            STEP_UP_TTL_SECONDS,
        );

        void this.audit.log({
            actorId: userId,
            action: 'auth.step_up.verified',
            entity: 'user',
            entityId: userId,
            ipAddress: ip ?? null,
            newValue: { method, expiresAt },
        });

        return {
            verified: true,
            expiresAt,
            method,
        };
    }

    private maskEmail(email: string): string {
        const [local, domain] = email.split('@');
        if (!local || !domain) return '***';
        const visible = local.slice(0, Math.min(2, local.length));
        return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`;
    }
}
