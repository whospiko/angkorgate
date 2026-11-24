import { colTimestamptz, colArrayText } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinTable,
    ManyToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Scope } from '../../scopes/entities/scope.entity';

@Entity('app_settings')
export class AppSetting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'app_code', type: 'varchar', length: 50, unique: true })
    appCode: string; // 'clinic-prod', 'internal-hr'

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description?: string | null;

    @Column({ name: 'client_secret', type: 'varchar', length: 255, nullable: true })
    clientSecret?: string | null;

    // Dual-secret rotation support with grace period
    @Column({ name: 'secondary_client_secret', type: 'varchar', length: 255, nullable: true })
    secondaryClientSecret?: string | null;

    @Column({ name: 'secondary_secret_expires_at', type: colTimestamptz(), nullable: true })
    secondarySecretExpiresAt?: Date | null;

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

    // Retained for backward compatibility
    @Column({ name: 'allowed_redirect_urls', type: 'jsonb', default: () => "'[]'" })
    allowedRedirectUrls: string[];

    // OIDC Core standard URLs
    @Column({ name: 'root_url', type: 'varchar', length: 255, nullable: true })
    rootUrl?: string | null;

    @Column({ name: 'home_url', type: 'varchar', length: 255, nullable: true })
    homeUrl?: string | null;

    @Column(colArrayText('valid_redirect_uris'))
    validRedirectUris: string[];

    @Column(colArrayText('valid_post_logout_redirect_uris'))
    validPostLogoutRedirectUris: string[];

    @Column(colArrayText('web_origins'))
    webOrigins: string[];

    // Capability settings (OIDC & OAuth 2.0 flows)
    @Column({ name: 'standard_flow_enabled', type: 'boolean', default: true })
    standardFlowEnabled: boolean; // Authorization Code Flow

    @Column({ name: 'implicit_flow_enabled', type: 'boolean', default: false })
    implicitFlowEnabled: boolean;

    @Column({ name: 'direct_access_grants_enabled', type: 'boolean', default: false })
    directAccessGrantsEnabled: boolean; // Resource Owner Password Flow

    @Column({ name: 'service_accounts_enabled', type: 'boolean', default: false })
    serviceAccountsEnabled: boolean; // Client Credentials Flow (M2M)

    @Column({ name: 'require_pkce', type: 'boolean', default: true })
    requirePkce: boolean;

    @Column({ name: 'is_public_client', type: 'boolean', default: false })
    isPublicClient: boolean; // Public (SPA/Mobile) vs Confidential (Backend)

    // Multi-tenancy foundation (Keycloak Realm equivalent)
    @Column({ name: 'realm_id', type: 'uuid', default: '00000000-0000-0000-0000-000000000000' })
    realmId: string;

    // Associated Client Scopes
    @ManyToMany(() => Scope, (scope) => scope.apps, { cascade: false })
    @JoinTable({
        name: 'app_scopes',
        joinColumn: { name: 'app_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'scope_id', referencedColumnName: 'id' },
    })
    allowedScopes: Scope[];

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;
}
