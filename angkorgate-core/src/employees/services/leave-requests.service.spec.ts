import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequest } from '../entities/leave-request.entity';
import { EmployeesService } from './employees.service';
import { AuditService } from '../../audit/services/audit.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('LeaveRequestsService', () => {
    let service: LeaveRequestsService;
    let repo: ReturnType<typeof createMockRepository>;
    let employees: { findByIdOrFail: jest.Mock };
    let audit: { log: jest.Mock };

    beforeEach(async () => {
        repo = createMockRepository<LeaveRequest>();
        employees = { findByIdOrFail: jest.fn().mockResolvedValue({ id: 'e1' }) };
        audit = { log: jest.fn().mockResolvedValue(undefined) };

        const module = await Test.createTestingModule({
            providers: [
                LeaveRequestsService,
                { provide: getRepositoryToken(LeaveRequest), useValue: repo },
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
});
