import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import { AuditService } from '../src/audit/services/audit.service';

export async function createTestApp(): Promise<{
    app: INestApplication;
    dataSource: DataSource;
    close: () => Promise<void>;
}> {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );
    await app.init();

    const dataSource = moduleRef.get<DataSource>(getDataSourceToken());

    return {
        app,
        dataSource,
        close: async () => {
            await AuditService.flush();
            await app.close();
        },
    };
}

/** Truncate all business tables between tests, preserving seed data. */
export async function truncateAll(ds: DataSource): Promise<void> {
    await AuditService.flush();
    await ds.query(`
    TRUNCATE TABLE
      users,
      oauth_tickets,
      oauth_accounts,
      oauth_providers,
      password_reset_tokens,
      email_verification_tokens,
      refresh_tokens,
      login_attempts,
      audit_logs,
      user_mfa,
      mfa_backup_codes,
      contact_attributes,
      customer_attributes,
      customer_contacts,
      customers,
      employee_attributes,
      employee_positions,
      work_schedules,
      employees,
      job_titles,
      departments,
      user_permission_overrides,
      user_roles,
      app_settings,
      oidc_sessions,
      api_keys
    RESTART IDENTITY CASCADE;
  `);
    // Note: roles, permissions, users kept if you re-seed per test class;
    // or add them to the TRUNCATE list and re-seed in beforeAll.
}

/** Bootstrap the first admin for tests. */
export async function seedAdmin(ds: DataSource): Promise<{
    userId: string;
    email: string;
    password: string;
}> {
    const bcrypt = require('bcrypt');
    const email = 'admin-test@example.com';
    const password = 'AdminPass123!';
    const hash = await bcrypt.hash(password, 4);

    const userRes = await ds.query(
        `INSERT INTO users (email, password_hash, is_active, is_email_verified)
     VALUES ($1, $2, true, true)
     ON CONFLICT (email) WHERE deleted_at IS NULL DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
        [email, hash],
    );
    const userId = userRes[0].id;

    await ds.query(
        `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE code = 'ADMIN'
     ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId],
    );

    return { userId, email, password };
}

/** Login helper — returns access + refresh tokens. */
export async function loginAs(
    app: INestApplication,
    email: string,
    password: string,
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
    const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
    const body = res.body?.data ?? res.body;
    return {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        userId: body.user?.id ?? body.userId,
    };
}