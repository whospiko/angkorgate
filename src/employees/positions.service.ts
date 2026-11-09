import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeePosition } from './entities/employee-position.entity';
import { EmployeeAttribute } from './entities/employee-attribute.entity';
import { EmployeesService } from './employees.service';
import { DepartmentsService } from './departments.service';
import { JobTitlesService } from './job-titles.service';
import { AssignPositionDto } from './dto/assign-position.dto';

@Injectable()
export class PositionsService {
    constructor(
        @InjectRepository(EmployeePosition)
        private readonly posRepo: Repository<EmployeePosition>,
        @InjectRepository(EmployeeAttribute)
        private readonly attrRepo: Repository<EmployeeAttribute>,
        private readonly employees: EmployeesService,
        private readonly departments: DepartmentsService,
        private readonly jobTitles: JobTitlesService,
    ) { }

    async assign(dto: AssignPositionDto): Promise<EmployeePosition> {
        const employee = await this.employees.findByIdOrFail(dto.employeeId);
        const jobTitle = await this.jobTitles.findByCodeOrFail(dto.jobTitleCode);

        let departmentId: string | null = null;
        if (dto.departmentCode) {
            const dept = await this.departments.findByCodeOrFail(dto.departmentCode);
            departmentId = dept.id;
        }

        // If isPrimary, demote any existing primary position
        if (dto.isPrimary) {
            await this.posRepo.update(
                { employeeId: employee.id, isPrimary: true },
                { isPrimary: false },
            );
        }

        const existing = await this.posRepo.findOne({
            where: {
                employeeId: employee.id,
                jobTitleId: jobTitle.id,
                departmentId: departmentId ?? undefined,
            },
        });
        if (existing) {
            throw new ConflictException('Position already assigned');
        }

        return this.posRepo.save(
            this.posRepo.create({
                employeeId: employee.id,
                jobTitleId: jobTitle.id,
                departmentId,
                isPrimary: dto.isPrimary ?? false,
                startDate: dto.startDate ?? null,
                endDate: dto.endDate ?? null,
            }),
        );
    }

    async findByEmployee(employeeId: string) {
        return this.posRepo.find({
            where: { employeeId },
            relations: { jobTitle: true, department: true },
            order: { isPrimary: 'DESC', createdAt: 'ASC' },
        });
    }

    async remove(positionId: string): Promise<void> {
        const result = await this.posRepo.delete(positionId);
        if (result.affected === 0) {
            throw new NotFoundException(`Position ${positionId} not found`);
        }
    }

    // ─── ATTRIBUTES (JSONB key/value) ────────────────────────────────

    async setAttribute(
        positionId: string,
        key: string,
        value: unknown,
    ): Promise<EmployeeAttribute> {
        const position = await this.posRepo.findOne({ where: { id: positionId } });
        if (!position) throw new NotFoundException(`Position ${positionId} not found`);

        let attr = await this.attrRepo.findOne({ where: { positionId, key } });
        if (attr) {
            attr.value = value;
        } else {
            attr = this.attrRepo.create({ positionId, key, value });
        }
        return this.attrRepo.save(attr);
    }

    async getAttributes(positionId: string): Promise<Record<string, unknown>> {
        const attrs = await this.attrRepo.find({ where: { positionId } });
        const out: Record<string, unknown> = {};
        for (const a of attrs) out[a.key] = a.value;
        return out;
    }

    async deleteAttribute(positionId: string, key: string): Promise<void> {
        await this.attrRepo.delete({ positionId, key });
    }
}