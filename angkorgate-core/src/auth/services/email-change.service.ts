import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';

import { EmailChangeToken } from '../entities/email-change-token.entity';
import { UsersService } from '../../users/services/users.service';
import { MfaService } from './mfa.service';
import { MailService } from '../../notifications/services/mail.service';
import { AuditService } from '../../audit/services/audit.service';
import { RequestEmailChangeDto } from '../dto/request-email-change.dto';
import { emailChangeAlertTemplate } from '../templates/email-change-alert.template';
import { emailChangeConfirmTemplate } from '../templates/email-change-confirm.template';
import { AuthService } from './auth.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { generateSecureToken, hashSha256 } from '../../common/utils/crypto.util';
import { emailToDisplayName } from '../../common/utils/string.util';

const EMAIL_CHANGE_TTL_HOURS = 24;
const RESEND_COOLDOWN_SECONDS = 60;
const GENERIC_RESPONSE = {
    message:
        'If the new email address is available, a confirmation link has been sent. Check your inbox.',
};

export interface EmailChangeContext {
    ip?: string;
    userAgent?: string;
}

@Injectable()
export class EmailChangeService {
    private readonly logger = new Logger(EmailChangeService.name);

    constructor(
        @InjectRepository(EmailChangeToken)
        private readonly tokenRepo: Repository<EmailChangeToken>,
        private readonly users: UsersService,
        private readonly mfa: MfaService,
        private readonly mail: MailService,
        private readonly audit: AuditService,
        private readonly config: ConfigService,
        @InjectRepository(RefreshToken)
        private readonly refreshRepo: Repository<RefreshToken>,
    ) { }

    /** Initiate email change request */
    async requestChange(
        userId: string,
        dto: RequestEmailChangeDto,
        ctx: EmailChangeContext,
    ): Promise<{ message: string }> {
        const user = await this.users.findByIdOrFail(userId);

        // 1. Block no-op
        if (user.email && user.email.toLowerCase() === dto.newEmail.toLowerCase()) {
            throw new BadRequestException(
                'New email must be different from your current email',
            );
        }

        // 2. MFA gate — if enabled, require a valid TOTP to proceed
        const mfaEnabled = await this.mfa.isEnabled(userId);
        if (mfaEnabled) {
            if (!dto.mfaCode) {
                throw new UnauthorizedException(
                    'MFA code required to change email address',
                );
            }
            const result = await this.mfa.verifyCodeOrBackup(userId, dto.mfaCode);
            if (!result.valid) {
                void this.audit.log({
                    actorId: userId,
                    action: 'auth.email.change.failed_mfa',
                    entity: 'user',
                    entityId: userId,
                    ipAddress: ctx.ip ?? null,
                });
                throw new UnauthorizedException('Invalid MFA code');
            }
        }

        // 3. Conflict check — is the new email already taken?
        //    We DON'T reveal this to the requester if the caller might be an attacker.
        //    But since the caller is authenticated as the user, it's safe to tell them.
        const existing = await this.users.findByEmail(dto.newEmail);
        if (existing && existing.id !== userId) {
            throw new ConflictException(
                'That email address is already in use by another account',
            );
        }

        // 4. Cooldown — prevent rapid-fire requests
        const latest = await this.tokenRepo.findOne({
            where: { userId, usedAt: IsNull() },
            order: { createdAt: 'DESC' },
        });
        if (
            latest &&
            Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000
        ) {
            return GENERIC_RESPONSE; // no-op, but don't reveal timing
        }

        // 5. Invalidate all prior unused email-change tokens for this user
        await this.tokenRepo.update(
            { userId, usedAt: IsNull() },
            { usedAt: new Date() },
        );

        // Create new token
        const rawToken = generateSecureToken(32);
        const tokenHash = hashSha256(rawToken);

        await this.tokenRepo.save(
            this.tokenRepo.create({
                userId,
                newEmail: dto.newEmail,
                tokenHash,
                expiresAt: new Date(Date.now() + EMAIL_CHANGE_TTL_HOURS * 3600_000),
                requestedIp: ctx.ip ?? null,
            }),
        );

        // Send alert email to current email address
        if (user.email) {
            const alertTpl = emailChangeAlertTemplate({
                fullName: emailToDisplayName(user.email),
                newEmail: dto.newEmail,
                oldEmail: user.email,
                changeIp: ctx.ip ?? null,
                requestedAt: new Date(),
            });
            await this.mail.send({
                to: user.email,
                subject: alertTpl.subject,
                html: alertTpl.html,
                text: alertTpl.text,
            });
        }

        // Send confirm email to requested new email address
        const webUrl =
            this.config.get<string>('APP_WEB_URL') ?? 'http://localhost:5173';
        const confirmUrl = `${webUrl}/confirm-email-change?token=${rawToken}`;

        const confirmTpl = emailChangeConfirmTemplate({
            fullName: user.email
                ? emailToDisplayName(user.email)
                : 'there',
            confirmUrl,
            expiresInHours: EMAIL_CHANGE_TTL_HOURS,
        });
        await this.mail.send({
            to: dto.newEmail,
            subject: confirmTpl.subject,
            html: confirmTpl.html,
            text: confirmTpl.text,
        });

        void this.audit.log({
            actorId: userId,
            action: 'auth.email.change.requested',
            entity: 'user',
            entityId: userId,
            newValue: { newEmail: dto.newEmail },
            ipAddress: ctx.ip ?? null,
        });

        return GENERIC_RESPONSE;
    }

