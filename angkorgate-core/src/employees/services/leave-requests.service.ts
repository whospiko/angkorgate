import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest } from '../entities/leave-request.entity';
import { CreateLeaveRequestDto, ReviewLeaveRequestDto } from '../dto/leave-request.dto';
import { EmployeesService } from './employees.service';
import { AuditService } from '../../audit/services/audit.service';
import { normalizePagination } from '../../common/utils/pagination.util';

@Injectable()
export class LeaveRequestsService {
    constructor(
        @InjectRepository(LeaveRequest)
        private readonly repo: Repository<LeaveRequest>,
        private readonly employees: EmployeesService,
        private readonly audit: AuditService,
    ) { }

    async create(
        employeeId: string,
        dto: CreateLeaveRequestDto,
        actorId?: string,
    ): Promise<LeaveRequest> {
        await this.employees.findByIdOrFail(employeeId);

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
            .where('l.employeeId = :eid', { eid: employeeId })
            .orderBy('l.startDate', 'DESC')
            .addOrderBy('l.createdAt', 'DESC')
            .getMany();
    }

    async findAll(params: {
        status?: string;
        employeeId?: string;
        page?: number;
        limit?: number;
    }) {
        const { page, limit, skip } = normalizePagination(params.page, params.limit);
        const qb = this.repo
            .createQueryBuilder('l')
            .leftJoinAndSelect('l.employee', 'emp')
            .leftJoin('l.reviewedBy', 'rev')
            .addSelect(['rev.id', 'rev.email', 'rev.phone']);

        if (params.status) {
            qb.andWhere('l.status = :status', { status: params.status.toUpperCase() });
        }
        if (params.employeeId) {
            qb.andWhere('l.employeeId = :eid', { eid: params.employeeId });
        }

        qb.orderBy('l.createdAt', 'DESC').skip(skip).take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit };
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
}
