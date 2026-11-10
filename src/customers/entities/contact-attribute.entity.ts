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
import { CustomerContact } from './customer-contact.entity';

/**
 * Domain-specific contact fields (usually empty; sometimes useful).
 * Hotel: 'is_emergency_contact' = true
 * Clinic: 'can_pickup_minor' = true, 'id_verified' = true
 */
@Entity('contact_attributes')
@Unique('uq_contact_attr_key', ['contactId', 'key'])
@Index('idx_contact_attrs_contact', ['contactId'])
export class ContactAttribute {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'contact_id', type: 'uuid' })
    contactId: string;

    @ManyToOne(() => CustomerContact, (c) => c.attributes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'contact_id' })
    contact: CustomerContact;

    @Column({ type: 'varchar', length: 100 })
    key: string;

    @Column({ type: 'jsonb' })
    value: unknown;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}