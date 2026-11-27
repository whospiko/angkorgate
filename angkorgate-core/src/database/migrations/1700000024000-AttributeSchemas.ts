import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttributeSchemas1700000024000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            CREATE TABLE IF NOT EXISTS attribute_schemas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                target_type VARCHAR(30) NOT NULL CHECK (target_type IN ('CUSTOMER', 'EMPLOYEE_POSITION')),
                domain VARCHAR(30) NOT NULL,
                key VARCHAR(100) NOT NULL,
                value_type VARCHAR(20) NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'array<string>', 'object')),
                is_required BOOLEAN NOT NULL DEFAULT FALSE,
                description TEXT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT uq_attribute_schema_target_domain_key UNIQUE (target_type, domain, key)
            );
        `);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_attr_schemas_target_domain ON attribute_schemas(target_type, domain);`);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE IF EXISTS attribute_schemas;`);
    }
}
