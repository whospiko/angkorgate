import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { Department } from '../entities/department.entity';
import { JobTitle } from '../entities/job-title.entity';
import { AuditService } from '../../audit/services/audit.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('DepartmentsService', () => {
    let service: DepartmentsService;
    let deptRepo: ReturnType<typeof createMockRepository>;
    let jtRepo: ReturnType<typeof createMockRepository>;
    let audit: { log: jest.Mock };

    beforeEach(async () => {
        deptRepo = createMockRepository<Department>();
        jtRepo = createMockRepository<JobTitle>();
        audit = { log: jest.fn().mockResolvedValue(undefined) };

        const module = await Test.createTestingModule({
            providers: [
                DepartmentsService,
                { provide: getRepositoryToken(Department), useValue: deptRepo },
                { provide: getRepositoryToken(JobTitle), useValue: jtRepo },
                { provide: AuditService, useValue: audit },
            ],
        }).compile();

        service = module.get(DepartmentsService);
    });

    it('seeds pos template departments and job titles idempotently', async () => {
        deptRepo.findOne.mockResolvedValue(null);
        jtRepo.findOne.mockResolvedValue(null);
        deptRepo.create.mockImplementation((d) => d);
        jtRepo.create.mockImplementation((d) => d);
        deptRepo.save.mockImplementation(async (d) => d);
        jtRepo.save.mockImplementation(async (d) => d);

        const res = await service.seedFromTemplate('pos', 'admin1');
        expect(res).toEqual({ departments: 3, jobTitles: 3 });
        expect(audit.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'department.seed', entityId: 'pos' }),
        );
    });

    it('throws NotFoundException on unknown template', async () => {
        await expect(service.seedFromTemplate('unknown')).rejects.toThrow(NotFoundException);
    });

    it('builds nested department tree from parentId', async () => {
        deptRepo.find.mockResolvedValue([
            { id: 'd1', code: 'CLINIC', name: 'Clinic', parentId: null, isActive: true, createdAt: new Date() },
            { id: 'd2', code: 'SURGERY', name: 'Surgery', parentId: 'd1', isActive: true, createdAt: new Date() },
        ] as never);

        const tree = await service.getTree();
        expect(tree).toHaveLength(1);
        expect(tree[0].code).toBe('CLINIC');
        expect(tree[0].children).toHaveLength(1);
        expect(tree[0].children[0].code).toBe('SURGERY');
    });

    it('rejects circular parentId on update', async () => {
        deptRepo.findOne.mockResolvedValue({ id: 'd1', code: 'CLINIC', name: 'Clinic', parentId: null } as never);
        deptRepo.find.mockResolvedValue([
            { id: 'd1', parentId: null },
            { id: 'd2', parentId: 'd1' },
        ] as never);

        await expect(service.update('CLINIC', { parentId: 'd2' })).rejects.toThrow(
            'Circular department hierarchy is not allowed',
        );
    });
});
