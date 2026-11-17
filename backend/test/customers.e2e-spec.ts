import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    seedAdmin,
    truncateAll,
    loginAs,
} from './e2e-utils';

describe('Customers (e2e)', () => {
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

    it('creates a PATIENT with PAT- prefix', async () => {
        const res = await request(app.getHttpServer())
            .post('/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                type: 'PATIENT',
                fullName: 'John',
                dateOfBirth: '1990-01-01',
                phone: '+85512345678',
            })
            .expect(201);

        expect(res.body.customerCode).toMatch(/^PAT-\d{4}$/);
        expect(res.body.type).toBe('PATIENT');
        expect(res.body.isMinor).toBe(false);
    });

    it('creates a GUEST with GST- prefix', async () => {
        const res = await request(app.getHttpServer())
            .post('/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                type: 'GUEST',
                fullName: 'Alice',
                dateOfBirth: '1985-01-01',
            })
            .expect(201);
        expect(res.body.customerCode).toMatch(/^GST-\d{4}$/);
    });

    it('flags minors', async () => {
        const res = await request(app.getHttpServer())
            .post('/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                type: 'PATIENT',
                fullName: 'Tommy',
                dateOfBirth: '2015-01-01',
            })
            .expect(201);
        expect(res.body.isMinor).toBe(true);
    });

    it('stores and retrieves JSONB attributes', async () => {
        const createRes = await request(app.getHttpServer())
            .post('/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                type: 'PATIENT',
                fullName: 'Test',
                dateOfBirth: '1990-01-01',
            });
        const customerId = createRes.body.id;

        await request(app.getHttpServer())
            .put(`/customers/${customerId}/attributes/blood_type`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ value: 'O+' })
            .expect(200);

        await request(app.getHttpServer())
            .put(`/customers/${customerId}/attributes/allergies`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ value: ['peanuts'] })
            .expect(200);

        const attrs = await request(app.getHttpServer())
            .get(`/customers/${customerId}/attributes`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(attrs.body).toEqual({
            blood_type: 'O+',
            allergies: ['peanuts'],
        });
    });

    it('adds a contact (guardian) and demotes primary correctly', async () => {
        const c = await request(app.getHttpServer())
            .post('/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                type: 'PATIENT',
                fullName: 'Minor',
                dateOfBirth: '2015-01-01',
            });

        // First contact becomes primary automatically
        const c1 = await request(app.getHttpServer())
            .post(`/customers/${c.body.id}/contacts`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ fullName: 'Mother', relationship: 'Mother', phone: '+85511111111' })
            .expect(201);
        expect(c1.body.isPrimary).toBe(true);

        // Second marked primary demotes first
        await request(app.getHttpServer())
            .post(`/customers/${c.body.id}/contacts`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                fullName: 'Father',
                relationship: 'Father',
                phone: '+85522222222',
                isPrimary: true,
            })
            .expect(201);

        const list = await request(app.getHttpServer())
            .get(`/customers/${c.body.id}/contacts`)
            .set('Authorization', `Bearer ${adminToken}`);

        const primary = list.body.filter((x: { isPrimary: boolean }) => x.isPrimary);
        expect(primary.length).toBe(1);
        expect(primary[0].fullName).toBe('Father');
    });

    it('customer permission check blocks CUSTOMER role from listing all', async () => {
        // Register a customer
        const reg = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'plain@example.com',
                password: 'MyStr0ng!Pass',
                fullName: 'Plain',
                dateOfBirth: '1990-01-01',
            })
            .expect(201);
        await dataSource.query(
            `UPDATE users SET is_email_verified = true WHERE id = $1`,
            [reg.body.userId],
        );
        const login = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'plain@example.com', password: 'MyStr0ng!Pass' })
            .expect(200);

        await request(app.getHttpServer())
            .get('/customers')
            .set('Authorization', `Bearer ${login.body.accessToken}`)
            .expect(403);
    });
});