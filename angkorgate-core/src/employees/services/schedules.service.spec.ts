import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { WorkSchedule } from '../entities/work-schedule.entity';
import { EmployeesService } from './employees.service';
import { AuditService } from '../../audit/services/audit.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('SchedulesService', () => {
    let service: SchedulesService;
    let repo: ReturnType<typeof createMockRepository>;
    let employees: { findByIdOrFail: jest.Mock };
    let audit: { log: jest.Mock };

    beforeEach(async () => {
        repo = createMockRepository<WorkSchedule>();
        employees = { findByIdOrFail: jest.fn().mockResolvedValue({ id: 'e1' }) };
        audit = { log: jest.fn().mockResolvedValue(undefined) };

        const module = await Test.createTestingModule({
            providers: [
                SchedulesService,
                { provide: getRepositoryToken(WorkSchedule), useValue: repo },
                { provide: EmployeesService, useValue: employees },
                { provide: AuditService, useValue: audit },
            ],
        }).compile();

        service = module.get(SchedulesService);
    });

    it('rejects schedule when startTime >= endTime', async () => {
        await expect(
            service.create({
                employeeId: 'e1',
                dayOfWeek: 1,
                startTime: '17:00',
                endTime: '08:00',
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('checks overlaps excluding current schedule on update', async () => {
        repo.findOne.mockResolvedValue({
            id: 's1',
            employeeId: 'e1',
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '12:00',
            isActive: true,
        } as never);

        const qb = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getExists: jest.fn().mockResolvedValue(true),
        };
        repo.createQueryBuilder.mockReturnValue(qb as never);

        await expect(
            service.update('e1', 's1', { endTime: '15:00' }),
        ).rejects.toThrow(BadRequestException);

        expect(qb.andWhere).toHaveBeenCalledWith('s.id != :excludeId', { excludeId: 's1' });
    });

    it('enforces employeeId ownership on remove', async () => {
        repo.findOne.mockResolvedValue(null);
        await expect(service.remove('e1', 's-of-e2')).rejects.toThrow(NotFoundException);
    });
});
