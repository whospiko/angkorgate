import crypto from 'node:crypto';
import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import passport from 'passport';
import { ResolvedProvider } from './oauth-config.service';
import {
    PROVIDER_DEFAULTS,
    SupportedProviderCode,
    parseProviderScopes,
} from '../oauth-providers.constants';
import { GoogleStrategy } from '../strategies/google.strategy';
import { GitHubStrategy } from '../strategies/github.strategy';
import { DiscordStrategy } from '../strategies/discord.strategy';
import { MicrosoftStrategy } from '../strategies/microsoft.strategy';
import { TelegramStrategy } from '../strategies/telegram.strategy';

export type OauthFlowMode = 'login' | 'link';

@Injectable()
export class OauthStrategyRegistry implements OnModuleDestroy {
    private readonly fingerprints = new Map<string, string>();

    onModuleDestroy(): void {
        for (const strategyKey of this.fingerprints.keys()) {
            passport.unuse(strategyKey);
        }
        this.fingerprints.clear();
    }

    /**
     * Ensures a Passport strategy for (providerCode, mode) is registered and
     * hot-synchronized with the latest DB configuration.
     */
    ensureStrategy(
        providerCode: SupportedProviderCode,
        config: ResolvedProvider,
        callbackUrl: string,
        mode: OauthFlowMode,
    ): string {
        const strategyKey = `${providerCode}:${mode}`;
        const fingerprint = this.computeFingerprint(config, callbackUrl);

        const registered = (passport as unknown as { _strategies?: Record<string, unknown> })
            ._strategies?.[strategyKey];

        if (registered && this.fingerprints.get(strategyKey) === fingerprint) {
            return strategyKey;
        }

        const strategy = this.instantiateStrategy(providerCode, config, callbackUrl);

        if (registered) {
            passport.unuse(strategyKey);
        }
        passport.use(strategyKey, strategy);
        this.fingerprints.set(strategyKey, fingerprint);

        return strategyKey;
    }

    /** Unregisters cached Passport strategies when a provider is updated, toggled, or deleted. */
    invalidate(providerCode: string): void {
        for (const mode of ['login', 'link'] as const) {
            const key = `${providerCode}:${mode}`;
            this.fingerprints.delete(key);
            passport.unuse(key);
        }
    }

    /** Unregisters all cached Passport strategies (e.g. when callbackBaseUrl changes). */
    invalidateAll(): void {
        for (const key of this.fingerprints.keys()) {
            passport.unuse(key);
        }
        this.fingerprints.clear();
    }

    private computeFingerprint(config: ResolvedProvider, callbackUrl: string): string {
        return crypto
            .createHash('sha256')
            .update(
                JSON.stringify({
                    code: config.code,
                    clientId: config.clientId,
                    clientSecret: config.clientSecret ?? '',
                    scopes: config.scopes,
                    extraConfig: config.extraConfig ?? null,
                    callbackUrl,
                }),
            )
            .digest('hex');
    }

    private instantiateStrategy(
        providerCode: SupportedProviderCode,
        config: ResolvedProvider,
        callbackUrl: string,
    ): passport.Strategy {
        const defaults = PROVIDER_DEFAULTS[providerCode];
        const scope = parseProviderScopes(config.scopes, defaults.defaultScopes);
        const clientSecret = config.clientSecret ?? '';

        switch (providerCode) {
            case 'google':
                return new GoogleStrategy({
                    clientID: config.clientId,
                    clientSecret,
                    callbackURL: callbackUrl,
                    scope,
                });

            case 'github':
                return new GitHubStrategy({
                    clientID: config.clientId,
                    clientSecret,
                    callbackURL: callbackUrl,
                    scope,
                });

            case 'discord':
                return new DiscordStrategy({
                    clientID: config.clientId,
                    clientSecret,
                    callbackURL: callbackUrl,
                    scope,
                });

            case 'microsoft': {
                const tenant =
                    typeof config.extraConfig?.tenantId === 'string' &&
                    config.extraConfig.tenantId.trim()
                        ? config.extraConfig.tenantId.trim()
                        : 'common';
                return new MicrosoftStrategy({
                    clientID: config.clientId,
                    clientSecret,
                    callbackURL: callbackUrl,
                    scope,
                    tenant,
                });
            }

            case 'telegram': {
                const botUsername =
                    typeof config.extraConfig?.botUsername === 'string' &&
                    config.extraConfig.botUsername.trim()
                        ? config.extraConfig.botUsername.trim()
                        : config.clientId;
                const maxAuthAgeSeconds =
                    typeof config.extraConfig?.maxAuthAgeSeconds === 'number'
                        ? config.extraConfig.maxAuthAgeSeconds
                        : undefined;
                if (!clientSecret) {
                    throw new NotFoundException(
                        'Telegram bot token (clientSecret) is not configured',
                    );
                }
                return new TelegramStrategy({
                    botUsername,
                    botToken: clientSecret,
                    callbackURL: callbackUrl,
                    maxAuthAgeSeconds,
                });
            }

            case 'apple':
                throw new NotFoundException('Apple OAuth strategy is not yet enabled');
        }
    }
}
