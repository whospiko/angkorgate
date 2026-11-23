import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    seedAdmin,
    truncateAll,
    loginAs,
} from './e2e-utils';

describe('OAuth (e2e)', () => {
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

    it('lists no providers when none configured', async () => {
        const res = await request(app.getHttpServer())
            .get('/auth/oauth/providers')
            .expect(200);
        expect(res.body.providers).toEqual([]);
    });

    it('lists providers when active and configured', async () => {
        // Seed Google provider directly
        await dataSource.query(
            `INSERT INTO oauth_providers (code, name, is_active, client_id, client_secret)
       VALUES ('google', 'Google', true, 'test-id', 'test-secret')`,
        );

        const res = await request(app.getHttpServer())
            .get('/auth/oauth/providers')
            .expect(200);

        expect(res.body.providers).toContainEqual({ code: 'google', name: 'Google' });
    });

    it('redirects to Google using dynamic client_id from database', async () => {
        await dataSource.query(
            `INSERT INTO oauth_providers (code, name, is_active, client_id, client_secret)
             VALUES ('google', 'Google', true, 'dynamic-google-id-12345', 'secret-xyz')`,
        );

        const res = await request(app.getHttpServer())
            .get('/auth/oauth/google')
            .expect(302);

        expect(res.header.location).toContain('accounts.google.com');
        expect(res.header.location).toContain('client_id=dynamic-google-id-12345');
    });

    it('404s when provider not active', async () => {
        await dataSource.query(
            `INSERT INTO oauth_providers (code, name, is_active, client_id)
       VALUES ('google', 'Google', false, 'test-id')`,
        );

        await request(app.getHttpServer())
            .get('/auth/oauth/google')
            .expect(404);
    });

    it('admin can create a provider', async () => {
        const res = await request(app.getHttpServer())
            .post('/admin/oauth/providers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                code: 'google',
                name: 'Google',
                clientId: 'test',
                clientSecret: 'secret',
                isActive: true,
            })
            .expect(201);

        expect(res.body.code).toBe('google');
    });

    it('admin can create an app setting', async () => {
        const res = await request(app.getHttpServer())
            .post('/admin/apps')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                appCode: 'clinic-prod',
                name: 'Clinic Prod',
                oauthEnabled: true,
                enabledProviders: ['google'],
            })
            .expect(201);

        expect(res.body.appCode).toBe('clinic-prod');
    });

    it('rejects non-whitelisted redirect', async () => {
        await dataSource.query(
            `INSERT INTO oauth_providers (code, name, is_active, client_id, client_secret)
       VALUES ('google', 'Google', true, 'x', 'y')`,
        );
        // Attempt with evil redirect — will fail at Google or at redirect service,
        // but the whitelist check is what we care about.
        await request(app.getHttpServer())
            .get('/auth/oauth/google?redirect=https://evil.com')
            .expect(403); // rejected before passport kicks in
    });
});