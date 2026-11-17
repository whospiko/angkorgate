import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { OauthTicket } from '../entities/oauth-ticket.entity';

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
        // Cheap cleanup of expired tickets (run occasionally; not blocking)
        void this.repo.delete({ expiresAt: LessThan(new Date()) });

        const raw = randomBytes(32).toString('base64url');
        await this.repo.save(
            this.repo.create({
                ticketHash: this.hash(raw),
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
            where: { ticketHash: this.hash(raw) },
        });
        if (!ticket) throw new NotFoundException('Invalid ticket');
        if (ticket.usedAt) throw new NotFoundException('Ticket already used');
        if (ticket.expiresAt < new Date()) throw new NotFoundException('Ticket expired');

        // Atomic consume — prevents race condition
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

    private hash(s: string): string {
        return createHash('sha256').update(s).digest('hex');
    }
}