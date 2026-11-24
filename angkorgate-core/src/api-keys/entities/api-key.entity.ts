import { colTimestamptz } from '../../common/utils/db-types.util';
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
import { AppSetting } from '../../apps/entities/app-setting.entity';

export type ApiKeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

@Entity('api_keys')
@Index('idx_api_keys_hash', ['keyHash'], { unique: true })
@Index('idx_api_keys_user', ['userId'])
@Index('idx_api_keys_status', ['status'])
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ name: 'key_prefix', type: 'varchar', length: 20 })
    keyPrefix: string;

    @Column({ name: 'key_hash', type: 'varchar', length: 64, unique: true })
    keyHash: string;

    @Column({ name: 'last_four', type: 'varchar', length: 4 })
    lastFour: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'app_code', type: 'varchar', length: 50, nullable: true })
    appCode: string | null;

    @ManyToOne(() => AppSetting, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'app_code', referencedColumnName: 'appCode' })
    app: AppSetting | null;

    @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
    status: ApiKeyStatus;

    @Column({ name: 'allowed_resources', type: 'text', array: true, default: ['customers', 'employees'] })
    allowedResources: string[];

    /**
     * Map of resource to allowed HTTP methods, e.g.:
     * { "customers": ["GET"], "employees": ["GET", "POST"] }
     */
    @Column({
        name: 'allowed_methods',
        type: 'jsonb',
        default: () => '\'{"customers":["GET"],"employees":["GET"]}\'',
    })
    allowedMethods: Record<string, string[]>;

    @Column({ type: 'text', array: true, default: ['customer:read', 'employee:read'] })
    permissions: string[];

    /**
     * Map of resource to allowed response fields, e.g.:
     * { "customers": ["id", "customerCode", "fullName", "gender"] }
     * Empty array or omitted means all fields allowed.
     */
    @Column({
        name: 'field_projections',
        type: 'jsonb',
        default: () => '\'{}\'',
    })
    fieldProjections: Record<string, string[]>;

    @Column({ name: 'rate_limit', type: 'int', default: 120 })
    rateLimit: number;

    @Column({ name: 'expires_at', type: colTimestamptz(), nullable: true })
    expiresAt: Date | null;

    @Column({ name: 'last_used_at', type: colTimestamptz(), nullable: true })
    lastUsedAt: Date | null;

    @Column({ name: 'total_requests', type: 'bigint', default: 0 })
    totalRequests: number;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;
}
