import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { OauthProvider } from '../entities/oauth-provider.entity';
import { CreateProviderDto } from '../dto/create-provider.dto';
import { UpdateProviderDto } from '../dto/update-provider.dto';
import { GLOBAL_OAUTH_SETTINGS_CODE } from './oauth-config.service';
import { OauthStrategyRegistry } from './oauth-strategy.registry';

@Injectable()
export class OauthProvidersService {
    constructor(
        @InjectRepository(OauthProvider)
        private readonly repo: Repository<OauthProvider>,
        @Optional()
        private readonly registry?: OauthStrategyRegistry,
    ) { }

    async list(): Promise<OauthProvider[]> {
        const rows = await this.repo.find({
            where: { code: Not(GLOBAL_OAUTH_SETTINGS_CODE) },
            order: { code: 'ASC' },
        });
        return rows.filter((r) => !r.code.startsWith('_'));
    }

    async findByCodeOrFail(code: string): Promise<OauthProvider> {
        if (code.startsWith('_')) {
            throw new NotFoundException(`Provider ${code} not found`);
        }
        const p = await this.repo.findOne({ where: { code } });
        if (!p) throw new NotFoundException(`Provider ${code} not found`);
        return p;
    }

    async create(dto: CreateProviderDto): Promise<OauthProvider> {
        const exists = await this.repo.findOne({ where: { code: dto.code } });
        if (exists) throw new ConflictException(`Provider ${dto.code} exists`);
        const saved = await this.repo.save(
            this.repo.create({ ...dto, isActive: dto.isActive ?? false }),
        );
        this.registry?.invalidate(saved.code);
        return saved;
    }

    async update(code: string, dto: UpdateProviderDto): Promise<OauthProvider> {
        const p = await this.findByCodeOrFail(code);
        Object.assign(p, dto);
        const saved = await this.repo.save(p);
        this.registry?.invalidate(code);
        return saved;
    }

    async toggleActive(code: string): Promise<void> {
        const p = await this.findByCodeOrFail(code);
        p.isActive = !p.isActive;
        await this.repo.save(p);
        this.registry?.invalidate(code);
    }

    async remove(code: string): Promise<void> {
        if (code === GLOBAL_OAUTH_SETTINGS_CODE) return;
        await this.repo.delete({ code });
        this.registry?.invalidate(code);
    }
}
