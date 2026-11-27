import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { EmployeePosition } from './employee-position.entity';

@Entity('departments')
@Index('idx_departments_code', ['code'])
@Index('idx_departments_parent', ['parentId'])
export class Department {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    code: string; // 'ORTHO', 'FRONT_DESK', 'STORE_1'

    @Column({ type: 'varchar', length: 100 })
    name: string; // 'Orthopedics', 'Front Desk', 'Store 1'

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ name: 'parent_id', type: 'uuid', nullable: true })
    parentId: string | null;

    @ManyToOne(() => Department, (d) => d.children, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'parent_id' })
    parent: Department | null;

    @OneToMany(() => Department, (d) => d.parent)
    children: Department[];

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @OneToMany(() => EmployeePosition, (p) => p.department)
    positions: EmployeePosition[];
}
