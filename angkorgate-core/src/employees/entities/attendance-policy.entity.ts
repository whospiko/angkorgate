import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { colTimestamptz } from '../../common/utils/db-types.util';

export interface AttendanceSessionRule {
  label: string;
  checkInTime: string;
  checkOutTime: string;
}

@Entity('attendance_policies')
@Index(['departmentId', 'isActive'])
@Index(['isDefault', 'isActive'])
export class AttendancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'grace_minutes', type: 'int', default: 5 })
  graceMinutes: number;

  @Column({ name: 'early_leave_grace_minutes', type: 'int', default: 5 })
  earlyLeaveGraceMinutes: number;

  @Column({ type: 'simple-json' })
  sessions: AttendanceSessionRule[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'allow_self_service_web', type: 'boolean', default: true })
  allowSelfServiceWeb: boolean;

  @Column({ name: 'allowed_ips', type: 'simple-json', nullable: true })
  allowedIps: string[] | null;

  @Column({ name: 'require_geofence', type: 'boolean', default: false })
  requireGeofence: boolean;

  @Column({ name: 'office_latitude', type: 'float', nullable: true })
  officeLatitude: number | null;

  @Column({ name: 'office_longitude', type: 'float', nullable: true })
  officeLongitude: number | null;

  @Column({ name: 'geofence_radius_meters', type: 'int', default: 100 })
  geofenceRadiusMeters: number;

  @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
  updatedAt: Date;
}
