import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceLogs1700000027000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            CREATE TABLE IF NOT EXISTS attendance_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                clock_in_at TIMESTAMPTZ NOT NULL,
                clock_out_at TIMESTAMPTZ NULL,
                source VARCHAR(20) NOT NULL DEFAULT 'WEB',
                notes TEXT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_attendance_emp ON attendance_logs(employee_id);`);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_attendance_clockin ON attendance_logs(clock_in_at);`);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE IF EXISTS attendance_logs;`);
    }
}
