import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllowedDashboardRolesToSystemConfig1700000014000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            ALTER TABLE system_configs
            ADD COLUMN IF NOT EXISTS allowed_dashboard_roles TEXT DEFAULT 'ADMIN';
        `);

        // Ensure any existing rows have 'ADMIN' if NULL
        await q.query(`
            UPDATE system_configs
            SET allowed_dashboard_roles = 'ADMIN'
            WHERE allowed_dashboard_roles IS NULL;
        `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`
            ALTER TABLE system_configs
            DROP COLUMN IF EXISTS allowed_dashboard_roles;
        `);
    }
}
