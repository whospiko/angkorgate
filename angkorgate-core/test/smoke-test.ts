import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource, IsNull } from 'typeorm';
import request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import { generate } from 'otplib';
import { CacheService } from '../src/cache/cache.service';
import { AuthService } from '../src/auth/services/auth.service';
import { User } from '../src/users/entities/user.entity';
import { Role } from '../src/rbac/entities/role.entity';
import { UserRole } from '../src/rbac/entities/user-role.entity';
import { Department } from '../src/employees/entities/department.entity';
import { JobTitle } from '../src/employees/entities/job-title.entity';
import { OauthProvider } from '../src/oauth/entities/oauth-provider.entity';
import { AppSetting } from '../src/apps/entities/app-setting.entity';
import { EmailChangeToken } from '../src/auth/entities/email-change-token.entity';

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
    if (dataSource.options.type === 'postgres') {
        await dataSource.runMigrations();
    }

    // Helper to bypass email verification steps in tests
    const verifyUserInDb = async (email: string) => {
        await dataSource.getRepository(User).update({ email }, { isEmailVerified: true });
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

        const userRepo = dataSource.getRepository(User);
        const userRoleRepo = dataSource.getRepository(UserRole);
        const roleRepo = dataSource.getRepository(Role);

        const adminUser = await userRepo.save(userRepo.create({
            email: adminEmail,
            passwordHash: hash,
            isActive: true,
            isEmailVerified: true,
        }));

        const adminRole = await roleRepo.findOne({ where: { code: 'ADMIN' } });
        if (adminRole) {
            await userRoleRepo.save(userRoleRepo.create({
                userId: adminUser.id,
                roleId: adminRole.id,
            }));
        }

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

        // Test cross-DB customer search & status validation
        const searchCustRes = await request(http)
            .get('/customers?search=Smoke')
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Customer search works in SQLite', searchCustRes.status === 200 && (searchCustRes.body?.data?.data?.length ?? 0) >= 1);

        const badCustStatusRes = await request(http)
            .patch(`/customers/${patientId}/status/LEAD`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Invalid customer status rejected with 400', badCustStatusRes.status === 400);

        const archiveCustRes = await request(http)
            .patch(`/customers/${patientId}/status/ARCHIVED`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Valid customer status ARCHIVED accepted', archiveCustRes.status === 204);

        // ══════════════════════════════════════════════════════════════════
        logSection('5. Employees Module (Clinic / Hotel / POS)');
        // ══════════════════════════════════════════════════════════════════
        // 1. Seed a department and job title
        const deptRepo = dataSource.getRepository(Department);
        const titleRepo = dataSource.getRepository(JobTitle);

        if (!await deptRepo.findOne({ where: { code: 'TEST_DEPT' } })) {
            await deptRepo.save(deptRepo.create({ code: 'TEST_DEPT', name: 'Test Department' }));
        }
        if (!await titleRepo.findOne({ where: { code: 'TEST_TITLE' } })) {
            await titleRepo.save(titleRepo.create({ code: 'TEST_TITLE', name: 'Test Title' }));
        }

        // 2. Create employee
        const empEmail = `smoke-emp-${Date.now()}@test.com`;
        const empUser = await userRepo.save(userRepo.create({
            email: empEmail,
            passwordHash: 'hash',
            isActive: true,
            isEmailVerified: true,
        }));

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

        // 5. Schedules & status validation + POS template seeding
        const schedRes = await request(http)
            .post(`/employees/${empId}/schedules`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ dayOfWeek: 1, startTime: '08:00', endTime: '17:00', isActive: true });
        assert('Create Employee schedule works', schedRes.status === 201);
        const schedId = schedRes.body?.data?.id;

        const schedUpdateRes = await request(http)
            .patch(`/employees/${empId}/schedules/${schedId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ endTime: '16:00' });
        assert('Update Employee schedule works', schedUpdateRes.status === 200);

        const badEmpStatusRes = await request(http)
            .patch(`/employees/${empId}/status/PROBATION`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Invalid employee status rejected with 400', badEmpStatusRes.status === 400);

        const leaveEmpStatusRes = await request(http)
            .patch(`/employees/${empId}/status/ON_LEAVE`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Valid employee status ON_LEAVE accepted', leaveEmpStatusRes.status === 204);

        const seedPosRes = await request(http)
            .post('/departments/seed/pos')
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Seed POS departments & job titles works', seedPosRes.status === 201);

        const leaveCreateRes = await request(http)
            .post(`/employees/${empId}/leave-requests`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                leaveType: 'ANNUAL',
                startDate: '2026-12-10',
                endDate: '2026-12-12',
                reason: 'Family trip',
                attachmentName: 'ticket.pdf',
                attachmentMimeType: 'application/pdf',
                attachmentDataUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
            });
        assert('Create Leave Request with PDF attachment works', leaveCreateRes.status === 201);
        const leaveId = leaveCreateRes.body?.data?.id || leaveCreateRes.body?.id;

        const leaveReviewRes = await request(http)
            .patch(`/leave-requests/${leaveId}/review`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ decision: 'APPROVED' });
        assert('Approve Leave Request works', leaveReviewRes.status === 200);

        const leaveListRes = await request(http)
            .get('/leave-requests')
            .set('Authorization', `Bearer ${adminToken}`);
        assert('List Leave Requests works', leaveListRes.status === 200);
        const leaveItems = leaveListRes.body?.data?.data || leaveListRes.body?.data || [];
        const approvedLeave = leaveItems.find((l: any) => l.id === leaveId);
        assert('Leave queue returns attachment and reviewer email', Boolean(approvedLeave?.attachmentName === 'ticket.pdf' && approvedLeave?.reviewedBy?.email));

        const unlinkedMeRes = await request(http)
            .get('/employees/me')
            .set('Authorization', `Bearer ${custToken}`);
        assert('Unlinked user /employees/me returns 200', unlinkedMeRes.status === 200);

        const meUserId = (await request(http)
            .get('/auth/me')
            .set('Authorization', `Bearer ${adminToken}`)).body?.data?.id;
        await request(http)
            .patch(`/employees/${empId}/user`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ userId: meUserId });
        const selfLeaveRes = await request(http)
            .get('/employees/me/leave-requests')
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Linked employee /employees/me/leave-requests returns balances', selfLeaveRes.status === 200 && Array.isArray(selfLeaveRes.body?.data?.balances?.items || selfLeaveRes.body?.balances?.items));

        const policiesRes = await request(http)
            .get('/leave-policies')
            .set('Authorization', `Bearer ${adminToken}`);
        assert('GET /leave-policies returns default yearly quotas', policiesRes.status === 200 && (policiesRes.body?.data || policiesRes.body)?.length >= 3);

        const subEmpRes = await request(http)
            .post('/employees')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ fullName: 'Junior Nurse', managerId: empId, employmentType: 'FULL_TIME' });
        const subEmpId = subEmpRes.body?.data?.id || subEmpRes.body?.id;
        const routedLeaveRes = await request(http)
            .post(`/employees/${subEmpId}/leave-requests`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ leaveType: 'ANNUAL', startDate: '2026-12-22', endDate: '2026-12-23', reason: 'Routed test' });
        const routedLeaveId = routedLeaveRes.body?.data?.id || routedLeaveRes.body?.id;
        const approvalsRes = await request(http)
            .get('/employees/me/approvals')
            .set('Authorization', `Bearer ${adminToken}`);
        const approvalsList = approvalsRes.body?.data || approvalsRes.body || [];
        assert('Leave request routes to manager /employees/me/approvals', approvalsList.some((a: any) => a.id === routedLeaveId));

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

        const custUserRecord = await userRepo.findOne({ where: { email: custEmail } });
        if (custUserRecord) {
            await dataSource.getRepository(EmailChangeToken).update(
                { userId: custUserRecord.id, usedAt: IsNull() },
                { tokenHash: knownHash }
            );
        }

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
        await dataSource.getRepository(AppSetting).delete({ appCode: 'smoke-app' });
        await dataSource.getRepository(OauthProvider).delete({ code: 'google' });

        const providerRes = await request(http)
            .post('/admin/oauth/providers')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ code: 'google', name: 'Google', clientId: 'smoke', clientSecret: 'smoke', isActive: true });
        assert('Admin can configure OAuth provider', providerRes.status === 201);

        const appRes = await request(http)
            .post('/admin/apps')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ appCode: 'smoke-app', name: 'Smoke App', oauthEnabled: true, enabledProviders: ['google'] });
        assert('Admin can configure App settings', appRes.status === 201, { status: appRes.status, body: appRes.body });

        const publicProviders = await request(http)
            .get('/auth/oauth/providers')
            .set('X-App-Code', 'smoke-app');
        assert('OAuth provider listed publicly', publicProviders.body?.data?.providers?.length > 0);

        // ══════════════════════════════════════════════════════════════════
        logSection('9. OpenID Connect (OIDC) & Identity Provider');
        // ══════════════════════════════════════════════════════════════════
        // 1. Root redirect check
        const rootDisco = await request(http).get('/.well-known/openid-configuration');
        assert('Root discovery redirects to /oidc/.well-known/openid-configuration', rootDisco.status === 302 && rootDisco.header.location === '/oidc/.well-known/openid-configuration');

        // 2. OIDC Discovery Document
        const discoRes = await request(http).get('/oidc/.well-known/openid-configuration');
        assert('OIDC Discovery document returns 200', discoRes.status === 200);
        assert('Discovery issuer ends with /oidc', discoRes.body?.issuer?.endsWith('/oidc'));
        assert('Discovery includes standard endpoints',
            !!discoRes.body?.authorization_endpoint &&
            !!discoRes.body?.token_endpoint &&
            !!discoRes.body?.jwks_uri &&
            !!discoRes.body?.userinfo_endpoint
        );
        assert('Discovery includes custom scopes (roles, permissions)',
            discoRes.body?.scopes_supported?.includes('roles') &&
            discoRes.body?.scopes_supported?.includes('permissions')
        );

        // 3. JWKS Keys
        const jwksRes = await request(http).get('/oidc/jwks');
        assert('JWKS endpoint returns valid signing keys', jwksRes.status === 200 && Array.isArray(jwksRes.body?.keys) && jwksRes.body?.keys?.length > 0);
        assert('JWKS contains RS256 RSA key', jwksRes.body?.keys?.[0]?.kty === 'RSA' && jwksRes.body?.keys?.[0]?.alg === 'RS256');

        // 4. Register OIDC Client Application
        const oidcClientCode = 'smoke-oidc-app';
        const oidcClientSecret = 'smoke-secret-key-at-least-32chars';
        const oidcRedirectUri = 'http://localhost:5173/callback';

        await dataSource.getRepository(AppSetting).delete({ appCode: oidcClientCode });

        const oidcAppRes = await request(http)
            .post('/admin/apps')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                appCode: oidcClientCode,
                name: 'Smoke OIDC Client App',
                clientSecret: oidcClientSecret,
                allowedRedirectUrls: [oidcRedirectUri],
                serviceAccountsEnabled: true,
            });
        assert('Register OIDC client app with secret & redirect URI', oidcAppRes.status === 201, { status: oidcAppRes.status, body: oidcAppRes.body });

        // 5. Client Credentials Grant
        const oidcBasicAuth = Buffer.from(`${oidcClientCode}:${oidcClientSecret}`).toString('base64');
        const ccTokenRes = await request(http)
            .post('/oidc/token')
            .set('Authorization', `Basic ${oidcBasicAuth}`)
            .type('form')
            .send({ grant_type: 'client_credentials' });
        assert('OIDC client_credentials grant returns access token', ccTokenRes.status === 200 && !!ccTokenRes.body?.access_token, { status: ccTokenRes.status, body: ccTokenRes.body });
        const ccToken = ccTokenRes.body?.access_token;

        // 6. Token Introspection (RFC 7662)
        const introRes = await request(http)
            .post('/oidc/introspect')
            .set('Authorization', `Basic ${oidcBasicAuth}`)
            .type('form')
            .send({ token: ccToken });
        assert('Token introspection shows active token', introRes.status === 200 && introRes.body?.active === true, { status: introRes.status, body: introRes.body });

        // 7. Token Revocation (RFC 7009)
        const revokeRes = await request(http)
            .post('/oidc/revoke')
            .set('Authorization', `Basic ${oidcBasicAuth}`)
            .type('form')
            .send({ token: ccToken });
        assert('Token revocation endpoint accepted', revokeRes.status === 200);

        const introAfterRevoke = await request(http)
            .post('/oidc/introspect')
            .set('Authorization', `Basic ${oidcBasicAuth}`)
            .type('form')
            .send({ token: ccToken });
        assert('Token introspection shows revoked token is inactive', introAfterRevoke.status === 200 && introAfterRevoke.body?.active === false);

        // 8. Interactive Authorization Code Flow
        const authReq = await request(http)
            .get('/oidc/auth')
            .query({
                client_id: oidcClientCode,
                response_type: 'code',
                scope: 'openid email profile roles',
                redirect_uri: oidcRedirectUri,
                state: 'smoke-state-42',
                nonce: 'smoke-nonce-99',
            });
        assert('Authorization request initiates interaction flow (302/303)', authReq.status === 302 || authReq.status === 303, { status: authReq.status });

        const locationHeader = authReq.header.location || '';
        assert('Redirect target contains interaction UID', locationHeader.includes('interaction'), { location: locationHeader });

        const interactionMatch = locationHeader.match(/interaction(?:=|\/)([a-zA-Z0-9_-]+)/);
        const interactionUid = interactionMatch ? interactionMatch[1] : null;
        assert('Successfully extracted interaction UID', !!interactionUid, { uid: interactionUid });

        const cookieMap = new Map<string, string>();
        const updateCookies = (headerVal: any) => {
            const list = Array.isArray(headerVal) ? headerVal : (typeof headerVal === 'string' ? [headerVal] : []);
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
                return new URL(urlOrPath).pathname;
            } catch {
                return urlOrPath;
            }
        };

        updateCookies(authReq.header['set-cookie']);

        // Complete interaction login with the admin user created in section 2
        const interLoginRes = await request(http)
            .post(`/oidc/interaction/${interactionUid}/login`)
            .set('Cookie', getCookies())
            .set('Accept', 'application/json')
            .send({
                email: adminEmail,
                password: adminPass,
            });
        assert('Interaction login accepts user credentials', interLoginRes.status === 200 && interLoginRes.body?.success === true, { status: interLoginRes.status, body: interLoginRes.body });

        updateCookies(interLoginRes.header['set-cookie']);

        let resumeUrl = resolvePath(interLoginRes.body?.redirectTo) || `/oidc/auth/${interactionUid}`;
        let resumeRes = await request(http)
            .get(resumeUrl)
            .set('Cookie', getCookies());

        updateCookies(resumeRes.header['set-cookie']);

        // If redirected to consent, confirm consent
        let finalLocation = resumeRes.header.location || '';
        if (finalLocation.includes('interaction')) {
            const consentMatch = finalLocation.match(/interaction(?:=|\/)([a-zA-Z0-9_-]+)/);
            const consentUid = consentMatch ? consentMatch[1] : interactionUid;

            const consentRes = await request(http)
                .post(`/oidc/interaction/${consentUid}/confirm`)
                .set('Cookie', getCookies())
                .set('Accept', 'application/json');

            updateCookies(consentRes.header['set-cookie']);

            const afterConsentUrl = resolvePath(consentRes.body?.redirectTo) || `/oidc/auth/${consentUid}`;
            resumeRes = await request(http)
                .get(afterConsentUrl)
                .set('Cookie', getCookies());

            updateCookies(resumeRes.header['set-cookie']);
            finalLocation = resumeRes.header.location || '';
        }

        assert('Authorization flow completes with redirect to client callback', finalLocation.startsWith(oidcRedirectUri), { finalLocation });

        const parsedCallbackUrl = new URL(finalLocation);
        const authCode = parsedCallbackUrl.searchParams.get('code');
        const returnedState = parsedCallbackUrl.searchParams.get('state');

        assert('Authorization code issued in callback URL', !!authCode);
        assert('State matches original request state', returnedState === 'smoke-state-42');

        // 9. Exchange Authorization Code for Tokens
        const codeExchangeRes = await request(http)
            .post('/oidc/token')
            .set('Authorization', `Basic ${oidcBasicAuth}`)
            .type('form')
            .send({
                grant_type: 'authorization_code',
                code: authCode,
                redirect_uri: oidcRedirectUri,
            });

        assert('Token endpoint exchanges authorization code for tokens', codeExchangeRes.status === 200, { status: codeExchangeRes.status, body: codeExchangeRes.body });
        assert('Token response contains access_token, id_token, and Bearer type',
            !!codeExchangeRes.body?.access_token &&
            !!codeExchangeRes.body?.id_token &&
            codeExchangeRes.body?.token_type === 'Bearer'
        );

        const oidcAccessToken = codeExchangeRes.body?.access_token;
        const oidcIdToken = codeExchangeRes.body?.id_token;

        // Verify ID Token format (header.payload.signature)
        const idTokenParts = oidcIdToken.split('.');
        assert('ID token is a valid 3-part signed JWT', idTokenParts.length === 3);

        const idTokenPayload = JSON.parse(Buffer.from(idTokenParts[1], 'base64').toString('utf8'));
        assert('ID token contains correct claims (sub, nonce, iss, aud)',
            idTokenPayload.sub === adminUser.id &&
            idTokenPayload.nonce === 'smoke-nonce-99' &&
            idTokenPayload.aud === oidcClientCode &&
            idTokenPayload.iss?.endsWith('/oidc')
        );

        // 10. UserInfo Endpoint (GET /oidc/me)
        const userinfoRes = await request(http)
            .get('/oidc/me')
            .set('Authorization', `Bearer ${oidcAccessToken}`);

        assert('UserInfo endpoint (/oidc/me) returns 200 with Bearer token', userinfoRes.status === 200, { status: userinfoRes.status, body: userinfoRes.body });
        assert('UserInfo claims contain sub, email, and user roles',
            userinfoRes.body?.sub === adminUser.id &&
            userinfoRes.body?.email === adminEmail &&
            Array.isArray(userinfoRes.body?.roles) &&
            userinfoRes.body?.roles?.includes('ADMIN')
        );

        // ══════════════════════════════════════════════════════════════════
        logSection('10. Distributed Redis & Cache Engine');
        // ══════════════════════════════════════════════════════════════════
        const cacheService = app.get(CacheService);
        assert('CacheService instance resolved', !!cacheService);

        // 1. Health & Status endpoint
        const healthRes = await request(http).get('/');
        assert('Health check returns cache status', healthRes.status === 200 && !!healthRes.body?.cache);

        const cacheStatusRes = await request(http).get('/cache/status');
        assert('Cache status endpoint returns operational metadata', cacheStatusRes.status === 200 && !!(cacheStatusRes.body?.data?.provider || cacheStatusRes.body?.provider));

        // 2. Direct Set and Get
        const samplePayload = { foo: 'bar', counter: 100, ok: true };
        await cacheService.set('smoke:item', samplePayload, 60);
        const retrieved = await cacheService.get<typeof samplePayload>('smoke:item');
        assert('Cache set & get preserves complex objects', JSON.stringify(retrieved) === JSON.stringify(samplePayload));

        // 3. Has check
        const hasKey = await cacheService.has('smoke:item');
        assert('Cache has() confirms key existence', hasKey === true);

        // 4. Cache-aside wrap
        let wrapExecutions = 0;
        const wrappedVal1 = await cacheService.wrap('smoke:wrapped', async () => {
            wrapExecutions++;
            return 'calculated-value';
        }, 60);
        const wrappedVal2 = await cacheService.wrap('smoke:wrapped', async () => {
            wrapExecutions++;
            return 'calculated-value';
        }, 60);
        assert('Cache wrap() serves cached value on subsequent call', wrappedVal1 === 'calculated-value' && wrappedVal2 === 'calculated-value' && wrapExecutions === 1);

        // 5. Pattern-based deletion
        await cacheService.set('smoke:rbac:user-1:p1', true);
        await cacheService.set('smoke:rbac:user-1:p2', true);
        await cacheService.set('smoke:rbac:user-2:p1', true);

        await cacheService.delByPattern('smoke:rbac:user-1:*');
        const user1P1 = await cacheService.get('smoke:rbac:user-1:p1');
        const user2P1 = await cacheService.get('smoke:rbac:user-2:p1');
        assert('delByPattern invalidates matching keys and preserves others', user1P1 === null && user2P1 === true);

        // 6. Delete key
        await cacheService.del('smoke:item');
        assert('Cache del() removes key', (await cacheService.get('smoke:item')) === null);

        // ══════════════════════════════════════════════════════════════════
        logSection('11. Extended Module APIs (Console / IAM Read & Write)');
        // ══════════════════════════════════════════════════════════════════
        const dataOf = (res: any) => (res?.body && 'data' in res.body ? res.body.data : res?.body);

        // 1. Auth: /auth/me/permissions
        const permsRes = await request(http)
            .get('/auth/me/permissions')
            .set('Authorization', `Bearer ${adminToken}`);
        const permsData = dataOf(permsRes);
        assert('Auth /auth/me/permissions returns user effective permissions', permsRes.status === 200 && Array.isArray(permsData) && permsData.length > 0);

        // 2. Users: Search & Filtering
        const userSearchRes = await request(http)
            .get(`/users?search=${encodeURIComponent(adminEmail.substring(0, 8))}`)
            .set('Authorization', `Bearer ${adminToken}`);
        const searchData = dataOf(userSearchRes);
        const searchItems = Array.isArray(searchData) ? searchData : searchData?.data;
        assert('Users list with search filtering returns results', userSearchRes.status === 200 && Array.isArray(searchItems) && searchItems.length > 0);

        // 3. Users: /users/:id/roles
        const userRolesRes = await request(http)
            .get(`/users/${adminUser.id}/roles`)
            .set('Authorization', `Bearer ${adminToken}`);
        const userRolesData = dataOf(userRolesRes);
        assert('Users /users/:id/roles returns assigned roles', userRolesRes.status === 200 && Array.isArray(userRolesData) && userRolesData.includes('ADMIN'));

        // 4. Users: /users/:id/unlock
        const unlockRes = await request(http)
            .patch(`/users/${adminUser.id}/unlock`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Users /users/:id/unlock clears lock and returns 204', unlockRes.status === 204);

        // 5. Users: /users/:id/reset-password
        const resetPassRes = await request(http)
            .post(`/users/${adminUser.id}/reset-password`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ newPassword: 'NewAdminPass123!', mustChangePassword: false });
        assert('Users /users/:id/reset-password resets password and returns 204', resetPassRes.status === 204);

        // 6. RBAC: /rbac/roles/:id/permissions
        const adminRoleRow = await roleRepo.findOne({ where: { code: 'ADMIN' } });
        const rolePermsRes = await request(http)
            .get(`/rbac/roles/${adminRoleRow?.id}/permissions`)
            .set('Authorization', `Bearer ${adminToken}`);
        const rolePermsData = dataOf(rolePermsRes);
        assert('RBAC /rbac/roles/:id/permissions returns role permissions', rolePermsRes.status === 200 && Array.isArray(rolePermsData) && rolePermsData.length > 0);

        // 7. RBAC: /rbac/permissions/:code
        const singlePermRes = await request(http)
            .get('/rbac/permissions/user:read')
            .set('Authorization', `Bearer ${adminToken}`);
        const singlePermData = dataOf(singlePermRes);
        assert('RBAC /rbac/permissions/:code returns single permission', singlePermRes.status === 200 && singlePermData?.code === 'user:read');

        // 8. RBAC: Overrides
        const overrideRes = await request(http)
            .post('/rbac/overrides')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ userId: adminUser.id, permissionCode: 'user:delete', effect: 'GRANT' });
        assert('RBAC /rbac/overrides sets permission override', overrideRes.status === 204);

        const listOverridesRes = await request(http)
            .get(`/rbac/overrides/${adminUser.id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        const listOverridesData = dataOf(listOverridesRes);
        assert('RBAC /rbac/overrides/:userId returns user overrides', listOverridesRes.status === 200 && Array.isArray(listOverridesData) && listOverridesData.some((o: any) => o.permissionCode === 'user:delete'));

        // 9. Apps: regenerate-secret & toggle
        const regenRes = await request(http)
            .post('/admin/apps/smoke-app/regenerate-secret')
            .set('Authorization', `Bearer ${adminToken}`);
        const regenData = dataOf(regenRes);
        assert('Apps /admin/apps/:code/regenerate-secret returns new secret', regenRes.status === 200 && !!regenData?.clientSecret);

        const toggleAppRes = await request(http)
            .patch('/admin/apps/smoke-app/toggle?feature=passwordLogin')
            .set('Authorization', `Bearer ${adminToken}`);
        const toggleAppData = dataOf(toggleAppRes);
        assert('Apps /admin/apps/:code/toggle toggles feature flag', toggleAppRes.status === 200 && typeof toggleAppData?.passwordLoginEnabled === 'boolean');

        // 10. OAuth: /admin/oauth/providers/:code
        const singleProviderRes = await request(http)
            .get('/admin/oauth/providers/google')
            .set('Authorization', `Bearer ${adminToken}`);
        const singleProviderData = dataOf(singleProviderRes);
        assert('OAuth /admin/oauth/providers/:code returns provider details', singleProviderRes.status === 200 && singleProviderData?.code === 'google');

        // 11. Audit: /audit-logs/actions
        const actionsRes = await request(http)
            .get('/audit-logs/actions')
            .set('Authorization', `Bearer ${adminToken}`);
        const actionsData = dataOf(actionsRes);
        assert('Audit /audit-logs/actions returns distinct action codes', actionsRes.status === 200 && Array.isArray(actionsData) && actionsData.length > 0);

        // 12. Customers: /customers/:customerId/contacts/:contactId
        const contactId = contactRes.body?.data?.id || contactRes.body?.id;
        if (contactId && patientId) {
            const getContactRes = await request(http)
                .get(`/customers/${patientId}/contacts/${contactId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            const contactData = dataOf(getContactRes);
            assert('Customers GET /customers/:customerId/contacts/:contactId returns contact', getContactRes.status === 200 && contactData?.fullName === 'Smoke Guardian');
        }

        // 13. Employees: Departments CRUD
        const deptCode = `SMOKE_D_${Date.now().toString().slice(-6)}`;
        const createDept = await request(http)
            .post('/departments')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ code: deptCode, name: 'Smoke Test Department' });
        assert('Departments POST /departments creates department', createDept.status === 201);

        const getDept = await request(http)
            .get(`/departments/${deptCode}`)
            .set('Authorization', `Bearer ${adminToken}`);
        const getDeptData = dataOf(getDept);
        assert('Departments GET /departments/:code retrieves department', getDept.status === 200 && getDeptData?.code === deptCode);

        const patchDept = await request(http)
            .patch(`/departments/${deptCode}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Smoke Test Department Updated' });
        const patchDeptData = dataOf(patchDept);
        assert('Departments PATCH /departments/:code updates department', patchDept.status === 200 && patchDeptData?.name === 'Smoke Test Department Updated');

        const delDept = await request(http)
            .delete(`/departments/${deptCode}`)
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Departments DELETE /departments/:code removes department', delDept.status === 204);

        // ══════════════════════════════════════════════════════════════════
        logSection('12. Refresh Token Family Reuse Detection & Enriched Sessions');
        // ══════════════════════════════════════════════════════════════════
        const sessionUserEmail = `session-smoke-${Date.now()}@example.com`;
        const sessionUserPass = 'SessionSmoke123!';
        const createSessionUser = await request(http)
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                email: sessionUserEmail,
                password: sessionUserPass,
                isActive: true,
                isEmailVerified: true,
            });
        const sessionUser = dataOf(createSessionUser);
        assert('Created dedicated user for session family checks', createSessionUser.status === 201 && !!sessionUser?.id);

        const authService = app.get(AuthService);
        const smokeDesktopUa =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
        const smokeMobileUa =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';

        const devABody = await authService.issueTokensForUser(
            sessionUser.id,
            sessionUserEmail,
            null,
            { ip: '203.0.113.10', userAgent: smokeDesktopUa },
        );
        assert('Device A login issues refresh token', !!devABody?.refreshToken);

        const devBBody = await authService.issueTokensForUser(
            sessionUser.id,
            sessionUserEmail,
            null,
            { ip: '198.51.100.42', userAgent: smokeMobileUa },
        );
        assert('Device B login issues independent refresh token', !!devBBody?.refreshToken);

        const devCBody = await authService.issueTokensForUser(
            sessionUser.id,
            sessionUserEmail,
            null,
            { ip: '192.0.2.77', userAgent: 'curl/8.7.1' },
        );
        assert('Device C login issues third session', !!devCBody?.refreshToken);

        // Rotate Device A token -> rtA2
        const rotA = await request(http)
            .post('/auth/refresh')
            .set('User-Agent', smokeDesktopUa)
            .send({ refreshToken: devABody.refreshToken });
        const rotABody = dataOf(rotA);
        assert('Device A refresh rotates token cleanly', rotA.status === 200 && rotABody?.refreshToken && rotABody.refreshToken !== devABody.refreshToken);

        // Replay old Device A token -> 401 AND revokes Family A (rtA2 fails), while Device B/C stay alive
        const replayA = await request(http)
            .post('/auth/refresh')
            .send({ refreshToken: devABody.refreshToken });
        assert('Replaying rotated Device A token fails with 401', replayA.status === 401);

        const postReplayA2 = await request(http)
            .post('/auth/refresh')
            .send({ refreshToken: rotABody.refreshToken });
        assert('Family A successor token is immediately revoked after replay', postReplayA2.status === 401);

        // Enriched /auth/sessions check
        const selfSessionsRes = await request(http)
            .get(`/auth/sessions?currentRefreshToken=${encodeURIComponent(devBBody.refreshToken)}`)
            .set('Authorization', `Bearer ${devBBody.accessToken}`);
        const selfSessions = dataOf(selfSessionsRes);
        const currentMobile = Array.isArray(selfSessions) ? selfSessions.find((s: any) => s.isCurrent) : null;
        assert(
            'GET /auth/sessions returns parsed OS/Browser, IP, Last Active, and isCurrent',
            selfSessionsRes.status === 200 &&
                currentMobile?.browser === 'Safari 18' &&
                currentMobile?.os === 'iOS 18.1' &&
                currentMobile?.ipAddress === '198.51.100.42' &&
                !!currentMobile?.lastActiveAt,
        );

        // Admin GET /users/:id/sessions
        const adminSessionsRes = await request(http)
            .get(`/users/${sessionUser.id}/sessions`)
            .set('Authorization', `Bearer ${adminToken}`);
        const adminSessions = dataOf(adminSessionsRes);
        assert(
            'GET /users/:id/sessions lists active sessions for admin',
            adminSessionsRes.status === 200 && Array.isArray(adminSessions) && adminSessions.length === 2,
        );

        // Revoke all other sessions from Device B -> Device C dies, Device B stays active
        const revokeOthersRes = await request(http)
            .post('/auth/sessions/revoke-others')
            .set('Authorization', `Bearer ${devBBody.accessToken}`)
            .send({ currentRefreshToken: devBBody.refreshToken });
        const revokeOthersData = dataOf(revokeOthersRes);
        assert(
            'POST /auth/sessions/revoke-others revokes other families while preserving current',
            revokeOthersRes.status === 200 && revokeOthersData?.revokedCount === 1,
        );

        const devCRefreshAfter = await request(http)
            .post('/auth/refresh')
            .send({ refreshToken: devCBody.refreshToken });
        assert('Device C refresh fails after revoke-others', devCRefreshAfter.status === 401);

        const devBRefreshAfter = await request(http)
            .post('/auth/refresh')
            .send({ refreshToken: devBBody.refreshToken });
        assert('Device B refresh still succeeds after revoke-others', devBRefreshAfter.status === 200);

        // ══════════════════════════════════════════════════════════════════
        logSection('13. Step-Up Verification & Masked Secret Reveal');
        // ══════════════════════════════════════════════════════════════════
        const maskedAppRes = await request(http)
            .get('/admin/apps/smoke-app')
            .set('Authorization', `Bearer ${adminToken}`);
        const maskedAppData = dataOf(maskedAppRes);
        assert(
            'GET /admin/apps/:code masks clientSecret by default',
            maskedAppRes.status === 200 && maskedAppData?.clientSecret === '••••••••',
        );

        const maskedAppsListRes = await request(http)
            .get('/admin/apps')
            .set('Authorization', `Bearer ${adminToken}`);
        const maskedAppsList = dataOf(maskedAppsListRes);
        const smokeAppRow = Array.isArray(maskedAppsList)
            ? maskedAppsList.find((a: any) => a.appCode === 'smoke-app')
            : null;
        assert(
            'GET /admin/apps masks confidential app secrets',
            maskedAppsListRes.status === 200 && smokeAppRow?.clientSecret === '••••••••',
        );

        // Store a runtime secret via PATCH /system/runtime-config
        const patchRuntimeRes = await request(http)
            .patch('/system/runtime-config')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ settings: { MAIL_PASS: 'smoke-secret-smtp-pass' } });
        assert('PATCH /system/runtime-config saves secret', patchRuntimeRes.status === 200);

        // Reveal attempts before step-up must fail with 403
        const unverifiedAppReveal = await request(http)
            .get('/admin/apps/smoke-app/reveal-secret')
            .set('Authorization', `Bearer ${adminToken}`);
        assert(
            'GET /admin/apps/:code/reveal-secret rejects before step-up (403)',
            unverifiedAppReveal.status === 403,
        );

        const unverifiedRuntimeReveal = await request(http)
            .get('/system/runtime-config/MAIL_PASS/reveal')
            .set('Authorization', `Bearer ${adminToken}`);
        assert(
            'GET /system/runtime-config/:key/reveal rejects before step-up (403)',
            unverifiedRuntimeReveal.status === 403,
        );

        // Status before verification
        const stepUpBeforeRes = await request(http)
            .get('/auth/step-up/status')
            .set('Authorization', `Bearer ${adminToken}`);
        const stepUpBefore = dataOf(stepUpBeforeRes);
        assert(
            'GET /auth/step-up/status reports unverified with password enabled',
            stepUpBeforeRes.status === 200 &&
                stepUpBefore?.verified === false &&
                stepUpBefore?.availableMethods?.password === true,
        );

        // Wrong password fails 401
        const badStepUp = await request(http)
            .post('/auth/step-up/verify')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ method: 'password', password: 'WrongPassword!' });
        assert('POST /auth/step-up/verify rejects wrong password (401)', badStepUp.status === 401);

        // Correct password unlocks 5-minute sudo window (Section 11 reset admin password to NewAdminPass123!)
        const goodStepUp = await request(http)
            .post('/auth/step-up/verify')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ method: 'password', password: 'NewAdminPass123!' });
        const goodStepUpData = dataOf(goodStepUp);
        assert(
            'POST /auth/step-up/verify unlocks sudo window for password',
            (goodStepUp.status === 200 || goodStepUp.status === 201) &&
                goodStepUpData?.verified === true &&
                goodStepUpData?.method === 'password',
        );

        // Reveal endpoints succeed after step-up
        const verifiedAppReveal = await request(http)
            .get('/admin/apps/smoke-app/reveal-secret')
            .set('Authorization', `Bearer ${adminToken}`);
        const verifiedAppData = dataOf(verifiedAppReveal);
        assert(
            'GET /admin/apps/:code/reveal-secret returns plaintext secret after step-up',
            verifiedAppReveal.status === 200 &&
                typeof verifiedAppData?.clientSecret === 'string' &&
                verifiedAppData.clientSecret.length > 0 &&
                verifiedAppData.clientSecret !== '••••••••',
        );

        const verifiedRuntimeReveal = await request(http)
            .get('/system/runtime-config/MAIL_PASS/reveal')
            .set('Authorization', `Bearer ${adminToken}`);
        const verifiedRuntimeData = dataOf(verifiedRuntimeReveal);
        assert(
            'GET /system/runtime-config/:key/reveal decrypts and returns secret after step-up',
            verifiedRuntimeReveal.status === 200 &&
                verifiedRuntimeData?.key === 'MAIL_PASS' &&
                verifiedRuntimeData?.value === 'smoke-secret-smtp-pass',
        );

        // Clear sudo lock -> reveal is blocked again
        const lockStepUp = await request(http)
            .delete('/auth/step-up')
            .set('Authorization', `Bearer ${adminToken}`);
        assert('DELETE /auth/step-up clears sudo window', lockStepUp.status === 200 || lockStepUp.status === 204);

        const postLockReveal = await request(http)
            .get('/admin/apps/smoke-app/reveal-secret')
            .set('Authorization', `Bearer ${adminToken}`);
        assert('Reveal endpoint rejects again (403) after sudo lock is cleared', postLockReveal.status === 403);

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

void runSmokeTest();