import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { OauthProvider } from '../entities/oauth-provider.entity';
import {
    isSupportedProviderCode,
    PROVIDER_DEFAULTS,
} from '../oauth-providers.constants';

export const GLOBAL_OAUTH_SETTINGS_CODE = '_global';

export interface ResolvedProvider {
    code: string;
    name: string;
    clientId: string;
    clientSecret: string | null;
    scopes: string;
    extraConfig: Record<string, unknown> | null;
}

export interface GlobalOauthSettings {
    oauthEnabled: boolean;
    callbackBaseUrl: string | null;
    webUrl: string;
}

@Injectable()
export class OauthConfigService implements OnModuleInit {
    private cachedGlobalEnabled: boolean | null = null;
    private cachedCallbackBaseUrl: string | null = null;
    private cachedWebUrl: string | null = null;

    constructor(
        private readonly config: ConfigService,
        @InjectRepository(OauthProvider)
        private readonly providerRepo: Repository<OauthProvider>,
    ) { }

    async onModuleInit(): Promise<void> {
        try {
            await this.refreshGlobalSettingsCache();
        } catch {
            // Ignore during unit tests or before migrations run
        }
    }

    /** Level 1: global kill switch (DB-managed first, env fallback) */
    isGlobalEnabled(): boolean {
        if (this.cachedGlobalEnabled !== null) {
            return this.cachedGlobalEnabled;
        }
        return this.config.get<boolean>('oauth.enabled') !== false;
    }

    /**
     * Resolves the backend callback base URL:
     *  1. DB-configured callbackBaseUrl (set via Console UI)
     *  2. OAUTH_CALLBACK_BASE_URL from env
     *  3. Request Host / X-Forwarded-Proto auto-detection
     *  4. http://localhost:8080 fallback
     */
    getCallbackBaseUrl(req?: Request): string {
        const fromDb = this.cachedCallbackBaseUrl?.trim();
        if (fromDb) {
            return fromDb.replace(/\/+$/, '');
        }

        const fromEnv = this.config.get<string>('oauth.callbackBaseUrl')?.trim();
        if (fromEnv) {
            return fromEnv.replace(/\/+$/, '');
        }

        if (req) {
            const forwardedProto = req.headers['x-forwarded-proto']
                ?.toString()
                .split(',')[0]
                ?.trim();
            const forwardedHost = req.headers['x-forwarded-host']
                ?.toString()
                .split(',')[0]
                ?.trim();
            const host = forwardedHost || req.get?.('host');
            const proto = forwardedProto || req.protocol || 'http';
            if (host) {
                return `${proto}://${host}`.replace(/\/+$/, '');
            }
        }

        return 'http://localhost:8080';
    }

    getWebUrl(): string {
        const fromDb = this.cachedWebUrl?.trim();
        if (fromDb) return fromDb.replace(/\/+$/, '');
        const fromEnv =
            this.config.get<string>('CONSOLE_URL') ??
            this.config.get<string>('APP_WEB_URL') ??
            this.config.get<string>('oauth.webUrl');
        return (fromEnv || 'http://localhost:4000').replace(/\/+$/, '');
    }

    async getGlobalSettings(): Promise<GlobalOauthSettings> {
        await this.refreshGlobalSettingsCache();
        return {
            oauthEnabled: this.isGlobalEnabled(),
            callbackBaseUrl:
                this.cachedCallbackBaseUrl ??
                this.config.get<string>('oauth.callbackBaseUrl')?.trim() ??
                null,
            webUrl: this.getWebUrl(),
        };
    }

