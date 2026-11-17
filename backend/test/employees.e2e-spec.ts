import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    seedAdmin,
    truncateAll,
    loginAs,
} from './e2e-utils';

describe('Employees (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let close: () => Promise<void>;
    let adminToken: string;

    beforeAll(async () => {
        ({ app, dataSource, close } = await createTestApp());
    });

    beforeEach(async () => {
        await truncateAll(dataSource);

        // Seed dept + job title for clinic
        await dataSource.query(
            `INSERT INTO departments (code, name) VALUES ('ORTHO', 'Orthopedics')`,
        );
        await dataSource.query(
            `INSERT INTO job_titles (code, name, category) VALUES ('DOCTOR', 'Doctor', 'CLINIC')`,
        );

        const admin = await seedAdmin(dataSource);
        ({ accessToken: adminToken } = await loginAs(app, admin.email, admin.password));
    });

    afterAll(async () => {
        await close();
    });

    it('creates an employee linked to a user', async () => {
        // Create a user first
        const userRes = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                email: 'dr@example.com',
                password: 'DoctorPass1!',
                isEmailVerified: true,
            })
            .expect(201);

        const res = await request(app.getHttpServer())
            .post('/employees')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                userId: userRes.body.id,
                employeeCode: 'EMP-001',
                fullName: 'Dr. Smith',
            })
            .expect(201);

        expect(res.body.employeeCode).toBe('EMP-001');
    });

    it('assigns a position and stores attributes', async () => {
        const userRes = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'dr2@example.com', password: 'DoctorPass1!', isEmailVerified: true });

        const emp = await request(app.getHttpServer())
            .post('/employees')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                userId: userRes.body.id,
                employeeCode: 'EMP-002',
                fullName: 'Dr. X',
            });

        const pos = await request(app.getHttpServer())
            .post(`/employees/${emp.body.id}/positions`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                jobTitleCode: 'DOCTOR',
                departmentCode: 'ORTHO',
                isPrimary: true,
            })
            .expect(201);

        await request(app.getHttpServer())
            .put(`/employees/${emp.body.id}/positions/${pos.body.id}/attributes/license_number`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ value: 'DEN-99999' })
            .expect(200);

        const attrs = await request(app.getHttpServer())
            .get(`/employees/${emp.body.id}/positions/${pos.body.id}/attributes`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(attrs.body.license_number).toBe('DEN-99999');
    });

    it('rejects overlapping schedule', async () => {
        const userRes = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'dr3@example.com', password: 'DoctorPass1!', isEmailVerified: true });

        const emp = await request(app.getHttpServer())
            .post('/employees')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                userId: userRes.body.id,
                employeeCode: 'EMP-003',
                fullName: 'Dr. Y',
            });

        await request(app.getHttpServer())
            .post(`/employees/${emp.body.id}/schedules`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' })
            .expect(201);

        await request(app.getHttpServer())
            .post(`/employees/${emp.body.id}/schedules`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ dayOfWeek: 1, startTime: '12:00', endTime: '20:00' })
            .expect(400); // or 404 depending on exception
    });
});