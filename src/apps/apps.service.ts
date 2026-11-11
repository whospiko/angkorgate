import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

@Injectable()
export class AppsService {
    constructor(
        @InjectRepository(AppSetting)
        private readonly repo: Repository<AppSetting>,
    ) { }

    async findAll(): Promise<AppSetting[]> {
        return this.repo.find({ order: { appCode: 'ASC' } });
    }

    async findByCode(code: string): Promise<AppSetting | null> {
        return this.repo.findOne({ where: { appCode: code } });
    }

    async findByCodeOrFail(code: string): Promise<AppSetting> {
        const a = await this.findByCode(code);
        if (!a) throw new NotFoundException(`App ${code} not found`);
        return a;
    }

    async create(data: Partial<AppSetting>): Promise<AppSetting> {
        return this.repo.save(this.repo.create(data));
    }

    async update(code: string, dto: UpdateAppSettingsDto): Promise<AppSetting> {
        const app = await this.findByCodeOrFail(code);
        Object.assign(app, dto);
        return this.repo.save(app);
    }

    async remove(code: string): Promise<void> {
        const app = await this.findByCodeOrFail(code);
        await this.repo.delete(app.id);
    }

    /** Narrow API — used by OAuth and Auth to resolve the caller's app. */
    async getContext(code: string | undefined): Promise<AppSetting | null> {
        if (!code) return null;
        return this.findByCode(code);
    }
}