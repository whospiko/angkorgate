import { Strategy as PassportMicrosoftStrategy, MicrosoftStrategyOptions } from 'passport-microsoft';
import type { VerifyCallback } from 'passport-oauth2';
import { OauthProfile } from '../interfaces/oauth-profile.interface';

export const MICROSOFT_STRATEGY = 'microsoft';

export interface MicrosoftStrategyConfig {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
    tenant?: string;
}

interface MicrosoftRawProfile {
    id?: string;
    displayName?: string;
    givenName?: string;
    surname?: string;
    mail?: string | null;
    userPrincipalName?: string | null;
    emails?: Array<{ value?: string; verified?: boolean }>;
    name?: { givenName?: string; familyName?: string };
    _json?: {
        id?: string;
        displayName?: string;
        givenName?: string;
        surname?: string;
        mail?: string | null;
        userPrincipalName?: string | null;
    };
}

export class MicrosoftStrategy extends PassportMicrosoftStrategy {
    constructor(config: MicrosoftStrategyConfig) {
        const options: MicrosoftStrategyOptions & { addUPNAsEmail?: boolean } = {
            clientID: config.clientID,
            clientSecret: config.clientSecret,
            callbackURL: config.callbackURL,
            tenant: config.tenant?.trim() || 'common',
            scope: config.scope?.length
                ? config.scope
                : ['openid', 'profile', 'email', 'User.Read'],
            addUPNAsEmail: true,
        };

        super(
            options,
            (
                _accessToken: string,
                _refreshToken: string,
                rawProfile: unknown,
                done: VerifyCallback,
            ) => {
                try {
                    const profile = rawProfile as MicrosoftRawProfile;
                    const json = profile._json ?? {};
                    const emailValue =
                        profile.emails?.[0]?.value ??
                        json.mail ??
                        profile.mail ??
                        json.userPrincipalName ??
                        profile.userPrincipalName ??
                        null;

                    const firstName = profile.name?.givenName ?? json.givenName ?? profile.givenName;
                    const lastName = profile.name?.familyName ?? json.surname ?? profile.surname;
                    const fullName =
                        profile.displayName ??
                        json.displayName ??
                        ([firstName, lastName].filter(Boolean).join(' ') || undefined);

                    const oauthProfile: OauthProfile = {
                        provider: MICROSOFT_STRATEGY,
                        providerUserId: String(profile.id ?? json.id ?? ''),
                        email: emailValue,
                        emailVerified: Boolean(emailValue),
                        firstName,
                        lastName,
                        fullName,
                        raw: profile as unknown as Record<string, unknown>,
                    };
                    done(null, oauthProfile);
                } catch (err) {
                    done(err as Error, undefined);
                }
            },
        );
    }
}
