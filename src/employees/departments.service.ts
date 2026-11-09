import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { SEED_TEMPLATES } from './seed/default-templates';
import { JobTitle } from './entities/job-title.entity';

@Injectable()
export class DepartmentsService {
    constructor(
        @InjectRepository(Department)
        private readonly repo: Repository<Department>,
        @InjectRepository(JobTitle)
        private readonly jobTitleRepo: Repository<JobTitle>,
    ) { }

    async create(dto: CreateDepartmentDto): Promise<Department> {
        const exists = await this.repo.findOne({ where: { code: dto.code } });
        if (exists) throw new ConflictException(`Department ${dto.code} exists`);
        return this.repo.save(this.repo.create(dto));
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

    async seedFromTemplate(template: string): Promise<{ departments: number; jobTitles: number }> {
        const tpl = SEED_TEMPLATES[template];
        if (!tpl) throw new NotFoundException(`Unknown template '${template}'`);

        let d = 0, j = 0;

        // Seed Departments
        for (const dept of tpl.departments) {
            const exists = await this.repo.findOne({ where: { code: dept.code } });
            if (!exists) {
                await this.repo.save(this.repo.create(dept));
                d++;
            }
        }

        // 2. Seed Job Titles
        for (const job of tpl.jobTitles) {
            const exists = await this.jobTitleRepo.findOne({ where: { code: job.code } });
            if (!exists) {
                await this.jobTitleRepo.save(this.jobTitleRepo.create(job));
                j++;
            }
        }

        return { departments: d, jobTitles: j };
    }
}