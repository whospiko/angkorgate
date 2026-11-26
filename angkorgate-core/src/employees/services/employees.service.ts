import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Employee, EmploymentStatus } from '../entities/employee.entity';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeResponseDto } from '../dto/employee-response.dto';
import { UsersService } from '../../users/services/users.service';
import { AuditService } from '../../audit/services/audit.service';
import { normalizePagination } from '../../common/utils/pagination.util';
import { isSqlite } from '../../common/utils/db-types.util';

const ALLOWED_EMPLOYMENT_STATUSES: ReadonlyArray<EmploymentStatus> = [
    'ACTIVE',
    'ON_LEAVE',
    'RESIGNED',
    'TERMINATED',
];

@Injectable()
export class EmployeesService {
    constructor(
        @InjectRepository(Employee)
        private readonly repo: Repository<Employee>,
        private readonly users: UsersService,
        private readonly audit: AuditService,
    ) { }

    async create(dto: CreateEmployeeDto, actorId?: string): Promise<EmployeeResponseDto> {
        if (dto.userId) {
            await this.assertUserLinkAvailable(dto.userId);
        }

        const employeeCode = dto.employeeCode?.trim()
            ? dto.employeeCode.trim().toUpperCase()
            : await this.nextCode();

        const codeExists = await this.repo.findOne({
            where: { employeeCode },
        });
        if (codeExists) {
            throw new ConflictException(`Employee code ${employeeCode} exists`);
        }

        const entity = this.repo.create({
            ...dto,
            employeeCode,
            userId: dto.userId ?? null,
        });
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
        const e = await this.repo.findOne({
            where: { id },
            relations: {
                positions: { jobTitle: true, department: true },
                schedules: true,
            },
        });
        if (!e) throw new NotFoundException(`Employee ${id} not found`);
        return EmployeeResponseDto.fromEntity(e);
    }

    async findByUserId(userId: string): Promise<EmployeeResponseDto | null> {
        const e = await this.repo.findOne({
            where: { userId },
            relations: {
                positions: { jobTitle: true, department: true },
            },
        });
        return e ? EmployeeResponseDto.fromEntity(e) : null;
    }

    async findByCodeOrFail(code: string): Promise<EmployeeResponseDto> {
        const e = await this.repo.findOne({
            where: { employeeCode: code },
            relations: {
                positions: { jobTitle: true, department: true },
            },
        });
        if (!e) throw new NotFoundException(`Employee ${code} not found`);
        return EmployeeResponseDto.fromEntity(e);
    }

    async findAll(params: {
        status?: string;
        departmentCode?: string;
        jobTitleCode?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const { page, limit, skip } = normalizePagination(params.page, params.limit);

        const qb = this.repo
            .createQueryBuilder('e')
            .leftJoinAndSelect('e.positions', 'pos')
            .leftJoinAndSelect('pos.jobTitle', 'jt')
            .leftJoinAndSelect('pos.department', 'd');

        if (params.status) {
            qb.andWhere('e.employmentStatus = :status', {
                status: params.status.toUpperCase(),
            });
        }
        if (params.departmentCode) qb.andWhere('d.code = :dc', { dc: params.departmentCode });
        if (params.jobTitleCode) qb.andWhere('jt.code = :jc', { jc: params.jobTitleCode });
        if (params.search && params.search.trim().length > 0) {
            const term = `%${params.search.trim().toLowerCase()}%`;
            qb.andWhere(
                '(LOWER(e.fullName) LIKE :q OR LOWER(e.employeeCode) LIKE :q OR LOWER(COALESCE(e.phone, \'\')) LIKE :q)',
                { q: term },
            );
        }

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

    async linkUser(
        id: string,
        userId: string | null,
        actorId?: string,
    ): Promise<EmployeeResponseDto> {
        const e = await this.repo.findOne({ where: { id } });
        if (!e) throw new NotFoundException(`Employee ${id} not found`);

        const previousUserId = e.userId;
        if (userId && userId !== e.userId) {
            await this.assertUserLinkAvailable(userId, id);
        }

        e.userId = userId;
        const saved = await this.repo.save(e);

        void this.audit.log({
            actorId: actorId ?? null,
            action: userId ? 'employee.user.link' : 'employee.user.unlink',
            entity: 'employee',
            entityId: id,
            oldValue: { userId: previousUserId },
            newValue: { userId },
        });

        return EmployeeResponseDto.fromEntity(saved);
    }

    async setStatus(
        id: string,
        status: string,
        actorId?: string,
    ): Promise<void> {
        const normalized = status.toUpperCase() as EmploymentStatus;
        if (!ALLOWED_EMPLOYMENT_STATUSES.includes(normalized)) {
            throw new BadRequestException(
                `Invalid employment status '${status}'. Allowed: ${ALLOWED_EMPLOYMENT_STATUSES.join(', ')}`,
            );
        }

        const existing = await this.repo.findOne({ where: { id } });
        if (!existing) throw new NotFoundException(`Employee ${id} not found`);

        const prevStatus = existing.employmentStatus;
        await this.repo.update(id, { employmentStatus: normalized });

        void this.audit.log({
            actorId: actorId ?? null,
            action: `employee.status.${normalized.toLowerCase()}`,
            entity: 'employee',
            entityId: id,
            oldValue: { employmentStatus: prevStatus },
            newValue: { employmentStatus: normalized },
        });
    }

    async remove(id: string, actorId?: string): Promise<void> {
        const existing = await this.repo.findOne({ where: { id } });
        if (!existing) throw new NotFoundException(`Employee ${id} not found`);

        if (existing.userId) {
            await this.repo.update(id, { userId: null });
        }

        const result = await this.repo.softDelete(id);
        if (result.affected === 0) throw new NotFoundException(`Employee ${id} not found`);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.delete',
            entity: 'employee',
            entityId: id,
            oldValue: { employeeCode: existing.employeeCode, fullName: existing.fullName },
            newValue: { softDeleted: true },
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
        const e = await this.repo.findOne({ where: { id }, select: { id: true, fullName: true } });
        return e?.fullName ?? null;
    }

    private async assertUserLinkAvailable(userId: string, excludeEmployeeId?: string): Promise<void> {
        if (!(await this.users.exists(userId))) {
            throw new NotFoundException(`User ${userId} not found`);
        }
        const userLinked = await this.repo.findOne({ where: { userId } });
        if (userLinked && userLinked.id !== excludeEmployeeId) {
            throw new ConflictException(`User ${userId} already has an employee record`);
        }
    }

    /** Generates EMP-0001, EMP-0002, ... when caller omits employeeCode. */
    private async nextCode(): Promise<string> {
        return this.repo.manager.transaction(async (em: EntityManager) => {
            const qb = em
                .createQueryBuilder(Employee, 'e')
                .where('e.employeeCode LIKE :p', { p: 'EMP-%' });

            if (typeof qb.withDeleted === 'function') {
                qb.withDeleted();
            }

            if (!isSqlite()) {
                qb.setLock('pessimistic_write');
            }

            const existing = await qb.select(['e.employeeCode']).getMany();
            const currentMax = existing.reduce((max, row) => {
                const match = /^EMP-(\d+)$/i.exec(row.employeeCode);
                const seq = match ? parseInt(match[1], 10) : 0;
                return Math.max(max, Number.isFinite(seq) ? seq : 0);
            }, 0);

            return `EMP-${String(currentMax + 1).padStart(4, '0')}`;
        });
    }
}
