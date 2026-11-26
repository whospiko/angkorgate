import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { SEED_TEMPLATES } from '../seed/default-templates';
import { JobTitle } from '../entities/job-title.entity';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class DepartmentsService {
    constructor(
        @InjectRepository(Department)
        private readonly repo: Repository<Department>,
        @InjectRepository(JobTitle)
        private readonly jobTitleRepo: Repository<JobTitle>,
        private readonly audit: AuditService,
    ) { }

    async create(dto: CreateDepartmentDto, actorId?: string): Promise<Department> {
        const exists = await this.repo.findOne({ where: { code: dto.code } });
        if (exists) throw new ConflictException(`Department ${dto.code} exists`);
        const saved = await this.repo.save(this.repo.create(dto));

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'department.create',
            entity: 'department',
            entityId: saved.id,
            newValue: { code: saved.code, name: saved.name },
        });

        return saved;
    }

    findAll(): Promise<Department[]> {
        return this.repo.find({ order: { code: 'ASC' } });
    }

    async findByIdOrFail(id: string): Promise<Department> {
        const d = await this.repo.findOne({ where: { id } });
        if (!d) throw new NotFoundException(`Department ${id} not found`);
        return d;
    }

    async findByCodeOrFail(code: string): Promise<Department> {
        const d = await this.repo.findOne({ where: { code } });
        if (!d) throw new NotFoundException(`Department ${code} not found`);
        return d;
    }

    async update(code: string, dto: UpdateDepartmentDto, actorId?: string): Promise<Department> {
        const d = await this.findByCodeOrFail(code);
        const oldValue = { name: d.name, description: d.description, isActive: d.isActive };
        Object.assign(d, dto);
        const saved = await this.repo.save(d);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'department.update',
            entity: 'department',
            entityId: d.id,
            oldValue,
            newValue: dto as Record<string, unknown>,
        });

        return saved;
    }

    async remove(code: string, actorId?: string): Promise<void> {
        const d = await this.findByCodeOrFail(code);
        await this.repo.delete(d.id);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'department.delete',
            entity: 'department',
            entityId: d.id,
            oldValue: { code: d.code, name: d.name },
        });
    }

    async seedFromTemplate(
        template: string,
        actorId?: string,
    ): Promise<{ departments: number; jobTitles: number }> {
        const tpl = SEED_TEMPLATES[template];
        if (!tpl) throw new NotFoundException(`Unknown template '${template}'`);

        let d = 0, j = 0;

        for (const dept of tpl.departments) {
            const exists = await this.repo.findOne({ where: { code: dept.code } });
            if (!exists) {
                await this.repo.save(this.repo.create(dept));
                d++;
            }
        }

        for (const job of tpl.jobTitles) {
            const exists = await this.jobTitleRepo.findOne({ where: { code: job.code } });
            if (!exists) {
                await this.jobTitleRepo.save(this.jobTitleRepo.create(job));
                j++;
            }
        }

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'department.seed',
            entity: 'department',
            entityId: template,
            newValue: { template, departments: d, jobTitles: j },
        });

        return { departments: d, jobTitles: j };
    }
}
