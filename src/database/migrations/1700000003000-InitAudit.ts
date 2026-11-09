import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAudit1700000003000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`
      CREATE TABLE audit_logs (
        id BIGSERIAL PRIMARY KEY,
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity VARCHAR(50) NOT NULL,
        entity_id UUID,
        old_value JSONB,
        new_value JSONB,
        ip_address INET,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
        await q.query(`
      CREATE INDEX idx_audit_entity
        ON audit_logs(entity, entity_id);
    `);
        await q.query(`
      CREATE INDEX idx_audit_actor
        ON audit_logs(actor_id, created_at DESC);
    `);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE audit_logs;`);
    }
}