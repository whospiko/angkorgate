import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'citext', unique: true, nullable: true })
    email: string | null;

    @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
    phone: string | null;

    @Column({ name: 'password_hash', type: 'text' })
    passwordHash: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @Column({ name: 'is_email_verified', type: 'boolean', default: false })
    isEmailVerified: boolean;

    @Column({ name: 'is_phone_verified', type: 'boolean', default: false })
    isPhoneVerified: boolean;

    @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
    lastLoginAt: Date | null;

    @Column({ name: 'failed_attempts', type: 'int', default: 0 })
    failedAttempts: number;

    @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
    lockedUntil: Date | null;

    @Column({ name: 'must_change_password', type: 'boolean', default: false })
    mustChangePassword: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}