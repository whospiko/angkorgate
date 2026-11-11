import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OauthProvider } from "./entities/oauth-provider.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

export interface ResolvedProvider {
    code: string;
    name: string;
    clientId: string;
    clientSecret: string | null;
    scopes: string;
    extraConfig: Record<string, unknown> | null;
}

@Injectable()
export class OauthConfigService {
    constructor(
        private readonly config: ConfigService,
        @InjectRepository(OauthProvider)
        private readonly providerRepo: Repository<OauthProvider>,
    ) { }

    /** Level 1: global kill switch (env) */
    isGlobalEnabled(): boolean {
        return this.config.get<boolean>('oauth.enabled') === true;
    }

    /**
     * Level 2: per-app check.
     * If you haven't enabled apps yet (single-app deployment),
     * callers pass `appCode=undefined` and this returns true.
     */
    isAppEnabled(
        appCode: string | undefined,
        app: { oauthEnabled: boolean; enabledProviders: string[] } | null,
    ): boolean {
        if (!this.isGlobalEnabled()) return false;
        if (!appCode) return true; // no multi-app context yet
        if (!app) return false;
        return app.oauthEnabled === true;
    }

    /** Level 3: per-provider check (global + per-app) */
    async isProviderEnabled(
        provider: string,
        app: { oauthEnabled: boolean; enabledProviders: string[] } | null,
    ): Promise<boolean> {
        if (!this.isGlobalEnabled()) return false;
        if (app && !app.oauthEnabled) return false;
        if (app && !app.enabledProviders.includes(provider)) return false;

        const row = await this.providerRepo.findOne({ where: { code: provider } });
        return row?.isActive === true && !!row.clientId;
    }

    /** Resolved credentials for a provider — throws if not configured */
    async getProviderConfig(provider: string): Promise<ResolvedProvider> {
        const row = await this.providerRepo.findOne({ where: { code: provider } });
        if (!row || !row.isActive || !row.clientId) {
            throw new Error(`OAuth provider '${provider}' is not active or not configured`);
        }
        return {
            code: row.code,
            name: row.name,
            clientId: row.clientId,
            clientSecret: row.clientSecret,
            scopes: row.scopes ?? 'email profile',
            extraConfig: row.extraConfig,
        };
    }

    /** Public: list all providers available to the caller's app. */
    async listAvailableProviders(
        app: { oauthEnabled: boolean; enabledProviders: string[] } | null,
    ): Promise<Array<{ code: string; name: string }>> {
        if (!this.isGlobalEnabled()) return [];

        const rows = await this.providerRepo.find({ where: { isActive: true } });
        return rows
            .filter((r) => !!r.clientId)
            .filter((r) => !app || !app.oauthEnabled || app.enabledProviders.includes(r.code))
            .map((r) => ({ code: r.code, name: r.name }));
    }

    /** Seed from env on first boot — safe to call every boot. */
    async seedFromEnv(): Promise<void> {
        if (!this.config.get<boolean>('oauth.enabled')) return;

        const googleId = this.config.get<string>('oauth.google.clientId');
        if (googleId) {
            const existing = await this.providerRepo.findOne({ where: { code: 'google' } });
            if (!existing) {
                await this.providerRepo.save(
                    this.providerRepo.create({
                        code: 'google',
                        name: 'Google',
                        isActive: true,
                        clientId: googleId,
                        clientSecret: this.config.get<string>('oauth.google.clientSecret') ?? null,
                        scopes: 'email profile',
                    }),
                );
            }
        }

        const appleId = this.config.get<string>('oauth.apple.clientId');
        if (appleId) {
            const existing = await this.providerRepo.findOne({ where: { code: 'apple' } });
            if (!existing) {
                await this.providerRepo.save(
                    this.providerRepo.create({
                        code: 'apple',
                        name: 'Apple',
                        isActive: true,
                        clientId: appleId,
                        clientSecret: null,
                        scopes: 'name email',
                        extraConfig: {
                            teamId: this.config.get<string>('oauth.apple.teamId'),
                            keyId: this.config.get<string>('oauth.apple.keyId'),
                            privateKey: this.config.get<string>('oauth.apple.privateKey'),
                        },
                    }),
                );
            }
        }
    }
}