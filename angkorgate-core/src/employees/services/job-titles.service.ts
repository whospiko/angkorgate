import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobTitle } from '../entities/job-title.entity';
import { CreateJobTitleDto } from '../dto/create-job-title.dto';
import { UpdateJobTitleDto } from '../dto/update-job-title.dto';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class JobTitlesService {
    constructor(
        @InjectRepository(JobTitle)
        private readonly repo: Repository<JobTitle>,
        private readonly audit: AuditService,
    ) { }

    async create(dto: CreateJobTitleDto, actorId?: string): Promise<JobTitle> {
        const exists = await this.repo.findOne({ where: { code: dto.code } });
        if (exists) throw new ConflictException(`Job title ${dto.code} exists`);
        const saved = await this.repo.save(this.repo.create(dto));

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'job_title.create',
            entity: 'job_title',
            entityId: saved.id,
            newValue: { code: saved.code, name: saved.name, category: saved.category },
        });

        return saved;
    }

    findAll(category?: string): Promise<JobTitle[]> {
        return this.repo.find({
            where: category ? { category } : {},
            order: { code: 'ASC' },
        });
    }

    async findByCodeOrFail(code: string): Promise<JobTitle> {
        const j = await this.repo.findOne({ where: { code } });
        if (!j) throw new NotFoundException(`Job title ${code} not found`);
        return j;
    }

    async update(code: string, dto: UpdateJobTitleDto, actorId?: string): Promise<JobTitle> {
        const j = await this.findByCodeOrFail(code);
        const oldValue = { name: j.name, category: j.category, isActive: j.isActive };
        Object.assign(j, dto);
        const saved = await this.repo.save(j);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'job_title.update',
            entity: 'job_title',
            entityId: j.id,
            oldValue,
            newValue: dto as Record<string, unknown>,
        });

        return saved;
    }

    async remove(code: string, actorId?: string): Promise<void> {
        const j = await this.findByCodeOrFail(code);
        await this.repo.delete(j.id);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'job_title.delete',
            entity: 'job_title',
            entityId: j.id,
            oldValue: { code: j.code, name: j.name },
        });
    }
}