    async updateGlobalSettings(patch: {
        oauthEnabled?: boolean;
        callbackBaseUrl?: string;
        webUrl?: string;
    }): Promise<GlobalOauthSettings> {
        const existing = await this.providerRepo.findOne({
            where: { code: GLOBAL_OAUTH_SETTINGS_CODE },
        });

        const currentExtra = (existing?.extraConfig ?? {}) as Record<string, unknown>;
        const nextCallbackUrl =
            patch.callbackBaseUrl !== undefined
                ? patch.callbackBaseUrl.trim().replace(/\/+$/, '') || null
                : (typeof currentExtra.callbackBaseUrl === 'string'
                    ? currentExtra.callbackBaseUrl
                    : null);
        const nextWebUrl =
            patch.webUrl !== undefined
                ? patch.webUrl.trim().replace(/\/+$/, '') || null
                : (typeof currentExtra.webUrl === 'string' ? currentExtra.webUrl : null);

        const nextEnabled =
            patch.oauthEnabled !== undefined
                ? patch.oauthEnabled
                : existing
                  ? existing.isActive
                  : this.isGlobalEnabled();

        const record = existing
            ? Object.assign(existing, {
                  isActive: nextEnabled,
                  extraConfig: {
                      ...currentExtra,
                      callbackBaseUrl: nextCallbackUrl,
                      webUrl: nextWebUrl,
                  },
              })
            : this.providerRepo.create({
                  code: GLOBAL_OAUTH_SETTINGS_CODE,
                  name: 'Global OAuth Settings',
                  isActive: nextEnabled,
                  clientId: null,
                  clientSecret: null,
                  scopes: null,
                  extraConfig: {
                      callbackBaseUrl: nextCallbackUrl,
                      webUrl: nextWebUrl,
                  },
              });

        await this.providerRepo.save(record);
        this.cachedGlobalEnabled = nextEnabled;
        this.cachedCallbackBaseUrl = nextCallbackUrl;
        this.cachedWebUrl = nextWebUrl;

        return this.getGlobalSettings();
    }

    private async refreshGlobalSettingsCache(): Promise<void> {
        const row = await this.providerRepo.findOne({
            where: { code: GLOBAL_OAUTH_SETTINGS_CODE },
        });
        if (!row) return;
        this.cachedGlobalEnabled = row.isActive;
        const extra = row.extraConfig ?? {};
        this.cachedCallbackBaseUrl =
            typeof extra.callbackBaseUrl === 'string' && extra.callbackBaseUrl.trim()
                ? extra.callbackBaseUrl.trim().replace(/\/+$/, '')
                : null;
        this.cachedWebUrl =
            typeof extra.webUrl === 'string' && extra.webUrl.trim()
                ? extra.webUrl.trim().replace(/\/+$/, '')
                : null;
    }

    /**
     * Level 2: per-app check.
     */
    isAppEnabled(
        appCode: string | undefined,
        app: { oauthEnabled: boolean; enabledProviders: string[] } | null,
    ): boolean {
        if (!this.isGlobalEnabled()) return false;
        if (!appCode) return true;
        if (!app) return false;
        return app.oauthEnabled === true;
    }

    /** Level 3: per-provider check (global + per-app + DB) */
    async isProviderEnabled(
        provider: string,
        app: { oauthEnabled: boolean; enabledProviders: string[] } | null,
    ): Promise<boolean> {
        if (provider.startsWith('_')) return false;
        if (!this.isGlobalEnabled()) return false;
        if (app && !app.oauthEnabled) return false;
        if (app && !app.enabledProviders.includes(provider)) return false;

        const row = await this.providerRepo.findOne({ where: { code: provider } });
        return row?.isActive === true && !!row.clientId;
    }

    /** Resolved credentials for a provider — throws if not configured */
    async getProviderConfig(provider: string): Promise<ResolvedProvider> {
        const row = await this.providerRepo.findOne({ where: { code: provider } });
        if (!row || row.code.startsWith('_') || !row.isActive || !row.clientId) {
            throw new Error(`OAuth provider '${provider}' is not active or not configured`);
        }
        const defaultScopes = isSupportedProviderCode(row.code)
            ? PROVIDER_DEFAULTS[row.code].defaultScopes
            : 'email profile';
        return {
            code: row.code,
            name: row.name,
            clientId: row.clientId,
            clientSecret: row.clientSecret,
            scopes: row.scopes ?? defaultScopes,
            extraConfig: row.extraConfig,
        };
    }

