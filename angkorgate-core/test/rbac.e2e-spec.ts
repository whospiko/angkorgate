import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    seedAdmin,
    truncateAll,
    loginAs,
} from './e2e-utils';

describe('RBAC (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let close: () => Promise<void>;
    let adminToken: string;
    let adminId: string;

    beforeAll(async () => {
        ({ app, dataSource, close } = await createTestApp());
    });

    beforeEach(async () => {
        await truncateAll(dataSource);
        const admin = await seedAdmin(dataSource);
        adminId = admin.userId;
        ({ accessToken: adminToken } = await loginAs(app, admin.email, admin.password));
    });

    afterAll(async () => {
        await close();
    });

    it('lists all roles', async () => {
        const res = await request(app.getHttpServer())
            .get('/rbac/roles')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        expect(res.body.map((r: { code: string }) => r.code)).toContain('ADMIN');
    });

    it('creates a custom role', async () => {
        const res = await request(app.getHttpServer())
            .post('/rbac/roles')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ code: 'CUSTOM_ROLE', name: 'Custom' })
            .expect(201);
        expect(res.body.code).toBe('CUSTOM_ROLE');
    });

    it('cannot delete a system role', async () => {
        const roles = await request(app.getHttpServer())
            .get('/rbac/roles')
            .set('Authorization', `Bearer ${adminToken}`);
        const adminRole = roles.body.find(
            (r: { code: string }) => r.code === 'ADMIN',
        );

        await request(app.getHttpServer())
            .delete(`/rbac/roles/${adminRole.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(400);
    });

    it('admin sees own permissions', async () => {
        const res = await request(app.getHttpServer())
            .get(`/rbac/users/${adminId}/permissions`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        expect(res.body).toContain('user:read');
        expect(res.body).toContain('role:write');
    });

    it('assigns a role and it becomes effective', async () => {
        // Create a plain user via register
        const reg = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'doctor@example.com',
                password: 'DoctorPass1!',
                fullName: 'Doc',
                dateOfBirth: '1980-01-01',
            })
            .expect(201);
        const userId = reg.body.userId;

        // Manually verify (or use the API — skipped for brevity)
        await dataSource.query(
            `UPDATE users SET is_email_verified = true WHERE id = $1`,
            [userId],
        );

        // Assign DOCTOR
        await request(app.getHttpServer())
            .post('/rbac/roles/assign')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ userId, roleCode: 'DOCTOR' })
            .expect(204);

        // Verify
        const roles = await request(app.getHttpServer())
            .get(`/rbac/users/${userId}/roles`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
        expect(roles.body).toContain('DOCTOR');
    });
});