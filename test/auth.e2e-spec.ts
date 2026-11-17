import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    seedAdmin,
    truncateAll,
    loginAs,
} from './e2e-utils';
import { generate } from 'otplib';

describe('Auth (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let close: () => Promise<void>;

    beforeAll(async () => {
        ({ app, dataSource, close } = await createTestApp());
    });

    beforeEach(async () => {
        await truncateAll(dataSource);
    });

    afterAll(async () => {
        await close();
    });

    // ─────────────────────────────────────────────────────────────
    //  REGISTER
    // ─────────────────────────────────────────────────────────────

    describe('POST /auth/register', () => {
        it('creates a customer and requires email verification', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'jane@example.com',
                    password: 'MyStr0ng!Pass',
                    fullName: 'Jane',
                    dateOfBirth: '1995-01-01',
                })
                .expect(201);

            const body = res.body?.data ?? res.body;
            expect(body.userId).toBeDefined();

            // Login before verify should fail
            const loginRes = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'jane@example.com', password: 'MyStr0ng!Pass' })
                .expect(403);

            expect(loginRes.body.success).toBe(false);
            expect(loginRes.body.statusCode).toBe(403);
            expect(loginRes.body.message).toMatch(/Email not verified/i);

            // A verification token should exist in DB
            const tokens = await dataSource.query(
                `SELECT * FROM email_verification_tokens`,
            );
            expect(tokens.length).toBeGreaterThan(0);

            // Customer record should exist
            const customers = await dataSource.query(
                `SELECT * FROM customers WHERE full_name = 'Jane'`,
            );
            expect(customers.length).toBe(1);
            expect(customers[0].type).toBe('CUSTOMER');
            expect(customers[0].customer_code).toMatch(/^CUS-/);
        });

        it('rejects weak password', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'weak@x.com',
                    password: '12345',
                    fullName: 'X',
                    dateOfBirth: '1990-01-01',
                })
                .expect(400);

            expect(res.body.success).toBe(false);
            expect(res.body.statusCode).toBe(400);
            // Validation failures carry an array of details
            expect(Array.isArray(res.body.details)).toBe(true);
        });

        it('rejects duplicate email', async () => {
            await seedAdmin(dataSource);
            const res = await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'admin-test@example.com',
                    password: 'AnotherStrong1!',
                    fullName: 'X',
                    dateOfBirth: '1990-01-01',
                })
                .expect(409);

            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/email/i);
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  LOGIN (no MFA)
    // ─────────────────────────────────────────────────────────────

    describe('POST /auth/login', () => {
        it('returns tokens for valid credentials (MFA off)', async () => {
            const admin = await seedAdmin(dataSource);
            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: admin.password })
                .expect(200);

            const body = res.body?.data ?? res.body;
            expect(body.accessToken).toBeDefined();
            expect(body.refreshToken).toBeDefined();
            expect(body.user.roles).toContain('ADMIN');
            // MFA not required
            expect(body.mfaRequired).toBeUndefined();
        });

        it('rejects wrong password with generic message', async () => {
            const admin = await seedAdmin(dataSource);
            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: 'wrong' })
                .expect(401);

            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('rejects unknown user with same message (no enumeration)', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'ghost@nowhere.com', password: 'x' })
                .expect(401);

            expect(res.body.message).toBe('Invalid credentials');
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  LOGIN (MFA) — full flow
    // ─────────────────────────────────────────────────────────────

    describe('POST /auth/login → MFA challenge', () => {
        async function enableMfa(
            admin: { email: string; password: string },
        ): Promise<{ secret: string; accessToken: string; backupCodes: string[] }> {
            // Login without MFA (first time)
            const { accessToken } = await loginAs(app, admin.email, admin.password);

            // Setup
            const setupRes = await request(app.getHttpServer())
                .post('/auth/mfa/setup')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ password: admin.password })
                .expect(200);

            const setupBody = setupRes.body?.data ?? setupRes.body;
            const secret = setupBody.secret;
            const backupCodes = setupBody.backupCodes;

            // ✅ FIX: Await the call and pass an object
            const code = await generate({ secret });

            await request(app.getHttpServer())
                .post('/auth/mfa/verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code })
                .expect(200);

            return { secret, accessToken, backupCodes };
        }

        it('returns a challenge (mfaRequired) instead of tokens', async () => {
            const admin = await seedAdmin(dataSource);
            await enableMfa(admin);

            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: admin.password })
                .expect(200);

            const body = res.body?.data ?? res.body;
            expect(body.mfaRequired).toBe(true);
            expect(body.mfaToken).toBeDefined();
            expect(body.backupCodesRemaining).toBe(10);
            // MUST NOT issue real tokens
            expect(body.accessToken).toBeUndefined();
            expect(body.refreshToken).toBeUndefined();
        });

        it('completes login with a valid TOTP code', async () => {
            const admin = await seedAdmin(dataSource);
            const { secret } = await enableMfa(admin);

            // Step 1: password
            const challenge = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: admin.password })
                .expect(200);

            const mfaToken = (challenge.body?.data ?? challenge.body).mfaToken;

            // Step 2: TOTP
            const code = await generate({ secret });
            const res = await request(app.getHttpServer())
                .post('/auth/login/mfa')
                .set('Authorization', `Bearer ${mfaToken}`)
                .send({ code })
                .expect(200);

            const resBody = res.body?.data ?? res.body;
            expect(resBody.accessToken).toBeDefined();
            expect(resBody.refreshToken).toBeDefined();
            expect(resBody.user.roles).toContain('ADMIN');
        });

        it('completes login with a valid backup code', async () => {
            const admin = await seedAdmin(dataSource);
            const { backupCodes } = await enableMfa(admin);

            // Step 1
            const challenge = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: admin.password })
                .expect(200);

            const mfaToken = (challenge.body?.data ?? challenge.body).mfaToken;

            // Step 2: first backup code
            const res = await request(app.getHttpServer())
                .post('/auth/login/mfa')
                .set('Authorization', `Bearer ${mfaToken}`)
                .send({ code: backupCodes[0] })
                .expect(200);

            const resBody = res.body?.data ?? res.body;
            expect(resBody.accessToken).toBeDefined();
            // Warn if only 2 or fewer remain — 9 left here, so no warning
            expect(resBody.warning).toBeUndefined();
        });

        it('rejects reuse of the same backup code', async () => {
            const admin = await seedAdmin(dataSource);
            const { backupCodes } = await enableMfa(admin);

            // Use it
            const c1 = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: admin.password })
                .expect(200);
            await request(app.getHttpServer())
                .post('/auth/login/mfa')
                .set('Authorization', `Bearer ${(c1.body?.data ?? c1.body).mfaToken}`)
                .send({ code: backupCodes[0] })
                .expect(200);

            // Try again with the same code
            const c2 = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: admin.password })
                .expect(200);
            await request(app.getHttpServer())
                .post('/auth/login/mfa')
                .set('Authorization', `Bearer ${(c2.body?.data ?? c2.body).mfaToken}`)
                .send({ code: backupCodes[0] })
                .expect(401);
        });

        it('rejects invalid TOTP code', async () => {
            const admin = await seedAdmin(dataSource);
            await enableMfa(admin);

            const challenge = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: admin.password })
                .expect(200);

            const mfaToken = (challenge.body?.data ?? challenge.body).mfaToken;
            const res = await request(app.getHttpServer())
                .post('/auth/login/mfa')
                .set('Authorization', `Bearer ${mfaToken}`)
                .send({ code: '000000' })
                .expect(401);

            expect(res.body.message).toMatch(/Invalid MFA code/i);
        });

        it('rejects full access token on /auth/login/mfa', async () => {
            const admin = await seedAdmin(dataSource);
            const { accessToken } = await loginAs(app, admin.email, admin.password);

            // Try to skip the challenge with a full access token
            await request(app.getHttpServer())
                .post('/auth/login/mfa')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code: '123456' })
                .expect(401);
        });

        it('rejects missing Authorization header on /auth/login/mfa', async () => {
            await request(app.getHttpServer())
                .post('/auth/login/mfa')
                .send({ code: '123456' })
                .expect(401);
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  MFA SETUP / DISABLE
    // ─────────────────────────────────────────────────────────────

    describe('MFA management', () => {
        it('setup requires correct password', async () => {
            const admin = await seedAdmin(dataSource);
            const { accessToken } = await loginAs(app, admin.email, admin.password);

            await request(app.getHttpServer())
                .post('/auth/mfa/setup')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ password: 'wrong-password' })
                .expect(401);
        });

        it('enables MFA after verifying a TOTP code', async () => {
            const admin = await seedAdmin(dataSource);
            const { accessToken } = await loginAs(app, admin.email, admin.password);

            const setup = await request(app.getHttpServer())
                .post('/auth/mfa/setup')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ password: admin.password })
                .expect(200);

            const secret = (setup.body?.data ?? setup.body).secret;

            // Before verify: not enabled
            const status1 = await request(app.getHttpServer())
                .get('/auth/mfa/status')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
            expect((status1.body?.data ?? status1.body).isEnabled).toBe(false);

            // Verify
            await request(app.getHttpServer())
                .post('/auth/mfa/verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code: await generate({ secret }) })
                .expect(200);

            // After verify: enabled
            const status2 = await request(app.getHttpServer())
                .get('/auth/mfa/status')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
            expect((status2.body?.data ?? status2.body).isEnabled).toBe(true);
        });

        it('disables MFA with password + TOTP', async () => {
            const admin = await seedAdmin(dataSource);
            const { accessToken: preMfaToken } = await loginAs(
                app,
                admin.email,
                admin.password,
            );

            // Enable
            const setup = await request(app.getHttpServer())
                .post('/auth/mfa/setup')
                .set('Authorization', `Bearer ${preMfaToken}`)
                .send({ password: admin.password })
                .expect(200);
            const secret = (setup.body?.data ?? setup.body).secret;
            await request(app.getHttpServer())
                .post('/auth/mfa/verify')
                .set('Authorization', `Bearer ${preMfaToken}`)
                .send({ code: await generate({ secret }) })
                .expect(200);

            // Full login (MFA challenge)
            const c = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: admin.password })
                .expect(200);
            const fullLogin = await request(app.getHttpServer())
                .post('/auth/login/mfa')
                .set('Authorization', `Bearer ${(c.body?.data ?? c.body).mfaToken}`)
                .send({ code: await generate({ secret }) })
                .expect(200);
            const fullToken = (fullLogin.body?.data ?? fullLogin.body).accessToken;

            // Disable
            await request(app.getHttpServer())
                .post('/auth/mfa/disable')
                .set('Authorization', `Bearer ${fullToken}`)
                .send({
                    password: admin.password,
                    code: await generate({ secret }),
                })
                .expect(204);

            // Verify status is disabled
            const status = await request(app.getHttpServer())
                .get('/auth/mfa/status')
                .set('Authorization', `Bearer ${fullToken}`)
                .expect(200);
            expect((status.body?.data ?? status.body).isEnabled).toBe(false);

            // Next login is password-only
            const nextLogin = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: admin.password })
                .expect(200);
            const nextLoginBody = nextLogin.body?.data ?? nextLogin.body;
            expect(nextLoginBody.accessToken).toBeDefined();
            expect(nextLoginBody.mfaRequired).toBeUndefined();
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  REFRESH
    // ─────────────────────────────────────────────────────────────

    describe('Refresh token flow', () => {
        it('rotates tokens and detects reuse', async () => {
            const admin = await seedAdmin(dataSource);
            const { refreshToken } = await loginAs(
                app,
                admin.email,
                admin.password,
            );

            // First refresh — OK
            const first = await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken })
                .expect(200);
            const firstBody = first.body?.data ?? first.body;
            expect(firstBody.refreshToken).not.toBe(refreshToken);

            // Reuse old refresh — fail + revoke all
            const reuse = await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken })
                .expect(401);
            expect(reuse.body.message).toMatch(/revoked/i);
        });

        it('rejects expired refresh token', async () => {
            const admin = await seedAdmin(dataSource);
            const { refreshToken } = await loginAs(app, admin.email, admin.password);

            // Force-expire it in the DB
            await dataSource.query(
                `UPDATE refresh_tokens SET expires_at = now() - interval '1 hour' WHERE revoked_at IS NULL`,
            );

            await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken })
                .expect(401);
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  PROTECTED
    // ─────────────────────────────────────────────────────────────

    describe('Protected routes', () => {
        it('401s without a token', async () => {
            await request(app.getHttpServer()).get('/auth/me').expect(401);
        });

        it('200s with a valid token', async () => {
            const admin = await seedAdmin(dataSource);
            const { accessToken } = await loginAs(app, admin.email, admin.password);

            const res = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            const body = res.body?.data ?? res.body;
            expect(body.roles).toContain('ADMIN');
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  RATE LIMITING
    // ─────────────────────────────────────────────────────────────

    describe('Rate limiting', () => {
        it('429s after too many register attempts', async () => {
            const attempts: Promise<request.Response>[] = [];
            for (let i = 0; i < 5; i++) {
                attempts.push(
                    request(app.getHttpServer())
                        .post('/auth/register')
                        .send({
                            email: `spam${i}@x.com`,
                            password: 'MyStr0ng!Pass',
                            fullName: `S${i}`,
                            dateOfBirth: '1990-01-01',
                        }),
                );
            }
            const results = await Promise.all(attempts);
            const codes = results.map((r) => r.status);
            expect(codes).toContain(429);

            const rateLimited = results.find((r) => r.status === 429);
            expect(rateLimited?.body.success).toBe(false);
            expect(rateLimited?.body.statusCode).toBe(429);
        });
    });
});