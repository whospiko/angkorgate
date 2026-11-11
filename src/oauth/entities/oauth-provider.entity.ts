import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('oauth_providers')
export class OauthProvider {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    code: string; // 'google' | 'apple'

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ name: 'is_active', type: 'boolean', default: false })
    isActive: boolean;

    @Column({ name: 'client_id', type: 'text', nullable: true })
    clientId: string | null;

    @Column({ name: 'client_secret', type: 'text', nullable: true })
    clientSecret: string | null;

    @Column({ type: 'text', nullable: true })
    scopes: string | null;

    @Column({ name: 'extra_config', type: 'jsonb', nullable: true })
    extraConfig: Record<string, unknown> | null; // Apple teamId, keyId, etc.

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}