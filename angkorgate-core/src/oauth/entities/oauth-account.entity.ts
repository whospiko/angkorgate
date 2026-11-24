import { colTimestamptz, colCitext } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('oauth_accounts')
@Unique('uq_oauth_provider_uid', ['provider', 'providerUserId'])
@Index('idx_oauth_user', ['userId'])
export class OauthAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', length: 50 })
    provider: string; // 'google' | 'apple'

    @Column({ name: 'provider_user_id', type: 'varchar', length: 255 })
    providerUserId: string; // Google's `sub`

    @Column({ type: colCitext(), nullable: true })
    email: string | null;

    @Column({ name: 'email_verified_at', type: colTimestamptz(), nullable: true })
    emailVerifiedAt: Date | null;

    @Column({ name: 'raw_profile', type: 'jsonb', nullable: true })
    rawProfile: Record<string, unknown> | null;

    @CreateDateColumn({ name: 'linked_at', type: colTimestamptz() })
    linkedAt: Date;

    @Column({ name: 'last_login_at', type: colTimestamptz(), nullable: true })
    lastLoginAt: Date | null;
}