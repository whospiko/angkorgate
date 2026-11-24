import { colTimestamptz, colCitext } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: colCitext(), nullable: true })
    email: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @Column({ name: 'password_hash', type: 'text' })
    passwordHash: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @Column({ name: 'is_email_verified', type: 'boolean', default: false })
    isEmailVerified: boolean;

    @Column({ name: 'is_phone_verified', type: 'boolean', default: false })
    isPhoneVerified: boolean;

    @Column({ name: 'last_login_at', type: colTimestamptz(), nullable: true })
    lastLoginAt: Date | null;

    @Column({ name: 'failed_attempts', type: 'int', default: 0 })
    failedAttempts: number;

    @Column({ name: 'locked_until', type: colTimestamptz(), nullable: true })
    lockedUntil: Date | null;

    @Column({ name: 'must_change_password', type: 'boolean', default: false })
    mustChangePassword: boolean;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: colTimestamptz(), nullable: true })
    deletedAt: Date | null;
}