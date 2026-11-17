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

@Entity('mfa_backup_codes')
@Index('idx_backup_codes_user', ['userId'])
export class MfaBackupCode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    /** bcrypt hash of the backup code — never store plaintext */
    @Column({ name: 'code_hash', type: 'text' })
    codeHash: string;

    @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
    usedAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}