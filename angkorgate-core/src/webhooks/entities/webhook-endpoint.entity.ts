import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export type WebhookEventType =
    | 'customer.created'
    | 'employee.onboarded'
    | 'leave.approved';

@Entity('webhook_endpoints')
export class WebhookEndpoint {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'text' })
    url: string;

    @Column({ type: 'varchar', length: 128 })
    secret: string;

    @Column({ type: 'simple-json' })
    events: string[];

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;
}
