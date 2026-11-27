import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaveRequestAttachment1700000025000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        if (!(await q.hasColumn('leave_requests', 'attachment_name'))) {
            await q.query(`ALTER TABLE leave_requests ADD COLUMN attachment_name VARCHAR(255) NULL;`);
        }
        if (!(await q.hasColumn('leave_requests', 'attachment_mime_type'))) {
            await q.query(`ALTER TABLE leave_requests ADD COLUMN attachment_mime_type VARCHAR(100) NULL;`);
        }
        if (!(await q.hasColumn('leave_requests', 'attachment_data_url'))) {
            await q.query(`ALTER TABLE leave_requests ADD COLUMN attachment_data_url TEXT NULL;`);
        }
    }

    public async down(q: QueryRunner): Promise<void> {
        if (await q.hasColumn('leave_requests', 'attachment_data_url')) {
            await q.query(`ALTER TABLE leave_requests DROP COLUMN attachment_data_url;`);
        }
        if (await q.hasColumn('leave_requests', 'attachment_mime_type')) {
            await q.query(`ALTER TABLE leave_requests DROP COLUMN attachment_mime_type;`);
        }
        if (await q.hasColumn('leave_requests', 'attachment_name')) {
            await q.query(`ALTER TABLE leave_requests DROP COLUMN attachment_name;`);
        }
    }
}
