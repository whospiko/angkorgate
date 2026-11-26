import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { GitHubStrategy } from './github.strategy';
import { DiscordStrategy } from './discord.strategy';
import { MicrosoftStrategy } from './microsoft.strategy';
import {
    TelegramStrategy,
    verifyTelegramAuthPayload,
} from './telegram.strategy';
import type { OauthProfile } from '../interfaces/oauth-profile.interface';

function signTelegramPayload(
    fields: Record<string, string>,
    botToken: string,
): Record<string, string> {
    const dataCheckString = Object.keys(fields)
        .sort()
        .map((k) => `${k}=${fields[k]}`)
        .join('\n');
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
    return { ...fields, hash };
}

describe('Social Passport Strategies', () => {
    describe('GitHubStrategy', () => {
        it('normalizes primary verified email and profile fields', async () => {
            const strategy = new GitHubStrategy({
                clientID: 'gh-id',
                clientSecret: 'gh-secret',
                callbackURL: 'http://localhost:8080/auth/oauth/github/callback',
            });

            const verify = (strategy as unknown as {
                _verify: (
                    at: string,
                    rt: string,
                    profile: unknown,
                    done: (err: unknown, user?: OauthProfile) => void,
                ) => void;
            })._verify;

            const result = await new Promise<OauthProfile>((resolve, reject) => {
                verify(
                    'access',
                    'refresh',
                    {
                        id: '424242',
                        username: 'piko-dev',
                        displayName: 'Piko Dev',
                        emails: [
                            { value: 'secondary@example.com', primary: false, verified: true },
                            { value: 'primary@example.com', primary: true, verified: true },
                        ],
                        photos: [{ value: 'https://avatars.githubusercontent.com/u/424242' }],
                    },
                    (err, user) => (err ? reject(err) : resolve(user!)),
                );
            });

            expect(result).toMatchObject({
                provider: 'github',
                providerUserId: '424242',
                email: 'primary@example.com',
                emailVerified: true,
                username: 'piko-dev',
                firstName: 'Piko',
                lastName: 'Dev',
                fullName: 'Piko Dev',
                avatarUrl: 'https://avatars.githubusercontent.com/u/424242',
            });
        });
    });

    describe('DiscordStrategy', () => {
        it('normalizes Discord email, global_name, and CDN avatar URL', async () => {
            const strategy = new DiscordStrategy({
                clientID: 'dc-id',
                clientSecret: 'dc-secret',
                callbackURL: 'http://localhost:8080/auth/oauth/discord/callback',
            });

            const verify = (strategy as unknown as {
                _verify: (
                    at: string,
                    rt: string,
                    profile: unknown,
                    done: (err: unknown, user?: OauthProfile) => void,
                ) => void;
            })._verify;

            const result = await new Promise<OauthProfile>((resolve, reject) => {
                verify(
                    'access',
                    'refresh',
                    {
                        id: '9876543210',
                        username: 'piko',
                        global_name: 'Piko KH',
                        email: 'piko@discord.gg',
                        verified: true,
                        avatar: 'a_hash_123',
                    },
                    (err, user) => (err ? reject(err) : resolve(user!)),
                );
            });

            expect(result).toMatchObject({
                provider: 'discord',
                providerUserId: '9876543210',
                email: 'piko@discord.gg',
                emailVerified: true,
                username: 'piko',
                fullName: 'Piko KH',
                avatarUrl: 'https://cdn.discordapp.com/avatars/9876543210/a_hash_123.png',
            });
        });
    });

    describe('MicrosoftStrategy', () => {
        it('uses configured tenant and falls back to userPrincipalName when mail is absent', async () => {
            const strategy = new MicrosoftStrategy({
                clientID: 'ms-id',
                clientSecret: 'ms-secret',
                callbackURL: 'http://localhost:8080/auth/oauth/microsoft/callback',
                tenant: 'organizations',
            });

            const oauth2 = (strategy as unknown as {
                _oauth2: { _authorizeUrl: string; _accessTokenUrl: string };
                _verify: (
                    at: string,
                    rt: string,
                    profile: unknown,
                    done: (err: unknown, user?: OauthProfile) => void,
                ) => void;
            });

            expect(oauth2._oauth2._authorizeUrl).toBe(
                'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize',
            );
            expect(oauth2._oauth2._accessTokenUrl).toBe(
                'https://login.microsoftonline.com/organizations/oauth2/v2.0/token',
            );

            const result = await new Promise<OauthProfile>((resolve, reject) => {
                oauth2._verify(
                    'access',
                    'refresh',
                    {
                        id: 'entra-oid-001',
                        displayName: 'Sok Dara',
                        _json: {
                            id: 'entra-oid-001',
                            givenName: 'Dara',
                            surname: 'Sok',
                            mail: null,
                            userPrincipalName: 'dara@contoso.onmicrosoft.com',
                        },
                    },
                    (err, user) => (err ? reject(err) : resolve(user!)),
                );
            });

            expect(result).toMatchObject({
                provider: 'microsoft',
                providerUserId: 'entra-oid-001',
                email: 'dara@contoso.onmicrosoft.com',
                emailVerified: true,
                firstName: 'Dara',
                lastName: 'Sok',
                fullName: 'Sok Dara',
            });
        });
    });

    describe('TelegramStrategy', () => {
        const botToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';

        it('verifies valid HMAC-SHA256 payload and ignores non-Telegram query params like state', () => {
            const now = Math.floor(Date.now() / 1000);
            const signed = signTelegramPayload(
                {
                    auth_date: String(now),
                    first_name: 'Piko',
                    id: '555000111',
                    username: 'pikotg',
                },
                botToken,
            );

            const check = verifyTelegramAuthPayload(
                { ...signed, state: 'opaque-state-token' },
                botToken,
                300,
                now,
            );
            expect(check.valid).toBe(true);
        });

        it('rejects tampered hash or expired auth_date', () => {
            const now = Math.floor(Date.now() / 1000);
            const signed = signTelegramPayload(
                {
                    auth_date: String(now - 600),
                    id: '555000111',
                },
                botToken,
            );

            expect(verifyTelegramAuthPayload(signed, botToken, 300, now).valid).toBe(false);

            const fresh = signTelegramPayload(
                { auth_date: String(now), id: '555000111' },
                botToken,
            );
            fresh.hash = '0'.repeat(64);
            expect(verifyTelegramAuthPayload(fresh, botToken, 300, now).valid).toBe(false);
        });

        it('renders widget HTML on initiation and calls success on valid callback', () => {
            const strategy = new TelegramStrategy({
                botUsername: '@angkorgate_bot',
                botToken,
                callbackURL: 'http://localhost:8080/auth/oauth/telegram/callback',
            });

            let sentHtml = '';
            const resMock = {
                status: jest.fn().mockReturnThis(),
                type: jest.fn().mockReturnThis(),
                send: jest.fn((html: string) => {
                    sentHtml = html;
                }),
            } as unknown as Response;

            strategy.authenticate(
                { query: {}, res: resMock } as unknown as Request & { res: Response },
                { state: 'abc"xyz' },
            );

            expect(sentHtml).toContain('data-telegram-login="angkorgate_bot"');
            expect(sentHtml).toContain('https://telegram.org/js/telegram-widget.js');
            expect(sentHtml).not.toContain('abc"xyz'); // escaped properly

            const now = Math.floor(Date.now() / 1000);
            const signed = signTelegramPayload(
                {
                    auth_date: String(now),
                    first_name: 'Piko',
                    last_name: 'Dev',
                    id: '555000111',
                    username: 'pikotg',
                },
                botToken,
            );

            const successSpy = jest.fn();
            const failSpy = jest.fn();
            (strategy as unknown as { success: jest.Mock }).success = successSpy;
            (strategy as unknown as { fail: jest.Mock }).fail = failSpy;

            strategy.authenticate({ query: signed } as unknown as Request);

            expect(failSpy).not.toHaveBeenCalled();
            expect(successSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    provider: 'telegram',
                    providerUserId: '555000111',
                    email: null,
                    username: 'pikotg',
                    fullName: 'Piko Dev',
                }),
            );
        });
    });
});
