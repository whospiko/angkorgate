import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceGeofenceAndIpRules1700000031000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    const policyCols: [string, string][] = [
      ['allow_self_service_web', 'BOOLEAN NOT NULL DEFAULT true'],
      ['allowed_ips', 'TEXT NULL'],
      ['require_geofence', 'BOOLEAN NOT NULL DEFAULT false'],
      ['office_latitude', 'DOUBLE PRECISION NULL'],
      ['office_longitude', 'DOUBLE PRECISION NULL'],
      ['geofence_radius_meters', 'INT NOT NULL DEFAULT 100'],
    ];
    for (const [col, def] of policyCols) {
      if (!(await q.hasColumn('attendance_policies', col))) {
        await q.query(`ALTER TABLE attendance_policies ADD COLUMN ${col} ${def};`);
      }
    }

    const logCols: [string, string][] = [
      ['clock_in_ip', 'VARCHAR(64) NULL'],
      ['clock_in_latitude', 'DOUBLE PRECISION NULL'],
      ['clock_in_longitude', 'DOUBLE PRECISION NULL'],
      ['distance_meters', 'INT NULL'],
    ];
    for (const [col, def] of logCols) {
      if (!(await q.hasColumn('attendance_logs', col))) {
        await q.query(`ALTER TABLE attendance_logs ADD COLUMN ${col} ${def};`);
      }
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const col of [
      'distance_meters',
      'clock_in_longitude',
      'clock_in_latitude',
      'clock_in_ip',
    ]) {
      if (await q.hasColumn('attendance_logs', col)) {
        await q.query(`ALTER TABLE attendance_logs DROP COLUMN ${col};`);
      }
    }
    for (const col of [
      'geofence_radius_meters',
      'office_longitude',
      'office_latitude',
      'require_geofence',
      'allowed_ips',
      'allow_self_service_web',
    ]) {
      if (await q.hasColumn('attendance_policies', col)) {
        await q.query(`ALTER TABLE attendance_policies DROP COLUMN ${col};`);
      }
    }
  }
}
