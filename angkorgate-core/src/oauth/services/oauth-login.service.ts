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
import { generateSecureToken } from '../../common/utils/crypto.util';

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
            const user = await this.users.findById(existing.userId);
            if (user) {
                await this.accountsRepo.update(existing.id, { lastLoginAt: new Date() });
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
            // Linked user was soft-deleted: remove stale oauth_accounts row and re-provision
            await this.accountsRepo.delete(existing.id);
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

    /** Internal Helper Methods */

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
        const allowEmailLess = profile.provider === 'telegram';
        if (!profile.email && !allowEmailLess) {
            throw new ForbiddenException(
                `Provider '${profile.provider}' did not return an email. Cannot auto-create account.`,
            );
        }

        // Create user (no password — they'll use OAuth)
        // Store a non-bcrypt marker containing "hash" so UsersService passes it through without hashing
        // and StepUpService knows this account has no local password.
        const randomPasswordHash = `oauth_no_password_hash_${generateSecureToken(24)}`;

        const user = await this.users.create({
            email: profile.email ?? undefined,
            password: randomPasswordHash,
            isEmailVerified: profile.emailVerified,
        });

        const fallbackName =
            profile.fullName ??
            (profile.username ? `@${profile.username}` : undefined) ??
            profile.email?.split('@')[0] ??
            `${profile.provider}_${profile.providerUserId}`;

        // Create customer record
        await this.customers.create(
            {
                type: 'CUSTOMER',
                userId: user.id,
                fullName: fallbackName,
                dateOfBirth: '1970-01-01', // placeholder — customer can update later
                email: profile.email ?? undefined,
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
            newValue: {
                email: profile.email,
                username: profile.username ?? null,
                provider: profile.provider,
            },
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