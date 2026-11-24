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
import { Department } from './department.entity';
import { JobTitle } from './job-title.entity';

/**
 * An employee can hold MULTIPLE positions:
 *  - Doctor at Orthopedics (primary)
 *  - Doctor at General Medicine (secondary)
 *  - Hotel employee: Concierge at Front Desk + Night Auditor
 */
@Entity('employee_positions')
@Unique('uq_employee_position', ['employeeId', 'jobTitleId', 'departmentId'])
@Index('idx_positions_employee', ['employeeId'])
export class EmployeePosition {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'employee_id', type: 'uuid' })
    employeeId: string;

    @ManyToOne(() => Employee, (e) => e.positions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employee_id' })
    employee: Employee;

    @Column({ name: 'job_title_id', type: 'uuid' })
    jobTitleId: string;

    @ManyToOne(() => JobTitle, (j) => j.positions, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'job_title_id' })
    jobTitle: JobTitle;

    @Column({ name: 'department_id', type: 'uuid', nullable: true })
    departmentId: string | null;

    @ManyToOne(() => Department, (d) => d.positions, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'department_id' })
    department: Department | null;

    @Column({ name: 'is_primary', type: 'boolean', default: false })
    isPrimary: boolean;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate: string | null;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate: string | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;
}