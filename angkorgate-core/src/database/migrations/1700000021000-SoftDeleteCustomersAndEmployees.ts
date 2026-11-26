import { MigrationInterface, QueryRunner } from 'typeorm';

export class SoftDeleteCustomersAndEmployees1700000021000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        // 1. Add deleted_at to customers
        await q.query(`
            ALTER TABLE customers
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
        `);

        await q.query(`ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_id_key;`);
        await q.query(`ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_customer_code_key;`);
        await q.query(`DROP INDEX IF EXISTS idx_customers_user_unique;`);
        await q.query(`DROP INDEX IF EXISTS idx_customers_code_unique;`);

        await q.query(`
            CREATE UNIQUE INDEX idx_customers_user_unique
            ON customers (user_id)
            WHERE deleted_at IS NULL AND user_id IS NOT NULL;
        `);
        await q.query(`
            CREATE UNIQUE INDEX idx_customers_code_unique
            ON customers (customer_code)
            WHERE deleted_at IS NULL;
        `);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);`);

        // 2. Add deleted_at to employees
        await q.query(`
            ALTER TABLE employees
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
        `);

        await q.query(`ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_user_id_key;`);
        await q.query(`ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_employee_code_key;`);
        await q.query(`DROP INDEX IF EXISTS idx_employees_user_unique;`);
        await q.query(`DROP INDEX IF EXISTS idx_employees_code_unique;`);

        await q.query(`
            CREATE UNIQUE INDEX idx_employees_user_unique
            ON employees (user_id)
            WHERE deleted_at IS NULL AND user_id IS NOT NULL;
        `);
        await q.query(`
            CREATE UNIQUE INDEX idx_employees_code_unique
            ON employees (employee_code)
            WHERE deleted_at IS NULL;
        `);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees(deleted_at);`);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP INDEX IF EXISTS idx_employees_deleted_at;`);
        await q.query(`DROP INDEX IF EXISTS idx_employees_code_unique;`);
        await q.query(`DROP INDEX IF EXISTS idx_employees_user_unique;`);
        await q.query(`ALTER TABLE employees DROP COLUMN IF EXISTS deleted_at;`);
        await q.query(`ALTER TABLE employees ADD CONSTRAINT employees_user_id_key UNIQUE (user_id);`);
        await q.query(`ALTER TABLE employees ADD CONSTRAINT employees_employee_code_key UNIQUE (employee_code);`);

        await q.query(`DROP INDEX IF EXISTS idx_customers_deleted_at;`);
        await q.query(`DROP INDEX IF EXISTS idx_customers_code_unique;`);
        await q.query(`DROP INDEX IF EXISTS idx_customers_user_unique;`);
        await q.query(`ALTER TABLE customers DROP COLUMN IF EXISTS deleted_at;`);
        await q.query(`ALTER TABLE customers ADD CONSTRAINT customers_user_id_key UNIQUE (user_id);`);
        await q.query(`ALTER TABLE customers ADD CONSTRAINT customers_customer_code_key UNIQUE (customer_code);`);
    }
}
