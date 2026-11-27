import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { SEED_TEMPLATES } from '../seed/default-templates';
import { JobTitle } from '../entities/job-title.entity';
import { AuditService } from '../../audit/services/audit.service';

export interface DepartmentTreeNode {
    id: string;
    code: string;
    name: string;
    description: string | null;
    parentId: string | null;
    isActive: boolean;
    createdAt: Date;
    children: DepartmentTreeNode[];
}

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

        if (dto.parentId) {
            await this.findByIdOrFail(dto.parentId);
        }

        const saved = await this.repo.save(
            this.repo.create({
                ...dto,
                parentId: dto.parentId ?? null,
            }),
        );

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'department.create',
            entity: 'department',
            entityId: saved.id,
            newValue: { code: saved.code, name: saved.name, parentId: saved.parentId },
        });

        return saved;
    }

    findAll(): Promise<Department[]> {
        return this.repo.find({ order: { code: 'ASC' } });
    }

    async getTree(): Promise<DepartmentTreeNode[]> {
        const all = await this.findAll();
        const nodeMap = new Map<string, DepartmentTreeNode>();

        for (const d of all) {
            nodeMap.set(d.id, {
                id: d.id,
                code: d.code,
                name: d.name,
                description: d.description,
                parentId: d.parentId ?? null,
                isActive: d.isActive,
                createdAt: d.createdAt,
                children: [],
            });
        }

        const roots: DepartmentTreeNode[] = [];
        for (const node of nodeMap.values()) {
            if (node.parentId && nodeMap.has(node.parentId)) {
                nodeMap.get(node.parentId)!.children.push(node);
            } else {
                roots.push(node);
            }
        }
        return roots;
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

        if (dto.parentId !== undefined && dto.parentId !== null) {
            await this.assertNoCycle(d.id, dto.parentId);
        }

        const oldValue = {
            name: d.name,
            description: d.description,
            isActive: d.isActive,
            parentId: d.parentId,
        };
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

    private async assertNoCycle(departmentId: string, candidateParentId: string): Promise<void> {
        if (departmentId === candidateParentId) {
            throw new BadRequestException('A department cannot be its own parent');
        }
        const all = await this.repo.find({ select: { id: true, parentId: true } });
        const parentMap = new Map<string, string | null>();
        for (const item of all) {
            parentMap.set(item.id, item.parentId ?? null);
        }

        if (!parentMap.has(candidateParentId)) {
            throw new NotFoundException(`Parent department ${candidateParentId} not found`);
        }

        let current: string | null = candidateParentId;
        const visited = new Set<string>();
        while (current) {
            if (current === departmentId) {
                throw new BadRequestException('Circular department hierarchy is not allowed');
            }
            if (visited.has(current)) break;
            visited.add(current);
            current = parentMap.get(current) ?? null;
        }
    }
}
