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
    UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

/**
 * Domain-specific customer fields go HERE.
 *
 * Clinic (type=PATIENT):    blood_type, allergies, medical_notes
 * Hotel  (type=GUEST):      passport_number, loyalty_tier, preferences
 * POS    (type=CUSTOMER):   loyalty_points, tax_exempt, preferred_payment
 */
@Entity('customer_attributes')
@Unique('uq_customer_attr_key', ['customerId', 'key'])
@Index('idx_customer_attrs_customer', ['customerId'])
export class CustomerAttribute {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'customer_id', type: 'uuid' })
    customerId: string;

    @ManyToOne(() => Customer, (c) => c.attributes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @Column({ type: 'varchar', length: 100 })
    key: string; // 'blood_type'

    @Column({ type: 'jsonb' })
    value: unknown; // "O+" | 1000 | true | ["peanuts"] | {...}

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;
}