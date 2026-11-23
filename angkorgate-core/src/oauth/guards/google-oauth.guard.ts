import {
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
    Optional,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OauthConfigService } from '../services/oauth-config.service';
import { OauthRedirectService } from '../services/oauth-redirect.service';
import { GoogleStrategy, GOOGLE_STRATEGY } from '../strategies/google.strategy';
import passport from 'passport';

/**
 * Wraps Passport's google guard:
 *  1. Checks OAuth is enabled for the caller's app
 *  2. Checks the provider is active
 *  3. Dynamically synchronizes client credentials from the database
 *  4. Validates redirect whitelist
 *  5. Delegates to passport-google-oauth20
 */
@Injectable()
export class GoogleOauthGuard extends AuthGuard('google') implements CanActivate {
    constructor(
        private readonly config: OauthConfigService,
        private readonly redirect: OauthRedirectService,
        @Optional() private readonly googleStrategy?: GoogleStrategy,
    ) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const enabled = await this.config.isProviderEnabled('google', req.appContext);
        if (!enabled) {
            throw new NotFoundException('Google login is not enabled');
        }

        // Dynamically synchronize latest credentials from database
        try {
            const providerConfig = await this.config.getProviderConfig('google');
            if (providerConfig.clientId) {
                if (this.googleStrategy) {
                    this.googleStrategy.updateCredentials(
                        providerConfig.clientId,
                        providerConfig.clientSecret,
                    );
                }
                const registeredStrategy = (passport as any)._strategies?.[GOOGLE_STRATEGY];
                if (registeredStrategy && registeredStrategy._oauth2) {
                    registeredStrategy._oauth2._clientId = providerConfig.clientId;
                    if (providerConfig.clientSecret) {
                        registeredStrategy._oauth2._clientSecret = providerConfig.clientSecret;
                    }
                }
            }
        } catch {
            // Ignore if provider lookup throws
        }

        if (req.query?.redirect) {
            this.redirect.resolve(req.query.redirect as string, req.appContext);
        }
        return (await super.canActivate(context)) as boolean;
    }

    override getAuthenticateOptions(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();
        const statePayload: Record<string, string> = {};
        if (req.query?.interaction) {
            statePayload.interaction = req.query.interaction as string;
        }
        if (req.query?.redirect) {
            statePayload.redirect = req.query.redirect as string;
        }
        if (req.query?.app) {
            statePayload.app = req.query.app as string;
        }
        if (Object.keys(statePayload).length > 0) {
            return {
                state: Buffer.from(JSON.stringify(statePayload)).toString('base64url'),
            };
        }
        if (req.query?.state) {
            return {
                state: req.query.state as string,
            };
        }
        return {};
    }
}