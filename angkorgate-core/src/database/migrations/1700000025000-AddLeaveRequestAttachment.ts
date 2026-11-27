import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaveRequestAttachment1700000025000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255) NULL;`);
        await q.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS attachment_mime_type VARCHAR(100) NULL;`);
        await q.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS attachment_data_url TEXT NULL;`);
    }

    public async down(q: QueryRunner): Promise<void> {
        await q.query(`ALTER TABLE leave_requests DROP COLUMN IF EXISTS attachment_data_url;`);
        await q.query(`ALTER TABLE leave_requests DROP COLUMN IF EXISTS attachment_mime_type;`);
        await q.query(`ALTER TABLE leave_requests DROP COLUMN IF EXISTS attachment_name;`);
    }
}
