import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { WebhookEndpoint } from './webhook-endpoint.entity';

export type WebhookDeliveryStatus = 'PENDING' | 'DELIVERED' | 'FAILED';

@Entity('webhook_deliveries')
@Index('idx_webhook_deliveries_endpoint', ['endpointId'])
@Index('idx_webhook_deliveries_status', ['status'])
export class WebhookDelivery {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'endpoint_id', type: 'uuid' })
    endpointId: string;

    @ManyToOne(() => WebhookEndpoint, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'endpoint_id' })
    endpoint: WebhookEndpoint;

    @Column({ type: 'varchar', length: 80 })
    event: string;

    @Column({ type: 'simple-json' })
    payload: Record<string, unknown>;

    @Column({ type: 'varchar', length: 128 })
    signature: string;

    @Column({ type: 'varchar', length: 20, default: 'PENDING' })
    status: WebhookDeliveryStatus;

    @Column({ name: 'status_code', type: 'int', nullable: true })
    statusCode: number | null;

    @Column({ name: 'response_body', type: 'text', nullable: true })
    responseBody: string | null;

    @Column({ type: 'int', default: 0 })
    attempts: number;

    @Column({ name: 'delivered_at', type: colTimestamptz(), nullable: true })
    deliveredAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;
}