    /** Public: list all providers available to the caller's app. */
    async listAvailableProviders(
        app: { oauthEnabled: boolean; enabledProviders: string[] } | null,
    ): Promise<Array<{ code: string; name: string }>> {
        if (!this.isGlobalEnabled()) return [];

        const rows = await this.providerRepo.find({
            where: { isActive: true },
            order: { code: 'ASC' },
        });
        return rows
            .filter((r) => !r.code.startsWith('_') && !!r.clientId)
            .filter((r) => !app || !app.oauthEnabled || app.enabledProviders.includes(r.code))
            .map((r) => ({ code: r.code, name: r.name }));
    }

    /** Seed from env on first boot — safe to call every boot. */
    async seedFromEnv(): Promise<void> {
        if (!this.isGlobalEnabled()) return;

        const envSeeds: Array<{
            code: string;
            name: string;
            clientId?: string;
            clientSecret?: string | null;
            scopes: string;
            extraConfig?: Record<string, unknown> | null;
        }> = [
            {
                code: 'google',
                name: 'Google',
                clientId: this.config.get<string>('oauth.google.clientId'),
                clientSecret: this.config.get<string>('oauth.google.clientSecret') ?? null,
                scopes: PROVIDER_DEFAULTS.google.defaultScopes,
            },
            {
                code: 'github',
                name: 'GitHub',
                clientId: this.config.get<string>('oauth.github.clientId'),
                clientSecret: this.config.get<string>('oauth.github.clientSecret') ?? null,
                scopes: PROVIDER_DEFAULTS.github.defaultScopes,
            },
            {
                code: 'discord',
                name: 'Discord',
                clientId: this.config.get<string>('oauth.discord.clientId'),
                clientSecret: this.config.get<string>('oauth.discord.clientSecret') ?? null,
                scopes: PROVIDER_DEFAULTS.discord.defaultScopes,
            },
            {
                code: 'microsoft',
                name: 'Microsoft Entra ID',
                clientId: this.config.get<string>('oauth.microsoft.clientId'),
                clientSecret: this.config.get<string>('oauth.microsoft.clientSecret') ?? null,
                scopes: PROVIDER_DEFAULTS.microsoft.defaultScopes,
                extraConfig: {
                    tenantId: this.config.get<string>('oauth.microsoft.tenantId') ?? 'common',
                },
            },
            {
                code: 'telegram',
                name: 'Telegram',
                clientId: this.config.get<string>('oauth.telegram.botUsername'),
                clientSecret: this.config.get<string>('oauth.telegram.botToken') ?? null,
                scopes: PROVIDER_DEFAULTS.telegram.defaultScopes,
                extraConfig: this.config.get<string>('oauth.telegram.botUsername')
                    ? { botUsername: this.config.get<string>('oauth.telegram.botUsername') }
                    : null,
            },
            {
                code: 'apple',
                name: 'Apple',
                clientId: this.config.get<string>('oauth.apple.clientId'),
                clientSecret: null,
                scopes: PROVIDER_DEFAULTS.apple.defaultScopes,
                extraConfig: {
                    teamId: this.config.get<string>('oauth.apple.teamId'),
                    keyId: this.config.get<string>('oauth.apple.keyId'),
                    privateKey: this.config.get<string>('oauth.apple.privateKey'),
                },
            },
        ];

        for (const seed of envSeeds) {
            if (!seed.clientId) continue;
            const existing = await this.providerRepo.findOne({ where: { code: seed.code } });
            if (!existing) {
                await this.providerRepo.save(
                    this.providerRepo.create({
                        code: seed.code,
                        name: seed.name,
                        isActive: true,
                        clientId: seed.clientId,
                        clientSecret: seed.clientSecret ?? null,
                        scopes: seed.scopes,
                        extraConfig: seed.extraConfig ?? null,
                    }),
                );
            }
        }
    }
}
