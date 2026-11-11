// src/database/migrations/1700000008000-OAuthTickets.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class OAuthTickets1700000008000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
      CREATE TABLE oauth_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_hash TEXT NOT NULL UNIQUE,
        user_id UUID NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        provider VARCHAR(50) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
        await q.query(`
      CREATE INDEX idx_oauth_tickets_active
        ON oauth_tickets(expires_at)
        WHERE used_at IS NULL;
    `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE oauth_tickets;`);
    }
}