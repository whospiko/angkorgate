import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitApiKeysAndDeveloperRole1700000015000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        // 1. Create api_keys table
        await q.query(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                key_prefix VARCHAR(20) NOT NULL,
                key_hash VARCHAR(64) NOT NULL UNIQUE,
                last_four VARCHAR(4) NOT NULL,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                app_code VARCHAR(50) NULL REFERENCES app_settings(app_code) ON DELETE SET NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                allowed_resources TEXT[] NOT NULL DEFAULT ARRAY['customers', 'employees'],
                allowed_methods JSONB NOT NULL DEFAULT '{"customers":["GET"],"employees":["GET"]}'::jsonb,
                permissions TEXT[] NOT NULL DEFAULT ARRAY['customer:read', 'employee:read'],
                field_projections JSONB NOT NULL DEFAULT '{}'::jsonb,
                rate_limit INT NOT NULL DEFAULT 120,
                expires_at TIMESTAMPTZ NULL,
                last_used_at TIMESTAMPTZ NULL,
                total_requests BIGINT NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        await q.query(`
            CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
            CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
            CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
        `);

        // 2. Insert DEVELOPER role if not exists
        await q.query(`
            INSERT INTO roles (code, name, description, is_system)
            VALUES ('DEVELOPER', 'Developer', 'API Key management, API access and third-party integrations', TRUE)
            ON CONFLICT (code) DO NOTHING;
        `);

        // 3. Insert apikey permissions if not exists
        const permissions = [
            { code: 'apikey:read', resource: 'apikey', action: 'read', desc: 'Read API keys and usage statistics' },
            { code: 'apikey:write', resource: 'apikey', action: 'write', desc: 'Create and configure API keys' },
            { code: 'apikey:delete', resource: 'apikey', action: 'delete', desc: 'Revoke and delete API keys' },
        ];

        for (const p of permissions) {
            await q.query(`
                INSERT INTO permissions (code, resource, action, description)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (code) DO NOTHING;
            `, [p.code, p.resource, p.action, p.desc]);
        }

        // 4. Map permissions to ADMIN (all permissions) and DEVELOPER
        const adminPerms = ['apikey:read', 'apikey:write', 'apikey:delete'];
        for (const perm of adminPerms) {
            await q.query(`
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id
                FROM roles r, permissions p
                WHERE r.code = 'ADMIN' AND p.code = $1
                ON CONFLICT DO NOTHING;
            `, [perm]);
        }

        const devPerms = [
            'apikey:read',
            'apikey:write',
            'apikey:delete',
            'customer:read',
            'customer:write',
            'employee:read',
            'employee:write',
            'app:read',
        ];

        for (const perm of devPerms) {
            await q.query(`
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id
                FROM roles r, permissions p
                WHERE r.code = 'DEVELOPER' AND p.code = $1
                ON CONFLICT DO NOTHING;
            `, [perm]);
        }

        // 5. Update system_configs allowed_dashboard_roles to include DEVELOPER
        await q.query(`
            UPDATE system_configs
            SET allowed_dashboard_roles = CASE
                WHEN allowed_dashboard_roles IS NULL THEN 'ADMIN,DEVELOPER'
                WHEN allowed_dashboard_roles NOT LIKE '%DEVELOPER%' THEN allowed_dashboard_roles || ',DEVELOPER'
                ELSE allowed_dashboard_roles
            END;
        `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE IF EXISTS api_keys;`);
        await q.query(`DELETE FROM permissions WHERE code IN ('apikey:read', 'apikey:write', 'apikey:delete');`);
        await q.query(`DELETE FROM roles WHERE code = 'DEVELOPER';`);
    }
}
