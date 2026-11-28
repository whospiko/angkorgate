import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaveAssignedApproverAndPolicies1700000026000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        if (!(await q.hasColumn('leave_requests', 'assigned_approver_id'))) {
            await q.query(
                `ALTER TABLE leave_requests ADD COLUMN assigned_approver_id UUID NULL;`,
            );
        }

        await q.query(`
            CREATE TABLE IF NOT EXISTS leave_policies (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                leave_type VARCHAR(20) NOT NULL UNIQUE,
                annual_quota_days INT NOT NULL,
                enforce_quota BOOLEAN NOT NULL DEFAULT TRUE,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE IF EXISTS leave_policies;`);
        if (await q.hasColumn('leave_requests', 'assigned_approver_id')) {
            await q.query(`ALTER TABLE leave_requests DROP COLUMN assigned_approver_id;`);
        }
    }
}
