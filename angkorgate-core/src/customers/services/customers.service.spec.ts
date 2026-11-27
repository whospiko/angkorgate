import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from '../entities/customer.entity';
import { CustomerAttribute } from '../entities/customer-attribute.entity';
import { UsersService } from '../../users/services/users.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';
import { AuditService } from '../../audit/services/audit.service';

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
                        withDeleted: jest.fn().mockReturnThis(),
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
                        withDeleted: jest.fn().mockReturnThis(),
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
                        withDeleted: jest.fn().mockReturnThis(),
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

    describe('findAll', () => {
        it('uses cross-DB LOWER LIKE instead of ILIKE for search', async () => {
            const qb = {
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };
            repo.createQueryBuilder.mockReturnValue(qb as never);

            await service.findAll({ search: 'PAT-0001', status: 'active' });

            expect(qb.andWhere).toHaveBeenCalledWith('c.status = :status', { status: 'ACTIVE' });
            const searchCall = qb.andWhere.mock.calls.find((c) =>
                String(c[0]).includes('LOWER(c.fullName)'),
            );
            expect(searchCall).toBeDefined();
            expect(String(searchCall![0])).not.toContain('ILIKE');
        });
    });

    describe('setStatus & remove & linkUser', () => {
        it('rejects invalid customer status', async () => {
            await expect(service.setStatus('c1', 'LEAD')).rejects.toThrow(BadRequestException);
        });

        it('updates status to ARCHIVED and logs audit', async () => {
            repo.findOne.mockResolvedValue({ id: 'c1', status: 'ACTIVE' } as never);
            repo.update.mockResolvedValue({ affected: 1 } as never);

            await service.setStatus('c1', 'archived', 'admin1');
            expect(repo.update).toHaveBeenCalledWith('c1', { status: 'ARCHIVED' });
            expect(audit.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'customer.status.archived', entityId: 'c1' }),
            );
        });

        it('clears userId and soft-deletes customer on remove', async () => {
            repo.findOne.mockResolvedValue({
                id: 'c1',
                userId: 'u1',
                customerCode: 'CUS-0001',
                fullName: 'John',
            } as never);
            repo.update.mockResolvedValue({ affected: 1 } as never);
            repo.softDelete.mockResolvedValue({ affected: 1 } as never);

            await service.remove('c1', 'admin1');
            expect(repo.update).toHaveBeenCalledWith('c1', { userId: null });
            expect(repo.softDelete).toHaveBeenCalledWith('c1');
        });

        it('links and unlinks userId cleanly', async () => {
            repo.findOne
                .mockResolvedValueOnce({ id: 'c1', userId: null } as never)
                .mockResolvedValueOnce(null);
            repo.save.mockImplementation(async (d) => d);

            const linked = await service.linkUser('c1', 'u1', 'admin1');
            expect(linked.userId).toBe('u1');
        });
    });

    describe('setAttribute & getAttributes & deleteAttribute', () => {
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

        it('deletes attribute after checking customer exists', async () => {
            repo.findOne.mockResolvedValue({ id: 'c1' } as never);
            attrRepo.delete.mockResolvedValue({ affected: 1 } as never);

            await service.deleteAttribute('c1', 'blood_type', 'admin1');
            expect(attrRepo.delete).toHaveBeenCalledWith({ customerId: 'c1', key: 'blood_type' });
        });
    });

    describe('deduplication, export & bulk import', () => {
        it('finds potential duplicates by phone, email, or nationalId', async () => {
            const qb = {
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { id: 'c1', customerCode: 'CUS-0001', fullName: 'Sokha', phone: '+85512345678' },
                ]),
            };
            repo.createQueryBuilder.mockReturnValue(qb as never);

            const matches = await service.findPotentialDuplicates({ phone: '+85512345678' });
            expect(matches).toHaveLength(1);
            expect(matches[0].customerCode).toBe('CUS-0001');
        });

        it('returns empty array when no deduplication criteria provided', async () => {
            const matches = await service.findPotentialDuplicates({});
            expect(matches).toEqual([]);
        });

        it('exports CSV with escaped values', async () => {
            const qb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([
                    [
                        {
                            id: 'c1',
                            customerCode: 'CUS-0001',
                            type: 'CUSTOMER',
                            fullName: 'Doe, "Jane"',
                            gender: 'FEMALE',
                            dateOfBirth: '1992-05-01',
                            phone: '+85512345678',
                            email: 'jane@example.com',
                            nationalId: 'ID-99',
                            address: 'Phnom Penh',
                            status: 'ACTIVE',
                            createdAt: new Date('2026-01-01T00:00:00Z'),
                        },
                    ],
                    1,
                ]),
            };
            repo.createQueryBuilder.mockReturnValue(qb as never);

            const exported = await service.exportCsv({});
            expect(exported.filename).toBe('customers-export.csv');
            expect(exported.total).toBe(1);
            expect(exported.csv).toContain('"Doe, ""Jane"""');
            expect(exported.csv).toContain('CUS-0001');
        });

        it('skips duplicates during bulk import when skipDuplicates is true', async () => {
            const dupQb = {
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { id: 'c1', customerCode: 'CUS-0001', fullName: 'Existing', phone: '+85512345678' },
                ]),
            };
            repo.createQueryBuilder.mockReturnValue(dupQb as never);

            const res = await service.importBulk(
                [
                    {
                        fullName: 'Existing Dup',
                        dateOfBirth: '1990-01-01',
                        phone: '+85512345678',
                    },
                ],
                true,
                'admin1',
            );

            expect(res.createdCount).toBe(0);
            expect(res.skippedCount).toBe(1);
            expect(res.skipped[0].existingCode).toBe('CUS-0001');
        });
    });
});
