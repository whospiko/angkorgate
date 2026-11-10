import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthVerification1700000006000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
      CREATE TABLE email_verification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
        await q.query(`
      CREATE INDEX idx_evt_user_active
        ON email_verification_tokens(user_id)
        WHERE used_at IS NULL;
    `);

        await q.query(`
      CREATE TABLE password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        ip_address INET,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
        await q.query(`
      CREATE INDEX idx_prt_user_active
        ON password_reset_tokens(user_id)
        WHERE used_at IS NULL;
    `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE password_reset_tokens;`);
        await q.query(`DROP TABLE email_verification_tokens;`);
    }
}