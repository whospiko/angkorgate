import {
    ForbiddenException,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    Optional,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual } from 'crypto';
import { IsNull, Repository } from 'typeorm';

import {
    generateNumericOtp,
    generateSecureToken,
    hashSha256,
} from '../../common/utils/crypto.util';
import { UsersService } from '../../users/services/users.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { CustomersService } from '../../customers/services/customers.service';
import { MailService } from '../../notifications/services/mail.service';
import { SmsService } from '../../notifications/services/sms.service';
import { AuditService } from '../../audit/services/audit.service';
import { LoginAttempt } from '../entities/login-attempt.entity';
import {
    PasswordlessChannel,
    PasswordlessToken,
} from '../entities/passwordless-token.entity';
import { AuthResponseDto } from '../dto/auth-response.dto';
import {
    PasswordlessRequestResponseDto,
    RequestMagicLinkDto,
    RequestOtpDto,
    VerifyOtpDto,
} from '../dto/passwordless.dto';
import { magicLinkTemplate } from '../templates/magic-link.template';
import { otpLoginTemplate } from '../templates/otp-login.template';
import { AuthService, LoginContext } from './auth.service';
import { RuntimeConfigService } from '../../system/services/runtime-config.service';

const MAGIC_LINK_AUDIENCE = 'angkorgate-magic-link';
const MAGIC_LINK_ISSUER = 'angkorgate-core';

interface MagicLinkJwtPayload {
    sub: string;
    jti: string;
    tok: string;
    email: string;
    type: 'magic_link';
}

@Injectable()
export class PasswordlessService {
    private readonly logger = new Logger(PasswordlessService.name);

    constructor(
        @InjectRepository(PasswordlessToken)
        private readonly tokenRepo: Repository<PasswordlessToken>,
        @InjectRepository(LoginAttempt)
        private readonly attemptRepo: Repository<LoginAttempt>,
        private readonly users: UsersService,
        private readonly rbac: RbacService,
        private readonly customers: CustomersService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        private readonly mail: MailService,
        private readonly sms: SmsService,
        private readonly audit: AuditService,
        private readonly authService: AuthService,
        @Optional() private readonly runtimeConfig?: RuntimeConfigService,
    ) { }

    private get magicLinkTtlMinutes(): number {
        return (
            this.runtimeConfig?.getNumber('PASSWORDLESS_MAGIC_LINK_TTL_MINUTES', 15) ??
            this.config.get<number>('passwordless.magicLinkTtlMinutes') ??
            15
        );
    }

    private get otpTtlMinutes(): number {
        return (
            this.runtimeConfig?.getNumber('PASSWORDLESS_OTP_TTL_MINUTES', 10) ??
            this.config.get<number>('passwordless.otpTtlMinutes') ??
            10
        );
    }

    private get cooldownSeconds(): number {
        return (
            this.runtimeConfig?.getNumber('PASSWORDLESS_COOLDOWN_SECONDS', 60) ??
            this.config.get<number>('passwordless.resendCooldownSeconds') ??
            60
        );
    }

    private get maxOtpAttempts(): number {
        return (
            this.runtimeConfig?.getNumber('PASSWORDLESS_MAX_OTP_ATTEMPTS', 5) ??
            this.config.get<number>('passwordless.maxOtpAttempts') ??
            5
        );
    }

    private get autoRegisterEnabled(): boolean {
        return (
            this.runtimeConfig?.getBoolean('PASSWORDLESS_AUTO_REGISTER', false) ??
            this.config.get<boolean>('passwordless.autoRegister') ??
            false
        );
    }

    private get webBaseUrl(): string {
        return (
            this.runtimeConfig?.get('APP_WEB_URL') ??
            this.config.get<string>('oauth.webUrl') ??
            this.config.get<string>('APP_WEB_URL') ??
            this.config.get<string>('CONSOLE_URL') ??
            'http://localhost:4000'
        );
    }

