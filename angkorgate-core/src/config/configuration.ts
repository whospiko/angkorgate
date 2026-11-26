export default () => ({
    database: {
        type: process.env.DB_TYPE || (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' ? 'postgres' : 'sqlite'),
        sqliteStorage: process.env.DB_SQLITE_DATABASE ?? './dev.sqlite',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        name: process.env.DB_NAME,
        logging: process.env.DB_LOGGING === 'true',
    },
    redis: {
        enabled: process.env.REDIS_ENABLED === 'true',
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB ?? '0', 10),
        keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'angkorgate:',
        defaultTtl: parseInt(process.env.REDIS_DEFAULT_TTL ?? '300', 10),
    },
    oauth: {
        enabled: process.env.OAUTH_ENABLED !== 'false',
        callbackBaseUrl: process.env.OAUTH_CALLBACK_BASE_URL,
        webUrl: process.env.APP_WEB_URL ?? process.env.CONSOLE_URL ?? 'http://localhost:4000',
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackUrl: process.env.GOOGLE_CALLBACK_URL,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
        },
        microsoft: {
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            tenantId: process.env.MICROSOFT_TENANT_ID ?? 'common',
        },
        telegram: {
            botUsername: process.env.TELEGRAM_BOT_USERNAME,
            botToken: process.env.TELEGRAM_BOT_TOKEN,
        },
        apple: {
            clientId: process.env.APPLE_CLIENT_ID,
            teamId: process.env.APPLE_TEAM_ID,
            keyId: process.env.APPLE_KEY_ID,
            privateKey: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            callbackUrl: process.env.APPLE_CALLBACK_URL,
        },
    },
    webauthn: {
        rpName: process.env.WEBAUTHN_RP_NAME ?? 'AngkorGate',
        rpId: process.env.WEBAUTHN_RP_ID ?? 'localhost',
        origins: (process.env.WEBAUTHN_ORIGINS ?? 'http://localhost:4000,http://localhost:3000,http://localhost:8080,http://127.0.0.1:4000,http://127.0.0.1:3000').split(','),
    },
    passwordless: {
        magicLinkTtlMinutes: parseInt(process.env.PASSWORDLESS_MAGIC_LINK_TTL_MINUTES ?? '15', 10),
        otpTtlMinutes: parseInt(process.env.PASSWORDLESS_OTP_TTL_MINUTES ?? '10', 10),
        resendCooldownSeconds: parseInt(process.env.PASSWORDLESS_COOLDOWN_SECONDS ?? '60', 10),
        maxOtpAttempts: parseInt(process.env.PASSWORDLESS_MAX_OTP_ATTEMPTS ?? '5', 10),
        autoRegister: process.env.PASSWORDLESS_AUTO_REGISTER === 'true',
    },
});