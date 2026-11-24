import { colTimestamptz, colInet } from '../../common/utils/db-types.util';
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

@Entity('password_reset_tokens')
@Index('idx_prt_user_active', ['userId', 'usedAt'])
export class PasswordResetToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'token_hash', type: 'text', unique: true })
    tokenHash: string;

    @Column({ name: 'expires_at', type: colTimestamptz() })
    expiresAt: Date;

    @Column({ name: 'used_at', type: colTimestamptz(), nullable: true })
    usedAt: Date | null;

    @Column({ name: 'ip_address', type: colInet(), nullable: true })
    ipAddress: string | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;
}