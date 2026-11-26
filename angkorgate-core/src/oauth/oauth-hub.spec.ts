import crypto from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OidcService } from '../oidc/services/oidc.service';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { OauthAdminController } from './controllers/oauth-admin.controller';
import { OauthAuthController } from './controllers/oauth-auth.controller';
import { OauthAccount } from './entities/oauth-account.entity';
import { OauthProvider } from './entities/oauth-provider.entity';
import { OauthTicket } from './entities/oauth-ticket.entity';
import { DynamicOauthGuard } from './guards/dynamic-oauth.guard';
import { OauthAccountsService } from './services/oauth-accounts.service';
import { OauthConfigService } from './services/oauth-config.service';
import { OauthLoginService } from './services/oauth-login.service';
import { OauthProvidersService } from './services/oauth-providers.service';
import { OauthRedirectService } from './services/oauth-redirect.service';
import { OauthStrategyRegistry } from './services/oauth-strategy.registry';
import { OauthTicketService } from './services/oauth-ticket.service';

describe('Pluggable Social Identity Hub (NestJS HTTP Integration)', () => {
    let app: INestApplication;
    let providersStore: OauthProvider[];
    let ticketsStore: OauthTicket[];
    let accountsStore: OauthAccount[];
    let registry: OauthStrategyRegistry;

    beforeAll(async () => {
        providersStore = [];
        ticketsStore = [];
        accountsStore = [];

        const providerRepoMock = {
            find: jest.fn(async (opts?: { where?: { isActive?: boolean } }) => {
                let rows = [...providersStore];
                if (opts?.where?.isActive !== undefined) {
                    rows = rows.filter((r) => r.isActive === opts.where!.isActive);
                }
                return rows.sort((a, b) => a.code.localeCompare(b.code));
            }),
            findOne: jest.fn(async (opts: { where: { code?: string } }) => {
                return providersStore.find((r) => r.code === opts.where.code) ?? null;
            }),
            create: jest.fn((data: Partial<OauthProvider>) => ({
                id: crypto.randomUUID(),
                isActive: false,
                clientSecret: null,
                scopes: null,
                extraConfig: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                ...data,
            })),
            save: jest.fn(async (entity: OauthProvider) => {
                const idx = providersStore.findIndex((r) => r.code === entity.code);
                if (idx >= 0) {
                    providersStore[idx] = { ...entity, updatedAt: new Date() };
                    return providersStore[idx];
                }
                providersStore.push(entity);
                return entity;
            }),
            delete: jest.fn(async (where: { code?: string }) => {
                const before = providersStore.length;
                providersStore = providersStore.filter((r) => r.code !== where.code);
                return { affected: before - providersStore.length };
            }),
        };

        const ticketRepoMock = {
            create: jest.fn((data: Partial<OauthTicket>) => ({
                id: crypto.randomUUID(),
                usedAt: null,
                createdAt: new Date(),
                ...data,
            })),
            save: jest.fn(async (entity: OauthTicket) => {
                ticketsStore.push(entity);
                return entity;
            }),
            findOne: jest.fn(async (opts: { where: { ticketHash?: string } }) => {
                return ticketsStore.find((t) => t.ticketHash === opts.where.ticketHash) ?? null;
            }),
            update: jest.fn(
                async (
                    where: { id?: string; usedAt?: unknown },
                    patch: Partial<OauthTicket>,
                ) => {
                    const row = ticketsStore.find(
                        (t) => t.id === where.id && t.usedAt === null,
                    );
                    if (!row) return { affected: 0 };
                    Object.assign(row, patch);
                    return { affected: 1 };
                },
            ),
            delete: jest.fn(async () => ({ affected: 0 })),
        };

        const accountRepoMock = {
            find: jest.fn(async (opts: { where: { userId?: string } }) => {
                return accountsStore.filter((a) => a.userId === opts.where.userId);
            }),
            findOne: jest.fn(
                async (opts: {
                    where: { provider?: string; providerUserId?: string; userId?: string };
                }) => {
                    return (
                        accountsStore.find((a) => {
                            if (opts.where.provider && a.provider !== opts.where.provider) {
                                return false;
                            }
                            if (
                                opts.where.providerUserId &&
                                a.providerUserId !== opts.where.providerUserId
                            ) {
                                return false;
                            }
                            if (opts.where.userId && a.userId !== opts.where.userId) {
                                return false;
                            }
                            return true;
                        }) ?? null
                    );
                },
            ),
            create: jest.fn((data: Partial<OauthAccount>) => ({
                id: crypto.randomUUID(),
                linkedAt: new Date(),
                ...data,
            })),
            save: jest.fn(async (entity: OauthAccount) => {
                accountsStore.push(entity);
                return entity;
            }),
            update: jest.fn(async () => ({ affected: 1 })),
            delete: jest.fn(async (where: { userId?: string; provider?: string }) => {
                const before = accountsStore.length;
                accountsStore = accountsStore.filter(
                    (a) => !(a.userId === where.userId && a.provider === where.provider),
                );
                return { affected: before - accountsStore.length };
            }),
        };

        const configMock = {
            get: jest.fn((key: string) => {
                const map: Record<string, unknown> = {
                    'oauth.enabled': true,
                    'oauth.callbackBaseUrl': 'http://localhost:8080',
                    'oauth.webUrl': 'http://localhost:4000',
                    APP_WEB_URL: 'http://localhost:4000',
                    NODE_ENV: 'test',
                };
                return map[key];
            }),
        };

        const loginServiceMock = {
            loginWithProfile: jest.fn(async (profile) => {
                const existing = accountsStore.find(
                    (a) =>
                        a.provider === profile.provider &&
                        a.providerUserId === profile.providerUserId,
                );
                const userId = existing?.userId ?? 'user-telegram-1';
                if (!existing) {
                    accountsStore.push({
                        id: crypto.randomUUID(),
                        userId,
                        provider: profile.provider,
                        providerUserId: profile.providerUserId,
                        email: profile.email,
                        emailVerifiedAt: null,
                        rawProfile: profile.raw,
                        linkedAt: new Date(),
                        lastLoginAt: new Date(),
                    } as OauthAccount);
                }
                return {
                    userId,
                    tokens: {
                        accessToken: 'jwt-access-token',
                        refreshToken: 'jwt-refresh-token',
                    },
                };
            }),
            linkToCurrentUser: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [OauthAuthController, OauthAdminController],
            providers: [
                OauthConfigService,
                OauthProvidersService,
                OauthAccountsService,
                OauthRedirectService,
                OauthTicketService,
                OauthStrategyRegistry,
                DynamicOauthGuard,
                { provide: ConfigService, useValue: configMock },
                { provide: OauthLoginService, useValue: loginServiceMock },
                { provide: OidcService, useValue: { oidc: {} } },
                { provide: getRepositoryToken(OauthProvider), useValue: providerRepoMock },
                { provide: getRepositoryToken(OauthTicket), useValue: ticketRepoMock },
                { provide: getRepositoryToken(OauthAccount), useValue: accountRepoMock },
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue({
                canActivate: (ctx: { switchToHttp: () => { getRequest: () => { user?: unknown } } }) => {
                    ctx.switchToHttp().getRequest().user = { id: 'user-telegram-1' };
                    return true;
                },
            })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (ctx: { switchToHttp: () => { getRequest: () => { user?: unknown } } }) => {
                    ctx.switchToHttp().getRequest().user = { id: 'user-telegram-1' };
                    return true;
                },
            })
            .overrideGuard(PermissionsGuard)
            .useValue({ canActivate: () => true })
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
        registry = moduleRef.get(OauthStrategyRegistry);
    });

    afterAll(async () => {
        registry?.onModuleDestroy();
        if (app) {
            await app.close();
        }
    });

    it('supports creating, hot-updating, toggling, and authenticating across GitHub, Discord, Microsoft, and Telegram without restart', async () => {
        const http = app.getHttpServer();

        // 1. Initially empty
        const emptyRes = await request(http).get('/auth/oauth/providers').expect(200);
        expect(emptyRes.body.providers).toEqual([]);

        // 2. Admin adds GitHub, Discord, Microsoft Entra ID, and Telegram
        await request(http)
            .post('/admin/oauth/providers')
            .send({
                code: 'github',
                name: 'GitHub',
                clientId: 'gh-id-1',
                clientSecret: 'gh-secret-1',
                scopes: 'read:user user:email',
                isActive: true,
            })
            .expect(201);

        await request(http)
            .post('/admin/oauth/providers')
            .send({
                code: 'discord',
                name: 'Discord',
                clientId: 'dc-id-1',
                clientSecret: 'dc-secret-1',
                scopes: 'identify email',
                isActive: true,
            })
            .expect(201);

        await request(http)
            .post('/admin/oauth/providers')
            .send({
                code: 'microsoft',
                name: 'Microsoft Entra ID',
                clientId: 'ms-id-1',
                clientSecret: 'ms-secret-1',
                scopes: 'openid profile email User.Read',
                extraConfig: { tenantId: 'contoso.onmicrosoft.com' },
                isActive: true,
            })
            .expect(201);

        const telegramBotToken = '123456:TELEGRAM_TEST_SECRET';
        await request(http)
            .post('/admin/oauth/providers')
            .send({
                code: 'telegram',
                name: 'Telegram',
                clientId: 'angkorgate_bot',
                clientSecret: telegramBotToken,
                extraConfig: { botUsername: 'angkorgate_bot' },
                isActive: true,
            })
            .expect(201);

        // 3. Public discovery lists all 4 active providers
        const listRes = await request(http).get('/auth/oauth/providers').expect(200);
        expect(listRes.body.providers).toEqual([
            { code: 'discord', name: 'Discord' },
            { code: 'github', name: 'GitHub' },
            { code: 'microsoft', name: 'Microsoft Entra ID' },
            { code: 'telegram', name: 'Telegram' },
        ]);

        // 4. Redirects work immediately
        const ghRes = await request(http).get('/auth/oauth/github').expect(302);
        expect(ghRes.header.location).toContain('github.com/login/oauth/authorize');
        expect(ghRes.header.location).toContain('client_id=gh-id-1');

        const dcRes = await request(http).get('/auth/oauth/discord').expect(302);
        expect(dcRes.header.location).toContain('discord.com/api/oauth2/authorize');
        expect(dcRes.header.location).toContain('client_id=dc-id-1');

        const msRes = await request(http).get('/auth/oauth/microsoft').expect(302);
        expect(msRes.header.location).toContain(
            'login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize',
        );
        expect(msRes.header.location).toContain('client_id=ms-id-1');

        // 5. Hot-reload credentials & Microsoft tenant without restart
        await request(http)
            .patch('/admin/oauth/providers/github')
            .send({ clientId: 'gh-id-2' })
            .expect(200);
        const ghRes2 = await request(http).get('/auth/oauth/github').expect(302);
        expect(ghRes2.header.location).toContain('client_id=gh-id-2');

        await request(http)
            .patch('/admin/oauth/providers/microsoft')
            .send({ extraConfig: { tenantId: 'organizations' } })
            .expect(200);
        const msRes2 = await request(http).get('/auth/oauth/microsoft').expect(302);
        expect(msRes2.header.location).toContain(
            'login.microsoftonline.com/organizations/oauth2/v2.0/authorize',
        );

        // 6. Toggle Discord off -> 404 immediately; toggle back on -> 302
        await request(http)
            .patch('/admin/oauth/providers/discord/toggle')
            .expect(204);
        await request(http).get('/auth/oauth/discord').expect(404);

        await request(http)
            .patch('/admin/oauth/providers/discord/toggle')
            .expect(204);
        await request(http).get('/auth/oauth/discord').expect(302);

        // 7. Telegram Login Widget + HMAC-SHA256 callback + ticket exchange + linked accounts
        const tgWidget = await request(http).get('/auth/oauth/telegram').expect(200);
        expect(tgWidget.text).toContain('data-telegram-login="angkorgate_bot"');

        const authDate = String(Math.floor(Date.now() / 1000));
        const tgFields: Record<string, string> = {
            auth_date: authDate,
            first_name: 'Piko',
            id: '555666777',
            username: 'piko_tg',
        };
        const dataCheckString = Object.keys(tgFields)
            .sort()
            .map((k) => `${k}=${tgFields[k]}`)
            .join('\n');
        const secretKey = crypto.createHash('sha256').update(telegramBotToken).digest();
        const hash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        const cbRes = await request(http)
            .get('/auth/oauth/telegram/callback')
            .query({ ...tgFields, hash })
            .expect(302);

        const redirectUrl = new URL(cbRes.header.location);
        const ticket = redirectUrl.searchParams.get('ticket');
        expect(ticket).toBeTruthy();

        const ticketRes = await request(http)
            .post('/auth/oauth/ticket')
            .send({ ticket })
            .expect(200);
        expect(ticketRes.body.accessToken).toBe('jwt-access-token');
        expect(ticketRes.body.provider).toBe('telegram');

        const accountsRes = await request(http)
            .get('/auth/oauth/me/accounts')
            .expect(200);
        expect(accountsRes.body.accounts).toHaveLength(1);
        expect(accountsRes.body.accounts[0].provider).toBe('telegram');

        await request(http)
            .delete('/auth/oauth/me/accounts/telegram')
            .expect(204);
        const afterUnlink = await request(http)
            .get('/auth/oauth/me/accounts')
            .expect(200);
        expect(afterUnlink.body.accounts).toEqual([]);

        // 8. DB-driven global OAuth settings (no .env edits or restart needed)
        const settingsRes = await request(http)
            .get('/admin/oauth/providers/settings')
            .expect(200);
        expect(settingsRes.body.oauthEnabled).toBe(true);

        // Disable OAuth globally via API -> providers list becomes empty & auth routes 404
        await request(http)
            .patch('/admin/oauth/providers/settings')
            .send({
                oauthEnabled: false,
                callbackBaseUrl: 'https://auth.example.com',
                webUrl: 'https://console.example.com',
            })
            .expect(200);

        const disabledList = await request(http).get('/auth/oauth/providers').expect(200);
        expect(disabledList.body.providers).toEqual([]);
        await request(http).get('/auth/oauth/github').expect(404);

        // Re-enable globally and verify new callbackBaseUrl is used immediately
        await request(http)
            .patch('/admin/oauth/providers/settings')
            .send({ oauthEnabled: true })
            .expect(200);

        const ghWithCustomCallback = await request(http)
            .get('/auth/oauth/github')
            .expect(302);
        expect(ghWithCustomCallback.header.location).toContain(
            encodeURIComponent('https://auth.example.com/auth/oauth/github/callback'),
        );

        // Per-provider extraConfig.callbackUrl overrides global callbackBaseUrl
        await request(http)
            .patch('/admin/oauth/providers/telegram')
            .send({
                extraConfig: {
                    botUsername: 'angkorgate_bot',
                    callbackUrl: 'https://my-tunnel.ngrok-free.app/auth/oauth/telegram/callback',
                },
            })
            .expect(200);

        const tgWithNgrok = await request(http)
            .get('/auth/oauth/telegram')
            .expect(200);
        expect(tgWithNgrok.text).toContain(
            'https://my-tunnel.ngrok-free.app/auth/oauth/telegram/callback',
        );

        // Internal _global settings row must never leak into admin providers list
        const adminList = await request(http)
            .get('/admin/oauth/providers')
            .expect(200);
        expect(adminList.body.some((p: { code: string }) => p.code === '_global')).toBe(false);

        // 9. Unsupported provider & invalid redirect rejections
        await request(http).get('/auth/oauth/myspace').expect(404);
        await request(http)
            .get('/auth/oauth/github?redirect=https://evil.example.com')
            .expect(403);
    });
});