    /**
     * Request a one-click signed Magic Link sent via SMTP/MailService.
     */
    async requestMagicLink(
        dto: RequestMagicLinkDto,
        ctx: LoginContext,
    ): Promise<PasswordlessRequestResponseDto> {
        if (!(this.runtimeConfig?.getBoolean('PASSWORDLESS_MAGIC_LINK_ENABLED', true) ?? true)) {
            throw new ForbiddenException('Magic Link sign-in is currently disabled by administrator.');
        }
        const email = dto.email.trim().toLowerCase();
        const ttlMinutes = this.magicLinkTtlMinutes;
        const safeRedirect = this.sanitizeRedirect(dto.redirectUrl);

        const genericResponse: PasswordlessRequestResponseDto = {
            message: 'If an account matches that email, a magic sign-in link has been sent.',
            channel: 'magic_link',
            expiresInSeconds: ttlMinutes * 60,
        };

        const user = await this.resolveOrAutoRegisterUser({ email });
        if (!user) {
            return genericResponse;
        }

        if (!user.isActive) {
            this.logger.warn(`Magic link requested for disabled user ${user.id}`);
            return genericResponse;
        }

        await this.assertCooldown(email, 'magic_link');
        await this.invalidateUnusedTokens(user.id, 'magic_link');

        const rawToken = generateSecureToken(32);
        const tokenHash = hashSha256(rawToken);
        const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

        const saved = await this.tokenRepo.save(
            this.tokenRepo.create({
                userId: user.id,
                channel: 'magic_link',
                identifier: email,
                tokenHash,
                maxAttempts: 1,
                redirectUrl: safeRedirect,
                ipAddress: ctx.ip ?? null,
                userAgent: ctx.userAgent ?? null,
                expiresAt,
            }),
        );

        const signedToken = await this.jwt.signAsync(
            {
                sub: user.id,
                jti: saved.id,
                tok: rawToken,
                email,
                type: 'magic_link',
            } satisfies MagicLinkJwtPayload,
            {
                secret: this.config.get<string>('JWT_ACCESS_SECRET')!,
                expiresIn: ttlMinutes * 60,
                algorithm: 'HS256',
                issuer: MAGIC_LINK_ISSUER,
                audience: MAGIC_LINK_AUDIENCE,
            },
        );

        const base = this.webBaseUrl.replace(/\/$/, '');
        const redirectQuery = safeRedirect
            ? `&redirect=${encodeURIComponent(safeRedirect)}`
            : '';
        const magicUrl = `${base}/auth/magic-link?token=${encodeURIComponent(signedToken)}${redirectQuery}`;

        const tpl = magicLinkTemplate({
            fullName: email.split('@')[0] || 'there',
            magicUrl,
            expiresInMinutes: ttlMinutes,
        });

        await this.mail.send({
            to: email,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
        });

        void this.audit.log({
            actorId: user.id,
            action: 'auth.passwordless.magic_link_requested',
            entity: 'user',
            entityId: user.id,
            newValue: { email },
            ipAddress: ctx.ip ?? null,
        });

        return genericResponse;
    }

