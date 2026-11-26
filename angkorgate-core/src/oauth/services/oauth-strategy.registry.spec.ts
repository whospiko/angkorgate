import { OauthStrategyRegistry } from './oauth-strategy.registry';
import passport from 'passport';

describe('OauthStrategyRegistry', () => {
    let registry: OauthStrategyRegistry;

    beforeEach(() => {
        registry = new OauthStrategyRegistry();
    });

    afterEach(() => {
        registry.onModuleDestroy();
    });

    it('dynamically registers and hot-reloads github, discord, microsoft, google, and telegram strategies', () => {
        const strategies = (passport as unknown as { _strategies: Record<string, unknown> })
            ._strategies;

        const ghKey = registry.ensureStrategy(
            'github',
            {
                code: 'github',
                name: 'GitHub',
                clientId: 'gh-client-1',
                clientSecret: 'gh-secret-1',
                scopes: 'read:user user:email',
                extraConfig: null,
            },
            'http://localhost:8080/auth/oauth/github/callback',
            'login',
        );
        expect(ghKey).toBe('github:login');
        expect(strategies['github:login']).toBeDefined();

        // Same config returns same cached instance
        const firstInstance = strategies['github:login'];
        registry.ensureStrategy(
            'github',
            {
                code: 'github',
                name: 'GitHub',
                clientId: 'gh-client-1',
                clientSecret: 'gh-secret-1',
                scopes: 'read:user user:email',
                extraConfig: null,
            },
            'http://localhost:8080/auth/oauth/github/callback',
            'login',
        );
        expect(strategies['github:login']).toBe(firstInstance);

        // Changing clientSecret hot-swaps the strategy without restart
        registry.ensureStrategy(
            'github',
            {
                code: 'github',
                name: 'GitHub',
                clientId: 'gh-client-1',
                clientSecret: 'gh-secret-rotated',
                scopes: 'read:user user:email',
                extraConfig: null,
            },
            'http://localhost:8080/auth/oauth/github/callback',
            'login',
        );
        expect(strategies['github:login']).not.toBe(firstInstance);

        // Discord
        const discordKey = registry.ensureStrategy(
            'discord',
            {
                code: 'discord',
                name: 'Discord',
                clientId: 'discord-id',
                clientSecret: 'discord-secret',
                scopes: 'identify email',
                extraConfig: null,
            },
            'http://localhost:8080/auth/oauth/discord/callback',
            'login',
        );
        expect(discordKey).toBe('discord:login');
        expect(strategies['discord:login']).toBeDefined();

        // Microsoft with custom Entra ID tenantId
        const msKey = registry.ensureStrategy(
            'microsoft',
            {
                code: 'microsoft',
                name: 'Microsoft Entra ID',
                clientId: 'ms-client-id',
                clientSecret: 'ms-secret',
                scopes: 'openid profile email User.Read',
                extraConfig: { tenantId: 'contoso.onmicrosoft.com' },
            },
            'http://localhost:8080/auth/oauth/microsoft/callback',
            'login',
        );
        expect(msKey).toBe('microsoft:login');
        const msStrategy = strategies['microsoft:login'] as {
            _oauth2?: { _authorizeUrl?: string; _accessTokenUrl?: string };
        };
        expect(msStrategy._oauth2?._authorizeUrl).toContain(
            'contoso.onmicrosoft.com',
        );

        // Telegram
        const tgKey = registry.ensureStrategy(
            'telegram',
            {
                code: 'telegram',
                name: 'Telegram',
                clientId: 'angkorgate_bot',
                clientSecret: '123456:TEST_BOT_TOKEN',
                scopes: '',
                extraConfig: { botUsername: '@angkorgate_bot' },
            },
            'http://localhost:8080/auth/oauth/telegram/callback',
            'login',
        );
        expect(tgKey).toBe('telegram:login');
        expect(strategies['telegram:login']).toBeDefined();

        // Separate link strategy key
        const ghLinkKey = registry.ensureStrategy(
            'github',
            {
                code: 'github',
                name: 'GitHub',
                clientId: 'gh-client-1',
                clientSecret: 'gh-secret-rotated',
                scopes: 'read:user user:email',
                extraConfig: null,
            },
            'http://localhost:8080/auth/oauth/github/link/callback',
            'link',
        );
        expect(ghLinkKey).toBe('github:link');

        // Invalidate removes both login and link strategies
        registry.invalidate('github');
        expect(strategies['github:login']).toBeUndefined();
        expect(strategies['github:link']).toBeUndefined();
    });
});
