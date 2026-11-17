import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('app_settings')
export class AppSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'app_code', type: 'varchar', length: 50, unique: true })
    appCode: string; // 'clinic-prod', 'internal-hr'

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ name: 'oauth_enabled', type: 'boolean', default: false })
    oauthEnabled: boolean;

    @Column({ name: 'enabled_providers', type: 'jsonb', default: () => "'[]'" })
    enabledProviders: string[]; // ['google', 'apple']

    @Column({ name: 'password_login_enabled', type: 'boolean', default: true })
    passwordLoginEnabled: boolean;

    @Column({ name: 'registration_enabled', type: 'boolean', default: true })
    registrationEnabled: boolean;

    @Column({ name: 'email_verification_required', type: 'boolean', default: true })
    emailVerificationRequired: boolean;

    @Column({ name: 'allowed_redirect_urls', type: 'jsonb', default: () => "'[]'" })
    allowedRedirectUrls: string[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}