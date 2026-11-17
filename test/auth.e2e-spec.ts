import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
    createTestApp,
    seedAdmin,
    truncateAll,
    loginAs,
} from './e2e-utils';

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

    describe('POST /auth/register', () => {
        it('creates a customer and requires email verification', async () => {
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'jane@example.com',
                    password: 'MyStr0ng!Pass',
                    fullName: 'Jane',
                    dateOfBirth: '1995-01-01',
                })
                .expect(201);

            // Login before verify should fail
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'jane@example.com', password: 'MyStr0ng!Pass' })
                .expect(403);

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
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'weak@x.com',
                    password: '12345',
                    fullName: 'X',
                    dateOfBirth: '1990-01-01',
                })
                .expect(400);
        });

        it('rejects duplicate email', async () => {
            await seedAdmin(dataSource);
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'admin-test@example.com',
                    password: 'AnotherStrong1!',
                    fullName: 'X',
                    dateOfBirth: '1990-01-01',
                })
                .expect(409);
        });
    });

    describe('POST /auth/login', () => {
        it('returns tokens for valid credentials', async () => {
            const admin = await seedAdmin(dataSource);
            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: admin.password })
                .expect(200);

            expect(res.body.accessToken).toBeDefined();
            expect(res.body.refreshToken).toBeDefined();
            expect(res.body.user.roles).toContain('ADMIN');
        });

        it('rejects wrong password with generic message', async () => {
            const admin = await seedAdmin(dataSource);
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: admin.email, password: 'wrong' })
                .expect(401)
                .expect((r) => {
                    expect(r.body.message).toBe('Invalid credentials');
                });
        });

        it('rejects unknown user with same message', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'ghost@nowhere.com', password: 'x' })
                .expect(401)
                .expect((r) => {
                    expect(r.body.message).toBe('Invalid credentials');
                });
        });
    });

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
            expect(first.body.refreshToken).not.toBe(refreshToken);

            // Reuse old refresh — fail + revoke all
            await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken })
                .expect(401);
        });
    });

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

            expect(res.body.roles).toContain('ADMIN');
        });
    });

    describe('Rate limiting', () => {
        it('429s after too many register attempts', async () => {
            const attempts = [];
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
        });
    });
});