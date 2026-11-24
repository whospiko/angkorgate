import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from './employee.entity';
import { Department } from './department.entity';

@Entity('work_schedules')
@Check(`"day_of_week" BETWEEN 0 AND 6`)
@Check(`"start_time" < "end_time"`)
@Index('idx_schedules_employee_day', ['employeeId', 'dayOfWeek'])
export class WorkSchedule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'employee_id', type: 'uuid' })
    employeeId: string;

    @ManyToOne(() => Employee, (e) => e.schedules, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employee_id' })
    employee: Employee;

    @Column({ name: 'department_id', type: 'uuid', nullable: true })
    departmentId: string | null;

    @ManyToOne(() => Department, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'department_id' })
    department: Department | null;

    @Column({ name: 'day_of_week', type: 'smallint' })
    dayOfWeek: number; // 0=Sun ... 6=Sat

    @Column({ name: 'start_time', type: 'time' })
    startTime: string; // '08:00'

    @Column({ name: 'end_time', type: 'time' })
    endTime: string; // '17:00'

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;
}