import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { Strategy as PassportBaseStrategy } from 'passport-strategy';
import { OauthProfile } from '../interfaces/oauth-profile.interface';

export const TELEGRAM_STRATEGY = 'telegram';

const TELEGRAM_AUTH_FIELDS = [
    'auth_date',
    'first_name',
    'id',
    'last_name',
    'photo_url',
    'username',
] as const;

const DEFAULT_MAX_AUTH_AGE_SECONDS = 300;

export interface TelegramStrategyConfig {
    botUsername: string;
    botToken: string;
    callbackURL: string;
    maxAuthAgeSeconds?: number;
}

export interface TelegramAuthenticateOptions {
    state?: string;
    callbackURL?: string;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function sanitizeBotUsername(raw: string): string {
    const cleaned = raw.trim().replace(/^@+/, '');
    if (!/^[A-Za-z0-9_]{3,64}$/.test(cleaned)) {
        throw new Error('Invalid Telegram bot username configured');
    }
    return cleaned;
}

/**
 * Verifies Telegram Login Widget HMAC-SHA256 payload integrity and freshness.
 * See: https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuthPayload(
    query: Record<string, unknown>,
    botToken: string,
    maxAuthAgeSeconds = DEFAULT_MAX_AUTH_AGE_SECONDS,
    nowSeconds = Math.floor(Date.now() / 1000),
): { valid: boolean; reason?: string } {
    const id = query.id;
    const authDateRaw = query.auth_date;
    const hash = query.hash;

    if (typeof id !== 'string' || !id || typeof authDateRaw !== 'string' || typeof hash !== 'string') {
        return { valid: false, reason: 'Missing required Telegram authentication fields' };
    }

    if (!/^[0-9a-f]{64}$/i.test(hash)) {
        return { valid: false, reason: 'Malformed Telegram signature hash' };
    }

    const authDate = Number(authDateRaw);
    if (!Number.isFinite(authDate) || authDate <= 0) {
        return { valid: false, reason: 'Invalid Telegram auth_date' };
    }

    if (nowSeconds - authDate > maxAuthAgeSeconds || authDate - nowSeconds > 60) {
        return { valid: false, reason: 'Telegram authentication payload has expired' };
    }

    const lines: string[] = [];
    for (const field of TELEGRAM_AUTH_FIELDS) {
        const val = query[field];
        if (typeof val === 'string' && val.length > 0) {
            lines.push(`${field}=${val}`);
        }
    }
    const dataCheckString = lines.join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const expectedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    const providedBuf = Buffer.from(hash.toLowerCase(), 'utf8');
    const expectedBuf = Buffer.from(expectedHash.toLowerCase(), 'utf8');
    if (providedBuf.length !== expectedBuf.length) {
        return { valid: false, reason: 'Telegram signature mismatch' };
    }

    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
        return { valid: false, reason: 'Telegram signature mismatch' };
    }

    return { valid: true };
}

export class TelegramStrategy extends PassportBaseStrategy {
    name = TELEGRAM_STRATEGY;

    private readonly botUsername: string;
    private readonly botToken: string;
    private readonly callbackURL: string;
    private readonly maxAuthAgeSeconds: number;

    constructor(config: TelegramStrategyConfig) {
        super();
        this.botUsername = sanitizeBotUsername(config.botUsername);
        this.botToken = config.botToken;
        this.callbackURL = config.callbackURL;
        this.maxAuthAgeSeconds = config.maxAuthAgeSeconds ?? DEFAULT_MAX_AUTH_AGE_SECONDS;
    }

    override authenticate(req: Request, options?: TelegramAuthenticateOptions): void {
        const query = (req.query ?? {}) as Record<string, unknown>;

        // Callback phase: Telegram redirected back with signed user fields
        if (query.hash !== undefined || query.id !== undefined) {
            const verification = verifyTelegramAuthPayload(
                query,
                this.botToken,
                this.maxAuthAgeSeconds,
            );

            if (!verification.valid) {
                this.fail({ message: verification.reason ?? 'Telegram authentication failed' }, 401);
                return;
            }

            const firstName =
                typeof query.first_name === 'string' ? query.first_name : undefined;
            const lastName =
                typeof query.last_name === 'string' ? query.last_name : undefined;
            const username =
                typeof query.username === 'string' ? query.username : undefined;
            const photoUrl =
                typeof query.photo_url === 'string' ? query.photo_url : undefined;

            const fullName =
                [firstName, lastName].filter(Boolean).join(' ').trim() ||
                username ||
                `Telegram ${String(query.id)}`;

            const profile: OauthProfile = {
                provider: TELEGRAM_STRATEGY,
                providerUserId: String(query.id),
                email: null,
                emailVerified: false,
                username,
                firstName,
                lastName,
                fullName,
                avatarUrl: photoUrl,
                raw: {
                    id: query.id,
                    first_name: firstName,
                    last_name: lastName,
                    username,
                    photo_url: photoUrl,
                    auth_date: query.auth_date,
                },
            };

            this.success(profile);
            return;
        }

        // Initiation phase: render hosted Telegram Login Widget page
        const res = (req as Request & { res?: Response }).res;
        if (!res) {
            this.error(new Error('Express response object not available for Telegram widget'));
            return;
        }

        const authUrl = new URL(options?.callbackURL || this.callbackURL);
        if (options?.state) {
            authUrl.searchParams.set('state', options.state);
        }

        const html = this.renderWidgetHtml(this.botUsername, authUrl.toString());
        res.status(200).type('text/html; charset=utf-8').send(html);
    }

    private renderWidgetHtml(botUsername: string, authUrl: string): string {
        const safeBot = escapeHtml(botUsername);
        const safeAuthUrl = escapeHtml(authUrl);
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign in with Telegram | AngkorGate</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1e1f22;
      color: #f2f3f5;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 1.5rem;
    }
    .card {
      max-width: 400px;
      width: 100%;
      background: #2b2d31;
      border: 1px solid #3f4147;
      border-radius: 10px;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    }
    h1 {
      font-size: 1.15rem;
      margin: 0 0 0.5rem;
      font-weight: 700;
    }
    p {
      font-size: 0.8rem;
      color: #b5bac1;
      margin: 0 0 1.5rem;
      line-height: 1.5;
    }
    .widget-wrap {
      display: flex;
      justify-content: center;
      min-height: 44px;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>Continue with Telegram</h1>
    <p>Authorize your AngkorGate session using your Telegram account.</p>
    <div class="widget-wrap">
      <script
        async
        src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-login="${safeBot}"
        data-size="large"
        data-auth-url="${safeAuthUrl}"
        data-request-access="write">
      </script>
    </div>
  </main>
</body>
</html>`;
    }
}
