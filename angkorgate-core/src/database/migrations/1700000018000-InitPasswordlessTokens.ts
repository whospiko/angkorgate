import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitPasswordlessTokens1700000018000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            CREATE TABLE IF NOT EXISTS passwordless_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                channel VARCHAR(32) NOT NULL,
                identifier CITEXT NOT NULL,
                token_hash TEXT NOT NULL,
                attempts INT NOT NULL DEFAULT 0,
                max_attempts INT NOT NULL DEFAULT 5,
                redirect_url TEXT,
                ip_address VARCHAR(64),
                user_agent TEXT,
                expires_at TIMESTAMPTZ NOT NULL,
                used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        await q.query(
            `CREATE INDEX IF NOT EXISTS idx_pwl_identifier_channel ON passwordless_tokens(identifier, channel, used_at);`,
        );
        await q.query(
            `CREATE INDEX IF NOT EXISTS idx_pwl_user_channel ON passwordless_tokens(user_id, channel, used_at);`,
        );
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE IF EXISTS passwordless_tokens;`);
    }
}
