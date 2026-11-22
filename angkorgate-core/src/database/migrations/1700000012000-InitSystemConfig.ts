import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSystemConfig1700000012000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            CREATE TABLE IF NOT EXISTS system_configs (
                id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
                is_initialized BOOLEAN NOT NULL DEFAULT FALSE,
                app_name VARCHAR(100) NOT NULL DEFAULT 'AngkorGate',
                app_description VARCHAR(255),
                logo_url TEXT,
                favicon_url TEXT,
                organization_name VARCHAR(150),
                support_email VARCHAR(150),
                footer_text VARCHAR(255),
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        // Insert initial default config record
        await q.query(`
            INSERT INTO system_configs (id, is_initialized, app_name)
            VALUES ('default', FALSE, 'AngkorGate')
            ON CONFLICT (id) DO NOTHING;
        `);

        // If an ADMIN role user already exists in this database, automatically mark as initialized
        // to prevent breaking existing installations.
        await q.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE r.code = 'ADMIN'
                ) THEN
                    UPDATE system_configs 
                    SET is_initialized = TRUE 
                    WHERE id = 'default';
                END IF;
            END $$;
        `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE IF EXISTS system_configs;`);
    }
}
