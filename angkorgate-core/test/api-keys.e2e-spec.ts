import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    seedAdmin,
    truncateAll,
    loginAs,
} from './e2e-utils';

describe('API Keys & Developer Portal (e2e)', () => {
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

    it('creates an API key with granular method restriction and field projection', async () => {
        // 1. Create API Key as Admin
        const createRes = await request(app.getHttpServer())
            .post('/admin/api-keys')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Front-Desk Portal Integration',
                environment: 'live',
                expirationDays: 30,
                allowedResources: ['customers'],
                allowedMethods: {
                    customers: ['GET'],
                },
                permissions: ['customer:read'],
                fieldProjections: {
                    customers: ['customerCode', 'fullName', 'gender', 'status'],
                },
            })
            .expect(201);

        const apiKeyData = createRes.body;
        expect(apiKeyData.name).toBe('Front-Desk Portal Integration');
        expect(apiKeyData.keyPrefix).toMatch(/^ag_live_/);
        expect(apiKeyData.secretKey).toMatch(/^ag_live_[a-f0-9]{64}$/);
        expect(apiKeyData.status).toBe('ACTIVE');

        const secretKey = apiKeyData.secretKey;

        // 2. Create a customer using Admin JWT
        const customerRes = await request(app.getHttpServer())
            .post('/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                type: 'PATIENT',
                fullName: 'Alice Walker',
                gender: 'FEMALE',
                dateOfBirth: '1992-05-15',
                phone: '+85512345678',
                nationalId: 'CAM-987654321',
            })
            .expect(201);

        const customerId = customerRes.body.id;

        // 3. Handshake via x-api-key: GET /customers (allowed method & filtered fields)
        const getRes = await request(app.getHttpServer())
            .get('/customers')
            .set('x-api-key', secretKey)
            .expect(200);

        expect(Array.isArray(getRes.body.data)).toBe(true);
        expect(getRes.body.data.length).toBeGreaterThan(0);

        const item = getRes.body.data[0];
        expect(item.fullName).toBe('Alice Walker');
        expect(item.gender).toBe('FEMALE');
        expect(item.customerCode).toMatch(/^PAT-\d{4}$/);

        // Verify dynamic field projection stripped sensitive PII
        expect(item.dateOfBirth).toBeUndefined();
        expect(item.nationalId).toBeUndefined();
        expect(item.phone).toBeUndefined();

        // 4. Handshake via Authorization: Bearer <secretKey>
        const bearerRes = await request(app.getHttpServer())
            .get(`/customers/${customerId}`)
            .set('Authorization', `Bearer ${secretKey}`)
            .expect(200);

        expect(bearerRes.body.fullName).toBe('Alice Walker');
        expect(bearerRes.body.nationalId).toBeUndefined();
        expect(bearerRes.body.dateOfBirth).toBeUndefined();

        // 5. Verify Granular HTTP Method Restriction: POST /customers with GET-only key
        const postRes = await request(app.getHttpServer())
            .post('/customers')
            .set('x-api-key', secretKey)
            .send({
                type: 'PATIENT',
                fullName: 'Malicious Create Attempt',
                dateOfBirth: '1995-01-01',
            })
            .expect(403);

        expect(postRes.body.message).toContain('HTTP method POST is not permitted for this API Key');

        // 6. Revoke API Key
        await request(app.getHttpServer())
            .post(`/admin/api-keys/${apiKeyData.id}/revoke`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        // 7. Verify Revoked Key fails handshake
        await request(app.getHttpServer())
            .get('/customers')
            .set('x-api-key', secretKey)
            .expect(401);
    });

    it('rejects invalid or non-existent API keys', async () => {
        await request(app.getHttpServer())
            .get('/customers')
            .set('x-api-key', 'ag_live_invalidkey1234567890abcdef1234567890abcdef')
            .expect(401);
    });

    it('allows full fields if no field projection was configured', async () => {
        // Create key without field projections
        const keyRes = await request(app.getHttpServer())
            .post('/admin/api-keys')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Full Sync Service',
                allowedResources: ['customers'],
                allowedMethods: { customers: ['GET', 'POST'] },
                permissions: ['customer:read', 'customer:write'],
                fieldProjections: {},
            })
            .expect(201);

        const secretKey = keyRes.body.secretKey;

        // Create customer via API Key
        const createCustomerRes = await request(app.getHttpServer())
            .post('/customers')
            .set('x-api-key', secretKey)
            .send({
                type: 'GUEST',
                fullName: 'Bob Dylan',
                dateOfBirth: '1980-03-20',
                phone: '+85599999999',
            })
            .expect(201);

        expect(createCustomerRes.body.fullName).toBe('Bob Dylan');
        expect(createCustomerRes.body.phone).toBe('+85599999999');
        expect(createCustomerRes.body.dateOfBirth).toBe('1980-03-20');
    });
});
