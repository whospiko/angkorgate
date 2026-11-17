import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { CustomerAttribute } from './entities/customer-attribute.entity';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { createMockRepository } from '../../test/mocks/repository.mock';

describe('CustomersService', () => {
    let service: CustomersService;
    let repo: ReturnType<typeof createMockRepository>;
    let attrRepo: ReturnType<typeof createMockRepository>;
    let users: { exists: jest.Mock };
    let audit: { log: jest.Mock };

    beforeEach(async () => {
        repo = createMockRepository<Customer>();
        attrRepo = createMockRepository<CustomerAttribute>();
        users = { exists: jest.fn().mockResolvedValue(true) };
        audit = { log: jest.fn().mockResolvedValue(undefined) };

        const module = await Test.createTestingModule({
            providers: [
                CustomersService,
                { provide: getRepositoryToken(Customer), useValue: repo },
                { provide: getRepositoryToken(CustomerAttribute), useValue: attrRepo },
                { provide: UsersService, useValue: users },
                { provide: AuditService, useValue: audit },
            ],
        }).compile();

        service = module.get(CustomersService);
    });

    describe('create', () => {
        it('generates PAT-0001 for first patient', async () => {
            repo.manager.transaction = jest.fn(async (cb: (em: any) => Promise<any>) =>
                cb({
                    createQueryBuilder: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnThis(),
                        orderBy: jest.fn().mockReturnThis(),
                        setLock: jest.fn().mockReturnThis(),
                        getOne: jest.fn().mockResolvedValue(null),
                    }),
                }),
            ) as never;
            repo.create.mockImplementation((d) => d);
            repo.save.mockImplementation(async (d) => ({
                id: 'c1',
                createdAt: new Date(),
                updatedAt: new Date(),
                ...d,
            }));

            const result = await service.create({
                type: 'PATIENT',
                fullName: 'John',
                dateOfBirth: '1990-01-01',
            });

            expect(result.customerCode).toBe('PAT-0001');
        });

        it('increments to PAT-0002 when PAT-0001 exists', async () => {
            repo.manager.transaction = jest.fn(async (cb: (em: any) => Promise<any>) =>
                cb({
                    createQueryBuilder: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnThis(),
                        orderBy: jest.fn().mockReturnThis(),
                        setLock: jest.fn().mockReturnThis(),
                        getOne: jest.fn().mockResolvedValue({ customerCode: 'PAT-0001' }),
                    }),
                }),
            ) as never;
            repo.create.mockImplementation((d) => d);
            repo.save.mockImplementation(async (d) => ({
                id: 'c2',
                createdAt: new Date(),
                updatedAt: new Date(),
                ...d,
            }));

            const result = await service.create({
                type: 'PATIENT',
                fullName: 'Jane',
                dateOfBirth: '1990-01-01',
            });

            expect(result.customerCode).toBe('PAT-0002');
        });

        it('uses GST prefix for GUEST type', async () => {
            repo.manager.transaction = jest.fn(async (cb: (em: any) => Promise<any>) =>
                cb({
                    createQueryBuilder: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnThis(),
                        orderBy: jest.fn().mockReturnThis(),
                        setLock: jest.fn().mockReturnThis(),
                        getOne: jest.fn().mockResolvedValue(null),
                    }),
                }),
            ) as never;
            repo.create.mockImplementation((d) => d);
            repo.save.mockImplementation(async (d) => ({
                id: 'c3',
                createdAt: new Date(),
                updatedAt: new Date(),
                ...d,
            }));

            const result = await service.create({
                type: 'GUEST',
                fullName: 'Alice',
                dateOfBirth: '1985-05-05',
            });

            expect(result.customerCode).toBe('GST-0001');
        });

        it('rejects userId that does not exist', async () => {
            users.exists!.mockResolvedValue(false);
            await expect(
                service.create({
                    userId: '00000000-0000-0000-0000-000000000000',
                    fullName: 'X',
                    dateOfBirth: '1990-01-01',
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it('rejects duplicate userId link', async () => {
            repo.findOne.mockResolvedValue({ id: 'existing' });
            await expect(
                service.create({
                    userId: '11111111-1111-1111-1111-111111111111',
                    fullName: 'X',
                    dateOfBirth: '1990-01-01',
                }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('setAttribute', () => {
        it('creates a new attribute', async () => {
            repo.findOne.mockResolvedValue({ id: 'c1' } as never);
            attrRepo.findOne.mockResolvedValue(null);
            attrRepo.create.mockImplementation((d) => d);
            attrRepo.save.mockImplementation(async (d) => ({ id: 'a1', ...d }));

            const result = await service.setAttribute('c1', 'blood_type', 'O+');
            expect(result.value).toBe('O+');
        });

        it('updates existing attribute', async () => {
            repo.findOne.mockResolvedValue({ id: 'c1' } as never);
            attrRepo.findOne.mockResolvedValue({
                id: 'a1',
                customerId: 'c1',
                key: 'blood_type',
                value: 'A+',
            } as never);
            attrRepo.save.mockImplementation(async (d) => d);

            const result = await service.setAttribute('c1', 'blood_type', 'O+');
            expect(result.value).toBe('O+');
        });
    });

    describe('getAttributes', () => {
        it('returns all attributes as a flat object', async () => {
            repo.findOne.mockResolvedValue({ id: 'c1' } as never);
            attrRepo.find.mockResolvedValue([
                { key: 'blood_type', value: 'O+' },
                { key: 'allergies', value: ['peanuts'] },
            ] as never);

            const result = await service.getAttributes('c1');
            expect(result).toEqual({
                blood_type: 'O+',
                allergies: ['peanuts'],
            });
        });
    });
});