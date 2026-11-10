import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { Customer } from './customer.entity';
import { ContactAttribute } from './contact-attribute.entity';

/**
 * A contact person linked to a customer.
 * Clinic: guardian (Mother, Father, Spouse)
 * Hotel: emergency contact, travel companion
 * POS: family, colleague
 *
 * Note: contacts are per-customer. The same person linked to two customers
 * (e.g. mother of two children) appears twice — intentional, since the
 * relationship itself is per-customer.
 */
@Entity('customer_contacts')
@Unique('uq_customer_contact_phone', ['customerId', 'phone'])
@Index('idx_contacts_customer', ['customerId'])
export class CustomerContact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'customer_id', type: 'uuid' })
    customerId: string;

    @ManyToOne(() => Customer, (c) => c.contacts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @Column({ name: 'full_name', type: 'varchar', length: 150 })
    fullName: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    relationship: string | null; // 'Mother', 'Emergency Contact', 'Colleague'

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @Column({ type: 'citext', nullable: true })
    email: string | null;

    @Column({ type: 'text', nullable: true })
    address: string | null;

    @Column({ name: 'is_primary', type: 'boolean', default: false })
    isPrimary: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @OneToMany(() => ContactAttribute, (a) => a.contact)
    attributes: ContactAttribute[];
}