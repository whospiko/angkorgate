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
        // Dynamic client resolution via AppsService
        if (this.name === 'Client') {
            const app = await this.appsService.findByCode(id);
            if (!app) return undefined;
            const isPublic = !app.clientSecret;
            return {
                client_id: app.appCode,
                client_name: app.name,
                client_secret: app.clientSecret ?? undefined,
                redirect_uris: app.allowedRedirectUrls && app.allowedRedirectUrls.length > 0
                    ? app.allowedRedirectUrls
                    : ['http://localhost:5173/callback'],
                grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
                response_types: ['code'],
                token_endpoint_auth_method: isPublic ? 'none' : 'client_secret_basic',
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
