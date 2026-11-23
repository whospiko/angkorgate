import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { OauthProfile } from '../interfaces/oauth-profile.interface';

export const GOOGLE_STRATEGY = 'google';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, GOOGLE_STRATEGY) {
    private readonly logger = new Logger(GoogleStrategy.name);

    constructor(config: ConfigService) {
        const clientId = config.get<string>('oauth.google.clientId') ?? '';
        const clientSecret = config.get<string>('oauth.google.clientSecret') ?? '';
        const callbackUrl =
            config.get<string>('oauth.google.callbackUrl') ??
            `${config.get<string>('oauth.callbackBaseUrl')}/auth/oauth/google/callback`;

        // Passport requires non-empty strings — this only registers the strategy
        // when we actually call new GoogleStrategy(). The module handles the gate.
        super({
            clientID: clientId || 'placeholder-google-client-id',
            clientSecret: clientSecret || 'placeholder-google-client-secret',
            callbackURL: callbackUrl,
            scope: ['email', 'profile'],
            state: false, // Required for /link flow to preserve state through Google
        });
    }

    /**
     * Synchronize strategy credentials dynamically with latest DB config
     */
    updateCredentials(clientId: string, clientSecret?: string | null): void {
        if ((this as any)._oauth2) {
            (this as any)._oauth2._clientId = clientId;
            if (clientSecret) {
                (this as any)._oauth2._clientSecret = clientSecret;
            }
        }
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ): Promise<void> {
        try {
            const email = profile.emails?.[0];
            const oauthProfile: OauthProfile = {
                provider: 'google',
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
    }
}