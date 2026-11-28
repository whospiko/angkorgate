import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

export type AttendanceSource = 'WEB' | 'KIOSK' | 'API';
export type AttendanceStatus = 'ON_TIME' | 'LATE';

@Entity('attendance_logs')
@Index('idx_attendance_emp', ['employeeId'])
@Index('idx_attendance_clockin', ['clockInAt'])
export class AttendanceLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'employee_id', type: 'uuid' })
    employeeId: string;

    @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employee_id' })
    employee: Employee;

    @Column({ name: 'clock_in_at', type: colTimestamptz() })
    clockInAt: Date;

    @Column({ name: 'clock_out_at', type: colTimestamptz(), nullable: true })
    clockOutAt: Date | null;

    @Column({ type: 'varchar', length: 20, default: 'WEB' })
    source: AttendanceSource;

    @Column({ type: 'varchar', length: 20, default: 'ON_TIME' })
    status: AttendanceStatus;

    @Column({ name: 'late_minutes', type: 'int', default: 0 })
    lateMinutes: number;

    @Column({ name: 'worked_minutes', type: 'int', nullable: true })
    workedMinutes: number | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;
}
