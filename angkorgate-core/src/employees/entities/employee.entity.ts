import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EmployeePosition } from './employee-position.entity';
import { WorkSchedule } from './work-schedule.entity';

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

@Entity('employees')
@Index('idx_employees_status', ['employmentStatus'])
export class Employee {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid', unique: true, nullable: true })
    userId: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @Column({ name: 'employee_code', type: 'varchar', length: 30, unique: true })
    employeeCode: string;

    @Column({ name: 'full_name', type: 'varchar', length: 150 })
    fullName: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    gender: Gender | null;

    @Column({ name: 'date_of_birth', type: 'date', nullable: true })
    dateOfBirth: string | null;

    @Column({ name: 'national_id', type: 'varchar', length: 50, nullable: true })
    nationalId: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @Column({ type: 'text', nullable: true })
    address: string | null;

    @Column({ name: 'avatar_url', type: 'text', nullable: true })
    avatarUrl: string | null;

    @Column({ name: 'hire_date', type: 'date', nullable: true })
    hireDate: string | null;

    @Column({
        name: 'employment_status',
        type: 'varchar',
        length: 20,
        default: 'ACTIVE',
    })
    employmentStatus: EmploymentStatus;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: colTimestamptz(), nullable: true })
    deletedAt: Date | null;

    @OneToMany(() => EmployeePosition, (p) => p.employee)
    positions: EmployeePosition[];

    @OneToMany(() => WorkSchedule, (s) => s.employee)
    schedules: WorkSchedule[];
}