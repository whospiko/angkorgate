import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { Employee } from './employee.entity';

@Entity('schedule_overrides')
@Unique('uq_schedule_override_emp_date', ['employeeId', 'date'])
@Index('idx_sched_overrides_emp_date', ['employeeId', 'date'])
export class ScheduleOverride {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'employee_id', type: 'uuid' })
    employeeId: string;

    @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employee_id' })
    employee: Employee;

    @Column({ type: 'date' })
    date: string;

    @Column({ name: 'is_available', type: 'boolean', default: false })
    isAvailable: boolean;

    @Column({ name: 'start_time', type: 'time', nullable: true })
    startTime: string | null;

    @Column({ name: 'end_time', type: 'time', nullable: true })
    endTime: string | null;

    @Column({ type: 'varchar', length: 200, nullable: true })
    reason: string | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;
}
