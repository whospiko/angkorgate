import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitRuntimeSettings1700000019000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            CREATE TABLE IF NOT EXISTS runtime_settings (
                key VARCHAR(128) PRIMARY KEY,
                value TEXT,
                category VARCHAR(32) NOT NULL,
                is_secret BOOLEAN NOT NULL DEFAULT FALSE,
                updated_by UUID,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        await q.query(
            `CREATE INDEX IF NOT EXISTS idx_runtime_settings_category ON runtime_settings(category);`,
        );
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE IF EXISTS runtime_settings;`);
    }
}
