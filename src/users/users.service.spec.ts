import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { createMockRepository } from '../../test/mocks/repository.mock';
import { AuditService } from '../audit/audit.service';

describe('UsersService', () => {
    let service: UsersService;
    let repo: ReturnType<typeof createMockRepository>;

    beforeEach(async () => {
        repo = createMockRepository<User>();

        const module = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: getRepositoryToken(User), useValue: repo },
                { provide: AuditService, useValue: { log: jest.fn() } },
            ],
        }).compile();

        service = module.get(UsersService);
    });

    describe('create', () => {
        it('creates a user with hashed password passed through', async () => {
            const dto = { email: 'a@b.com', password: 'hashed-value' };
            repo.findOne.mockResolvedValue(null);
            repo.create.mockImplementation((d) => d);
            repo.save.mockImplementation((d) => Promise.resolve({ id: 'u1', ...d }));

            const result = await service.create(dto);

            expect(repo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'a@b.com',
                    passwordHash: 'hashed-value',
                    isActive: true,
                }),
            );
            expect(result.id).toBe('u1');
            expect(result).not.toHaveProperty('passwordHash');
        });

        it('throws ConflictException if email exists', async () => {
            repo.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getExists: jest.fn().mockResolvedValue(true),
            });

            await expect(
                service.create({ email: 'dup@b.com', password: 'x' }),
            ).rejects.toThrow(ConflictException);
        });

        it('throws ConflictException if phone exists', async () => {
            repo.createQueryBuilder
                .mockReturnValueOnce({
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    getExists: jest.fn().mockResolvedValue(false), // email clean
                })
                .mockReturnValueOnce({
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    getExists: jest.fn().mockResolvedValue(true), // phone dup
                });

            await expect(
                service.create({ email: 'clean@b.com', phone: '+855123', password: 'x' }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('findByIdOrFail', () => {
        it('returns the user when found', async () => {
            repo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
            const user = await service.findByIdOrFail('u1');
            expect(user.id).toBe('u1');
        });

        it('throws NotFoundException when missing', async () => {
            repo.findOne.mockResolvedValue(null);
            await expect(service.findByIdOrFail('nope')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('exists', () => {
        it('returns true when count > 0', async () => {
            repo.count.mockResolvedValue(1);
            expect(await service.exists('u1')).toBe(true);
        });

        it('returns false when count === 0', async () => {
            repo.count.mockResolvedValue(0);
            expect(await service.exists('u1')).toBe(false);
        });
    });

    describe('narrow API methods', () => {
        it('getEmail returns just the email', async () => {
            repo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
            expect(await service.getEmail('u1')).toBe('a@b.com');
        });

        it('getEmail returns null when no user', async () => {
            repo.findOne.mockResolvedValue(null);
            expect(await service.getEmail('u1')).toBeNull();
        });
    });
});