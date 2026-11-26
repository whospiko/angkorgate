import crypto from 'node:crypto';
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

    it('supports creating, hot-updating, and toggling GitHub, Discord, and Microsoft Entra ID without restart', async () => {
        // 1. Create GitHub, Discord, Microsoft via Admin API
        await request(app.getHttpServer())
            .post('/admin/oauth/providers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                code: 'github',
                name: 'GitHub',
                clientId: 'gh-id-v1',
                clientSecret: 'gh-secret',
                scopes: 'read:user user:email',
                isActive: true,
            })
            .expect(201);

        await request(app.getHttpServer())
            .post('/admin/oauth/providers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                code: 'discord',
                name: 'Discord',
                clientId: 'discord-id-123',
                clientSecret: 'discord-secret',
                scopes: 'identify email',
                isActive: true,
            })
            .expect(201);

        await request(app.getHttpServer())
            .post('/admin/oauth/providers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                code: 'microsoft',
                name: 'Microsoft Entra ID',
                clientId: 'ms-id-123',
                clientSecret: 'ms-secret',
                scopes: 'openid profile email User.Read',
                extraConfig: { tenantId: 'contoso.onmicrosoft.com' },
                isActive: true,
            })
            .expect(201);

        // Public list shows all 3 active providers
        const listRes = await request(app.getHttpServer())
            .get('/auth/oauth/providers')
            .expect(200);
        expect(listRes.body.providers).toEqual(
            expect.arrayContaining([
                { code: 'github', name: 'GitHub' },
                { code: 'discord', name: 'Discord' },
                { code: 'microsoft', name: 'Microsoft Entra ID' },
            ]),
        );

        // Verify redirects for each provider
        const ghRes = await request(app.getHttpServer())
            .get('/auth/oauth/github')
            .expect(302);
        expect(ghRes.header.location).toContain('github.com/login/oauth/authorize');
        expect(ghRes.header.location).toContain('client_id=gh-id-v1');

        const dcRes = await request(app.getHttpServer())
            .get('/auth/oauth/discord')
            .expect(302);
        expect(dcRes.header.location).toContain('discord.com/api/oauth2/authorize');
        expect(dcRes.header.location).toContain('client_id=discord-id-123');

        const msRes = await request(app.getHttpServer())
            .get('/auth/oauth/microsoft')
            .expect(302);
        expect(msRes.header.location).toContain(
            'login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize',
        );
        expect(msRes.header.location).toContain('client_id=ms-id-123');

        // Hot-update GitHub clientId without restart
        await request(app.getHttpServer())
            .patch('/admin/oauth/providers/github')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ clientId: 'gh-id-v2' })
            .expect(200);

        const ghResV2 = await request(app.getHttpServer())
            .get('/auth/oauth/github')
            .expect(302);
        expect(ghResV2.header.location).toContain('client_id=gh-id-v2');

        // Toggle Discord off -> immediately returns 404 and disappears from public list
        await request(app.getHttpServer())
            .patch('/admin/oauth/providers/discord/toggle')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(204);

        await request(app.getHttpServer())
            .get('/auth/oauth/discord')
            .expect(404);

        const afterToggleRes = await request(app.getHttpServer())
            .get('/auth/oauth/providers')
            .expect(200);
        expect(afterToggleRes.body.providers).not.toContainEqual({
            code: 'discord',
            name: 'Discord',
        });
    });

    it('renders Telegram widget and verifies HMAC-SHA256 callback with ticket redemption', async () => {
        const botToken = '998877:TEST_TELEGRAM_BOT_TOKEN_XYZ';
        await request(app.getHttpServer())
            .post('/admin/oauth/providers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                code: 'telegram',
                name: 'Telegram',
                clientId: 'angkorgate_test_bot',
                clientSecret: botToken,
                extraConfig: { botUsername: 'angkorgate_test_bot' },
                isActive: true,
            })
            .expect(201);

        const widgetRes = await request(app.getHttpServer())
            .get('/auth/oauth/telegram')
            .expect(200);
        expect(widgetRes.text).toContain('data-telegram-login="angkorgate_test_bot"');

        const authDate = String(Math.floor(Date.now() / 1000));
        const fields: Record<string, string> = {
            auth_date: authDate,
            first_name: 'Piko',
            id: '44556677',
            username: 'piko_tg',
        };
        const dataCheckString = Object.keys(fields)
            .sort()
            .map((k) => `${k}=${fields[k]}`)
            .join('\n');
        const secretKey = crypto.createHash('sha256').update(botToken).digest();
        const hash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        const cbRes = await request(app.getHttpServer())
            .get('/auth/oauth/telegram/callback')
            .query({ ...fields, hash })
            .expect(302);

        const locationUrl = new URL(cbRes.header.location);
        const ticket = locationUrl.searchParams.get('ticket');
        expect(ticket).toBeTruthy();
        expect(locationUrl.searchParams.get('provider')).toBe('telegram');

        const redeemRes = await request(app.getHttpServer())
            .post('/auth/oauth/ticket')
            .send({ ticket })
            .expect(200);
        expect(redeemRes.body.accessToken).toBeDefined();
        expect(redeemRes.body.provider).toBe('telegram');
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

    it('admin can create an app setting with new social providers', async () => {
        const res = await request(app.getHttpServer())
            .post('/admin/apps')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                appCode: 'clinic-prod',
                name: 'Clinic Prod',
                oauthEnabled: true,
                enabledProviders: ['google', 'github', 'discord', 'microsoft', 'telegram'],
            })
            .expect(201);

        expect(res.body.appCode).toBe('clinic-prod');
        expect(res.body.enabledProviders).toEqual([
            'google',
            'github',
            'discord',
            'microsoft',
            'telegram',
        ]);
    });

    it('rejects non-whitelisted redirect', async () => {
        await dataSource.query(
            `INSERT INTO oauth_providers (code, name, is_active, client_id, client_secret)
       VALUES ('google', 'Google', true, 'x', 'y')`,
        );
        await request(app.getHttpServer())
            .get('/auth/oauth/google?redirect=https://evil.com')
            .expect(403);
    });
});
