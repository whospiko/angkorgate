import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenFamiliesAndMetadata1700000020000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            ALTER TABLE refresh_tokens
            ADD COLUMN IF NOT EXISTS family_id UUID,
            ADD COLUMN IF NOT EXISTS replaced_by_id UUID,
            ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(64),
            ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
        `);

        await q.query(`
            UPDATE refresh_tokens
            SET family_id = id
            WHERE family_id IS NULL;
        `);

        await q.query(`
            UPDATE refresh_tokens
            SET last_used_at = created_at
            WHERE last_used_at IS NULL;
        `);

        await q.query(`
            CREATE INDEX IF NOT EXISTS idx_refresh_family
            ON refresh_tokens(family_id);
        `);

        await q.query(`
            CREATE INDEX IF NOT EXISTS idx_refresh_user_last_used
            ON refresh_tokens(user_id, last_used_at DESC)
            WHERE revoked_at IS NULL;
        `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP INDEX IF EXISTS idx_refresh_user_last_used;`);
        await q.query(`DROP INDEX IF EXISTS idx_refresh_family;`);
        await q.query(`
            ALTER TABLE refresh_tokens
            DROP COLUMN IF EXISTS last_used_at,
            DROP COLUMN IF EXISTS revoked_reason,
            DROP COLUMN IF EXISTS replaced_by_id,
            DROP COLUMN IF EXISTS family_id;
        `);
    }
}
