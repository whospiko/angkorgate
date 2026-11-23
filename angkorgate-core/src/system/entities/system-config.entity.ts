import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('system_configs')
export class SystemConfig {
    @PrimaryColumn({ type: 'varchar', length: 50, default: 'default' })
    id: string;

    @Column({ name: 'is_initialized', type: 'boolean', default: false })
    isInitialized: boolean;

    @Column({ name: 'app_name', type: 'varchar', length: 100, default: 'AngkorGate' })
    appName: string;

    @Column({ name: 'app_description', type: 'varchar', length: 255, nullable: true })
    appDescription?: string | null;

    @Column({ name: 'logo_url', type: 'text', nullable: true })
    logoUrl?: string | null;

    @Column({ name: 'favicon_url', type: 'text', nullable: true })
    faviconUrl?: string | null;

    @Column({ name: 'organization_name', type: 'varchar', length: 150, nullable: true })
    organizationName?: string | null;

    @Column({ name: 'support_email', type: 'varchar', length: 150, nullable: true })
    supportEmail?: string | null;

    @Column({ name: 'footer_text', type: 'varchar', length: 255, nullable: true })
    footerText?: string | null;

    @Column({ name: 'allowed_dashboard_roles', type: 'simple-array', nullable: true })
    allowedDashboardRoles?: string[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
