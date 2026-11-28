import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendancePolicies1700000030000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    if (!(await q.hasTable('attendance_policies'))) {
      await q.query(`
        CREATE TABLE IF NOT EXISTS attendance_policies (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          department_id VARCHAR(36) NULL,
          is_default BOOLEAN NOT NULL DEFAULT false,
          grace_minutes INT NOT NULL DEFAULT 5,
          early_leave_grace_minutes INT NOT NULL DEFAULT 5,
          sessions TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    if (!(await q.hasColumn('attendance_logs', 'session_index'))) {
      await q.query(
        `ALTER TABLE attendance_logs ADD COLUMN session_index INT NULL;`,
      );
    }
    if (!(await q.hasColumn('attendance_logs', 'policy_id'))) {
      await q.query(
        `ALTER TABLE attendance_logs ADD COLUMN policy_id VARCHAR(36) NULL;`,
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    if (await q.hasColumn('attendance_logs', 'policy_id')) {
      await q.query(`ALTER TABLE attendance_logs DROP COLUMN policy_id;`);
    }
    if (await q.hasColumn('attendance_logs', 'session_index')) {
      await q.query(`ALTER TABLE attendance_logs DROP COLUMN session_index;`);
    }
    if (await q.hasTable('attendance_policies')) {
      await q.query(`DROP TABLE attendance_policies;`);
    }
  }
}
