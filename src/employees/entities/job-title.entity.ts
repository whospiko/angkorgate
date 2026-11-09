import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { EmployeePosition } from './employee-position.entity';

@Entity('job_titles')
export class JobTitle {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    code: string; // 'DOCTOR', 'CASHIER', 'CONCIERGE'

    @Column({ type: 'varchar', length: 100 })
    name: string; // 'Doctor', 'Cashier', 'Concierge'

    @Column({ type: 'text', nullable: true })
    description: string | null;

    /** Which app/industry this title belongs to — helps filter seeds */
    @Column({ type: 'varchar', length: 50, nullable: true })
    category: string | null; // 'CLINIC', 'HOTEL', 'POS', 'GENERAL'

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @OneToMany(() => EmployeePosition, (p) => p.jobTitle)
    positions: EmployeePosition[];
}