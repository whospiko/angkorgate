import { MigrationInterface, QueryRunner } from 'typeorm';

export class SoftDeleteUsersAndNullableEmployeeUser1700000016000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        // 1. Add deleted_at to users table if not exists
        await q.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
        `);

        // 2. Drop existing blanket unique constraints on email and phone
        await q.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;`);
        await q.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;`);

        // 3. Create partial unique indexes (uniqueness strictly enforced only among non-deleted rows)
        await q.query(`DROP INDEX IF EXISTS idx_users_email_unique;`);
        await q.query(`DROP INDEX IF EXISTS idx_users_phone_unique;`);

        await q.query(`
            CREATE UNIQUE INDEX idx_users_email_unique
            ON users (email)
            WHERE deleted_at IS NULL;
        `);

        await q.query(`
            CREATE UNIQUE INDEX idx_users_phone_unique
            ON users (phone)
            WHERE deleted_at IS NULL;
        `);

        // 4. Update employees table: allow NULL user_id and set ON DELETE SET NULL
        await q.query(`
            ALTER TABLE employees
            ALTER COLUMN user_id DROP NOT NULL;
        `);

        await q.query(`ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey;`);
        await q.query(`
            ALTER TABLE employees
            ADD CONSTRAINT employees_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP INDEX IF EXISTS idx_users_email_unique;`);
        await q.query(`DROP INDEX IF EXISTS idx_users_phone_unique;`);
        await q.query(`ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);`);
        await q.query(`ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);`);
        await q.query(`ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;`);

        await q.query(`ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey;`);
        await q.query(`
            ALTER TABLE employees
            ADD CONSTRAINT employees_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
        `);
    }
}
