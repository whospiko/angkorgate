export default () => ({
    database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        name: process.env.DB_NAME,
    },
    oauth: {
        enabled: process.env.OAUTH_ENABLED === 'true',
        callbackBaseUrl: process.env.OAUTH_CALLBACK_BASE_URL ?? 'http://localhost:3000',
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