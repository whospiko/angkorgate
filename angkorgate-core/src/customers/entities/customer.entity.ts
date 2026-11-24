import { colTimestamptz, colCitext } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CustomerContact } from './customer-contact.entity';
import { CustomerAttribute } from './customer-attribute.entity';
import { Expose } from 'class-transformer';

export type CustomerType = 'PATIENT' | 'GUEST' | 'CUSTOMER';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

@Entity('customers')
@Index('idx_customers_type', ['type'])
@Index('idx_customers_name', ['fullName'])
@Index('idx_customers_phone', ['phone'])
@Index('idx_customers_status', ['status'])
export class Customer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'customer_code', type: 'varchar', length: 30, unique: true })
    customerCode: string; // PAT-0001, GST-0001, CUS-0001 — per-type prefix

    /** Portal opt-in: NULL = no account, works for walk-in customers too */
    @Column({ name: 'user_id', type: 'uuid', nullable: true, unique: true })
    userId: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @Column({ type: 'varchar', length: 20, default: 'CUSTOMER' })
    type: CustomerType; // 'PATIENT' | 'GUEST' | 'CUSTOMER'

    @Column({ name: 'full_name', type: 'varchar', length: 150 })
    fullName: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    gender: Gender | null;

    @Column({ name: 'date_of_birth', type: 'date' })
    dateOfBirth: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @Column({ type: colCitext(), nullable: true })
    email: string | null;

    @Column({ type: 'text', nullable: true })
    address: string | null;

    @Column({ name: 'national_id', type: 'varchar', length: 50, nullable: true })
    nationalId: string | null;

    @Column({ name: 'avatar_url', type: 'text', nullable: true })
    avatarUrl: string | null;

    @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
    status: CustomerStatus;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;

    @OneToMany(() => CustomerContact, (c) => c.customer)
    contacts: CustomerContact[];

    @OneToMany(() => CustomerAttribute, (a) => a.customer)
    attributes: CustomerAttribute[];

    /**
     * Computed at runtime
     * - Clinic: triggers guardian requirement.
     * - Hotel: alerts front desk.
     * - POS: age-restricted sales.
     */
    @Expose() // Uncomment if using class-transformer to include in JSON
    get isMinor(): boolean {
        if (!this.dateOfBirth) return false;

        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();

        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age < 18;
    }
}