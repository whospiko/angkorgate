import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';
import { CacheService } from '../cache/cache.service';
import { generateHexSecret } from '../common/utils/crypto.util';
import { ScopesService } from '../scopes/services/scopes.service';

@Injectable()
export class AppsService {
    constructor(
        @InjectRepository(AppSetting)
        private readonly repo: Repository<AppSetting>,
        private readonly scopesService: ScopesService,
        @Optional()
        private readonly cache?: CacheService,
    ) { }

    async findAll(): Promise<AppSetting[]> {
        return this.repo.find({
            relations: { allowedScopes: true },
            order: { appCode: 'ASC' },
        });
    }

    async findByCode(code: string): Promise<AppSetting | null> {
        const fetcher = () =>
            this.repo.findOne({
                where: { appCode: code },
                relations: { allowedScopes: true },
            });
        if (this.cache) {
            return this.cache.wrap(`apps:${code}`, fetcher, 600);
        }
        return fetcher();
    }

    async findByCodeOrFail(code: string): Promise<AppSetting> {
        const a = await this.findByCode(code);
        if (!a) throw new NotFoundException(`App ${code} not found`);
        return a;
    }

    async create(dto: CreateAppDto): Promise<AppSetting> {
        const isPublic = dto.isPublicClient ?? false;
        let clientSecret: string | null = null;
        if (!isPublic) {
            clientSecret = dto.clientSecret || generateHexSecret(32);
        }

        // Synchronize redirect URIs
        const redirectUris =
            dto.validRedirectUris && dto.validRedirectUris.length > 0
                ? dto.validRedirectUris
                : dto.allowedRedirectUrls || ['http://localhost:5173/callback'];

        // Resolve scopes: use explicitly provided scopeIds or default system scopes
        let scopes = [];
        if (dto.scopeIds && dto.scopeIds.length > 0) {
            scopes = await this.scopesService.findByIds(dto.scopeIds);
        } else {
            scopes = await this.scopesService.findDefaultScopes();
        }

        const app = this.repo.create({
            appCode: dto.appCode,
            name: dto.name,
            description: dto.description ?? null,
            clientSecret: clientSecret,
            rootUrl: dto.rootUrl ?? null,
            homeUrl: dto.homeUrl ?? null,
            validRedirectUris: redirectUris,
            allowedRedirectUrls: redirectUris,
            validPostLogoutRedirectUris: dto.validPostLogoutRedirectUris ?? [],
            webOrigins: dto.webOrigins ?? [],
            standardFlowEnabled: dto.standardFlowEnabled ?? true,
            implicitFlowEnabled: dto.implicitFlowEnabled ?? false,
            directAccessGrantsEnabled: dto.directAccessGrantsEnabled ?? false,
            serviceAccountsEnabled: dto.serviceAccountsEnabled ?? false,
            requirePkce: dto.requirePkce ?? true,
            isPublicClient: isPublic,
            oauthEnabled: dto.oauthEnabled ?? false,
            enabledProviders: dto.enabledProviders ?? [],
            passwordLoginEnabled: dto.passwordLoginEnabled ?? true,
            registrationEnabled: dto.registrationEnabled ?? true,
            emailVerificationRequired: dto.emailVerificationRequired ?? true,
            allowedScopes: scopes,
        });

        const saved = await this.repo.save(app);
        if (saved.appCode) {
            await this.cache?.del(`apps:${saved.appCode}`);
        }
        return this.findByCodeOrFail(saved.appCode);
    }

