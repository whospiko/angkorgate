import { colTimestamptz, colInet, colIdIncrement } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('login_attempts')
@Index('idx_login_attempts_identifier', ['emailPhone', 'createdAt'])
export class LoginAttempt {
    @PrimaryGeneratedColumn('increment', colIdIncrement())
    id: string;

    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    userId: string | null;

    @Column({ name: 'email_phone', type: 'varchar', length: 255, nullable: true })
    emailPhone: string | null;

    @Column({ type: 'boolean' })
    success: boolean;

    @Column({ name: 'ip_address', type: colInet(), nullable: true })
    ipAddress: string | null;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;
}