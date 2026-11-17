import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailChange1700000010000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
      CREATE TABLE email_change_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        new_email CITEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        requested_ip INET,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
        await q.query(`
      CREATE INDEX idx_email_change_user_active
        ON email_change_tokens(user_id)
        WHERE used_at IS NULL;
    `);
        await q.query(`
      CREATE INDEX idx_email_change_new_email
        ON email_change_tokens(new_email)
        WHERE used_at IS NULL;
    `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE email_change_tokens;`);
    }
}