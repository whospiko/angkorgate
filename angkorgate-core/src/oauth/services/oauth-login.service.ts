import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OauthAccount } from '../entities/oauth-account.entity';
import { OauthProfile } from '../interfaces/oauth-profile.interface';
import { UsersService } from '../../users/services/users.service';
import { CustomersService } from '../../customers/services/customers.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { AuthService } from '../../auth/services/auth.service';
import { AuditService } from '../../audit/services/audit.service';

export interface OauthLoginResult {
    userId: string;
    created: boolean;
    accountLinked: boolean;
}

@Injectable()
export class OauthLoginService {
    private readonly logger = new Logger(OauthLoginService.name);

    constructor(
        @InjectRepository(OauthAccount)
        private readonly accountsRepo: Repository<OauthAccount>,
        private readonly users: UsersService,
        private readonly customers: CustomersService,
        private readonly rbac: RbacService,
        private readonly audit: AuditService,
        private readonly auth: AuthService,
    ) { }

    /**
     * Main flow:
     *  1. Look up oauth_accounts by (provider, providerUserId)
     *     → found: log them in (update last_login_at)
     *  2. Not found → look up users by email
     *     → found: link account to existing user (if allowed by policy)
     *     → not found: auto-create user + customer + CUSTOMER role
     *  3. Return AuthResponseDto (same shape as /auth/login)
     */
    async loginWithProfile(
        profile: OauthProfile,
        ctx: { ip?: string; userAgent?: string },
    ): Promise<{ tokens: unknown; userId: string }> {
        // 1. Existing oauth link
        const existing = await this.accountsRepo.findOne({
            where: {
                provider: profile.provider,
                providerUserId: profile.providerUserId,
            },
        });

        if (existing) {
            await this.accountsRepo.update(existing.id, { lastLoginAt: new Date() });
            const user = await this.users.findByIdOrFail(existing.userId);
            if (!user.isActive) throw new ForbiddenException('Account disabled');

            void this.audit.log({
                actorId: user.id,
                action: `auth.oauth.${profile.provider}.login`,
                entity: 'user',
                entityId: user.id,
                ipAddress: ctx.ip ?? null,
            });

            const tokens = await this.auth.issueTokensForUser(user.id, user.email, user.phone, ctx);
            return { tokens, userId: user.id };
        }

        // 2. Existing user by email?
        if (profile.email) {
            const user = await this.users.findByEmail(profile.email);
            if (user) {
                // Auto-link. If you want stricter policy (send confirmation email
                // before linking), gate it here.
                await this.linkAccount(user.id, profile);

                void this.audit.log({
                    actorId: user.id,
                    action: `auth.oauth.${profile.provider}.linked`,
                    entity: 'user',
                    entityId: user.id,
                    ipAddress: ctx.ip ?? null,
                });

                const tokens = await this.auth.issueTokensForUser(
                    user.id,
                    user.email,
                    user.phone,
                    ctx,
                );
                return { tokens, userId: user.id };
            }
        }

        // 3. Create user + customer + link
        const created = await this.createUserWithProfile(profile, ctx);
        return created;
    }

    /** Called by /auth/oauth/:provider/link for an already-logged-in user. */
    async linkToCurrentUser(
        userId: string,
        profile: OauthProfile,
    ): Promise<OauthAccount> {
        const existing = await this.accountsRepo.findOne({
            where: {
                provider: profile.provider,
                providerUserId: profile.providerUserId,
            },
        });
        if (existing && existing.userId !== userId) {
            throw new ForbiddenException('This provider account is already linked to another user');
        }
        return this.linkAccount(userId, profile);
    }

    // ───────────────────────── INTERNAL ─────────────────────────

    private async linkAccount(
        userId: string,
        profile: OauthProfile,
    ): Promise<OauthAccount> {
        const existing = await this.accountsRepo.findOne({
            where: { provider: profile.provider, userId },
        });
        if (existing) {
            // Update email/avatar if changed
            existing.email = profile.email ?? existing.email;
            existing.rawProfile = profile.raw;
            existing.lastLoginAt = new Date();
            return this.accountsRepo.save(existing);
        }
        return this.accountsRepo.save(
            this.accountsRepo.create({
                userId,
                provider: profile.provider,
                providerUserId: profile.providerUserId,
                email: profile.email,
                emailVerifiedAt: profile.emailVerified ? new Date() : null,
                rawProfile: profile.raw,
                lastLoginAt: new Date(),
            }),
        );
    }

    private async createUserWithProfile(
        profile: OauthProfile,
        ctx: { ip?: string; userAgent?: string },
    ): Promise<{ tokens: unknown; userId: string }> {
        if (!profile.email) {
            throw new ForbiddenException(
                `Provider '${profile.provider}' did not return an email. Cannot auto-create account.`,
            );
        }

        // Create user (no password — they'll use OAuth)
        // For password_hash NOT NULL constraint: generate a random one they'll never know
        const randomPasswordHash =
            '$2b$12$' + require('crypto').randomBytes(40).toString('base64url').slice(0, 53);

        const user = await this.users.create({
            email: profile.email,
            password: randomPasswordHash,
            isEmailVerified: profile.emailVerified,
        });

        // Create customer record
        await this.customers.create(
            {
                type: 'CUSTOMER',
                userId: user.id,
                fullName: profile.fullName ?? profile.email.split('@')[0],
                dateOfBirth: '1970-01-01', // placeholder — customer can update later
                email: profile.email,
                avatarUrl: profile.avatarUrl,
            },
            user.id,
        );

        await this.rbac.assignRoleToUser(user.id, 'CUSTOMER', user.id);
        await this.linkAccount(user.id, profile);

        void this.audit.log({
            actorId: user.id,
            action: `auth.oauth.${profile.provider}.register`,
            entity: 'user',
            entityId: user.id,
            newValue: { email: profile.email, provider: profile.provider },
            ipAddress: ctx.ip ?? null,
        });

        const tokens = await this.auth.issueTokensForUser(
            user.id,
            user.email,
            user.phone,
            ctx,
        );
        return { tokens, userId: user.id };
    }
}