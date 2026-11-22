import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitOidc1700000011000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            CREATE TABLE IF NOT EXISTS oidc_sessions (
                id VARCHAR(255) PRIMARY KEY,
                model_name VARCHAR(100),
                payload JSONB NOT NULL,
                grant_id VARCHAR(255),
                user_code VARCHAR(255),
                uid VARCHAR(255),
                expires_at TIMESTAMPTZ NOT NULL,
                consumed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        await q.query(`CREATE INDEX IF NOT EXISTS idx_oidc_sessions_model ON oidc_sessions(model_name);`);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_oidc_sessions_grant_id ON oidc_sessions(grant_id) WHERE grant_id IS NOT NULL;`);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_oidc_sessions_user_code ON oidc_sessions(user_code) WHERE user_code IS NOT NULL;`);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_oidc_sessions_uid ON oidc_sessions(uid) WHERE uid IS NOT NULL;`);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_oidc_sessions_expires_at ON oidc_sessions(expires_at);`);

        await q.query(`
            ALTER TABLE app_settings
            ADD COLUMN IF NOT EXISTS client_secret VARCHAR(255);
        `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`ALTER TABLE app_settings DROP COLUMN IF EXISTS client_secret;`);
        await q.query(`DROP TABLE IF EXISTS oidc_sessions;`);
    }
}
