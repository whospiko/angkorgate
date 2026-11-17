import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitRbac1700000001000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
      CREATE TABLE roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

        await q.query(`
      CREATE TABLE permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(100) UNIQUE NOT NULL,
        resource VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description TEXT,
        UNIQUE (resource, action)
      );
    `);

        await q.query(`
      CREATE TABLE role_permissions (
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );
    `);

        await q.query(`
      CREATE TABLE user_roles (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        assigned_by UUID REFERENCES users(id),
        PRIMARY KEY (user_id, role_id)
      );
    `);

        await q.query(`
      CREATE TABLE user_permission_overrides (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        effect VARCHAR(10) NOT NULL CHECK (effect IN ('GRANT','REVOKE')),
        PRIMARY KEY (user_id, permission_id)
      );
    `);

        await q.query(`CREATE INDEX idx_user_roles_user ON user_roles(user_id);`);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE user_permission_overrides;`);
        await q.query(`DROP TABLE user_roles;`);
        await q.query(`DROP TABLE role_permissions;`);
        await q.query(`DROP TABLE permissions;`);
        await q.query(`DROP TABLE roles;`);
    }
}