    /**
     * Verify a signed Magic Link token and issue session tokens.
     */
    async verifyMagicLink(
        token: string,
        ctx: LoginContext,
    ): Promise<AuthResponseDto & { redirectUrl?: string | null }> {
        if (!(this.runtimeConfig?.getBoolean('PASSWORDLESS_MAGIC_LINK_ENABLED', true) ?? true)) {
            throw new ForbiddenException('Magic Link sign-in is currently disabled by administrator.');
        }
        let payload: MagicLinkJwtPayload;
        try {
            payload = await this.jwt.verifyAsync<MagicLinkJwtPayload>(token, {
                secret: this.config.get<string>('JWT_ACCESS_SECRET')!,
                algorithms: ['HS256'],
                issuer: MAGIC_LINK_ISSUER,
                audience: MAGIC_LINK_AUDIENCE,
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired magic link.');
        }

        if (payload.type !== 'magic_link' || !payload.jti || !payload.tok || !payload.sub) {
            throw new UnauthorizedException('Invalid magic link payload.');
        }

        const record = await this.tokenRepo.findOne({
            where: { id: payload.jti, channel: 'magic_link' },
        });

        if (!record || record.userId !== payload.sub) {
            throw new UnauthorizedException('Invalid magic link.');
        }
        if (record.usedAt) {
            throw new UnauthorizedException('This magic link has already been used.');
        }
        if (record.expiresAt < new Date()) {
            throw new UnauthorizedException('This magic link has expired.');
        }
        if (!this.safeCompareHash(hashSha256(payload.tok), record.tokenHash)) {
            throw new UnauthorizedException('Invalid magic link signature.');
        }

        record.usedAt = new Date();
        await this.tokenRepo.save(record);

        const auth = await this.completePasswordlessLogin(
            record.userId,
            record.identifier,
            'magic_link',
            ctx,
        );

        return {
            ...auth,
            redirectUrl: record.redirectUrl,
        };
    }

    /**
     * Request a 6-digit numeric OTP via Email (SMTP) or SMS.
     */
    async requestOtp(
        dto: RequestOtpDto,
        ctx: LoginContext,
    ): Promise<PasswordlessRequestResponseDto> {
        if (dto.channel === 'sms' && !(this.runtimeConfig?.getBoolean('PASSWORDLESS_SMS_OTP_ENABLED', true) ?? true)) {
            throw new ForbiddenException('SMS OTP sign-in is currently disabled by administrator.');
        }
        if (dto.channel === 'email' && !(this.runtimeConfig?.getBoolean('PASSWORDLESS_EMAIL_OTP_ENABLED', true) ?? true)) {
            throw new ForbiddenException('Email OTP sign-in is currently disabled by administrator.');
        }
        const channel: PasswordlessChannel = dto.channel === 'sms' ? 'sms_otp' : 'email_otp';
        const identifier =
            dto.channel === 'sms'
                ? dto.phone!.trim()
                : dto.email!.trim().toLowerCase();
        const ttlMinutes = this.otpTtlMinutes;

        const genericResponse: PasswordlessRequestResponseDto = {
            message:
                dto.channel === 'sms'
                    ? 'If an account matches that phone number, a 6-digit verification code has been sent.'
                    : 'If an account matches that email, a 6-digit verification code has been sent.',
            channel,
            expiresInSeconds: ttlMinutes * 60,
        };

        const user =
            dto.channel === 'sms'
                ? await this.resolveOrAutoRegisterUser({ phone: identifier })
                : await this.resolveOrAutoRegisterUser({ email: identifier });

        if (!user) {
            return genericResponse;
        }

        if (!user.isActive) {
            this.logger.warn(`OTP requested for disabled user ${user.id}`);
            return genericResponse;
        }

        await this.assertCooldown(identifier, channel);
        await this.invalidateUnusedTokens(user.id, channel);

        const code = generateNumericOtp(6);
        const tokenHash = hashSha256(code);
        const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

        await this.tokenRepo.save(
            this.tokenRepo.create({
                userId: user.id,
                channel,
                identifier,
                tokenHash,
                maxAttempts: this.maxOtpAttempts,
                ipAddress: ctx.ip ?? null,
                userAgent: ctx.userAgent ?? null,
                expiresAt,
            }),
        );

        if (dto.channel === 'sms') {
            await this.sms.send(
                identifier,
                `Your AngkorGate sign-in code is ${code}. It expires in ${ttlMinutes} minutes.`,
            );
        } else {
            const tpl = otpLoginTemplate({
                fullName: identifier.split('@')[0] || 'there',
                code,
                expiresInMinutes: ttlMinutes,
            });
            await this.mail.send({
                to: identifier,
                subject: tpl.subject,
                html: tpl.html,
                text: tpl.text,
            });
        }

        void this.audit.log({
            actorId: user.id,
            action: `auth.passwordless.${channel}_requested`,
            entity: 'user',
            entityId: user.id,
            newValue: { channel, identifier },
            ipAddress: ctx.ip ?? null,
        });

        return genericResponse;
    }

    /**
     * Verify a 6-digit numeric OTP and issue session tokens.
     */
    async verifyOtp(dto: VerifyOtpDto, ctx: LoginContext): Promise<AuthResponseDto> {
        if (dto.channel === 'sms' && !(this.runtimeConfig?.getBoolean('PASSWORDLESS_SMS_OTP_ENABLED', true) ?? true)) {
            throw new ForbiddenException('SMS OTP sign-in is currently disabled by administrator.');
        }
        if (dto.channel === 'email' && !(this.runtimeConfig?.getBoolean('PASSWORDLESS_EMAIL_OTP_ENABLED', true) ?? true)) {
            throw new ForbiddenException('Email OTP sign-in is currently disabled by administrator.');
        }
        const channel: PasswordlessChannel = dto.channel === 'sms' ? 'sms_otp' : 'email_otp';
        const identifier =
            dto.channel === 'sms'
                ? dto.phone!.trim()
                : dto.email!.trim().toLowerCase();

        const record = await this.tokenRepo.findOne({
            where: {
                identifier,
                channel,
                usedAt: IsNull(),
            },
            order: { createdAt: 'DESC' },
        });

        if (!record) {
            await this.recordAttempt(null, identifier, false, ctx);
            throw new UnauthorizedException('Invalid or expired verification code.');
        }

        if (record.expiresAt < new Date()) {
            record.usedAt = new Date();
            await this.tokenRepo.save(record);
            await this.recordAttempt(record.userId, identifier, false, ctx);
            throw new UnauthorizedException('Verification code has expired. Please request a new one.');
        }

        if (record.attempts >= record.maxAttempts) {
            record.usedAt = new Date();
            await this.tokenRepo.save(record);
            await this.recordAttempt(record.userId, identifier, false, ctx);
            throw new UnauthorizedException('Too many invalid attempts. Please request a new code.');
        }

        const matches = this.safeCompareHash(hashSha256(dto.code.trim()), record.tokenHash);
        if (!matches) {
            record.attempts += 1;
            if (record.attempts >= record.maxAttempts) {
                record.usedAt = new Date();
            }
            await this.tokenRepo.save(record);
            await this.recordAttempt(record.userId, identifier, false, ctx);
            throw new UnauthorizedException('Invalid verification code.');
        }

        record.usedAt = new Date();
        await this.tokenRepo.save(record);

        return this.completePasswordlessLogin(record.userId, identifier, channel, ctx);
    }

    private async completePasswordlessLogin(
        userId: string,
        identifier: string,
        channel: PasswordlessChannel,
        ctx: LoginContext,
    ): Promise<AuthResponseDto> {
        const user = await this.users.findByIdOrFail(userId);

        if (!user.isActive) {
            await this.recordAttempt(user.id, identifier, false, ctx);
            throw new ForbiddenException('Account disabled');
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            await this.recordAttempt(user.id, identifier, false, ctx);
            throw new ForbiddenException(
                `Account locked until ${user.lockedUntil.toISOString()}`,
            );
        }

        if (channel === 'sms_otp') {
            if (!user.isPhoneVerified) {
                await this.users.setPhoneVerified(user.id, true);
            }
        } else {
            if (!user.isEmailVerified) {
                await this.users.setEmailVerified(user.id, true);
            }
        }

        await this.users.setFailedAttempts(user.id, 0, null);
        await this.users.setLastLogin(user.id);
        await this.recordAttempt(user.id, identifier, true, ctx);

        void this.audit.log({
            actorId: user.id,
            action: `auth.passwordless.${channel}_login`,
            entity: 'user',
            entityId: user.id,
            newValue: { channel, identifier },
            ipAddress: ctx.ip ?? null,
        });

        return this.authService.issueTokensForUser(user.id, user.email, user.phone, ctx);
    }

    private async resolveOrAutoRegisterUser(contact: { email?: string; phone?: string }) {
        const existing = contact.email
            ? await this.users.findByEmail(contact.email)
            : await this.users.findByPhone(contact.phone!);

        if (existing) {
            return existing;
        }

        if (!this.autoRegisterEnabled) {
            return null;
        }

        const randomPassword = generateSecureToken(32);
        const passwordHash = await this.authService.hashPassword(randomPassword);
        const created = await this.users.create({
            email: contact.email,
            phone: contact.phone,
            password: passwordHash,
            isActive: true,
            isEmailVerified: false,
            isPhoneVerified: false,
        });

        const displayName = contact.email
            ? contact.email.split('@')[0]
            : contact.phone ?? 'Customer';

        await this.customers.create(
            {
                type: 'CUSTOMER',
                userId: created.id,
                fullName: displayName,
                dateOfBirth: '1970-01-01',
                email: contact.email,
                phone: contact.phone,
            },
            created.id,
        );

        await this.rbac.assignRoleToUser(created.id, 'CUSTOMER', created.id);
        return created;
    }

    private async assertCooldown(
        identifier: string,
        channel: PasswordlessChannel,
    ): Promise<void> {
        const recent = await this.tokenRepo.findOne({
            where: { identifier, channel },
            order: { createdAt: 'DESC' },
        });
        if (!recent) return;

        const cooldownMs = this.cooldownSeconds * 1000;
        const elapsedMs = Date.now() - recent.createdAt.getTime();
        if (elapsedMs < cooldownMs) {
            const waitSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
            throw new HttpException(
                `Please wait ${waitSeconds} seconds before requesting a new code or link.`,
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }

    private async invalidateUnusedTokens(
        userId: string,
        channel: PasswordlessChannel,
    ): Promise<void> {
        await this.tokenRepo.update(
            { userId, channel, usedAt: IsNull() },
            { usedAt: new Date() },
        );
    }

    private async recordAttempt(
        userId: string | null,
        emailPhone: string,
        success: boolean,
        ctx: LoginContext,
    ): Promise<void> {
        await this.attemptRepo.save(
            this.attemptRepo.create({
                userId,
                emailPhone,
                success,
                ipAddress: ctx.ip ?? null,
                userAgent: ctx.userAgent ?? null,
            }),
        );
    }

    private safeCompareHash(a: string, b: string): boolean {
        const bufA = Buffer.from(a, 'utf8');
        const bufB = Buffer.from(b, 'utf8');
        if (bufA.length !== bufB.length) return false;
        return timingSafeEqual(bufA, bufB);
    }

    private sanitizeRedirect(redirectUrl?: string): string | null {
        if (!redirectUrl) return null;
        const trimmed = redirectUrl.trim();
        if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
            return trimmed;
        }
        return null;
    }
}
