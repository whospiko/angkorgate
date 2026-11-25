import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitPasskeys1700000017000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            CREATE TABLE IF NOT EXISTS user_passkeys (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                credential_id VARCHAR(512) NOT NULL UNIQUE,
                public_key TEXT NOT NULL,
                counter BIGINT NOT NULL DEFAULT 0,
                device_type VARCHAR(64) NOT NULL DEFAULT 'singleDevice',
                backed_up BOOLEAN NOT NULL DEFAULT FALSE,
                transports TEXT,
                friendly_name VARCHAR(128) NOT NULL DEFAULT 'Passkey',
                aaguid VARCHAR(64),
                last_used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        await q.query(`CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id ON user_passkeys(user_id);`);
        await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_passkeys_credential_id ON user_passkeys(credential_id);`);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE IF EXISTS user_passkeys;`);
    }
}
