import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { EmployeePosition } from '../entities/employee-position.entity';
import { EmployeeAttribute } from '../entities/employee-attribute.entity';
import { JobTitlesService } from './job-titles.service';
import { AssignPositionDto } from '../dto/assign-position.dto';
import { UpdatePositionDto } from '../dto/update-position.dto';
import { EmployeesService } from './employees.service';
import { DepartmentsService } from './departments.service';
import { AuditService } from '../../audit/services/audit.service';
import { AttributeSchemasService } from '../../customers/services/attribute-schemas.service';

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
        private readonly audit: AuditService,
        @Optional() private readonly attributeSchemas?: AttributeSchemasService,
    ) { }

    async assign(dto: AssignPositionDto, actorId?: string): Promise<EmployeePosition> {
        if (dto.startDate && dto.endDate && dto.startDate > dto.endDate) {
            throw new BadRequestException('Position startDate cannot be after endDate');
        }

        const employee = await this.employees.findByIdOrFail(dto.employeeId);
        const jobTitle = await this.jobTitles.findByCodeOrFail(dto.jobTitleCode);

        let departmentId: string | null = null;
        if (dto.departmentCode) {
            const dept = await this.departments.findByCodeOrFail(dto.departmentCode);
            departmentId = dept.id;
        }

        const existing = await this.posRepo.findOne({
            where: {
                employeeId: employee.id,
                jobTitleId: jobTitle.id,
                departmentId: departmentId === null ? IsNull() : departmentId,
            },
        });
        if (existing) {
            throw new ConflictException('Position already assigned');
        }

        if (dto.isPrimary) {
            await this.posRepo.update(
                { employeeId: employee.id, isPrimary: true },
                { isPrimary: false },
            );
        }

        const saved = await this.posRepo.save(
            this.posRepo.create({
                employeeId: employee.id,
                jobTitleId: jobTitle.id,
                departmentId,
                isPrimary: dto.isPrimary ?? false,
                startDate: dto.startDate ?? null,
                endDate: dto.endDate ?? null,
            }),
        );

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.position.assign',
            entity: 'employee_position',
            entityId: saved.id,
            newValue: {
                employeeId: employee.id,
                jobTitleCode: dto.jobTitleCode,
                departmentCode: dto.departmentCode ?? null,
                isPrimary: saved.isPrimary,
            },
        });

        return this.findById(employee.id, saved.id);
    }

    async findByEmployee(employeeId: string) {
        await this.employees.findByIdOrFail(employeeId);
        return this.posRepo.find({
            where: { employeeId },
            relations: { jobTitle: true, department: true },
            order: { isPrimary: 'DESC', createdAt: 'ASC' },
        });
    }

    async findById(employeeId: string, positionId: string): Promise<EmployeePosition> {
        const p = await this.posRepo.findOne({
            where: { id: positionId, employeeId },
            relations: { jobTitle: true, department: true },
        });
        if (!p) throw new NotFoundException(`Position ${positionId} not found`);
        return p;
    }

    async update(
        employeeId: string,
        positionId: string,
        dto: UpdatePositionDto,
        actorId?: string,
    ): Promise<EmployeePosition> {
        const p = await this.findById(employeeId, positionId);

        const nextStart = dto.startDate !== undefined ? dto.startDate : p.startDate;
        const nextEnd = dto.endDate !== undefined ? dto.endDate : p.endDate;
        if (nextStart && nextEnd && nextStart > nextEnd) {
            throw new BadRequestException('Position startDate cannot be after endDate');
        }

        let nextDepartmentId = p.departmentId;
        if (dto.departmentCode !== undefined) {
            if (dto.departmentCode === null || dto.departmentCode === '') {
                nextDepartmentId = null;
            } else {
                const dept = await this.departments.findByCodeOrFail(dto.departmentCode);
                nextDepartmentId = dept.id;
            }
        }

        if (nextDepartmentId !== p.departmentId) {
            const dup = await this.posRepo.findOne({
                where: {
                    employeeId,
                    jobTitleId: p.jobTitleId,
                    departmentId: nextDepartmentId === null ? IsNull() : nextDepartmentId,
                },
            });
            if (dup && dup.id !== positionId) {
                throw new ConflictException('Position already assigned for this department');
            }
        }

        if (dto.isPrimary === true && !p.isPrimary) {
            await this.posRepo.update(
                { employeeId, isPrimary: true },
                { isPrimary: false },
            );
        }

        const oldValue = {
            departmentId: p.departmentId,
            isPrimary: p.isPrimary,
            startDate: p.startDate,
            endDate: p.endDate,
        };

        p.departmentId = nextDepartmentId;
        if (dto.isPrimary !== undefined) p.isPrimary = dto.isPrimary;
        if (dto.startDate !== undefined) p.startDate = dto.startDate;
        if (dto.endDate !== undefined) p.endDate = dto.endDate;

        await this.posRepo.save(p);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.position.update',
            entity: 'employee_position',
            entityId: positionId,
            oldValue,
            newValue: {
                departmentId: p.departmentId,
                isPrimary: p.isPrimary,
                startDate: p.startDate,
                endDate: p.endDate,
            },
        });

        return this.findById(employeeId, positionId);
    }

    async remove(
        employeeId: string,
        positionId: string,
        actorId?: string,
    ): Promise<void> {
        const existing = await this.findById(employeeId, positionId);
        const result = await this.posRepo.delete({ id: positionId, employeeId });
        if (result.affected === 0) {
            throw new NotFoundException(`Position ${positionId} not found`);
        }

        if (existing.isPrimary) {
            const nextPrimary = await this.posRepo.findOne({
                where: { employeeId },
                order: { createdAt: 'ASC' },
            });
            if (nextPrimary) {
                await this.posRepo.update(nextPrimary.id, { isPrimary: true });
            }
        }

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.position.remove',
            entity: 'employee_position',
            entityId: positionId,
            oldValue: {
                employeeId,
                jobTitleId: existing.jobTitleId,
                departmentId: existing.departmentId,
            },
        });
    }

    /** Dynamic attributes (JSONB key/value) */
    async setAttribute(
        employeeId: string,
        positionId: string,
        key: string,
        value: unknown,
        actorId?: string,
    ): Promise<EmployeeAttribute> {
        const position = await this.findById(employeeId, positionId);
        if (this.attributeSchemas) {
            const domain = position.jobTitle?.category || 'GENERAL';
            await this.attributeSchemas.validateValue('EMPLOYEE_POSITION', domain, key, value);
        }

        let attr = await this.attrRepo.findOne({ where: { positionId, key } });
        const oldValue = attr ? attr.value : undefined;
        if (attr) {
            attr.value = value;
        } else {
            attr = this.attrRepo.create({ positionId, key, value });
        }
        const saved = await this.attrRepo.save(attr);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.position.attribute.set',
            entity: 'employee_position',
            entityId: positionId,
            oldValue: oldValue !== undefined ? { [key]: oldValue } : undefined,
            newValue: { [key]: value },
        });

        return saved;
    }

    async getAttributes(
        employeeId: string,
        positionId: string,
    ): Promise<Record<string, unknown>> {
        await this.findById(employeeId, positionId);
        const attrs = await this.attrRepo.find({ where: { positionId } });
        const out: Record<string, unknown> = {};
        for (const a of attrs) out[a.key] = a.value;
        return out;
    }

    async deleteAttribute(
        employeeId: string,
        positionId: string,
        key: string,
        actorId?: string,
    ): Promise<void> {
        await this.findById(employeeId, positionId);
        const result = await this.attrRepo.delete({ positionId, key });
        if (result.affected && result.affected > 0) {
            void this.audit.log({
                actorId: actorId ?? null,
                action: 'employee.position.attribute.delete',
                entity: 'employee_position',
                entityId: positionId,
                oldValue: { key },
            });
        }
    }
}
