import { colTimestamptz, isSqlite } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_passkeys')
export class UserPasskey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'credential_id', type: 'varchar', length: 512, unique: true })
    @Index()
    credentialId: string;

    @Column({ name: 'public_key', type: 'text' })
    publicKey: string;

    @Column({ name: 'counter', type: isSqlite() ? 'integer' : 'bigint', default: 0 })
    counter: number;

    @Column({ name: 'device_type', type: 'varchar', length: 64, default: 'singleDevice' })
    deviceType: string;

    @Column({ name: 'backed_up', type: 'boolean', default: false })
    backedUp: boolean;

    @Column({ name: 'transports', type: 'text', nullable: true })
    transports: string | null;

    @Column({ name: 'friendly_name', type: 'varchar', length: 128, default: 'Passkey' })
    friendlyName: string;

    @Column({ name: 'aaguid', type: 'varchar', length: 64, nullable: true })
    aaguid: string | null;

    @Column({ name: 'last_used_at', type: colTimestamptz(), nullable: true })
    lastUsedAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;
}
