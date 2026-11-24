import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

async function runDevModeSmokeTest() {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_SQLITE_DATABASE = ':memory:';
    process.env.CREATE_DEV_ADMIN = 'false';
    process.env.JWT_ACCESS_SECRET = '044f00bb36c436c2be0d49edd97f6991cac1433fe19fea152abbf84d5e50156073cf896d7fa3f2589a4d5ea689e9a201';
    process.env.JWT_REFRESH_SECRET = '6b6725d0a38e587a00a800734262d277985cbb0dcca1c373dca2ec9be0c9b83fb810002acb38d9f239ad12d999c4a034';
    process.env.OAUTH_ENABLED = 'false';
    process.env.REDIS_ENABLED = 'false';

    console.log('\n🚀 Starting SQLite Dev Mode Verification Test...\n');

    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );
    await app.init();

    const server = app.getHttpServer();
    const ds = app.get(DataSource);

    try {
        // 1. Verify DB Driver
        console.log(`[Check 1] Active Database Driver: ${ds.options.type}`);
        if (ds.options.type !== 'better-sqlite3') {
            throw new Error(`Expected better-sqlite3 but got ${ds.options.type}`);
        }

        // 2. Verify Initial Setup Status (Admin NOT pre-seeded)
        console.log('[Check 2] Testing System Setup Status (Uninitialized)...');
        const setupStatusRes = await request(server)
            .get('/system/setup-status')
            .expect(200);
        const setupStatus = setupStatusRes.body?.data ?? setupStatusRes.body;
        if (setupStatus.isInitialized) {
            throw new Error(`Expected isInitialized: false, but got true: ${JSON.stringify(setupStatus)}`);
        }
        if (!setupStatus.requiresAdmin) {
            throw new Error(`Expected requiresAdmin: true, but got false: ${JSON.stringify(setupStatus)}`);
        }
        console.log('  ✓ System correctly reports uninitialized status (requiresAdmin: true).');

        // 3. Execute Initial Setup (simulating Frontend Setup Wizard)
        console.log('[Check 3] Executing Initial Setup Wizard (/system/setup)...');
        const setupRes = await request(server)
            .post('/system/setup')
            .send({
                appName: 'AngkorGate IAM',
                adminEmail: 'setup-admin@angkorgate.local',
                adminPassword: 'SetupPass123!',
            })
            .expect(200);

        const setupResult = setupRes.body?.data ?? setupRes.body;
        if (!setupResult.tokens?.accessToken) {
            throw new Error(`Setup failed to return tokens: ${JSON.stringify(setupRes.body)}`);
        }
        console.log(`  ✓ Setup completed successfully! Admin created: ${setupResult.user?.email}`);
        const token = setupResult.tokens.accessToken;

        // 4. Verify System Setup is Now Permanently Locked
        console.log('[Check 4] Verifying Setup Endpoint is Now Locked...');
        const lockedStatusRes = await request(server)
            .get('/system/setup-status')
            .expect(200);
        const lockedStatus = lockedStatusRes.body?.data ?? lockedStatusRes.body;
        if (!lockedStatus.isInitialized) {
            throw new Error('Expected isInitialized: true after setup execution');
        }
        await request(server)
            .post('/system/setup')
            .send({
                appName: 'Hacker App',
                adminEmail: 'hacker@angkorgate.local',
                adminPassword: 'HackerPass123!',
            })
            .expect(403);
        console.log('  ✓ Setup endpoint permanently locked (403 Forbidden).');

        // 5. Verify Authenticated User Profile
        console.log('[Check 5] Testing /auth/me with Bearer token...');
        const meRes = await request(server)
            .get('/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const meBody = meRes.body?.data ?? meRes.body;
        console.log(`  ✓ Authenticated as: ${meBody.email}, roles: ${JSON.stringify(meBody.roles)}`);

        // 6. Verify OIDC Discovery Endpoint
        console.log('[Check 6] Testing OIDC Discovery Endpoint...');
        const oidcRes = await request(server)
            .get('/oidc/.well-known/openid-configuration')
            .expect(200);

        if (!oidcRes.body.issuer) {
            throw new Error(`OIDC Discovery returned invalid config: ${JSON.stringify(oidcRes.body)}`);
        }
        console.log(`  ✓ OIDC Discovery Issuer: ${oidcRes.body.issuer}`);

        // 7. Verify Client Apps Seeded
        console.log('[Check 7] Verifying seeded OIDC Client Applications...');
        const appsRes = await request(server)
            .get('/admin/apps')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const appsBody = appsRes.body?.data ?? appsRes.body;
        console.log(`  ✓ Seeded apps found: ${Array.isArray(appsBody) ? appsBody.map((a: any) => a.appCode).join(', ') : (appsBody.items ? appsBody.items.map((a: any) => a.appCode).join(', ') : 'OK')}`);

        // 8. Verify User Registration
        console.log('[Check 8] Testing New User Registration & User Management...');
        const newUserEmail = `test-${Date.now()}@example.com`;
        const regRes = await request(server)
            .post('/auth/register')
            .send({
                email: newUserEmail,
                password: 'Str0ngPass!2026',
                fullName: 'Dev Test User',
                dateOfBirth: '1995-05-15',
            })
            .expect(201);
        console.log(`  ✓ Successfully registered new user: ${newUserEmail}`);

        console.log('\n======================================================');
        console.log('🎉 ALL SQLITE DEV MODE TESTS PASSED WITH FLYING COLORS!');
        console.log('======================================================\n');
    } finally {
        await app.close();
    }
}

runDevModeSmokeTest().catch((err) => {
    console.error('VERIFICATION TEST FAILED:', err);
    process.exit(1);
});
