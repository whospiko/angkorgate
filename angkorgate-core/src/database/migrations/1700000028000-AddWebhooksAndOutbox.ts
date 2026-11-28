import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhooksAndOutbox1700000028000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
            CREATE TABLE IF NOT EXISTS webhook_endpoints (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                url TEXT NOT NULL,
                secret VARCHAR(128) NOT NULL,
                events TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        await q.query(`
            CREATE TABLE IF NOT EXISTS webhook_deliveries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
                event VARCHAR(80) NOT NULL,
                payload TEXT NOT NULL,
                signature VARCHAR(128) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                status_code INT NULL,
                response_body TEXT NULL,
                attempts INT NOT NULL DEFAULT 0,
                delivered_at TIMESTAMPTZ NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id);`);
        await q.query(`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);`);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE IF EXISTS webhook_deliveries;`);
        await q.query(`DROP TABLE IF EXISTS webhook_endpoints;`);
    }
}