    /** Confirm email change via token */
    async confirmChange(
        rawToken: string,
        ctx: EmailChangeContext,
    ): Promise<{ message: string }> {
        const tokenHash = hashSha256(rawToken);
        const record = await this.tokenRepo.findOne({ where: { tokenHash } });

        if (!record) throw new BadRequestException('Invalid or expired token');
        if (record.usedAt) throw new BadRequestException('Token already used');
        if (record.expiresAt < new Date())
            throw new BadRequestException('Token has expired');

        const targetUser = await this.users.findByEmail(record.newEmail);
        if (targetUser && targetUser.id !== record.userId) {
            throw new ConflictException(
                'That email address was just taken by another account',
            );
        }

        // Atomic consume
        const consumed = await this.tokenRepo.update(
            { id: record.id, usedAt: IsNull() },
            { usedAt: new Date() },
        );
        if (consumed.affected === 0) {
            throw new BadRequestException('Token already used');
        }

        // Apply the change
        await this.users.updateEmail(record.userId, record.newEmail);

        // 🔒 Revoke all sessions directly — no circular dependency
        await this.refreshRepo.update(
            { userId: record.userId, revokedAt: IsNull() },
            { revokedAt: new Date() },
        );

        void this.audit.log({
            actorId: record.userId,
            action: 'auth.email.change.completed',
            entity: 'user',
            entityId: record.userId,
            newValue: { newEmail: record.newEmail },
            ipAddress: ctx.ip ?? null,
        });

        return {
            message:
                'Email address changed successfully. Please log in again with your new email.',
        };
    }

    /** Resend confirmation to pending new email */
    async resend(userId: string, ctx: EmailChangeContext): Promise<{ message: string }> {
        const pending = await this.tokenRepo.findOne({
            where: { userId, usedAt: IsNull() },
            order: { createdAt: 'DESC' },
        });

        // If no pending change, silently succeed (no info leak)
        if (!pending) {
            return {
                message:
                    'If you have a pending email change, a new confirmation link has been sent.',
            };
        }

        // Cooldown
        if (
            Date.now() - pending.createdAt.getTime() <
            RESEND_COOLDOWN_SECONDS * 1000
        ) {
            return {
                message:
                    'If you have a pending email change, a new confirmation link has been sent.',
            };
        }

        // Expired? Force the user to restart.
        if (pending.expiresAt < new Date()) {
            throw new BadRequestException(
                'The previous request expired. Please start a new email change request.',
            );
        }

        // Invalidate old token, issue a new one for the SAME newEmail
        await this.tokenRepo.update(
            { id: pending.id },
            { usedAt: new Date() },
        );

        const rawToken = generateSecureToken(32);
        const tokenHash = hashSha256(rawToken);

        await this.tokenRepo.save(
            this.tokenRepo.create({
                userId,
                newEmail: pending.newEmail,
                tokenHash,
                expiresAt: new Date(Date.now() + EMAIL_CHANGE_TTL_HOURS * 3600_000),
                requestedIp: ctx.ip ?? null,
            }),
        );

        const user = await this.users.findByIdOrFail(userId);
        const webUrl =
            this.config.get<string>('APP_WEB_URL') ?? 'http://localhost:5173';
        const confirmUrl = `${webUrl}/confirm-email-change?token=${rawToken}`;

        const tpl = emailChangeConfirmTemplate({
            fullName: user.email
                ? emailToDisplayName(user.email)
                : 'there',
            confirmUrl,
            expiresInHours: EMAIL_CHANGE_TTL_HOURS,
        });

        await this.mail.send({
            to: pending.newEmail,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
        });

        void this.audit.log({
            actorId: userId,
            action: 'auth.email.change.resent',
            entity: 'user',
            entityId: userId,
            newValue: { newEmail: pending.newEmail },
            ipAddress: ctx.ip ?? null,
        });

        return {
            message:
                'If you have a pending email change, a new confirmation link has been sent.',
        };
    }

    /** Check pending email change status */
    async getPendingStatus(userId: string): Promise<{
        pending: boolean;
        newEmail?: string;
        expiresAt?: Date;
    }> {
        const pending = await this.tokenRepo.findOne({
            where: { userId, usedAt: IsNull() },
            order: { createdAt: 'DESC' },
        });
        if (!pending || pending.expiresAt < new Date()) {
            return { pending: false };
        }
        return {
            pending: true,
            newEmail: pending.newEmail,
            expiresAt: pending.expiresAt,
        };
    }
}