    async update(code: string, dto: UpdateAppSettingsDto): Promise<AppSetting> {
        const app = await this.findByCodeOrFail(code);

        // Handle Public vs Confidential transition
        if (dto.isPublicClient !== undefined) {
            app.isPublicClient = dto.isPublicClient;
            if (app.isPublicClient) {
                app.clientSecret = null;
            } else if (!app.clientSecret) {
                app.clientSecret = generateHexSecret(32);
            }
        }

        if (dto.name !== undefined) app.name = dto.name;
        if (dto.description !== undefined) app.description = dto.description;
        if (dto.rootUrl !== undefined) app.rootUrl = dto.rootUrl;
        if (dto.homeUrl !== undefined) app.homeUrl = dto.homeUrl;

        // Redirect URIs sync
        if (dto.validRedirectUris !== undefined) {
            app.validRedirectUris = dto.validRedirectUris;
            app.allowedRedirectUrls = dto.validRedirectUris;
        } else if (dto.allowedRedirectUrls !== undefined) {
            app.allowedRedirectUrls = dto.allowedRedirectUrls;
            app.validRedirectUris = dto.allowedRedirectUrls;
        }

        if (dto.validPostLogoutRedirectUris !== undefined) {
            app.validPostLogoutRedirectUris = dto.validPostLogoutRedirectUris;
        }
        if (dto.webOrigins !== undefined) {
            app.webOrigins = dto.webOrigins;
        }

        // Capability flags
        if (dto.standardFlowEnabled !== undefined) app.standardFlowEnabled = dto.standardFlowEnabled;
        if (dto.implicitFlowEnabled !== undefined) app.implicitFlowEnabled = dto.implicitFlowEnabled;
        if (dto.directAccessGrantsEnabled !== undefined) app.directAccessGrantsEnabled = dto.directAccessGrantsEnabled;
        if (dto.serviceAccountsEnabled !== undefined) app.serviceAccountsEnabled = dto.serviceAccountsEnabled;
        if (dto.requirePkce !== undefined) app.requirePkce = dto.requirePkce;

        // Legacy auth flags
        if (dto.oauthEnabled !== undefined) app.oauthEnabled = dto.oauthEnabled;
        if (dto.enabledProviders !== undefined) app.enabledProviders = dto.enabledProviders;
        if (dto.passwordLoginEnabled !== undefined) app.passwordLoginEnabled = dto.passwordLoginEnabled;
        if (dto.registrationEnabled !== undefined) app.registrationEnabled = dto.registrationEnabled;
        if (dto.emailVerificationRequired !== undefined) app.emailVerificationRequired = dto.emailVerificationRequired;

        // Scopes update
        if (dto.scopeIds !== undefined) {
            app.allowedScopes = await this.scopesService.findByIds(dto.scopeIds);
        }

        await this.repo.save(app);
        await this.cache?.del(`apps:${code}`);
        return this.findByCodeOrFail(code);
    }

    async remove(code: string): Promise<void> {
        const app = await this.findByCodeOrFail(code);
        await this.repo.delete(app.id);
        await this.cache?.del(`apps:${code}`);
    }

    /**
     * Zero-Downtime Secret Rotation:
     * Moves existing secret to secondaryClientSecret with a configurable grace period (default 24h).
     */
    async regenerateSecret(
        code: string,
        gracePeriodHours: number = 24,
    ): Promise<{
        appCode: string;
        clientSecret: string;
        secondaryClientSecret?: string | null;
        secondarySecretExpiresAt?: Date | null;
    }> {
        const app = await this.findByCodeOrFail(code);
        if (app.isPublicClient) {
            app.isPublicClient = false;
        }

        // Store old secret as secondary during grace window
        if (app.clientSecret) {
            app.secondaryClientSecret = app.clientSecret;
            app.secondarySecretExpiresAt = new Date(Date.now() + gracePeriodHours * 3600 * 1000);
        }

        const newSecret = generateHexSecret(32);
        app.clientSecret = newSecret;

        await this.repo.save(app);
        await this.cache?.del(`apps:${code}`);

        return {
            appCode: code,
            clientSecret: newSecret,
            secondaryClientSecret: app.secondaryClientSecret,
            secondarySecretExpiresAt: app.secondarySecretExpiresAt,
        };
    }

    async setScopes(code: string, scopeIds: string[]): Promise<AppSetting> {
        const app = await this.findByCodeOrFail(code);
        app.allowedScopes = await this.scopesService.findByIds(scopeIds);
        await this.repo.save(app);
        await this.cache?.del(`apps:${code}`);
        return this.findByCodeOrFail(code);
    }

    async toggleActive(
        code: string,
        feature: 'passwordLogin' | 'oauth' | 'registration' = 'passwordLogin',
    ): Promise<AppSetting> {
        const app = await this.findByCodeOrFail(code);
        if (feature === 'oauth') {
            app.oauthEnabled = !app.oauthEnabled;
        } else if (feature === 'registration') {
            app.registrationEnabled = !app.registrationEnabled;
        } else {
            app.passwordLoginEnabled = !app.passwordLoginEnabled;
        }
        const saved = await this.repo.save(app);
        await this.cache?.del(`apps:${code}`);
        return saved;
    }

    /**
     * Validates whether a provided secret matches primary or unexpired secondary secret.
     */
    async validateSecret(code: string, providedSecret: string): Promise<boolean> {
        const app = await this.findByCode(code);
        if (!app) return false;
        if (app.isPublicClient) return true;

        if (app.clientSecret && app.clientSecret === providedSecret) {
            return true;
        }

        if (
            app.secondaryClientSecret &&
            app.secondaryClientSecret === providedSecret &&
            app.secondarySecretExpiresAt &&
            app.secondarySecretExpiresAt > new Date()
        ) {
            return true;
        }

        return false;
    }

    /** Narrow API — used by OAuth and Auth to resolve the caller's app. */
    async getContext(code: string | undefined): Promise<AppSetting | null> {
        if (!code) return null;
        return this.findByCode(code);
    }
}
