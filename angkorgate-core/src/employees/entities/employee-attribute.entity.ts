import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { EmployeePosition } from './employee-position.entity';

/**
 * Domain-specific fields live HERE, not in separate tables.
 *
 * Clinic:  license_number = "DEN-12345", consultation_fee = 500
 * Hotel:   languages = ["EN","KH"], shift_lead = true
 * POS:     pos_terminal_id = "T-04", drawer_code = "D-07"
 *
 * `value` is JSONB so it can hold string, number, boolean, array, object.
 */
@Entity('employee_attributes')
@Unique('uq_attribute_position_key', ['positionId', 'key'])
@Index('idx_attributes_position', ['positionId'])
export class EmployeeAttribute {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'position_id', type: 'uuid' })
    positionId: string;

    @ManyToOne(() => EmployeePosition, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'position_id' })
    position: EmployeePosition;

    @Column({ type: 'varchar', length: 100 })
    key: string; // 'license_number'

    @Column({ type: 'jsonb' })
    value: unknown; // "DEN-12345" or 500 or ["EN","KH"]

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}