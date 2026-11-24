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
        enabled: process.env.OAUTH_ENABLED === 'true',
        callbackBaseUrl: process.env.OAUTH_CALLBACK_BASE_URL ?? 'http://localhost:8080',
        webUrl: process.env.APP_WEB_URL ?? 'http://localhost:5173',
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackUrl: process.env.GOOGLE_CALLBACK_URL,
        },
        apple: {
            clientId: process.env.APPLE_CLIENT_ID,
            teamId: process.env.APPLE_TEAM_ID,
            keyId: process.env.APPLE_KEY_ID,
            privateKey: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            callbackUrl: process.env.APPLE_CALLBACK_URL,
        },
    },
});