import { colTimestamptz, colCitext } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type PasswordlessChannel = 'magic_link' | 'email_otp' | 'sms_otp';

@Entity('passwordless_tokens')
@Index('idx_pwl_identifier_channel', ['identifier', 'channel', 'usedAt'])
@Index('idx_pwl_user_channel', ['userId', 'channel', 'usedAt'])
export class PasswordlessToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', length: 32 })
    channel: PasswordlessChannel;

    @Column({ type: colCitext(), length: 255 })
    identifier: string;

    @Column({ name: 'token_hash', type: 'text' })
    tokenHash: string;

    @Column({ type: 'int', default: 0 })
    attempts: number;

    @Column({ name: 'max_attempts', type: 'int', default: 5 })
    maxAttempts: number;

    @Column({ name: 'redirect_url', type: 'text', nullable: true })
    redirectUrl: string | null;

    @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
    ipAddress: string | null;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string | null;

    @Column({ name: 'expires_at', type: colTimestamptz() })
    expiresAt: Date;

    @Column({ name: 'used_at', type: colTimestamptz(), nullable: true })
    usedAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;
}
