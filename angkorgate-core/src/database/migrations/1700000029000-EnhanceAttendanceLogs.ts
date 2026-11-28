import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceAttendanceLogs1700000029000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        if (!(await q.hasColumn('attendance_logs', 'status'))) {
            await q.query(
                `ALTER TABLE attendance_logs ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ON_TIME';`,
            );
        }
        if (!(await q.hasColumn('attendance_logs', 'late_minutes'))) {
            await q.query(
                `ALTER TABLE attendance_logs ADD COLUMN late_minutes INT NOT NULL DEFAULT 0;`,
            );
        }
        if (!(await q.hasColumn('attendance_logs', 'worked_minutes'))) {
            await q.query(
                `ALTER TABLE attendance_logs ADD COLUMN worked_minutes INT NULL;`,
            );
        }
    }

    public async down(q: QueryRunner): Promise<void> {
        if (await q.hasColumn('attendance_logs', 'worked_minutes')) {
            await q.query(`ALTER TABLE attendance_logs DROP COLUMN worked_minutes;`);
        }
        if (await q.hasColumn('attendance_logs', 'late_minutes')) {
            await q.query(`ALTER TABLE attendance_logs DROP COLUMN late_minutes;`);
        }
        if (await q.hasColumn('attendance_logs', 'status')) {
            await q.query(`ALTER TABLE attendance_logs DROP COLUMN status;`);
        }
    }
}
