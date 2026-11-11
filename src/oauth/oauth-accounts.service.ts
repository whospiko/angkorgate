import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OauthAccount } from './entities/oauth-account.entity';

export class LinkedProviderDto {
    provider: string;
    email: string | null;
    linkedAt: Date;
    lastLoginAt: Date | null;
}

@Injectable()
export class OauthAccountsService {
    constructor(
        @InjectRepository(OauthAccount)
        private readonly repo: Repository<OauthAccount>,
    ) { }

    /** Public — used by GET /auth/me/providers or settings UI. */
    async listForUser(userId: string): Promise<LinkedProviderDto[]> {
        const rows = await this.repo.find({
            where: { userId },
            order: { linkedAt: 'DESC' },
        });
        return rows.map((r) => ({
            provider: r.provider,
            email: r.email,
            linkedAt: r.linkedAt,
            lastLoginAt: r.lastLoginAt,
        }));
    }

    /** Admin API — list all links for a user. */
    async listByUser(userId: string): Promise<OauthAccount[]> {
        return this.repo.find({
            where: { userId },
            order: { linkedAt: 'DESC' },
        });
    }

    /** Admin API — force-unlink a provider from a user. */
    async unlink(userId: string, provider: string): Promise<void> {
        const result = await this.repo.delete({ userId, provider });
        if (result.affected === 0) {
            throw new NotFoundException(
                `No ${provider} link found for user ${userId}`,
            );
        }
    }

    async exists(provider: string, providerUserId: string): Promise<boolean> {
        return (
            (await this.repo.count({ where: { provider, providerUserId } })) > 0
        );
    }
}