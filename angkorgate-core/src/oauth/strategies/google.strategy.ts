import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { OauthProfile } from '../interfaces/oauth-profile.interface';

export const GOOGLE_STRATEGY = 'google';

export interface GoogleStrategyConfig {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
}

export class GoogleStrategy extends Strategy {
    constructor(config: GoogleStrategyConfig) {
        super(
            {
                clientID: config.clientID,
                clientSecret: config.clientSecret,
                callbackURL: config.callbackURL,
                scope: config.scope?.length ? config.scope : ['email', 'profile'],
                state: false, // DynamicOauthGuard manages explicit state payloads
            },
            (
                _accessToken: string,
                _refreshToken: string,
                profile: Profile,
                done: VerifyCallback,
            ) => {
                try {
                    const email = profile.emails?.[0];
                    const oauthProfile: OauthProfile = {
                        provider: GOOGLE_STRATEGY,
                        providerUserId: profile.id,
                        email: email?.value ?? null,
                        emailVerified: email?.verified ?? false,
                        firstName: profile.name?.givenName,
                        lastName: profile.name?.familyName,
                        fullName: profile.displayName,
                        avatarUrl: profile.photos?.[0]?.value,
                        raw: profile as unknown as Record<string, unknown>,
                    };
                    done(null, oauthProfile);
                } catch (err) {
                    done(err as Error, undefined);
                }
            },
        );
    }

    /** Synchronize strategy credentials dynamically with latest DB config. */
    updateCredentials(clientId: string, clientSecret?: string | null): void {
        const oauth2 = (this as unknown as { _oauth2?: { _clientId?: string; _clientSecret?: string } })._oauth2;
        if (oauth2) {
            oauth2._clientId = clientId;
            if (clientSecret) {
                oauth2._clientSecret = clientSecret;
            }
        }
    }
}
