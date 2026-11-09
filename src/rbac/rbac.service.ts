import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRole } from './entities/user-role.entity';
import {
    UserPermissionOverride,
    OverrideEffect,
} from './entities/user-permission-override.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class RbacService {
    constructor(
        @InjectRepository(Role)
        private readonly roleRepo: Repository<Role>,
        @InjectRepository(Permission)
        private readonly permRepo: Repository<Permission>,
        @InjectRepository(RolePermission)
        private readonly rolePermRepo: Repository<RolePermission>,
        @InjectRepository(UserRole)
        private readonly userRoleRepo: Repository<UserRole>,
        @InjectRepository(UserPermissionOverride)
        private readonly overrideRepo: Repository<UserPermissionOverride>,
    ) { }

    // ══════════════════════════════════════════════════════════════════
    //  PUBLIC API — what AuthModule and other modules actually call
    // ══════════════════════════════════════════════════════════════════

    /** Resolved effective permission codes for a user (roles ∪ grants − revokes). */
    async getUserPermissions(userId: string): Promise<string[]> {
        const rolePerms = await this.rolePermRepo
            .createQueryBuilder('rp')
            .innerJoin('rp.permission', 'p')
            .innerJoin('rp.role', 'r')
            .innerJoin('user_roles', 'ur', 'ur.role_id = r.id')
            .where('ur.user_id = :userId', { userId })
            .select('p.code', 'code')
            .getRawMany<{ code: string }>();

        const overrides = await this.overrideRepo
            .createQueryBuilder('o')
            .innerJoin('o.permission', 'p')
            .where('o.user_id = :userId', { userId })
            .select(['p.code AS code', 'o.effect AS effect'])
            .getRawMany<{ code: string; effect: OverrideEffect }>();

        const set = new Set(rolePerms.map((r) => r.code));
        for (const ov of overrides) {
            if (ov.effect === 'GRANT') set.add(ov.code);
            else set.delete(ov.code); // REVOKE
        }
        return Array.from(set);
    }

    async getUserRoleCodes(userId: string): Promise<string[]> {
        const rows = await this.userRoleRepo
            .createQueryBuilder('ur')
            .innerJoin('ur.role', 'r')
            .where('ur.user_id = :userId', { userId })
            .select('r.code', 'code')
            .getRawMany<{ code: string }>();
        return rows.map((r) => r.code);
    }

    async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
        const perms = await this.getUserPermissions(userId);
        return perms.includes(permissionCode);
    }

    async hasRole(userId: string, roleCode: string): Promise<boolean> {
        const roles = await this.getUserRoleCodes(userId);
        return roles.includes(roleCode);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ROLE MANAGEMENT (called from RolesController)
    // ══════════════════════════════════════════════════════════════════

    async createRole(dto: CreateRoleDto): Promise<Role> {
        const exists = await this.roleRepo.findOne({ where: { code: dto.code } });
        if (exists) throw new ConflictException(`Role ${dto.code} already exists`);

        const role = this.roleRepo.create({
            code: dto.code,
            name: dto.name,
            description: dto.description ?? null,
            isSystem: dto.isSystem ?? false,
        });
        const saved = await this.roleRepo.save(role);

        if (dto.permissionCodes?.length) {
            await this.setRolePermissions(saved.id, dto.permissionCodes);
        }
        return this.findRoleByIdOrFail(saved.id);
    }

    async findAllRoles(): Promise<Role[]> {
        return this.roleRepo.find({ order: { code: 'ASC' } });
    }

    async findRoleByIdOrFail(id: string): Promise<Role> {
        const role = await this.roleRepo.findOne({
            where: { id },
            relations: { rolePermissions: { permission: true } },
        });
        if (!role) throw new NotFoundException(`Role ${id} not found`);
        return role;
    }

    async findRoleByCodeOrFail(code: string): Promise<Role> {
        const role = await this.roleRepo.findOne({ where: { code } });
        if (!role) throw new NotFoundException(`Role ${code} not found`);
        return role;
    }

    async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
        const role = await this.findRoleByIdOrFail(id);
        Object.assign(role, dto);
        await this.roleRepo.save(role);
        return this.findRoleByIdOrFail(id);
    }

    async deleteRole(id: string): Promise<void> {
        const role = await this.findRoleByIdOrFail(id);
        if (role.isSystem) {
            throw new BadRequestException('Cannot delete a system role');
        }
        await this.roleRepo.delete(id);
    }

    async setRolePermissions(roleId: string, permissionCodes: string[]): Promise<void> {
        const perms = await this.permRepo.find({ where: { code: In(permissionCodes) } });
        if (perms.length !== permissionCodes.length) {
            const found = perms.map((p) => p.code);
            const missing = permissionCodes.filter((c) => !found.includes(c));
            throw new BadRequestException(`Unknown permissions: ${missing.join(', ')}`);
        }
        await this.rolePermRepo.delete({ roleId });
        await this.rolePermRepo.save(
            perms.map((p) => this.rolePermRepo.create({ roleId, permissionId: p.id })),
        );
    }

    async getRolePermissions(roleId: string): Promise<string[]> {
        const rows = await this.rolePermRepo
            .createQueryBuilder('rp')
            .innerJoin('rp.permission', 'p')
            .where('rp.role_id = :roleId', { roleId })
            .select('p.code', 'code')
            .getRawMany<{ code: string }>();
        return rows.map((r) => r.code);
    }

    // ══════════════════════════════════════════════════════════════════
    //  PERMISSION MANAGEMENT
    // ══════════════════════════════════════════════════════════════════

    async createPermission(dto: CreatePermissionDto): Promise<Permission> {
        const exists = await this.permRepo.findOne({ where: { code: dto.code } });
        if (exists) throw new ConflictException(`Permission ${dto.code} already exists`);

        const p = this.permRepo.create({
            code: dto.code,
            resource: dto.resource,
            action: dto.action,
            description: dto.description ?? null,
        });
        return this.permRepo.save(p);
    }

    async findAllPermissions(): Promise<Permission[]> {
        return this.permRepo.find({ order: { code: 'ASC' } });
    }

    async findPermissionByCodeOrFail(code: string): Promise<Permission> {
        const p = await this.permRepo.findOne({ where: { code } });
        if (!p) throw new NotFoundException(`Permission ${code} not found`);
        return p;
    }

    // ══════════════════════════════════════════════════════════════════
    //  USER ↔ ROLE ASSIGNMENT
    // ══════════════════════════════════════════════════════════════════

    async assignRoleToUser(
        userId: string,
        roleCode: string,
        assignedBy?: string,
    ): Promise<void> {
        const role = await this.findRoleByCodeOrFail(roleCode);
        const existing = await this.userRoleRepo.findOne({
            where: { userId, roleId: role.id },
        });
        if (existing) return; // idempotent
        await this.userRoleRepo.save(
            this.userRoleRepo.create({
                userId,
                roleId: role.id,
                assignedBy: assignedBy ?? null,
            }),
        );
    }

    async replaceUserRoles(
        userId: string,
        roleCodes: string[],
        assignedBy?: string,
    ): Promise<void> {
        const roles = await this.roleRepo.find({ where: { code: In(roleCodes) } });
        if (roles.length !== roleCodes.length) {
            const found = roles.map((r) => r.code);
            const missing = roleCodes.filter((c) => !found.includes(c));
            throw new BadRequestException(`Unknown roles: ${missing.join(', ')}`);
        }
        await this.userRoleRepo.delete({ userId });
        if (roles.length === 0) return;
        await this.userRoleRepo.save(
            roles.map((r) =>
                this.userRoleRepo.create({
                    userId,
                    roleId: r.id,
                    assignedBy: assignedBy ?? null,
                }),
            ),
        );
    }

    async revokeRoleFromUser(userId: string, roleCode: string): Promise<void> {
        const role = await this.findRoleByCodeOrFail(roleCode);
        await this.userRoleRepo.delete({ userId, roleId: role.id });
    }

    // ══════════════════════════════════════════════════════════════════
    //  PER-USER PERMISSION OVERRIDES
    // ══════════════════════════════════════════════════════════════════

    async setUserPermissionOverride(
        userId: string,
        permissionCode: string,
        effect: OverrideEffect,
    ): Promise<void> {
        const perm = await this.findPermissionByCodeOrFail(permissionCode);
        await this.overrideRepo.upsert(
            { userId, permissionId: perm.id, effect },
            ['userId', 'permissionId'],
        );
    }

    async clearUserPermissionOverride(
        userId: string,
        permissionCode: string,
    ): Promise<void> {
        const perm = await this.findPermissionByCodeOrFail(permissionCode);
        await this.overrideRepo.delete({ userId, permissionId: perm.id });
    }
}