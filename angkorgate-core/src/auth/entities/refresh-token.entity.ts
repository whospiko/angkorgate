import { colTimestamptz, colInet } from '../../common/utils/db-types.util';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ name: 'family_id', type: 'uuid', nullable: true })
    familyId: string | null;

    @Column({ name: 'token_hash', type: 'text', unique: true })
    tokenHash: string;

    @Column({ name: 'replaced_by_id', type: 'uuid', nullable: true })
    replacedById: string | null;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string | null;

    @Column({ name: 'ip_address', type: colInet(), nullable: true })
    ipAddress: string | null;

    @Column({ name: 'last_used_at', type: colTimestamptz(), nullable: true })
    lastUsedAt: Date | null;

    @Column({ name: 'expires_at', type: colTimestamptz() })
    expiresAt: Date;

    @Column({ name: 'revoked_at', type: colTimestamptz(), nullable: true })
    revokedAt: Date | null;

    @Column({ name: 'revoked_reason', type: 'varchar', length: 64, nullable: true })
    revokedReason: string | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}