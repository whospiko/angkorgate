import { Strategy as PassportDiscordStrategy, Profile } from 'passport-discord';
import type { VerifyCallback } from 'passport-oauth2';
import { OauthProfile } from '../interfaces/oauth-profile.interface';

export const DISCORD_STRATEGY = 'discord';

export interface DiscordStrategyConfig {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
}

export class DiscordStrategy extends PassportDiscordStrategy {
    constructor(config: DiscordStrategyConfig) {
        super(
            {
                clientID: config.clientID,
                clientSecret: config.clientSecret,
                callbackURL: config.callbackURL,
                scope: config.scope?.length ? config.scope : ['identify', 'email'],
            },
            (
                _accessToken: string,
                _refreshToken: string,
                profile: Profile,
                done: VerifyCallback,
            ) => {
                try {
                    const avatarUrl = profile.avatar
                        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                        : undefined;

                    const displayName = profile.global_name || profile.username;

                    const oauthProfile: OauthProfile = {
                        provider: DISCORD_STRATEGY,
                        providerUserId: String(profile.id),
                        email: profile.email ?? null,
                        emailVerified: Boolean(profile.verified),
                        username: profile.username,
                        fullName: displayName,
                        avatarUrl,
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
