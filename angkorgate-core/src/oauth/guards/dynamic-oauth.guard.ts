import {
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import passport from 'passport';
import { AppSetting } from '../../apps/entities/app-setting.entity';
import { isSupportedProviderCode } from '../oauth-providers.constants';
import { OauthConfigService } from '../services/oauth-config.service';
import { OauthRedirectService } from '../services/oauth-redirect.service';
import { OauthStrategyRegistry } from '../services/oauth-strategy.registry';

type RequestWithApp = Request & {
    appContext?: AppSetting | null;
    user?: unknown;
    authInfo?: unknown;
};

/**
 * Generic Passport OAuth broker guard:
 *  1. Validates `:provider` route parameter against supported providers
 *  2. Verifies global kill switch, per-app allowlist, and DB `isActive`
 *  3. Validates `redirect` query parameter against app whitelist (anti-open-redirect)
 *  4. Dynamically registers/hot-reloads the Passport strategy from DB config
 *  5. Executes `passport.authenticate` for both initiation and callback phases
 */
@Injectable()
export class DynamicOauthGuard implements CanActivate {
    constructor(
        private readonly config: OauthConfigService,
        private readonly redirect: OauthRedirectService,
        private readonly registry: OauthStrategyRegistry,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const http = context.switchToHttp();
        const req = http.getRequest<RequestWithApp>();
        const res = http.getResponse<Response>();

        const rawProvider = String(req.params?.provider ?? '').toLowerCase();
        if (!isSupportedProviderCode(rawProvider)) {
            throw new NotFoundException(`OAuth provider '${rawProvider}' is not supported`);
        }

        const appContext = req.appContext ?? null;
        const enabled = await this.config.isProviderEnabled(rawProvider, appContext);
        if (!enabled) {
            throw new NotFoundException(`${rawProvider} login is not enabled`);
        }

        if (typeof req.query?.redirect === 'string' && req.query.redirect.length > 0) {
            this.redirect.resolve(req.query.redirect, appContext);
        }

        const providerConfig = await this.config.getProviderConfig(rawProvider);
        const mode = req.path?.includes('/link') ? 'link' : 'login';
        const baseUrl = this.config.getCallbackBaseUrl(req);
        const rawCustomCallback =
            mode === 'login' &&
            typeof providerConfig.extraConfig?.callbackUrl === 'string' &&
            providerConfig.extraConfig.callbackUrl.trim()
                ? providerConfig.extraConfig.callbackUrl.trim()
                : null;
        let customCallbackUrl: string | null = null;
        if (rawCustomCallback) {
            try {
                const parsed = new URL(rawCustomCallback);
                if (parsed.pathname === '/' || parsed.pathname === '') {
                    parsed.pathname = `/auth/oauth/${rawProvider}/callback`;
                }
                customCallbackUrl = parsed.toString();
            } catch {
                customCallbackUrl = rawCustomCallback;
            }
        }
        const callbackUrl =
            customCallbackUrl ??
            (mode === 'link'
                ? `${baseUrl}/auth/oauth/${rawProvider}/link/callback`
                : `${baseUrl}/auth/oauth/${rawProvider}/callback`);

        const strategyKey = this.registry.ensureStrategy(
            rawProvider,
            providerConfig,
            callbackUrl,
            mode,
        );

        const authenticateOptions = this.buildAuthenticateOptions(req, callbackUrl);

        const user = await this.authenticateWithPassport(
            strategyKey,
            authenticateOptions,
            req,
            res,
        );

        if (user !== undefined && user !== null) {
            req.user = user as Express.User;
        }
        return true;
    }

    private buildAuthenticateOptions(
        req: RequestWithApp,
        callbackUrl: string,
    ): Record<string, unknown> {
        const options: Record<string, unknown> = {
            session: false,
            callbackURL: callbackUrl,
        };

        const statePayload: Record<string, string> = {};
        if (typeof req.query?.interaction === 'string' && req.query.interaction) {
            statePayload.interaction = req.query.interaction;
        }
        if (typeof req.query?.redirect === 'string' && req.query.redirect) {
            statePayload.redirect = req.query.redirect;
        }
        if (typeof req.query?.app === 'string' && req.query.app) {
            statePayload.app = req.query.app;
        }

        if (Object.keys(statePayload).length > 0) {
            options.state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');
        } else if (typeof req.query?.state === 'string' && req.query.state) {
            options.state = req.query.state;
        }

        return options;
    }

    private authenticateWithPassport(
        strategyKey: string,
        options: Record<string, unknown>,
        req: RequestWithApp,
        res: Response,
    ): Promise<unknown> {
        return new Promise((resolve, reject) => {
            let settled = false;
            const finishOnce = (fn: () => void) => {
                if (settled) return;
                settled = true;
                fn();
            };

            const onFinish = () => finishOnce(() => resolve(undefined));
            res.once('finish', onFinish);

            const middleware = passport.authenticate(
                strategyKey,
                options,
                (err: unknown, user: unknown, info: unknown) => {
                    res.removeListener('finish', onFinish);
                    req.authInfo = info as Express.AuthInfo | undefined;
                    if (err) {
                        finishOnce(() => reject(err));
                        return;
                    }
                    if (!user) {
                        const message =
                            info && typeof info === 'object' && 'message' in info
                                ? String((info as { message: unknown }).message)
                                : 'OAuth authentication failed';
                        finishOnce(() => reject(new UnauthorizedException(message)));
                        return;
                    }
                    finishOnce(() => resolve(user));
                },
            );

            middleware(req, res, (nextErr?: unknown) => {
                res.removeListener('finish', onFinish);
                if (nextErr) {
                    finishOnce(() => reject(nextErr));
                    return;
                }
                finishOnce(() => resolve(undefined));
            });

            // Synchronous redirects / widget HTML responses leave headersSent=true immediately
            if (res.headersSent) {
                res.removeListener('finish', onFinish);
                finishOnce(() => resolve(undefined));
            }
        });
    }
}
