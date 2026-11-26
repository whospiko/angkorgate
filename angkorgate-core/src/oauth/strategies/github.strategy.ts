import { Strategy as PassportGitHubStrategy, Profile } from 'passport-github2';
import type { VerifyCallback } from 'passport-oauth2';
import { OauthProfile } from '../interfaces/oauth-profile.interface';

export const GITHUB_STRATEGY = 'github';

export interface GitHubStrategyConfig {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
}

interface GitHubEmailEntry {
    value: string;
    primary?: boolean;
    verified?: boolean;
}

export class GitHubStrategy extends PassportGitHubStrategy {
    constructor(config: GitHubStrategyConfig) {
        super(
            {
                clientID: config.clientID,
                clientSecret: config.clientSecret,
                callbackURL: config.callbackURL,
                scope: config.scope?.length ? config.scope : ['read:user', 'user:email'],
                userAgent: 'AngkorGate-IAM',
            },
            (
                _accessToken: string,
                _refreshToken: string,
                profile: Profile,
                done: VerifyCallback,
            ) => {
                try {
                    const emails = (profile.emails ?? []) as GitHubEmailEntry[];
                    const primaryEmail =
                        emails.find((e) => e.primary && e.verified) ??
                        emails.find((e) => e.verified) ??
                        emails[0];

                    const displayName = profile.displayName || profile.username;
                    const nameParts = displayName ? displayName.trim().split(/\s+/) : [];

                    const oauthProfile: OauthProfile = {
                        provider: GITHUB_STRATEGY,
                        providerUserId: String(profile.id),
                        email: primaryEmail?.value ?? null,
                        emailVerified: primaryEmail?.verified ?? false,
                        username: profile.username,
                        firstName: profile.name?.givenName ?? nameParts[0],
                        lastName:
                            profile.name?.familyName ??
                            (nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined),
                        fullName: displayName,
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
}
