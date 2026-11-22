import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OauthProvider } from '../entities/oauth-provider.entity';
import { CreateProviderDto } from '../dto/create-provider.dto';
import { UpdateProviderDto } from '../dto/update-provider.dto';

@Injectable()
export class OauthProvidersService {
    constructor(
        @InjectRepository(OauthProvider)
        private readonly repo: Repository<OauthProvider>,
    ) { }

    async list(): Promise<OauthProvider[]> {
        return this.repo.find({ order: { code: 'ASC' } });
    }

    async findByCodeOrFail(code: string): Promise<OauthProvider> {
        const p = await this.repo.findOne({ where: { code } });
        if (!p) throw new NotFoundException(`Provider ${code} not found`);
        return p;
    }

    async create(dto: CreateProviderDto): Promise<OauthProvider> {
        const exists = await this.repo.findOne({ where: { code: dto.code } });
        if (exists) throw new ConflictException(`Provider ${dto.code} exists`);
        return this.repo.save(this.repo.create({ ...dto, isActive: dto.isActive ?? false }));
    }

    async update(code: string, dto: UpdateProviderDto): Promise<OauthProvider> {
        const p = await this.repo.findOne({ where: { code } });
        if (!p) throw new NotFoundException(`Provider ${code} not found`);
        Object.assign(p, dto);
        return this.repo.save(p);
    }

    async toggleActive(code: string): Promise<void> {
        const p = await this.repo.findOne({ where: { code } });
        if (!p) throw new NotFoundException(`Provider ${code} not found`);
        p.isActive = !p.isActive;
        await this.repo.save(p);
    }

    async remove(code: string): Promise<void> {
        await this.repo.delete({ code });
    }
}