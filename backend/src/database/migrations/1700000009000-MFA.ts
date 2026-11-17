import { MigrationInterface, QueryRunner } from 'typeorm';

export class MFA1700000009000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
      CREATE TABLE user_mfa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        secret_encrypted TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        enabled_at TIMESTAMPTZ,
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
        await q.query(`
      CREATE INDEX idx_mfa_enabled
        ON user_mfa(user_id)
        WHERE is_enabled = TRUE;
    `);

        await q.query(`
      CREATE TABLE mfa_backup_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
        await q.query(`
      CREATE INDEX idx_backup_codes_user
        ON mfa_backup_codes(user_id)
        WHERE used_at IS NULL;
    `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE mfa_backup_codes;`);
        await q.query(`DROP TABLE user_mfa;`);
    }
}