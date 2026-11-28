import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeavePolicy } from '../entities/leave-policy.entity';
import { EmployeesService } from './employees.service';
import { AuditService } from '../../audit/services/audit.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('LeaveRequestsService', () => {
    let service: LeaveRequestsService;
    let repo: ReturnType<typeof createMockRepository>;
    let policyRepo: ReturnType<typeof createMockRepository>;
    let employees: { findByIdOrFail: jest.Mock };
    let audit: { log: jest.Mock };

    beforeEach(async () => {
        repo = createMockRepository<LeaveRequest>();
        policyRepo = createMockRepository<LeavePolicy>();
        policyRepo.find.mockResolvedValue([
            { id: 'p1', leaveType: 'ANNUAL', annualQuotaDays: 18, enforceQuota: true },
            { id: 'p2', leaveType: 'SICK', annualQuotaDays: 10, enforceQuota: true },
            { id: 'p3', leaveType: 'MATERNITY', annualQuotaDays: 90, enforceQuota: true },
        ]);
        employees = { findByIdOrFail: jest.fn().mockResolvedValue({ id: 'e1', managerId: 'mgr-1' }) };
        audit = { log: jest.fn().mockResolvedValue(undefined) };

        const module = await Test.createTestingModule({
            providers: [
                LeaveRequestsService,
                { provide: getRepositoryToken(LeaveRequest), useValue: repo },
                { provide: getRepositoryToken(LeavePolicy), useValue: policyRepo },
                { provide: EmployeesService, useValue: employees },
                { provide: AuditService, useValue: audit },
            ],
        }).compile();

        service = module.get(LeaveRequestsService);
    });

    it('rejects leave request when startDate > endDate', async () => {
        await expect(
            service.create('e1', {
                leaveType: 'ANNUAL',
                startDate: '2026-12-10',
                endDate: '2026-12-05',
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects overlapping pending or approved leave', async () => {
        const qb = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getExists: jest.fn().mockResolvedValue(true),
        };
        repo.createQueryBuilder.mockReturnValue(qb as never);

        await expect(
            service.create('e1', {
                leaveType: 'SICK',
                startDate: '2026-12-01',
                endDate: '2026-12-02',
            }),
        ).rejects.toThrow(ConflictException);
    });

    it('approves a pending leave request and records reviewer', async () => {
        repo.findOne.mockResolvedValue({
            id: 'lr1',
            employeeId: 'e1',
            status: 'PENDING',
        } as never);
        repo.save.mockImplementation(async (d) => d);

        const res = await service.review(
            'lr1',
            { decision: 'APPROVED', reviewNote: 'Enjoy' },
            'admin1',
        );
        expect(res.status).toBe('APPROVED');
        expect(res.reviewedById).toBe('admin1');
    });

    it('rejects reviewing non-pending leave request', async () => {
        repo.findOne.mockResolvedValue({ id: 'lr1', status: 'APPROVED' } as never);
        await expect(
            service.review('lr1', { decision: 'REJECTED' }),
        ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when cancelling unknown request', async () => {
        repo.findOne.mockResolvedValue(null);
        await expect(service.cancel('missing')).rejects.toThrow(NotFoundException);
    });

    it('persists PDF/PNG/JPG attachment metadata when creating leave request', async () => {
        const qb = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getExists: jest.fn().mockResolvedValue(false),
            getMany: jest.fn().mockResolvedValue([]),
        };
        repo.createQueryBuilder.mockReturnValue(qb as never);
        repo.create.mockImplementation((d) => d);
        repo.save.mockImplementation(async (d) => ({ id: 'lr2', ...d }));

        const res = await service.create('e1', {
            leaveType: 'SICK',
            startDate: '2026-12-05',
            endDate: '2026-12-06',
            attachmentName: 'medical-note.pdf',
            attachmentMimeType: 'application/pdf',
            attachmentDataUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
        });

        expect(res.attachmentName).toBe('medical-note.pdf');
        expect(res.attachmentMimeType).toBe('application/pdf');
        expect(res.assignedApproverId).toBe('mgr-1');
    });

    it('rejects leave request exceeding yearly quota when enforceQuota is true', async () => {
        const qb = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getExists: jest.fn().mockResolvedValue(false),
            getMany: jest.fn().mockResolvedValue([
                {
                    id: 'lr-used',
                    leaveType: 'SICK',
                    startDate: '2026-01-01',
                    endDate: '2026-01-09',
                    status: 'APPROVED',
                },
            ]),
        };
        repo.createQueryBuilder.mockReturnValue(qb as never);

        await expect(
            service.create('e1', {
                leaveType: 'SICK',
                startDate: '2026-02-01',
                endDate: '2026-02-03', // 3 days > 1 day remaining
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('prevents non-assigned manager from approving in reviewForManager', async () => {
        repo.findOne.mockResolvedValue({
            id: 'lr1',
            assignedApproverId: 'mgr-1',
            status: 'PENDING',
        } as never);

        await expect(
            service.reviewForManager('lr1', 'mgr-other', { decision: 'APPROVED' }),
        ).rejects.toThrow(ForbiddenException);
    });

    it('calculates annual, sick, and maternity leave balances for the year', async () => {
        const qb = {
            leftJoin: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([
                {
                    id: 'lr1',
                    leaveType: 'ANNUAL',
                    startDate: '2026-12-10',
                    endDate: '2026-12-12',
                    status: 'APPROVED',
                },
                {
                    id: 'lr2',
                    leaveType: 'ANNUAL',
                    startDate: '2026-12-20',
                    endDate: '2026-12-21',
                    status: 'PENDING',
                },
            ]),
        };
        repo.createQueryBuilder.mockReturnValue(qb as never);

        const summary = await service.getBalanceSummary('e1', 2026);
        const annual = summary.items.find((i) => i.leaveType === 'ANNUAL')!;
        expect(annual.allowanceDays).toBe(18);
        expect(annual.usedDays).toBe(3);
        expect(annual.pendingDays).toBe(2);
        expect(annual.remainingDays).toBe(15);
    });

    it('prevents cancelling another employee leave request in cancelForEmployee', async () => {
        repo.findOne.mockResolvedValue(null);
        await expect(
            service.cancelForEmployee('lr1', 'other-emp', 'u-other'),
        ).rejects.toThrow(NotFoundException);
    });
});
