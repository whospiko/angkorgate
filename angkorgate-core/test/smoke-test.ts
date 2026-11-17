import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import { generate } from 'otplib';

// ANSI colors for pretty console output
const c = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

let hasErrors = false;
let testCount = 0;
let passCount = 0;

function logSection(title: string) {
    console.log(`\n${c.cyan}${c.bright}━━━ ${title} ━━━${c.reset}`);
}

function assert(name: string, condition: boolean, details?: any) {
    testCount++;
    if (condition) {
        passCount++;
        console.log(`  ${c.green}✓${c.reset} ${name}`);
    } else {
        hasErrors = true;
        console.error(`  ${c.red}✗ FAILED: ${name}${c.reset}`);
        if (details) console.error(`    ${c.gray}${JSON.stringify(details, null, 2)}${c.reset}`);
    }
}

async function runSmokeTest() {
    console.log(`\n${c.bright}🚀 Starting Full System Smoke Test...${c.reset}\n`);

    // 1. Boot the app in-memory
    const app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const http = app.getHttpServer();
    const dataSource = app.get(DataSource);

    // Helper to bypass email verification steps in tests
    const verifyUserInDb = async (email: string) => {
        await dataSource.query(`UPDATE users SET is_email_verified = true WHERE email = $1`, [email]);
    };

    try {
        // ══════════════════════════════════════════════════════════════════
        logSection('1. System Health & Database');
        // ══════════════════════════════════════════════════════════════════
        const dbCheck = await dataSource.query('SELECT 1');
        assert('Database connection established', dbCheck.length > 0);

        // ══════════════════════════════════════════════════════════════════
        logSection('2. Bootstrap Admin & RBAC');
        // ══════════════════════════════════════════════════════════════════
        const adminEmail = `smoke-admin-${Date.now()}@test.com`;
        const adminPass = 'AdminPass123!';

        // Create admin user directly in DB (to get ADMIN role)
        const bcrypt = require('bcrypt');
        const hash = await bcrypt.hash(adminPass, 4);

        const [adminUser] = await dataSource.query(
            `INSERT INTO users (email, password_hash, is_active, is_email_verified) 
       VALUES ($1, $2, true, true) RETURNING id`,
            [adminEmail, hash]
        );

        await dataSource.query(
            `INSERT INTO user_roles (user_id, role_id) 
       SELECT $1, id FROM roles WHERE code = 'ADMIN'`,
            [adminUser.id]
        );

        const adminLogin = await request(http)
            .post('/auth/login')
            .send({ email: adminEmail, password: adminPass });

        assert('Admin login successful', adminLogin.status === 200);
        const adminToken = adminLogin.body?.data?.accessToken;
        assert('Admin has valid token', !!adminToken);
        assert('Admin has ADMIN role', adminLogin.body?.data?.user?.roles?.includes('ADMIN'));

        // ══════════════════════════════════════════════════════════════════
        logSection('3. Customer Registration & Email Verification');
        // ══════════════════════════════════════════════════════════════════
        const custEmail = `smoke-cust-${Date.now()}@test.com`;
        const custPass = 'CustPass123!';

        const regRes = await request(http)
            .post('/auth/register')
            .send({ email: custEmail, password: custPass, fullName: 'Smoke Customer', dateOfBirth: '1995-01-01' });

        assert('Customer registration accepted', regRes.status === 201);

        // Login should fail before verification
        const earlyLogin = await request(http)
            .post('/auth/login')
            .send({ email: custEmail, password: custPass });
        assert('Login blocked before email verification', earlyLogin.status === 403);

        // Bypass email verification via DB
        await verifyUserInDb(custEmail);

        const custLogin = await request(http)
            .post('/auth/login')
            .send({ email: custEmail, password: custPass });
        assert('Customer login successful after verification', custLogin.status === 200);
        let custToken = custLogin.body?.data?.accessToken;
        assert('Customer has valid token', !!custToken);

        // ══════════════════════════════════════════════════════════════════
        logSection('4. Customers Module (PAT / GST / CUS)');
        // ══════════════════════════════════════════════════════════════════
        const patRes = await request(http)
            .post('/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ type: 'PATIENT', fullName: 'Smoke Patient', dateOfBirth: '1990-01-01' });
        assert('Create Patient works', patRes.status === 201);
        assert('Patient code uses PAT- prefix', patRes.body?.data?.customerCode?.startsWith('PAT-'));
        const patientId = patRes.body?.data?.id;

        const guestRes = await request(http)
            .post('/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ type: 'GUEST', fullName: 'Smoke Guest', dateOfBirth: '1980-01-01' });
        assert('Create Guest works', guestRes.status === 201);
        assert('Guest code uses GST- prefix', guestRes.body?.data?.customerCode?.startsWith('GST-'));

        // Test JSONB Attributes
        await request(http)
            .put(`/customers/${patientId}/attributes/blood_type`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ value: 'O+' });
        const attrs = await request(http)
            .get(`/customers/${patientId}/attributes`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Customer attributes (JSONB) saved & retrieved', attrs.body?.data?.blood_type === 'O+');

        // Test Contacts (Guardians)
        const contactRes = await request(http)
            .post(`/customers/${patientId}/contacts`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ fullName: 'Smoke Guardian', relationship: 'Mother', phone: '+123456789' });
        assert('Customer guardian added', contactRes.status === 201);

        // ══════════════════════════════════════════════════════════════════
        logSection('5. Employees Module (Clinic / Hotel / POS)');
        // ══════════════════════════════════════════════════════════════════
        // 1. Seed a department and job title
        await dataSource.query(`INSERT INTO departments (code, name) VALUES ('TEST_DEPT', 'Test Department') ON CONFLICT DO NOTHING`);
        await dataSource.query(`INSERT INTO job_titles (code, name, category) VALUES ('TEST_TITLE', 'Test Title', 'GENERAL') ON CONFLICT DO NOTHING`);

        // 2. Create employee
        const empEmail = `smoke-emp-${Date.now()}@test.com`;
        const [empUser] = await dataSource.query(
            `INSERT INTO users (email, password_hash, is_active, is_email_verified) VALUES ($1, 'hash', true, true) RETURNING id`,
            [empEmail]
        );

        const empRes = await request(http)
            .post('/employees')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ userId: empUser.id, employeeCode: `EMP-${Date.now()}`, fullName: 'Smoke Employee' });
        assert('Create Employee works', empRes.status === 201);
        const empId = empRes.body?.data?.id;

        // 3. Assign position
        const posRes = await request(http)
            .post(`/employees/${empId}/positions`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ jobTitleCode: 'TEST_TITLE', departmentCode: 'TEST_DEPT', isPrimary: true });
        assert('Assign Employee Position works', posRes.status === 201);
        const posId = posRes.body?.data?.id;

        // 4. Assign attributes (generic domain mapping)
        await request(http)
            .put(`/employees/${empId}/positions/${posId}/attributes/license_number`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ value: 'LIC-12345' });
        const empAttrs = await request(http)
            .get(`/employees/${empId}/positions/${posId}/attributes`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Employee attributes (JSONB) saved & retrieved', empAttrs.body?.data?.license_number === 'LIC-12345');

        // ══════════════════════════════════════════════════════════════════
        logSection('6. MFA (TOTP) Setup & Login Flow');
        // ══════════════════════════════════════════════════════════════════
        // Setup MFA for the customer
        const mfaSetup = await request(http)
            .post('/auth/mfa/setup')
            .set('Authorization', `Bearer ${custToken}`)
            .send({ password: custPass });
        assert('MFA Setup successful', mfaSetup.status === 200);
        const mfaSecret = mfaSetup.body?.data?.secret;

        // Verify MFA to enable it
        const mfaCode = await generate({ secret: mfaSecret });
        const mfaVerify = await request(http)
            .post('/auth/mfa/verify')
            .set('Authorization', `Bearer ${custToken}`)
            .send({ code: mfaCode });
        assert('MFA verification enabled', mfaVerify.status === 200);

        // Try logging in again
        const loginChallenge = await request(http)
            .post('/auth/login')
            .send({ email: custEmail, password: custPass });
        assert('Login now requires MFA challenge', loginChallenge.status === 200 && loginChallenge.body?.data?.mfaRequired === true);

        // Complete Login with TOTP
        const mfaToken = loginChallenge.body?.data?.mfaToken;
        const validTotp = await generate({ secret: mfaSecret });
        const loginComplete = await request(http)
            .post('/auth/login/mfa')
            .set('Authorization', `Bearer ${mfaToken}`)
            .send({ code: validTotp });
        assert('Login completed with MFA', loginComplete.status === 200);
        assert('Received real tokens after MFA', !!loginComplete.body?.data?.accessToken);

        // Update token for later requests
        custToken = loginComplete.body?.data?.accessToken;

        // ══════════════════════════════════════════════════════════════════
        logSection('7. Email Change with Verification');
        // ══════════════════════════════════════════════════════════════════
        const newEmail = `smoke-new-${Date.now()}@test.com`;
        const currentTotp = await generate({ secret: mfaSecret });

        // 1. Request change
        const changeReq = await request(http)
            .post('/auth/email/change-request')
            .set('Authorization', `Bearer ${custToken}`)
            .send({ newEmail, mfaCode: currentTotp });
        assert('Email change requested', changeReq.status === 200);

        // 2. Bypass email token via DB (for smoke testing)
        const crypto = require('crypto');
        const knownRawToken = `smoke-test-token-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        const knownHash = crypto.createHash('sha256').update(knownRawToken).digest('hex');

        await dataSource.query(
            `UPDATE email_change_tokens SET token_hash = $1 WHERE user_id = (SELECT id FROM users WHERE email = $2) AND used_at IS NULL`,
            [knownHash, custEmail]
        );

        // 3. Confirm change
        const changeConfirm = await request(http)
            .post('/auth/email/confirm')
            .send({ token: knownRawToken });
        assert('Email change confirmed', changeConfirm.status === 200);

        // 4. Verify new email works
        const finalLogin = await request(http)
            .post('/auth/login')
            .send({ email: newEmail, password: custPass });
        assert('Can login with new email (MFA challenge issued)', finalLogin.body?.data?.mfaRequired === true);

        // ══════════════════════════════════════════════════════════════════
        logSection('8. OAuth Configuration & Gates');
        // ══════════════════════════════════════════════════════════════════
        // Ensure clean state for repeatable smoke tests
        await dataSource.query(`DELETE FROM app_settings WHERE app_code = 'smoke-app'`);
        await dataSource.query(`DELETE FROM oauth_providers WHERE code = 'google'`);

        const providerRes = await request(http)
            .post('/admin/oauth/providers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ code: 'google', name: 'Google', clientId: 'smoke', clientSecret: 'smoke', isActive: true });
        assert('Admin can configure OAuth provider', providerRes.status === 201);

        const appRes = await request(http)
            .post('/admin/apps')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ appCode: 'smoke-app', name: 'Smoke App', oauthEnabled: true, enabledProviders: ['google'] });
        assert('Admin can configure App settings', appRes.status === 201);

        const publicProviders = await request(http)
            .get('/auth/oauth/providers')
            .set('X-App-Code', 'smoke-app');
        assert('OAuth provider listed publicly', publicProviders.body?.data?.providers?.length > 0);

    } catch (err) {
        console.error(`\n${c.red}💥 Smoke test crashed unexpectedly:${c.reset}`, err);
        hasErrors = true;
    } finally {
        await app.close();

        console.log(`\n${c.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
        if (hasErrors) {
            console.error(`${c.red}${c.bright}❌ SMOKE TEST FAILED (${passCount}/${testCount} passed)${c.reset}\n`);
            process.exit(1);
        } else {
            console.log(`${c.green}${c.bright}🎉 SMOKE TEST PASSED (${passCount}/${testCount} checks)${c.reset}\n`);
            process.exit(0);
        }
    }
}

runSmokeTest();