import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrgHierarchyAndEmploymentType1700000022000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            ALTER TABLE departments
            ADD COLUMN IF NOT EXISTS parent_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL;
        `);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);`);

        await q.query(`
            ALTER TABLE employees
            ADD COLUMN IF NOT EXISTS manager_id UUID NULL REFERENCES employees(id) ON DELETE SET NULL;
        `);
        await q.query(`
            ALTER TABLE employees
            ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) NOT NULL DEFAULT 'FULL_TIME'
            CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'));
        `);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);`);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP INDEX IF EXISTS idx_employees_manager;`);
        await q.query(`ALTER TABLE employees DROP COLUMN IF EXISTS employment_type;`);
        await q.query(`ALTER TABLE employees DROP COLUMN IF EXISTS manager_id;`);

        await q.query(`DROP INDEX IF EXISTS idx_departments_parent;`);
        await q.query(`ALTER TABLE departments DROP COLUMN IF EXISTS parent_id;`);
    }
}
