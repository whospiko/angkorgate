import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuditService } from '../src/audit/services/audit.service';
import { GoogleOauthGuard } from '../src/oauth/guards/google-oauth.guard';
import { seedAdmin, truncateAll, loginAs } from './e2e-utils';
import { decodeJwt } from 'jose';

describe('Federated Google OAuth to Downstream OIDC (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let close: () => Promise<void>;
    let adminToken: string;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideGuard(GoogleOauthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = {
                        provider: 'google',
                        providerUserId: 'google-uid-12345678',
                        email: 'federated.user@gmail.com',
                        emailVerified: true,
                        firstName: 'Federated',
                        lastName: 'User',
                        fullName: 'Federated User',
                        avatarUrl: 'https://lh3.googleusercontent.com/avatar-test',
                        raw: {},
                    };
                    return true;
                },
                getAuthenticateOptions: (context: ExecutionContext) => {
                    const req = context.switchToHttp().getRequest();
                    const statePayload: Record<string, string> = {};
                    if (req.query?.interaction) {
                        statePayload.interaction = req.query.interaction as string;
                    }
                    if (req.query?.redirect) {
                        statePayload.redirect = req.query.redirect as string;
                    }
                    if (Object.keys(statePayload).length > 0) {
                        return {
                            state: Buffer.from(JSON.stringify(statePayload)).toString('base64url'),
                        };
                    }
                    return {};
                },
            })
            .compile();

        app = moduleRef.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );
        await app.init();

        dataSource = moduleRef.get<DataSource>(getDataSourceToken());
        close = async () => {
            await AuditService.flush();
            await app.close();
        };
    });

    beforeEach(async () => {
        await truncateAll(dataSource);
        const admin = await seedAdmin(dataSource);
        ({ accessToken: adminToken } = await loginAs(app, admin.email, admin.password));
    });

    afterAll(async () => {
        await close();
    });

    it('enables a downstream app user to sign in via Google OAuth and obtain downstream OIDC tokens', async () => {
        // 1. Seed active Google OAuth provider
        await dataSource.query(
            `INSERT INTO oauth_providers (code, name, is_active, client_id, client_secret)
             VALUES ('google', 'Google', true, 'mock-google-client-id', 'mock-google-client-secret')`,
        );

        // 2. Register downstream client app
        const appRes = await request(app.getHttpServer())
            .post('/admin/apps')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                appCode: 'client-portal-app',
                name: 'Downstream Portal App',
                clientSecret: 'portal-super-secret-xyz',
                allowedRedirectUrls: ['http://localhost:5173/callback'],
            })
            .expect(201);

        expect(appRes.body.appCode).toBe('client-portal-app');

        // Helper cookie jar with proper map overwrite
        const cookieMap = new Map<string, string>();
        const updateCookies = (res: request.Response) => {
            const setCookie = res.headers['set-cookie'];
            const list = Array.isArray(setCookie) ? setCookie : (typeof setCookie === 'string' ? [setCookie] : []);
            for (const c of list) {
                const [pair] = c.split(';');
                if (pair) {
                    const idx = pair.indexOf('=');
                    if (idx > -1) {
                        const k = pair.slice(0, idx).trim();
                        const v = pair.slice(idx + 1).trim();
                        cookieMap.set(k, v);
                    }
                }
            }
        };
        const getCookies = () => {
            return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
        };

        const resolvePath = (urlOrPath: string): string => {
            if (!urlOrPath) return '';
            try {
                const u = new URL(urlOrPath);
                return u.pathname + u.search;
            } catch {
                return urlOrPath;
            }
        };

        // 3. Downstream app initiates OIDC authorization code flow
        const authRes = await request(app.getHttpServer())
            .get('/oidc/auth')
            .query({
                client_id: 'client-portal-app',
                response_type: 'code',
                scope: 'openid profile email roles',
                redirect_uri: 'http://localhost:5173/callback',
                state: 'downstream-client-state-999',
            })
            .expect(303);

        updateCookies(authRes);
        const interactionLocation = authRes.header.location;
        expect(interactionLocation).toContain('/oidc/interaction/');

        const match = interactionLocation.match(/interaction(?:=|\/)([a-zA-Z0-9_-]+)/);
        expect(match).toBeTruthy();
        const interactionUid = match![1];

        // 4. User is on login screen and chooses "Sign in with Google"
        // State encodes the pending interaction UID
        const statePayload = Buffer.from(
            JSON.stringify({ interaction: interactionUid }),
        ).toString('base64url');

        // 5. Google redirects back to AngkorGate OAuth callback
        const callbackRes = await request(app.getHttpServer())
            .get('/auth/oauth/google/callback')
            .set('Cookie', getCookies())
            .query({ state: statePayload })
            .expect(303);

        updateCookies(callbackRes);
        const resumeUrl = resolvePath(callbackRes.header.location);
        expect(resumeUrl).toContain(`/oidc/auth/${interactionUid}`);

        // 6. Resume OIDC authorization flow with session cookies
        let resumeRes = await request(app.getHttpServer())
            .get(resumeUrl)
            .set('Cookie', getCookies());

        updateCookies(resumeRes);

        // If redirected to consent prompt, auto-consent via GET /oidc/interaction/:uid
        let location = resumeRes.header.location || '';
        if (location.includes('interaction')) {
            const consentPath = resolvePath(location);
            const consentRes = await request(app.getHttpServer())
                .get(consentPath)
                .set('Cookie', getCookies())
                .expect(303);

            updateCookies(consentRes);
            const afterConsentUrl = resolvePath(consentRes.header.location);

            resumeRes = await request(app.getHttpServer())
                .get(afterConsentUrl)
                .set('Cookie', getCookies())
                .expect(303);

            location = resumeRes.header.location || '';
        }

        // 7. Verify final redirect is to downstream client callback with authorization code
        expect(location).toContain('http://localhost:5173/callback');
        expect(location).toContain('code=');
        expect(location).toContain('state=downstream-client-state-999');

        const codeMatch = location.match(/code=([^&]+)/);
        expect(codeMatch).toBeTruthy();
        const authorizationCode = codeMatch![1];

        // 8. Downstream app exchanges authorization code for OIDC tokens
        const credentials = Buffer.from('client-portal-app:portal-super-secret-xyz').toString('base64');
        const tokenRes = await request(app.getHttpServer())
            .post('/oidc/token')
            .set('Authorization', `Basic ${credentials}`)
            .type('form')
            .send({
                grant_type: 'authorization_code',
                code: authorizationCode,
                redirect_uri: 'http://localhost:5173/callback',
            })
            .expect(200);

        expect(tokenRes.body.access_token).toBeDefined();
        expect(tokenRes.body.id_token).toBeDefined();

        // 9. Inspect the ID Token claims and UserInfo endpoint
        const claims = decodeJwt(tokenRes.body.id_token);
        expect(claims.sub).toBeDefined();

        const userinfoRes = await request(app.getHttpServer())
            .get('/oidc/me')
            .set('Authorization', `Bearer ${tokenRes.body.access_token}`)
            .expect(200);

        expect(userinfoRes.body.sub).toBe(claims.sub);
        expect(userinfoRes.body.email).toBe('federated.user@gmail.com');
        expect(userinfoRes.body.email_verified).toBe(true);

        // 10. Verify User and Customer record was auto-created in database
        const userInDb = await dataSource.query(
            `SELECT * FROM users WHERE email = 'federated.user@gmail.com'`,
        );
        expect(userInDb.length).toBe(1);
        expect(claims.sub).toBe(userInDb[0].id);

        const oauthAccount = await dataSource.query(
            `SELECT * FROM oauth_accounts WHERE user_id = $1 AND provider = 'google'`,
            [userInDb[0].id],
        );
        expect(oauthAccount.length).toBe(1);
        expect(oauthAccount[0].provider_user_id).toBe('google-uid-12345678');
    });
});
