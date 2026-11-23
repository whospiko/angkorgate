import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { type Adapter, type AdapterPayload } from 'oidc-provider';
import { OidcSession } from '../entities/oidc-session.entity';
import { AppsService } from '../../apps/apps.service';

export class TypeOrmOidcAdapter implements Adapter {
    constructor(
        private readonly name: string,
        private readonly repo: Repository<OidcSession>,
        private readonly appsService: AppsService,
    ) { }

    private key(id: string): string {
        return `${this.name}:${id}`;
    }

    async upsert(id: string, payload: AdapterPayload, expiresIn?: number): Promise<void> {
        const expiresAt = expiresIn
            ? new Date(Date.now() + expiresIn * 1000)
            : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        await this.repo.save({
            id: this.key(id),
            modelName: this.name,
            payload: payload,
            expiresAt,
            grantId: payload.grantId ?? null,
            userCode: payload.userCode ?? null,
            uid: payload.uid ?? null,
        });
    }

    async find(id: string): Promise<AdapterPayload | undefined> {
        // Dynamic client resolution via AppsService with full OIDC capabilities
        if (this.name === 'Client') {
            const app = await this.appsService.findByCode(id);
            if (!app) return undefined;

            const isPublic = app.isPublicClient || !app.clientSecret;

            const redirectUris =
                app.validRedirectUris && app.validRedirectUris.length > 0
                    ? app.validRedirectUris
                    : app.allowedRedirectUrls && app.allowedRedirectUrls.length > 0
                        ? app.allowedRedirectUrls
                        : ['http://localhost:5173/callback'];

            const postLogoutRedirectUris = app.validPostLogoutRedirectUris || [];

            const grantTypes: string[] = [];
            if (app.standardFlowEnabled) grantTypes.push('authorization_code');
            if (app.implicitFlowEnabled) grantTypes.push('implicit');
            if (app.directAccessGrantsEnabled) grantTypes.push('password');
            if (app.serviceAccountsEnabled) grantTypes.push('client_credentials');
            if (app.standardFlowEnabled || app.directAccessGrantsEnabled || app.serviceAccountsEnabled) {
                grantTypes.push('refresh_token');
            }
            if (grantTypes.length === 0) {
                grantTypes.push('authorization_code', 'refresh_token');
            }

            const responseTypes: string[] = [];
            if (app.standardFlowEnabled) responseTypes.push('code');
            if (app.implicitFlowEnabled) responseTypes.push('id_token token', 'id_token');
            if (responseTypes.length === 0) responseTypes.push('code');

            const allowedScopes =
                app.allowedScopes && app.allowedScopes.length > 0
                    ? app.allowedScopes.map((s) => s.name).join(' ')
                    : 'openid profile email roles offline_access';

            return {
                client_id: app.appCode,
                client_name: app.name,
                client_secret: isPublic ? undefined : (app.clientSecret ?? undefined),
                redirect_uris: redirectUris,
                post_logout_redirect_uris: postLogoutRedirectUris,
                grant_types: grantTypes,
                response_types: responseTypes,
                scope: allowedScopes,
                token_endpoint_auth_method: isPublic ? 'none' : 'client_secret_basic',
                require_pkce: app.requirePkce,
            } as unknown as AdapterPayload;
        }

        const record = await this.repo.findOne({
            where: { id: this.key(id), consumedAt: IsNull() },
        });
        if (!record || (record.expiresAt && record.expiresAt < new Date())) {
            return undefined;
        }
        return typeof record.payload === 'string' ? JSON.parse(record.payload) : record.payload;
    }

    async findByUid(uid: string): Promise<AdapterPayload | undefined> {
        const record = await this.repo.findOne({
            where: { modelName: this.name, uid, consumedAt: IsNull() },
        });
        if (!record || (record.expiresAt && record.expiresAt < new Date())) {
            return undefined;
        }
        return typeof record.payload === 'string' ? JSON.parse(record.payload) : record.payload;
    }

    async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
        const record = await this.repo.findOne({
            where: { modelName: this.name, userCode, consumedAt: IsNull() },
        });
        if (!record || (record.expiresAt && record.expiresAt < new Date())) {
            return undefined;
        }
        return typeof record.payload === 'string' ? JSON.parse(record.payload) : record.payload;
    }

    async destroy(id: string): Promise<void> {
        await this.repo.delete({ id: this.key(id) });
    }

    async consume(id: string): Promise<void> {
        await this.repo.update({ id: this.key(id) }, { consumedAt: new Date() });
    }

    async revokeByGrantId(grantId: string): Promise<void> {
        await this.repo.delete({ grantId });
    }
}

@Injectable()
export class OidcAdapterService {
    private readonly logger = new Logger(OidcAdapterService.name);

    constructor(
        @InjectRepository(OidcSession)
        private readonly repo: Repository<OidcSession>,
        private readonly appsService: AppsService,
    ) { }

    createAdapter(name: string): Adapter {
        return new TypeOrmOidcAdapter(name, this.repo, this.appsService);
    }

    async purgeExpired(): Promise<void> {
        const result = await this.repo.delete({ expiresAt: LessThan(new Date()) });
        this.logger.debug(`Purged expired OIDC sessions: ${result.affected ?? 0}`);
    }
}
