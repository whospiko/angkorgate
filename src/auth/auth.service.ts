import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

import { UsersService } from '../users/users.service';
import { RbacService } from '../rbac/rbac.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuditService } from '../audit/audit.service';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { MailService } from '../notifications/mail.service';
import { CustomersService } from '../customers/customers.service';
import { resetPasswordTemplate } from './templates/reset-password.template';
import { verifyEmailTemplate } from './templates/verify-email.template';
import { RegisterCustomerDto } from './dto/register-customer.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

const EMAIL_VERIFY_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 30;
const RESEND_COOLDOWN_SECONDS = 60;

@Injectable()
export class AuthService {

    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly users: UsersService,
        private readonly rbac: RbacService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        @InjectRepository(RefreshToken)
        private readonly refreshRepo: Repository<RefreshToken>,
        @InjectRepository(LoginAttempt)
        private readonly attemptRepo: Repository<LoginAttempt>,
        private readonly audit: AuditService,
        @InjectRepository(EmailVerificationToken)
        private readonly evtRepo: Repository<EmailVerificationToken>,
        @InjectRepository(PasswordResetToken)
        private readonly prtRepo: Repository<PasswordResetToken>,
        private readonly mail: MailService,
        private readonly customers: CustomersService
    ) { }

    async hashPassword(plain: string): Promise<string> {
        return bcrypt.hash(plain, BCRYPT_ROUNDS);
    }

    async verifyPassword(plain: string, hash: string): Promise<boolean> {
        return bcrypt.compare(plain, hash);
    }

    async login(dto: LoginDto, ctx: LoginContext): Promise<AuthResponseDto> {
        const identifier = dto.email ?? dto.phone ?? '';
        const audit = (success: boolean, userId: string | null = null) =>
            this.attemptRepo.save(
                this.attemptRepo.create({
                    userId,
                    emailPhone: identifier,
                    success,
                    ipAddress: ctx.ip,
                    userAgent: ctx.userAgent,
                }),
            );

        // 1. Look up the user (raw, with password hash)
        const record = dto.email
            ? await this.users.findAuthRecordByEmail(dto.email)
            : await this.users.findAuthRecordByPhone(dto.phone!);

        if (!record) {
            await audit(false);
            // Same message for "no user" and "wrong password" — avoid enumeration
            throw new UnauthorizedException('Invalid credentials');
        }

        // 2. Check active + lock
        if (!record.isActive) {
            await audit(false, record.id);
            throw new ForbiddenException('Account disabled');
        }
        if (record.lockedUntil && record.lockedUntil > new Date()) {
            await audit(false, record.id);
            throw new ForbiddenException(
                `Account locked until ${record.lockedUntil.toISOString()}`,
            );
        }

        // 3. Verify password
        const ok = await this.verifyPassword(dto.password, record.passwordHash);
        if (!ok) {
            const failed = record.failedAttempts + 1;
            const lockedUntil =
                failed >= MAX_FAILED_ATTEMPTS
                    ? new Date(Date.now() + LOCK_MINUTES * 60_000)
                    : null;

            await this.users.setFailedAttempts(record.id, failed, lockedUntil);

            await audit(false, record.id);
            throw new UnauthorizedException('Invalid credentials');
        }

        if (record.email && !record.isEmailVerified) {
            await audit(false, record.id);
            throw new ForbiddenException(
                'Email not verified. Check your inbox or request a new link.',
            );
        }

        // 4. Success — reset counters + last_login
        await this.users.setLastLogin(record.id);
        await audit(true, record.id);

        // 5. Build tokens
        const roles = await this.rbac.getUserRoleCodes(record.id);

        void this.audit.log({
            actorId: record.id,
            action: 'auth.login',
            entity: 'user',
            entityId: record.id,
            ipAddress: ctx.ip ?? null,
        });

        return this.issueTokens(record.id, record.email, record.phone, roles, ctx);

    }

    async registerCustomer(
        dto: RegisterCustomerDto,
        ctx: LoginContext,
    ): Promise<{ message: string; userId: string }> {
        // 1. Create user (email not verified yet)
        const passwordHash = await this.hashPassword(dto.password);
        const user = await this.users.create({
            email: dto.email,
            phone: dto.phone,
            password: passwordHash,
            isEmailVerified: false,
            isPhoneVerified: false,
        });

        // 2. Create linked customer record
        await this.customers.create(
            {
                type: 'CUSTOMER',
                userId: user.id,
                fullName: dto.fullName,
                dateOfBirth: dto.dateOfBirth,
                gender: dto.gender as 'MALE' | 'FEMALE' | 'OTHER' | undefined,
                phone: dto.phone,
                email: dto.email,
            },
            user.id,
        );

        // 3. Assign default role (CUSTOMER — you should add this role to seed)
        await this.rbac.assignRoleToUser(user.id, 'CUSTOMER', user.id);

        // 4. Send verification email (if email registration)
        if (dto.email) {
            await this.sendVerificationEmail(user.id, dto.email, dto.fullName);
        } else if (dto.phone) {
            await this.sendVerificationSms(user.id, dto.phone);
        }

        void this.audit.log({
            actorId: user.id,
            action: 'auth.register.customer',
            entity: 'user',
            entityId: user.id,
            newValue: { email: dto.email, phone: dto.phone },
            ipAddress: ctx.ip ?? null,
        });

        return {
            message: 'Registration successful. Please check your email to verify your account.',
            userId: user.id,
        };
    }

    async refresh(refreshToken: string, ctx: LoginContext): Promise<AuthResponseDto> {
        const tokenHash = this.hashToken(refreshToken);
        const stored = await this.refreshRepo.findOne({
            where: { tokenHash },
        });

        if (!stored) throw new UnauthorizedException('Invalid refresh token');
        if (stored.revokedAt) {
            // Token reuse — revoke all tokens for that user (token theft signal)
            await this.refreshRepo.update(
                { userId: stored.userId },
                { revokedAt: new Date() },
            );
            throw new UnauthorizedException('Refresh token has been revoked');
        }
        if (stored.expiresAt < new Date()) {
            throw new UnauthorizedException('Refresh token expired');
        }

        const user = await this.users.findByIdOrFail(stored.userId);
        if (!user.isActive) throw new ForbiddenException('Account disabled');

        // Rotate: revoke the old, issue a new pair
        await this.refreshRepo.update(stored.id, { revokedAt: new Date() });
        const roles = await this.rbac.getUserRoleCodes(user.id);

        return this.issueTokens(user.id, user.email, user.phone, roles, {
            ip: ctx.ip,
            userAgent: ctx.userAgent,
        });
    }

    async logout(refreshToken: string): Promise<void> {
        const tokenHash = this.hashToken(refreshToken);
        await this.refreshRepo.update({ tokenHash }, { revokedAt: new Date() });
    }

    async logoutAll(userId: string): Promise<void> {
        await this.refreshRepo.update(
            { userId, revokedAt: IsNull() },
            { revokedAt: new Date() },
        );
    }

    async changePassword(
        userId: string,
        oldPassword: string,
        newPassword: string,
    ): Promise<void> {
        const currentHash = await this.users.getPasswordHashForAuth(userId);
        if (!currentHash) throw new UnauthorizedException('User not found');

        const ok = await this.verifyPassword(oldPassword, currentHash);
        if (!ok) throw new BadRequestException('Old password is incorrect');

        const newHash = await this.hashPassword(newPassword);
        await this.users.setPasswordHash(userId, newHash);

        // Revoke all refresh tokens so stolen sessions die
        await this.logoutAll(userId);
    }

    private async issueTokens(
        userId: string,
        email: string | null,
        phone: string | null,
        roles: string[],
        ctx: LoginContext,
    ): Promise<AuthResponseDto> {
        // Parse TTLs as integers so jsonwebtoken treats them as seconds, not milliseconds
        const accessTtl = parseInt(this.config.get<string>('JWT_ACCESS_TTL') ?? '900', 10);
        const refreshTtl = parseInt(this.config.get<string>('JWT_REFRESH_TTL') ?? '604800', 10);
        const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET')!;

        const payload: JwtPayload = { sub: userId, email, phone, roles };

        const accessToken = await this.jwt.signAsync(payload, {
            secret: this.config.get<string>('JWT_ACCESS_SECRET')!,
            expiresIn: accessTtl, // Now properly passed as a Number
        });

        // Refresh token = random opaque string (NOT a JWT). We store its hash.
        const refreshToken = randomBytes(48).toString('base64url');
        const tokenHash = this.hashToken(refreshToken);

        await this.refreshRepo.save(
            this.refreshRepo.create({
                userId,
                tokenHash,
                userAgent: ctx.userAgent ?? null,
                ipAddress: ctx.ip ?? null,
                expiresAt: new Date(Date.now() + refreshTtl * 1000),
            }),
        );

        // Touch the refresh secret so TypeScript doesn't complain — not used for JWT
        void refreshSecret;

        const user = await this.users.findByIdOrFail(userId);

        return {
            accessToken,
            refreshToken,
            accessTokenExpiresIn: accessTtl,
            refreshTokenExpiresIn: refreshTtl,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                roles,
                mustChangePassword: user.mustChangePassword,
            },
        };
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    async sendVerificationEmail(userId: string, email: string, fullName: string): Promise<void> {
        // Invalidate old unused tokens
        await this.evtRepo.update(
            { userId, usedAt: IsNull() },
            { usedAt: new Date() },
        );

        const raw = randomBytes(32).toString('base64url');
        const tokenHash = this.hashToken(raw);

        await this.evtRepo.save(
            this.evtRepo.create({
                userId,
                tokenHash,
                expiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 3600_000),
            }),
        );

        const webUrl = this.config.get<string>('APP_WEB_URL') ?? 'http://localhost:5173';
        const verifyUrl = `${webUrl}/verify-email?token=${raw}`;

        const tpl = verifyEmailTemplate({
            fullName,
            verifyUrl,
            expiresInHours: EMAIL_VERIFY_TTL_HOURS,
        });

        await this.mail.send({
            to: email,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
        });
    }

    async sendVerificationSms(userId: string, phone: string): Promise<void> {
        // For now: log only. Add SMS provider later.
        // Generate a 6-digit code, store hashed, compare on verify.
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const tokenHash = this.hashToken(code);

        await this.evtRepo.save(
            this.evtRepo.create({
                userId,
                tokenHash,
                expiresAt: new Date(Date.now() + 10 * 60_000),
            }),
        );

        // SmsService stub — replace with real provider
        const { SmsService } = require('../notifications/sms.service');
        void SmsService;
        // await this.sms.send(phone, `Your verification code is ${code}`);
        this.logger.log(`SMS verification code for ${phone}: ${code}`);
    }

    async verifyEmail(token: string, ctx: LoginContext): Promise<{ message: string }> {
        const tokenHash = this.hashToken(token);
        const record = await this.evtRepo.findOne({ where: { tokenHash } });

        if (!record) throw new BadRequestException('Invalid token');
        if (record.usedAt) throw new BadRequestException('Token already used');
        if (record.expiresAt < new Date()) throw new BadRequestException('Token expired');

        record.usedAt = new Date();
        await this.evtRepo.save(record);

        await this.users['setEmailVerified']?.(record.userId, true);
        // ↑ fallback if method not on UsersService yet — see note below

        void this.audit.log({
            actorId: record.userId,
            action: 'auth.email.verified',
            entity: 'user',
            entityId: record.userId,
            ipAddress: ctx.ip ?? null,
        });

        return { message: 'Email verified successfully' };
    }

    async resendVerification(
        identifier: { email?: string; phone?: string },
        ctx: LoginContext,
    ): Promise<{ message: string }> {
        const user = identifier.email
            ? await this.users.findByEmail(identifier.email)
            : await this.users.findByPhone(identifier.phone!);

        // Generic response — don't reveal whether user exists
        const generic = {
            message: 'If the account exists and is unverified, we sent a new verification link.',
        };

        if (!user) return generic;
        if (user.isEmailVerified || user.isPhoneVerified) return generic;

        // Cooldown: max 1 resend per 60 seconds per user
        const latest = await this.evtRepo.findOne({
            where: { userId: user.id },
            order: { createdAt: 'DESC' },
        });
        if (
            latest &&
            Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000
        ) {
            return generic;
        }

        if (identifier.email && user.email) {
            await this.sendVerificationEmail(user.id, user.email, user.email);
        } else if (identifier.phone && user.phone) {
            await this.sendVerificationSms(user.id, user.phone);
        }

        void this.audit.log({
            actorId: user.id,
            action: 'auth.verification.resent',
            entity: 'user',
            entityId: user.id,
            ipAddress: ctx.ip ?? null,
        });

        return generic;
    }

    async forgotPassword(
        email: string,
        ctx: LoginContext,
    ): Promise<{ message: string }> {
        // Generic response — never reveal whether the email exists
        const generic = {
            message: 'If the account exists, we sent a password reset link to that email.',
        };

        const user = await this.users.findByEmail(email);
        if (!user) return generic;
        if (!user.isActive) return generic;

        // Invalidate older unused reset tokens for this user
        await this.prtRepo.update(
            { userId: user.id, usedAt: IsNull() },
            { usedAt: new Date() },
        );

        const raw = randomBytes(32).toString('base64url');
        const tokenHash = this.hashToken(raw);

        await this.prtRepo.save(
            this.prtRepo.create({
                userId: user.id,
                tokenHash,
                expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000),
                ipAddress: ctx.ip ?? null,
            }),
        );

        const webUrl = this.config.get<string>('APP_WEB_URL') ?? 'http://localhost:5173';
        const resetUrl = `${webUrl}/reset-password?token=${raw}`;

        const tpl = resetPasswordTemplate({
            fullName: email.split('@')[0],
            resetUrl,
            expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        });

        await this.mail.send({
            to: email,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
        });

        void this.audit.log({
            actorId: user.id,
            action: 'auth.password.reset.requested',
            entity: 'user',
            entityId: user.id,
            ipAddress: ctx.ip ?? null,
        });

        return generic;
    }

    async resetPassword(
        token: string,
        newPassword: string,
        ctx: LoginContext,
    ): Promise<{ message: string }> {
        const tokenHash = this.hashToken(token);
        const record = await this.prtRepo.findOne({ where: { tokenHash } });

        if (!record) throw new BadRequestException('Invalid token');
        if (record.usedAt) throw new BadRequestException('Token already used');
        if (record.expiresAt < new Date()) throw new BadRequestException('Token expired');

        const passwordHash = await this.hashPassword(newPassword);
        await this.users.setPasswordHash(record.userId, passwordHash);
        await this.users.setFailedAttempts?.(record.userId, 0, null);

        record.usedAt = new Date();
        await this.prtRepo.save(record);

        // Security: revoke all refresh tokens on password reset
        await this.logoutAll(record.userId);

        void this.audit.log({
            actorId: record.userId,
            action: 'auth.password.reset.completed',
            entity: 'user',
            entityId: record.userId,
            ipAddress: ctx.ip ?? null,
        });

        return { message: 'Password reset successful. You can now log in.' };
    }

    async listSessions(userId: string, currentRefreshToken?: string) {
        const tokens = await this.refreshRepo.find({
            where: { userId, revokedAt: IsNull() },
            order: { createdAt: 'DESC' },
        });

        const currentHash = currentRefreshToken
            ? this.hashToken(currentRefreshToken)
            : null;

        return tokens
            .filter((t) => t.expiresAt > new Date())
            .map((t) => ({
                id: t.id,
                userAgent: t.userAgent,
                ipAddress: t.ipAddress,
                createdAt: t.createdAt,
                expiresAt: t.expiresAt,
                isCurrent: currentHash ? t.tokenHash === currentHash : false,
            }));
    }

    async revokeSession(userId: string, sessionId: string): Promise<void> {
        const result = await this.refreshRepo.update(
            { id: sessionId, userId, revokedAt: IsNull() },
            { revokedAt: new Date() },
        );
        if (result.affected === 0) {
            throw new NotFoundException('Session not found');
        }
    }
}

export interface LoginContext {
    ip?: string;
    userAgent?: string;
}