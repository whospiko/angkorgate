import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { AppSetting } from '../../apps/entities/app-setting.entity';

@Entity('scopes')
export class Scope {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    name: string; // 'openid', 'profile', 'email', 'roles'

    @Column({ name: 'display_name', type: 'varchar', length: 150, nullable: true })
    displayName: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'jsonb', default: () => "'[]'" })
    claims: string[]; // ['email', 'email_verified']

    @Column({ name: 'is_default', type: 'boolean', default: false })
    isDefault: boolean;

    @Column({ name: 'realm_id', type: 'uuid', default: '00000000-0000-0000-0000-000000000000' })
    realmId: string;

    @ManyToMany(() => AppSetting, (app) => app.allowedScopes)
    apps: AppSetting[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
