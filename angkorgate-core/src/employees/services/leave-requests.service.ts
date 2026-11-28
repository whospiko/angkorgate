import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeavePolicy, type QuotaLeaveType } from '../entities/leave-policy.entity';
import {
    CreateLeaveRequestDto,
    ReviewLeaveRequestDto,
    UpdateLeavePolicyDto,
} from '../dto/leave-request.dto';
import { EmployeesService } from './employees.service';
import { AuditService } from '../../audit/services/audit.service';
import { normalizePagination } from '../../common/utils/pagination.util';

const DEFAULT_LEAVE_POLICIES: {
    leaveType: QuotaLeaveType;
    annualQuotaDays: number;
    enforceQuota: boolean;
}[] = [
    { leaveType: 'ANNUAL', annualQuotaDays: 18, enforceQuota: true },
    { leaveType: 'SICK', annualQuotaDays: 10, enforceQuota: true },
    { leaveType: 'MATERNITY', annualQuotaDays: 90, enforceQuota: true },
];

@Injectable()
export class LeaveRequestsService {
    constructor(
        @InjectRepository(LeaveRequest)
        private readonly repo: Repository<LeaveRequest>,
        @InjectRepository(LeavePolicy)
        private readonly policyRepo: Repository<LeavePolicy>,
        private readonly employees: EmployeesService,
        private readonly audit: AuditService,
    ) { }

