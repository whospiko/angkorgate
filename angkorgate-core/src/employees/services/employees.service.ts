import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeResponseDto } from '../dto/employee-response.dto';
import { UsersService } from '../../users/services/users.service';
import { AuditService } from '../../audit/services/audit.service';
import { normalizePagination } from '../../common/utils/pagination.util';

@Injectable()
export class EmployeesService {
    constructor(
        @InjectRepository(Employee)
        private readonly repo: Repository<Employee>,
        private readonly users: UsersService,
        private readonly audit: AuditService,
    ) { }

    async create(dto: CreateEmployeeDto, actorId?: string): Promise<EmployeeResponseDto> {
        // Validate the linked user exists if provided
        if (dto.userId) {
            if (!(await this.users.exists(dto.userId))) {
                throw new NotFoundException(`User ${dto.userId} not found`);
            }
            const userLinked = await this.repo.findOne({ where: { userId: dto.userId } });
            if (userLinked) {
                throw new ConflictException(`User ${dto.userId} already has an employee record`);
            }
        }

        const codeExists = await this.repo.findOne({
            where: { employeeCode: dto.employeeCode },
        });
        if (codeExists) {
            throw new ConflictException(`Employee code ${dto.employeeCode} exists`);
        }

        const entity = this.repo.create(dto);
        const saved = await this.repo.save(entity);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.create',
            entity: 'employee',
            entityId: saved.id,
            newValue: { employeeCode: saved.employeeCode, fullName: saved.fullName },
        });

        return EmployeeResponseDto.fromEntity(saved);
    }

    async findByIdOrFail(id: string): Promise<EmployeeResponseDto> {
        const e = await this.repo.findOne({ where: { id } });
        if (!e) throw new NotFoundException(`Employee ${id} not found`);
        return EmployeeResponseDto.fromEntity(e);
    }

    async findByUserId(userId: string): Promise<EmployeeResponseDto | null> {
        const e = await this.repo.findOne({ where: { userId } });
        return e ? EmployeeResponseDto.fromEntity(e) : null;
    }

    async findByCodeOrFail(code: string): Promise<EmployeeResponseDto> {
        const e = await this.repo.findOne({ where: { employeeCode: code } });
        if (!e) throw new NotFoundException(`Employee ${code} not found`);
        return EmployeeResponseDto.fromEntity(e);
    }

    async findAll(params: {
        status?: string;
        departmentCode?: string;
        jobTitleCode?: string;
        page?: number;
        limit?: number;
    }) {
        const { page, limit, skip } = normalizePagination(params.page, params.limit);

        const qb = this.repo
            .createQueryBuilder('e')
            .leftJoinAndSelect('e.positions', 'pos')
            .leftJoinAndSelect('pos.jobTitle', 'jt')
            .leftJoinAndSelect('pos.department', 'd');

        if (params.status) qb.andWhere('e.employmentStatus = :status', { status: params.status });
        if (params.departmentCode) qb.andWhere('d.code = :dc', { dc: params.departmentCode });
        if (params.jobTitleCode) qb.andWhere('jt.code = :jc', { jc: params.jobTitleCode });

        qb.orderBy('e.fullName', 'ASC').skip(skip).take(limit);

        const [rows, total] = await qb.getManyAndCount();
        return {
            data: rows.map(EmployeeResponseDto.fromEntity),
            total,
            page,
            limit,
        };
    }

    async update(
        id: string,
        dto: UpdateEmployeeDto,
        actorId?: string,
    ): Promise<EmployeeResponseDto> {
        const e = await this.repo.findOne({ where: { id } });
        if (!e) throw new NotFoundException(`Employee ${id} not found`);

        const before = { fullName: e.fullName, phone: e.phone };
        Object.assign(e, dto);
        const saved = await this.repo.save(e);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.update',
            entity: 'employee',
            entityId: id,
            oldValue: before,
            newValue: dto as Record<string, unknown>,
        });

        return EmployeeResponseDto.fromEntity(saved);
    }

    async setStatus(
        id: string,
        status: Employee['employmentStatus'],
        actorId?: string,
    ): Promise<void> {
        const result = await this.repo.update(id, { employmentStatus: status });
        if (result.affected === 0) throw new NotFoundException(`Employee ${id} not found`);

        void this.audit.log({
            actorId: actorId ?? null,
            action: `employee.status.${status.toLowerCase()}`,
            entity: 'employee',
            entityId: id,
        });
    }

    async remove(id: string, actorId?: string): Promise<void> {
        const result = await this.repo.delete(id);
        if (result.affected === 0) throw new NotFoundException(`Employee ${id} not found`);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.delete',
            entity: 'employee',
            entityId: id,
        });
    }

    /** Narrow domain queries for external module integration */
    async findByJobTitle(jobTitleCode: string): Promise<EmployeeResponseDto[]> {
        const rows = await this.repo
            .createQueryBuilder('e')
            .innerJoin('e.positions', 'pos')
            .innerJoin('pos.jobTitle', 'jt')
            .where('jt.code = :code', { code: jobTitleCode })
            .andWhere('e.employmentStatus = :status', { status: 'ACTIVE' })
            .orderBy('e.fullName', 'ASC')
            .getMany();
        return rows.map(EmployeeResponseDto.fromEntity);
    }

    async exists(id: string): Promise<boolean> {
        return (await this.repo.count({ where: { id } })) > 0;
    }

    async getFullName(id: string): Promise<string | null> {
        const e = await this.repo.findOne({ where: { id }, select: { 'id': true, 'fullName': true } });
        return e?.fullName ?? null;
    }
}