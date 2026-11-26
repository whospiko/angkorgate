import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { Employee } from '../entities/employee.entity';
import { UsersService } from '../../users/services/users.service';
import { AuditService } from '../../audit/services/audit.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('EmployeesService', () => {
    let service: EmployeesService;
    let repo: ReturnType<typeof createMockRepository>;
    let users: { exists: jest.Mock };
    let audit: { log: jest.Mock };

    beforeEach(async () => {
        repo = createMockRepository<Employee>();
        users = { exists: jest.fn().mockResolvedValue(true) };
        audit = { log: jest.fn().mockResolvedValue(undefined) };

        const module = await Test.createTestingModule({
            providers: [
                EmployeesService,
                { provide: getRepositoryToken(Employee), useValue: repo },
                { provide: UsersService, useValue: users },
                { provide: AuditService, useValue: audit },
            ],
        }).compile();

        service = module.get(EmployeesService);
    });

    it('auto-generates EMP-0002 when employeeCode is omitted and EMP-0001 exists', async () => {
        repo.manager.transaction = jest.fn(async (cb: (em: any) => Promise<any>) =>
            cb({
                createQueryBuilder: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnThis(),
                    withDeleted: jest.fn().mockReturnThis(),
                    setLock: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    getMany: jest.fn().mockResolvedValue([{ employeeCode: 'EMP-0001' }]),
                }),
            }),
        ) as never;
        repo.findOne.mockResolvedValue(null);
        repo.create.mockImplementation((d) => d);
        repo.save.mockImplementation(async (d) => ({
            id: 'e1',
            employmentStatus: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...d,
        }));

        const res = await service.create({ fullName: 'Dr. Sokha' });
        expect(res.employeeCode).toBe('EMP-0002');
    });

    it('rejects duplicate employeeCode', async () => {
        repo.findOne.mockResolvedValue({ id: 'existing' } as never);
        await expect(
            service.create({ employeeCode: 'EMP-001', fullName: 'Dup' }),
        ).rejects.toThrow(ConflictException);
    });

    it('preserves positions in findAll response', async () => {
        const qb = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn().mockResolvedValue([
                [
                    {
                        id: 'e1',
                        userId: null,
                        employeeCode: 'EMP-001',
                        fullName: 'Jane',
                        employmentStatus: 'ACTIVE',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        positions: [
                            {
                                id: 'p1',
                                isPrimary: true,
                                jobTitle: { code: 'DOCTOR', name: 'Doctor' },
                                department: { code: 'ORTHO', name: 'Orthopedics' },
                            },
                        ],
                    },
                ],
                1,
            ]),
        };
        repo.createQueryBuilder.mockReturnValue(qb as never);

        const res = await service.findAll({ search: 'jane' });
        expect(res.data[0].positions).toHaveLength(1);
        expect(res.data[0].positions![0].jobTitle.code).toBe('DOCTOR');
    });

    it('rejects invalid employment status', async () => {
        await expect(service.setStatus('e1', 'PROBATION')).rejects.toThrow(BadRequestException);
    });

    it('clears userId and soft-deletes employee on remove', async () => {
        repo.findOne.mockResolvedValue({
            id: 'e1',
            userId: 'u1',
            employeeCode: 'EMP-001',
            fullName: 'Jane',
        } as never);
        repo.update.mockResolvedValue({ affected: 1 } as never);
        repo.softDelete.mockResolvedValue({ affected: 1 } as never);

        await service.remove('e1', 'admin1');
        expect(repo.update).toHaveBeenCalledWith('e1', { userId: null });
        expect(repo.softDelete).toHaveBeenCalledWith('e1');
    });

    it('throws NotFoundException when linking missing user', async () => {
        repo.findOne.mockResolvedValue({ id: 'e1', userId: null } as never);
        users.exists.mockResolvedValue(false);

        await expect(service.linkUser('e1', 'u-missing')).rejects.toThrow(NotFoundException);
    });
});
