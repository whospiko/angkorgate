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

@Entity('email_change_tokens')
@Index('idx_email_change_user_active', ['userId', 'usedAt'])
export class EmailChangeToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    /** The email they want to change TO (not their current one) */
    @Column({ name: 'new_email', type: 'citext' })
    newEmail: string;

    /** Hash of the confirmation token sent to `newEmail` */
    @Column({ name: 'token_hash', type: 'text', unique: true })
    tokenHash: string;

    @Column({ name: 'expires_at', type: 'timestamptz' })
    expiresAt: Date;

    @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
    usedAt: Date | null;

    @Column({ name: 'requested_ip', type: 'inet', nullable: true })
    requestedIp: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}