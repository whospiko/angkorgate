import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { UserRole } from '../entities/user-role.entity';
import { UserPermissionOverride } from '../entities/user-permission-override.entity';
import { createMockRepository } from '../../../test/mocks/repository.mock';
import { RbacService } from './rbac.service';

describe('RbacService', () => {
    let service: RbacService;
    let roleRepo: ReturnType<typeof createMockRepository>;
    let permRepo: ReturnType<typeof createMockRepository>;
    let rolePermRepo: ReturnType<typeof createMockRepository>;
    let userRoleRepo: ReturnType<typeof createMockRepository>;
    let overrideRepo: ReturnType<typeof createMockRepository>;

    beforeEach(async () => {
        roleRepo = createMockRepository<Role>();
        permRepo = createMockRepository<Permission>();
        rolePermRepo = createMockRepository<RolePermission>();
        userRoleRepo = createMockRepository<UserRole>();
        overrideRepo = createMockRepository<UserPermissionOverride>();

        const module = await Test.createTestingModule({
            providers: [
                RbacService,
                { provide: getRepositoryToken(Role), useValue: roleRepo },
                { provide: getRepositoryToken(Permission), useValue: permRepo },
                { provide: getRepositoryToken(RolePermission), useValue: rolePermRepo },
                { provide: getRepositoryToken(UserRole), useValue: userRoleRepo },
                {
                    provide: getRepositoryToken(UserPermissionOverride),
                    useValue: overrideRepo,
                },
            ],
        }).compile();

        service = module.get(RbacService);
    });

    // ─────────── getUserPermissions: the crown jewel ───────────

    describe('getUserPermissions', () => {
        function mockRolePermsQb(rows: { code: string }[]) {
            rolePermRepo.createQueryBuilder.mockReturnValue({
                innerJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(rows),
            });
        }
        function mockOverridesQb(
            rows: { code: string; effect: 'GRANT' | 'REVOKE' }[],
        ) {
            overrideRepo.createQueryBuilder.mockReturnValue({
                innerJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(rows),
            });
        }

        it('returns union of role permissions when no overrides', async () => {
            mockRolePermsQb([{ code: 'patient:read' }, { code: 'patient:write' }]);
            mockOverridesQb([]);

            const result = await service.getUserPermissions('user-1');
            expect(result.sort()).toEqual(['patient:read', 'patient:write']);
        });

        it('adds GRANT overrides', async () => {
            mockRolePermsQb([{ code: 'patient:read' }]);
            mockOverridesQb([{ code: 'report:read', effect: 'GRANT' }]);

            const result = await service.getUserPermissions('user-1');
            expect(result.sort()).toEqual(['patient:read', 'report:read']);
        });

        it('removes REVOKE overrides', async () => {
            mockRolePermsQb([
                { code: 'patient:read' },
                { code: 'patient:write' },
                { code: 'patient:delete' },
            ]);
            mockOverridesQb([{ code: 'patient:delete', effect: 'REVOKE' }]);

            const result = await service.getUserPermissions('user-1');
            expect(result.sort()).toEqual(['patient:read', 'patient:write']);
        });

        it('handles GRANT + REVOKE on same permission (REVOKE wins)', async () => {
            mockRolePermsQb([{ code: 'patient:read' }]);
            mockOverridesQb([
                { code: 'patient:read', effect: 'REVOKE' },
                { code: 'patient:read', effect: 'GRANT' },
            ]);

            const result = await service.getUserPermissions('user-1');
            // Iteration order: GRANT adds, REVOKE removes (order in code determines winner).
            // In the service, GRANT is processed first, so final = removed.
            expect(result).toEqual([]);
        });

        it('returns empty array for user with no roles', async () => {
            mockRolePermsQb([]);
            mockOverridesQb([]);
            expect(await service.getUserPermissions('user-1')).toEqual([]);
        });
    });

    describe('assignRoleToUser', () => {
        it('is idempotent — does nothing if already assigned', async () => {
            roleRepo.findOne.mockResolvedValue({ id: 'r1', code: 'DOCTOR' });
            userRoleRepo.findOne.mockResolvedValue({
                userId: 'u1',
                roleId: 'r1',
            });

            await service.assignRoleToUser('u1', 'DOCTOR');
            expect(userRoleRepo.save).not.toHaveBeenCalled();
        });

        it('creates the assignment when new', async () => {
            roleRepo.findOne.mockResolvedValue({ id: 'r1', code: 'DOCTOR' });
            userRoleRepo.findOne.mockResolvedValue(null);
            userRoleRepo.create.mockImplementation((d) => d);
            userRoleRepo.save.mockResolvedValue({});

            await service.assignRoleToUser('u1', 'DOCTOR', 'admin-1');

            expect(userRoleRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'u1',
                    roleId: 'r1',
                    assignedBy: 'admin-1',
                }),
            );
        });

        it('throws NotFoundException for unknown role', async () => {
            roleRepo.findOne.mockResolvedValue(null);
            await expect(
                service.assignRoleToUser('u1', 'GHOST'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('createRole', () => {
        it('creates a role without permissions', async () => {
            roleRepo.findOne.mockResolvedValue(null);
            roleRepo.create.mockImplementation((d) => d);
            roleRepo.save.mockImplementation(async (d) => ({ id: 'r1', ...d }));
            roleRepo.findOne
                .mockResolvedValueOnce(null) // uniqueness check
                .mockResolvedValueOnce({ id: 'r1', code: 'MANAGER' }); // findRoleByIdOrFail

            const role = await service.createRole({
                code: 'MANAGER',
                name: 'Manager',
            });

            expect(role.code).toBe('MANAGER');
            expect(roleRepo.save).toHaveBeenCalledTimes(1);
        });

        it('rejects duplicate role code', async () => {
            roleRepo.findOne.mockResolvedValue({ id: 'r1', code: 'DOCTOR' });
            await expect(
                service.createRole({ code: 'DOCTOR', name: 'Doctor' }),
            ).rejects.toThrow('already exists');
        });
    });
});