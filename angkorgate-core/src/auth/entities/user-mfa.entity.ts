import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_mfa')
export class UserMfa {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid', unique: true })
    userId: string;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    /** AES-256-GCM encrypted TOTP secret (base32). Never store plaintext. */
    @Column({ name: 'secret_encrypted', type: 'text' })
    secretEncrypted: string;

    /** false until user proves they can generate a valid code */
    @Column({ name: 'is_enabled', type: 'boolean', default: false })
    isEnabled: boolean;

    @Column({ name: 'enabled_at', type: colTimestamptz(), nullable: true })
    enabledAt: Date | null;

    @Column({ name: 'last_used_at', type: colTimestamptz(), nullable: true })
    lastUsedAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;
}