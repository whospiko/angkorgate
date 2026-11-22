import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';
import { CacheService } from '../cache/cache.service';
import { generateHexSecret } from '../common/utils/crypto.util';

@Injectable()
export class AppsService {
    constructor(
        @InjectRepository(AppSetting)
        private readonly repo: Repository<AppSetting>,
        @Optional()
        private readonly cache?: CacheService,
    ) { }

    async findAll(): Promise<AppSetting[]> {
        return this.repo.find({ order: { appCode: 'ASC' } });
    }

    async findByCode(code: string): Promise<AppSetting | null> {
        const fetcher = () => this.repo.findOne({ where: { appCode: code } });
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

    async create(data: Partial<AppSetting>): Promise<AppSetting> {
        const saved = await this.repo.save(this.repo.create(data));
        if (saved.appCode) {
            await this.cache?.del(`apps:${saved.appCode}`);
        }
        return saved;
    }

    async update(code: string, dto: UpdateAppSettingsDto): Promise<AppSetting> {
        const app = await this.findByCodeOrFail(code);
        Object.assign(app, dto);
        const saved = await this.repo.save(app);
        await this.cache?.del(`apps:${code}`);
        return saved;
    }

    async remove(code: string): Promise<void> {
        const app = await this.findByCodeOrFail(code);
        await this.repo.delete(app.id);
        await this.cache?.del(`apps:${code}`);
    }

    async regenerateSecret(code: string): Promise<{ appCode: string; clientSecret: string }> {
        const app = await this.findByCodeOrFail(code);
        const clientSecret = generateHexSecret(32);
        app.clientSecret = clientSecret;
        await this.repo.save(app);
        await this.cache?.del(`apps:${code}`);
        return { appCode: code, clientSecret };
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

    /** Narrow API — used by OAuth and Auth to resolve the caller's app. */
    async getContext(code: string | undefined): Promise<AppSetting | null> {
        if (!code) return null;
        return this.findByCode(code);
    }
}
