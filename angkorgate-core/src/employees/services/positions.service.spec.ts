import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { PositionsService } from './positions.service';
import { EmployeePosition } from '../entities/employee-position.entity';
import { EmployeeAttribute } from '../entities/employee-attribute.entity';
import { EmployeesService } from './employees.service';
import { DepartmentsService } from './departments.service';
import { JobTitlesService } from './job-titles.service';
import { AuditService } from '../../audit/services/audit.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('PositionsService', () => {
    let service: PositionsService;
    let posRepo: ReturnType<typeof createMockRepository>;
    let attrRepo: ReturnType<typeof createMockRepository>;
    let employees: { findByIdOrFail: jest.Mock };
    let departments: { findByCodeOrFail: jest.Mock };
    let jobTitles: { findByCodeOrFail: jest.Mock };
    let audit: { log: jest.Mock };

    beforeEach(async () => {
        posRepo = createMockRepository<EmployeePosition>();
        attrRepo = createMockRepository<EmployeeAttribute>();
        employees = { findByIdOrFail: jest.fn().mockResolvedValue({ id: 'e1' }) };
        departments = { findByCodeOrFail: jest.fn().mockResolvedValue({ id: 'd1', code: 'ORTHO' }) };
        jobTitles = { findByCodeOrFail: jest.fn().mockResolvedValue({ id: 'jt1', code: 'DOCTOR' }) };
        audit = { log: jest.fn().mockResolvedValue(undefined) };

        const module = await Test.createTestingModule({
            providers: [
                PositionsService,
                { provide: getRepositoryToken(EmployeePosition), useValue: posRepo },
                { provide: getRepositoryToken(EmployeeAttribute), useValue: attrRepo },
                { provide: EmployeesService, useValue: employees },
                { provide: DepartmentsService, useValue: departments },
                { provide: JobTitlesService, useValue: jobTitles },
                { provide: AuditService, useValue: audit },
            ],
        }).compile();

        service = module.get(PositionsService);
    });

    it('rejects startDate after endDate', async () => {
        await expect(
            service.assign({
                employeeId: 'e1',
                jobTitleCode: 'DOCTOR',
                startDate: '2026-05-10',
                endDate: '2026-01-01',
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('detects duplicate position when departmentCode is omitted (null)', async () => {
        posRepo.findOne.mockResolvedValue({ id: 'pos-existing' } as never);

        await expect(
            service.assign({ employeeId: 'e1', jobTitleCode: 'DOCTOR' }),
        ).rejects.toThrow(ConflictException);

        expect(posRepo.findOne).toHaveBeenCalledWith({
            where: {
                employeeId: 'e1',
                jobTitleId: 'jt1',
                departmentId: IsNull(),
            },
        });
    });

    it('enforces employeeId ownership on remove and attribute access', async () => {
        posRepo.findOne.mockResolvedValue(null);

        await expect(service.remove('e1', 'pos-of-e2')).rejects.toThrow(NotFoundException);
        await expect(service.getAttributes('e1', 'pos-of-e2')).rejects.toThrow(NotFoundException);
    });
});
