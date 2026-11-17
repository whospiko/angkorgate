import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobTitle } from '../entities/job-title.entity';
import { CreateJobTitleDto } from '../dto/create-job-title.dto';

@Injectable()
export class JobTitlesService {
    constructor(
        @InjectRepository(JobTitle)
        private readonly repo: Repository<JobTitle>,
    ) { }

    async create(dto: CreateJobTitleDto): Promise<JobTitle> {
        const exists = await this.repo.findOne({ where: { code: dto.code } });
        if (exists) throw new ConflictException(`Job title ${dto.code} exists`);
        return this.repo.save(this.repo.create(dto));
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
}