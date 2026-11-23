import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceOidcClientsAndScopes1700000013000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        // 1. Expand app_settings table with standard OIDC and Keycloak capability fields
        await q.query(`
            ALTER TABLE app_settings
            ADD COLUMN IF NOT EXISTS description VARCHAR(255),
            ADD COLUMN IF NOT EXISTS root_url VARCHAR(255),
            ADD COLUMN IF NOT EXISTS home_url VARCHAR(255),
            ADD COLUMN IF NOT EXISTS valid_redirect_uris TEXT[] NOT NULL DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS valid_post_logout_redirect_uris TEXT[] NOT NULL DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS web_origins TEXT[] NOT NULL DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS standard_flow_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS implicit_flow_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS direct_access_grants_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS service_accounts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS require_pkce BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS is_public_client BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS secondary_client_secret VARCHAR(255),
            ADD COLUMN IF NOT EXISTS secondary_secret_expires_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS realm_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
        `);

        // Migrate any existing allowed_redirect_urls to valid_redirect_uris
        await q.query(`
            UPDATE app_settings
            SET valid_redirect_uris = ARRAY(
                SELECT jsonb_array_elements_text(allowed_redirect_urls)
            )
            WHERE (valid_redirect_uris IS NULL OR cardinality(valid_redirect_uris) = 0)
              AND allowed_redirect_urls IS NOT NULL
              AND jsonb_array_length(allowed_redirect_urls) > 0;
        `);

        // 2. Create scopes table
        await q.query(`
            CREATE TABLE IF NOT EXISTS scopes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) UNIQUE NOT NULL,
                display_name VARCHAR(150),
                description TEXT,
                claims JSONB NOT NULL DEFAULT '[]',
                is_default BOOLEAN NOT NULL DEFAULT FALSE,
                realm_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        // 3. Create app_scopes relationship table
        await q.query(`
            CREATE TABLE IF NOT EXISTS app_scopes (
                app_id UUID NOT NULL REFERENCES app_settings(id) ON DELETE CASCADE,
                scope_id UUID NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
                is_optional BOOLEAN NOT NULL DEFAULT FALSE,
                PRIMARY KEY (app_id, scope_id)
            );
        `);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_app_scopes_app ON app_scopes(app_id);`);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_app_scopes_scope ON app_scopes(scope_id);`);

        // 4. Seed standard default OIDC scopes
        await q.query(`
            INSERT INTO scopes (name, display_name, description, claims, is_default)
            VALUES
                ('openid', 'OpenID', 'OpenID Connect subject identifier', '["sub"]'::jsonb, TRUE),
                ('profile', 'Profile', 'User basic profile data', '["name", "preferred_username", "given_name", "family_name"]'::jsonb, TRUE),
                ('email', 'Email', 'User email address and verification state', '["email", "email_verified"]'::jsonb, TRUE),
                ('phone', 'Phone', 'User phone number and verification state', '["phone", "phone_verified"]'::jsonb, FALSE),
                ('roles', 'Roles', 'Assigned application and realm roles', '["roles", "https://angkorgate.com/roles"]'::jsonb, TRUE),
                ('permissions', 'Permissions', 'Granular RBAC permission codes', '["permissions", "https://angkorgate.com/permissions"]'::jsonb, FALSE),
                ('offline_access', 'Offline Access', 'Refresh token for offline/background access', '[]'::jsonb, TRUE)
            ON CONFLICT (name) DO NOTHING;
        `);

        // 5. Associate all existing app_settings with default scopes
        await q.query(`
            INSERT INTO app_scopes (app_id, scope_id, is_optional)
            SELECT a.id, s.id, FALSE
            FROM app_settings a
            CROSS JOIN scopes s
            WHERE s.is_default = TRUE
            ON CONFLICT DO NOTHING;
        `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE IF EXISTS app_scopes;`);
        await q.query(`DROP TABLE IF EXISTS scopes;`);
        await q.query(`
            ALTER TABLE app_settings
            DROP COLUMN IF EXISTS description,
            DROP COLUMN IF EXISTS root_url,
            DROP COLUMN IF EXISTS home_url,
            DROP COLUMN IF EXISTS valid_redirect_uris,
            DROP COLUMN IF EXISTS valid_post_logout_redirect_uris,
            DROP COLUMN IF EXISTS web_origins,
            DROP COLUMN IF EXISTS standard_flow_enabled,
            DROP COLUMN IF EXISTS implicit_flow_enabled,
            DROP COLUMN IF EXISTS direct_access_grants_enabled,
            DROP COLUMN IF EXISTS service_accounts_enabled,
            DROP COLUMN IF EXISTS require_pkce,
            DROP COLUMN IF EXISTS is_public_client,
            DROP COLUMN IF EXISTS secondary_client_secret,
            DROP COLUMN IF EXISTS secondary_secret_expires_at,
            DROP COLUMN IF EXISTS realm_id;
        `);
    }
}
