import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
@Index('idx_audit_entity', ['entity', 'entityId'])
export class AuditLog {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: string;

    @Column({ name: 'actor_id', type: 'uuid', nullable: true })
    actorId: string | null;

    @Column({ type: 'varchar', length: 100 })
    action: string; // 'patient.create', 'user.disable', 'role.assign'

    @Column({ type: 'varchar', length: 50 })
    entity: string; // 'patient', 'user', 'role'

    @Column({ name: 'entity_id', type: 'uuid', nullable: true })
    entityId: string | null;

    @Column({ name: 'old_value', type: 'jsonb', nullable: true })
    oldValue: Record<string, unknown> | null;

    @Column({ name: 'new_value', type: 'jsonb', nullable: true })
    newValue: Record<string, unknown> | null;

    @Column({ name: 'ip_address', type: 'inet', nullable: true })
    ipAddress: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}