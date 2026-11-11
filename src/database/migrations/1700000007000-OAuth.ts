import { MigrationInterface, QueryRunner } from 'typeorm';

export class OAuth1700000007000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
      CREATE TABLE oauth_providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        client_id TEXT,
        client_secret TEXT,
        scopes TEXT,
        extra_config JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

        await q.query(`
      CREATE TABLE oauth_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        email CITEXT,
        email_verified_at TIMESTAMPTZ,
        raw_profile JSONB,
        linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_login_at TIMESTAMPTZ,
        CONSTRAINT uq_oauth_provider_uid UNIQUE (provider, provider_user_id)
      );
    `);
        await q.query(`CREATE INDEX idx_oauth_user ON oauth_accounts(user_id);`);

        await q.query(`
      CREATE TABLE app_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        oauth_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        enabled_providers JSONB NOT NULL DEFAULT '[]',
        password_login_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        registration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        email_verification_required BOOLEAN NOT NULL DEFAULT TRUE,
        allowed_redirect_urls JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE app_settings;`);
        await q.query(`DROP TABLE oauth_accounts;`);
        await q.query(`DROP TABLE oauth_providers;`);
    }
}