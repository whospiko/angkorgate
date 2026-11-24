import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    seedAdmin,
    truncateAll,
    loginAs,
} from './e2e-utils';

describe('Users Soft Delete & Unique Email (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let close: () => Promise<void>;
    let adminToken: string;

    beforeAll(async () => {
        ({ app, dataSource, close } = await createTestApp());
    });

    beforeEach(async () => {
        await truncateAll(dataSource);
        const admin = await seedAdmin(dataSource);
        ({ accessToken: adminToken } = await loginAs(app, admin.email, admin.password));
    });

    afterAll(async () => {
        await close();
    });

    it('soft deletes user, unlinks employee without violating RESTRICT, and allows re-registering with the same email', async () => {
        // 1. Create User
        const userRes = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                email: 'doctor.strange@example.com',
                password: 'Password123!',
                isActive: true,
            })
            .expect(201);

        const userId = userRes.body.id;
        expect(userId).toBeDefined();

        // 2. Create Employee linked to this User
        const empRes = await request(app.getHttpServer())
            .post('/employees')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                userId,
                employeeCode: 'EMP-999',
                fullName: 'Stephen Strange',
                gender: 'MALE',
                dateOfBirth: '1975-01-01',
                phone: '+85511223344',
            })
            .expect(201);

        const employeeId = empRes.body.id;
        expect(employeeId).toBeDefined();
        expect(empRes.body.userId).toBe(userId);

        // 3. Delete the user account (soft delete)
        await request(app.getHttpServer())
            .delete(`/users/${userId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(204);

        // 4. Verify user is soft-deleted: GET /users/:id returns 404
        await request(app.getHttpServer())
            .get(`/users/${userId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(404);

        // 5. Verify employee still exists in directory and userId is set to null (unlinked)
        const getEmpRes = await request(app.getHttpServer())
            .get(`/employees/${employeeId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(getEmpRes.body.id).toBe(employeeId);
        expect(getEmpRes.body.fullName).toBe('Stephen Strange');
        expect(getEmpRes.body.userId).toBeNull();

        // 6. Verify email reusability: create a NEW user with the SAME email doctor.strange@example.com
        const newUserRes = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                email: 'doctor.strange@example.com',
                password: 'NewPassword123!',
                isActive: true,
            })
            .expect(201);

        const newUserId = newUserRes.body.id;
        expect(newUserId).toBeDefined();
        expect(newUserId).not.toBe(userId);
        expect(newUserRes.body.email).toBe('doctor.strange@example.com');

        // 7. Verify uniqueness is still enforced among ACTIVE users:
        // Trying to create a duplicate active user with doctor.strange@example.com must fail with 409
        await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                email: 'doctor.strange@example.com',
                password: 'AnotherPassword123!',
                isActive: true,
            })
            .expect(409);
    });
});
