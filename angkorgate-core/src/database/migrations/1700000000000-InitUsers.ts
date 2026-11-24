import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitUsers1700000000000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
        await q.query(`CREATE EXTENSION IF NOT EXISTS "citext";`);

        await q.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email CITEXT,
        phone VARCHAR(20),
        password_hash TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
        last_login_at TIMESTAMPTZ,
        failed_attempts INT NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT user_has_login CHECK (email IS NOT NULL OR phone IS NOT NULL)
      );
    `);

        await q.query(`
      CREATE UNIQUE INDEX idx_users_email_unique ON users (email) WHERE deleted_at IS NULL;
    `);
        await q.query(`
      CREATE UNIQUE INDEX idx_users_phone_unique ON users (phone) WHERE deleted_at IS NULL;
    `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE users;`);
    }
}