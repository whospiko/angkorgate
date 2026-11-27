import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScheduleOverridesAndLeaveRequests1700000023000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            CREATE TABLE IF NOT EXISTS schedule_overrides (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                is_available BOOLEAN NOT NULL DEFAULT FALSE,
                start_time TIME NULL,
                end_time TIME NULL,
                reason VARCHAR(200) NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT uq_schedule_override_emp_date UNIQUE (employee_id, date)
            );
        `);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_sched_overrides_emp_date ON schedule_overrides(employee_id, date);`);

        await q.query(`
            CREATE TABLE IF NOT EXISTS leave_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'OTHER')),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
                reviewed_by_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
                reviewed_at TIMESTAMPTZ NULL,
                review_note TEXT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CHECK (start_date <= end_date)
            );
        `);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id);`);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);`);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE IF EXISTS leave_requests;`);
        await q.query(`DROP TABLE IF EXISTS schedule_overrides;`);
    }
}
