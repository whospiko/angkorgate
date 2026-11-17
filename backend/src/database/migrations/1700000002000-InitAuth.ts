import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAuth1700000002000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
      CREATE TABLE refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        user_agent TEXT,
        ip_address INET,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
        await q.query(`
      CREATE INDEX idx_refresh_user
        ON refresh_tokens(user_id)
        WHERE revoked_at IS NULL;
    `);

        await q.query(`
      CREATE TABLE login_attempts (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        email_phone VARCHAR(255),
        success BOOLEAN NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
        await q.query(`
      CREATE INDEX idx_login_attempts_identifier
        ON login_attempts(email_phone, created_at DESC);
    `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE login_attempts;`);
        await q.query(`DROP TABLE refresh_tokens;`);
    }
}