    async create(
        employeeId: string,
        dto: CreateLeaveRequestDto,
        actorId?: string,
    ): Promise<LeaveRequest> {
        const employee = await this.employees.findByIdOrFail(employeeId);

        if (dto.startDate > dto.endDate) {
            throw new BadRequestException('Leave startDate cannot be after endDate');
        }

        const overlap = await this.repo
            .createQueryBuilder('l')
            .where('l.employeeId = :eid', { eid: employeeId })
            .andWhere('l.status IN (:...statuses)', { statuses: ['PENDING', 'APPROVED'] })
            .andWhere('(l.startDate <= :endDate AND l.endDate >= :startDate)', {
                startDate: dto.startDate,
                endDate: dto.endDate,
            })
            .getExists();

        if (overlap) {
            throw new ConflictException(
                'An overlapping pending or approved leave request already exists for these dates',
            );
        }

        // Enforce yearly quota when configured for ANNUAL / SICK / MATERNITY
        if (
            dto.leaveType === 'ANNUAL' ||
            dto.leaveType === 'SICK' ||
            dto.leaveType === 'MATERNITY'
        ) {
            const policies = await this.getPolicies();
            const policy = policies.find((p) => p.leaveType === dto.leaveType);
            if (policy?.enforceQuota) {
                const year = parseInt(dto.startDate.slice(0, 4), 10);
                const summary = await this.getBalanceSummary(employeeId, year);
                const bal = summary.items.find((i) => i.leaveType === dto.leaveType);
                const requestedDays =
                    Math.floor(
                        (new Date(`${dto.endDate}T00:00:00Z`).getTime() -
                            new Date(`${dto.startDate}T00:00:00Z`).getTime()) /
                            86_400_000,
                    ) + 1;
                const available = Math.max(0, (bal?.remainingDays ?? 0) - (bal?.pendingDays ?? 0));
                if (requestedDays > available) {
                    throw new BadRequestException(
                        `Insufficient ${dto.leaveType} leave balance: requested ${requestedDays} day(s), available ${available} day(s) in ${year}`,
                    );
                }
            }
        }

        const saved = await this.repo.save(
            this.repo.create({
                employeeId,
                leaveType: dto.leaveType,
                startDate: dto.startDate,
                endDate: dto.endDate,
                reason: dto.reason ?? null,
                attachmentName: dto.attachmentName ?? null,
                attachmentMimeType: dto.attachmentMimeType ?? null,
                attachmentDataUrl: dto.attachmentDataUrl ?? null,
                assignedApproverId: employee.managerId ?? null,
                status: 'PENDING',
            }),
        );

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.leave.request',
            entity: 'leave_request',
            entityId: saved.id,
            newValue: {
                employeeId,
                leaveType: saved.leaveType,
                startDate: saved.startDate,
                endDate: saved.endDate,
            },
        });

        return saved;
    }

    async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
        await this.employees.findByIdOrFail(employeeId);
        return this.repo
            .createQueryBuilder('l')
            .leftJoin('l.reviewedBy', 'rev')
            .addSelect(['rev.id', 'rev.email', 'rev.phone'])
            .leftJoin('l.assignedApprover', 'app')
            .addSelect(['app.id', 'app.employeeCode', 'app.fullName'])
            .where('l.employeeId = :eid', { eid: employeeId })
            .orderBy('l.startDate', 'DESC')
            .addOrderBy('l.createdAt', 'DESC')
            .getMany();
    }

    async findAll(params: {
        status?: string;
        employeeId?: string;
        assignedApproverId?: string;
        page?: number;
        limit?: number;
    }) {
        const { page, limit, skip } = normalizePagination(params.page, params.limit);
        const qb = this.repo
            .createQueryBuilder('l')
            .leftJoinAndSelect('l.employee', 'emp')
            .leftJoin('l.reviewedBy', 'rev')
            .addSelect(['rev.id', 'rev.email', 'rev.phone'])
            .leftJoin('l.assignedApprover', 'app')
            .addSelect(['app.id', 'app.employeeCode', 'app.fullName']);

        if (params.status) {
            qb.andWhere('l.status = :status', { status: params.status.toUpperCase() });
        }
        if (params.employeeId) {
            qb.andWhere('l.employeeId = :eid', { eid: params.employeeId });
        }
        if (params.assignedApproverId) {
            qb.andWhere('l.assignedApproverId = :aid', { aid: params.assignedApproverId });
        }

        qb.orderBy('l.createdAt', 'DESC').skip(skip).take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit };
    }

    async findAssignedApprovals(managerEmployeeId: string, status?: string): Promise<LeaveRequest[]> {
        const qb = this.repo
            .createQueryBuilder('l')
            .leftJoinAndSelect('l.employee', 'emp')
            .leftJoin('l.reviewedBy', 'rev')
            .addSelect(['rev.id', 'rev.email', 'rev.phone'])
            .where('l.assignedApproverId = :mid', { mid: managerEmployeeId });

        if (status) {
            qb.andWhere('l.status = :status', { status: status.toUpperCase() });
        }

        return qb.orderBy('l.createdAt', 'DESC').getMany();
    }

    async reviewForManager(
        id: string,
        managerEmployeeId: string,
        dto: ReviewLeaveRequestDto,
        actorId?: string,
    ): Promise<LeaveRequest> {
        const leave = await this.repo.findOne({ where: { id } });
        if (!leave) throw new NotFoundException(`Leave request ${id} not found`);
        if (leave.assignedApproverId !== managerEmployeeId) {
            throw new ForbiddenException('You are not the assigned manager for this leave request');
        }
        return this.review(id, dto, actorId);
    }

    async review(
        id: string,
        dto: ReviewLeaveRequestDto,
        actorId?: string,
    ): Promise<LeaveRequest> {
        const leave = await this.repo.findOne({ where: { id } });
        if (!leave) throw new NotFoundException(`Leave request ${id} not found`);

        if (leave.status !== 'PENDING') {
            throw new BadRequestException(
                `Cannot review leave request with status '${leave.status}'`,
            );
        }

        leave.status = dto.decision;
        leave.reviewedById = actorId ?? null;
        leave.reviewedAt = new Date();
        leave.reviewNote = dto.reviewNote ?? null;

        const saved = await this.repo.save(leave);

        void this.audit.log({
            actorId: actorId ?? null,
            action: `employee.leave.${dto.decision.toLowerCase()}`,
            entity: 'leave_request',
            entityId: id,
            oldValue: { status: 'PENDING' },
            newValue: { status: saved.status, reviewNote: saved.reviewNote },
        });

        return saved;
    }

    async cancel(id: string, actorId?: string): Promise<LeaveRequest> {
        const leave = await this.repo.findOne({ where: { id } });
        if (!leave) throw new NotFoundException(`Leave request ${id} not found`);

        if (leave.status === 'CANCELLED' || leave.status === 'REJECTED') {
            throw new BadRequestException(
                `Leave request is already '${leave.status}'`,
            );
        }

        const prevStatus = leave.status;
        leave.status = 'CANCELLED';
        const saved = await this.repo.save(leave);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.leave.cancel',
            entity: 'leave_request',
            entityId: id,
            oldValue: { status: prevStatus },
            newValue: { status: 'CANCELLED' },
        });

        return saved;
    }

    async cancelForEmployee(
        id: string,
        employeeId: string,
        actorId?: string,
    ): Promise<LeaveRequest> {
        const leave = await this.repo.findOne({ where: { id, employeeId } });
        if (!leave) {
            throw new NotFoundException(`Leave request ${id} not found for this employee`);
        }
        return this.cancel(id, actorId);
    }

    async getPolicies(): Promise<LeavePolicy[]> {
        const existing = await this.policyRepo.find({ order: { leaveType: 'ASC' } });
        const byType = new Map(existing.map((p) => [p.leaveType, p]));
        const missing = DEFAULT_LEAVE_POLICIES.filter((d) => !byType.has(d.leaveType));
        if (missing.length > 0) {
            for (const def of missing) {
                const created = await this.policyRepo.save(this.policyRepo.create(def));
                byType.set(created.leaveType, created);
            }
        }
        return DEFAULT_LEAVE_POLICIES.map((d) => byType.get(d.leaveType)!);
    }

    async updatePolicy(
        leaveType: QuotaLeaveType,
        dto: UpdateLeavePolicyDto,
        actorId?: string,
    ): Promise<LeavePolicy> {
        let policy = await this.policyRepo.findOne({ where: { leaveType } });
        if (!policy) {
            policy = this.policyRepo.create({
                leaveType,
                annualQuotaDays: dto.annualQuotaDays,
                enforceQuota: dto.enforceQuota ?? true,
            });
        } else {
            policy.annualQuotaDays = dto.annualQuotaDays;
            if (dto.enforceQuota !== undefined) {
                policy.enforceQuota = dto.enforceQuota;
            }
        }
        const saved = await this.policyRepo.save(policy);
        void this.audit.log({
            actorId: actorId ?? null,
            action: 'employee.leave_policy.update',
            entity: 'leave_policy',
            entityId: saved.id,
            newValue: {
                leaveType: saved.leaveType,
                annualQuotaDays: saved.annualQuotaDays,
                enforceQuota: saved.enforceQuota,
            },
        });
        return saved;
    }

    async getBalanceSummary(
        employeeId: string,
        year: number = new Date().getUTCFullYear(),
    ): Promise<{
        year: number;
        items: {
            leaveType: QuotaLeaveType;
            allowanceDays: number;
            usedDays: number;
            pendingDays: number;
            remainingDays: number;
        }[];
    }> {
        const policies = await this.getPolicies();
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year}-12-31`;
        const requests = await this.findByEmployee(employeeId);

        const countDaysInYear = (start: string, end: string): number => {
            const clampedStart = start < yearStart ? yearStart : start;
            const clampedEnd = end > yearEnd ? yearEnd : end;
            if (clampedStart > clampedEnd) return 0;
            const s = new Date(`${clampedStart}T00:00:00Z`).getTime();
            const e = new Date(`${clampedEnd}T00:00:00Z`).getTime();
            return Math.floor((e - s) / 86_400_000) + 1;
        };

        const items = policies.map(({ leaveType, annualQuotaDays }) => {
            let usedDays = 0;
            let pendingDays = 0;
            for (const req of requests) {
                if (req.leaveType !== leaveType) continue;
                const days = countDaysInYear(req.startDate, req.endDate);
                if (req.status === 'APPROVED') usedDays += days;
                else if (req.status === 'PENDING') pendingDays += days;
            }
            return {
                leaveType,
                allowanceDays: annualQuotaDays,
                usedDays,
                pendingDays,
                remainingDays: Math.max(0, annualQuotaDays - usedDays),
            };
        });

        return { year, items };
    }
}
