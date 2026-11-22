import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { OauthTicket } from '../entities/oauth-ticket.entity';
import { generateSecureToken, hashSha256 } from '../../common/utils/crypto.util';

const TICKET_TTL_SECONDS = 60;

export interface TicketPayload {
    accessToken: string;
    refreshToken: string;
    userId: string;
    provider: string;
}

@Injectable()
export class OauthTicketService {
    constructor(
        @InjectRepository(OauthTicket)
        private readonly repo: Repository<OauthTicket>,
    ) { }

    /** Creates a one-time opaque ticket, returns the raw string. */
    async issue(payload: TicketPayload): Promise<string> {
        // Periodic cleanup of expired tickets
        void this.repo.delete({ expiresAt: LessThan(new Date()) });

        const raw = generateSecureToken(32);
        await this.repo.save(
            this.repo.create({
                ticketHash: hashSha256(raw),
                userId: payload.userId,
                accessToken: payload.accessToken,
                refreshToken: payload.refreshToken,
                provider: payload.provider,
                expiresAt: new Date(Date.now() + TICKET_TTL_SECONDS * 1000),
            }),
        );
        return raw;
    }

    /** Redeems a ticket exactly once. Throws if invalid, used, or expired. */
    async redeem(raw: string): Promise<TicketPayload> {
        const ticket = await this.repo.findOne({
            where: { ticketHash: hashSha256(raw) },
        });
        if (!ticket) throw new NotFoundException('Invalid ticket');
        if (ticket.usedAt) throw new NotFoundException('Ticket already used');
        if (ticket.expiresAt < new Date()) throw new NotFoundException('Ticket expired');

        // Atomic consume to prevent race condition
        const result = await this.repo.update(
            { id: ticket.id, usedAt: IsNull() },
            { usedAt: new Date() },
        );
        if (result.affected === 0) {
            throw new NotFoundException('Ticket already used');
        }

        return {
            accessToken: ticket.accessToken,
            refreshToken: ticket.refreshToken,
            userId: ticket.userId,
            provider: ticket.provider,
        };
    }
}