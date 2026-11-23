import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    seedAdmin,
    truncateAll,
    loginAs,
} from './e2e-utils';

describe('OIDC Protocol & Provider (e2e)', () => {
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

    describe('OIDC Discovery & JWKS', () => {
        it('GET /oidc/.well-known/openid-configuration returns valid OIDC metadata', async () => {
            const res = await request(app.getHttpServer())
                .get('/oidc/.well-known/openid-configuration')
                .expect(200);

            expect(res.body.issuer).toMatch(/\/oidc$/);
            expect(res.body.authorization_endpoint).toMatch(/\/oidc\/auth$/);
            expect(res.body.token_endpoint).toMatch(/\/oidc\/token$/);
            expect(res.body.jwks_uri).toMatch(/\/oidc\/jwks$/);
            expect(res.body.userinfo_endpoint).toMatch(/\/oidc\/me$/);
            expect(res.body.scopes_supported).toEqual(
                expect.arrayContaining(['openid', 'email', 'profile', 'roles', 'permissions']),
            );
        });

        it('GET /.well-known/openid-configuration redirects to /oidc/.well-known/openid-configuration', async () => {
            const res = await request(app.getHttpServer())
                .get('/.well-known/openid-configuration')
                .expect(302);

            expect(res.header.location).toBe('/oidc/.well-known/openid-configuration');
        });

        it('GET /oidc/jwks returns signing keys', async () => {
            const res = await request(app.getHttpServer())
                .get('/oidc/jwks')
                .expect(200);

            expect(res.body.keys).toBeDefined();
            expect(Array.isArray(res.body.keys)).toBe(true);
            expect(res.body.keys.length).toBeGreaterThan(0);
            expect(res.body.keys[0]).toEqual(
                expect.objectContaining({
                    kty: 'RSA',
                    use: 'sig',
                    alg: 'RS256',
                }),
            );
        });
    });

    describe('Dynamic Client Resolution & Token Endpoint', () => {
        it('resolves registered apps and issues token via client_credentials', async () => {
            // Register client application in apps table
            await request(app.getHttpServer())
                .post('/admin/apps')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    appCode: 'clinic-api',
                    name: 'Clinic Backend API',
                    clientSecret: 'super-secret-api-key',
                    serviceAccountsEnabled: true,
                    allowedRedirectUrls: ['http://localhost:5173/callback'],
                })
                .expect(201);

            // Request token using client_credentials grant
            const credentials = Buffer.from('clinic-api:super-secret-api-key').toString('base64');
            const tokenRes = await request(app.getHttpServer())
                .post('/oidc/token')
                .set('Authorization', `Basic ${credentials}`)
                .type('form')
                .send({
                    grant_type: 'client_credentials',
                })
                .expect(200);

            expect(tokenRes.body.access_token).toBeDefined();
            expect(tokenRes.body.token_type).toBe('Bearer');
            expect(tokenRes.body.expires_in).toBeGreaterThan(0);
        });
    });

    describe('Authorization & Interaction Flow', () => {
        it('redirects to interaction endpoint on authorization request', async () => {
            // Register app
            await request(app.getHttpServer())
                .post('/admin/apps')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    appCode: 'portal-app',
                    name: 'Portal Web App',
                    clientSecret: 'portal-secret-key',
                    allowedRedirectUrls: ['http://localhost:5173/callback'],
                })
                .expect(201);

            // Start authorization flow
            const authRes = await request(app.getHttpServer())
                .get('/oidc/auth')
                .query({
                    client_id: 'portal-app',
                    response_type: 'code',
                    scope: 'openid email profile roles',
                    redirect_uri: 'http://localhost:5173/callback',
                    state: 'test-state-123',
                })
                .expect(303);

            const location = authRes.header.location;
            expect(location).toContain('/oidc/interaction/');
        });
    });
});
