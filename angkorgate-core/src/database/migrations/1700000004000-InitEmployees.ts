import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitEmployees1700000004000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
      CREATE TABLE departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

        await q.query(`
      CREATE TABLE job_titles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
        await q.query(`CREATE INDEX idx_job_titles_category ON job_titles(category);`);

        await q.query(`
      CREATE TABLE employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
        employee_code VARCHAR(30) UNIQUE NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        gender VARCHAR(10) CHECK (gender IN ('MALE','FEMALE','OTHER')),
        date_of_birth DATE,
        national_id VARCHAR(50),
        phone VARCHAR(20),
        address TEXT,
        avatar_url TEXT,
        hire_date DATE,
        employment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
          CHECK (employment_status IN ('ACTIVE','ON_LEAVE','RESIGNED','TERMINATED')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
        await q.query(`CREATE INDEX idx_employees_status ON employees(employment_status);`);

        await q.query(`
      CREATE TABLE employee_positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        job_title_id UUID NOT NULL REFERENCES job_titles(id) ON DELETE RESTRICT,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_employee_position UNIQUE (employee_id, job_title_id, department_id)
      );
    `);
        await q.query(`CREATE INDEX idx_positions_employee ON employee_positions(employee_id);`);
        await q.query(`
      CREATE UNIQUE INDEX uq_one_primary_per_employee
        ON employee_positions(employee_id)
        WHERE is_primary = TRUE;
    `);

        await q.query(`
      CREATE TABLE employee_attributes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        position_id UUID NOT NULL REFERENCES employee_positions(id) ON DELETE CASCADE,
        key VARCHAR(100) NOT NULL,
        value JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_attribute_position_key UNIQUE (position_id, key)
      );
    `);
        await q.query(`CREATE INDEX idx_attributes_position ON employee_attributes(position_id);`);
        await q.query(`CREATE INDEX idx_attributes_value_gin ON employee_attributes USING GIN (value);`);

        await q.query(`
      CREATE TABLE work_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (start_time < end_time)
      );
    `);
        await q.query(`CREATE INDEX idx_schedules_employee_day ON work_schedules(employee_id, day_of_week);`);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE work_schedules;`);
        await q.query(`DROP TABLE employee_attributes;`);
        await q.query(`DROP TABLE employee_positions;`);
        await q.query(`DROP TABLE employees;`);
        await q.query(`DROP TABLE job_titles;`);
        await q.query(`DROP TABLE departments;`);
    }
}