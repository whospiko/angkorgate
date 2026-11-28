import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceSoftDelete1700000032000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    const cols: [string, string][] = [
      ['deleted_at', 'TIMESTAMP NULL'],
      ['deleted_by_id', 'VARCHAR(36) NULL'],
      ['delete_reason', 'VARCHAR(300) NULL'],
    ];
    for (const [col, def] of cols) {
      if (!(await q.hasColumn('attendance_logs', col))) {
        await q.query(`ALTER TABLE attendance_logs ADD COLUMN ${col} ${def};`);
      }
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const col of ['delete_reason', 'deleted_by_id', 'deleted_at']) {
      if (await q.hasColumn('attendance_logs', col)) {
        await q.query(`ALTER TABLE attendance_logs DROP COLUMN ${col};`);
      }
    }
  }
}
