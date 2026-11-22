import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppSetting } from '../../apps/entities/app-setting.entity';

@Injectable()
export class OauthRedirectService {
    constructor(private readonly config: ConfigService) { }

    /**
     * Validates `redirect` against the calling app's whitelist.
     *
     * Rules:
     *  - If redirect is empty → use APP_WEB_URL (dev fallback) — safe default
     *  - If redirect is present:
     *      - Must be a valid absolute URL
     *      - Must match one of the app's allowed_redirect_urls (prefix match)
     *      - In dev (NODE_ENV != production), also allow http://localhost:*
     *
     * Throws ForbiddenException on mismatch — never silently redirects.
     */
    resolve(
        redirect: string | undefined,
        app: AppSetting | null,
    ): string {
        const fallback =
            this.config.get<string>('oauth.webUrl') ?? 'http://localhost:5173';

        if (!redirect) return fallback;

        let parsed: URL;
        try {
            parsed = new URL(redirect);
        } catch {
            throw new ForbiddenException('Invalid redirect URL');
        }

        const isDev = this.config.get<string>('NODE_ENV') !== 'production';
        if (isDev && ['localhost', '127.0.0.1'].includes(parsed.hostname)) {
            return parsed.toString();
        }

        if (!app) {
            throw new ForbiddenException(
                'Redirect not allowed: no app context and app not whitelisted',
            );
        }

        const allowed = app.allowedRedirectUrls ?? [];
        const matched = allowed.some((pattern) => {
            // Support wildcard path prefix (e.g. 'https://app.com/*')
            if (pattern.endsWith('/*')) {
                const base = pattern.slice(0, -2);
                try {
                    const baseParsed = new URL(base);
                    return (
                        parsed.origin === baseParsed.origin &&
                        (parsed.pathname === baseParsed.pathname ||
                            parsed.pathname.startsWith(
                                baseParsed.pathname.endsWith('/')
                                    ? baseParsed.pathname
                                    : `${baseParsed.pathname}/`,
                            ))
                    );
                } catch {
                    return false;
                }
            }

            try {
                const allowedUrl = new URL(pattern);
                return (
                    parsed.origin === allowedUrl.origin &&
                    (parsed.pathname === allowedUrl.pathname ||
                        (allowedUrl.pathname !== '/' &&
                            parsed.pathname.startsWith(`${allowedUrl.pathname}/`)))
                );
            } catch {
                return false;
            }
        });

        if (!matched) {
            throw new ForbiddenException(
                `Redirect URL not allowed: ${redirect}`,
            );
        }

        return parsed.toString();
    }
}