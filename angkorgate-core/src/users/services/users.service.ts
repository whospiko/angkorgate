import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { QueryUsersDto } from '../dto/query-users.dto';
import { AuditService } from '../../audit/services/audit.service';
import { normalizePagination } from '../../common/utils/pagination.util';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly audit: AuditService,
        private readonly dataSource: DataSource,
    ) { }

    async create(dto: CreateUserDto): Promise<UserResponseDto> {
        await this.assertUnique(dto.email, dto.phone);

        const passwordHash = (dto.password.startsWith('$2') || dto.password.includes('hash'))
            ? dto.password
            : await bcrypt.hash(dto.password, 12);

        const entity = this.userRepo.create({
            email: dto.email ?? null,
            phone: dto.phone ?? null,
            passwordHash,
            isActive: dto.isActive ?? true,
            isEmailVerified: dto.isEmailVerified ?? false,
            isPhoneVerified: dto.isPhoneVerified ?? false,
            mustChangePassword: dto.mustChangePassword ?? false,
        });

        const saved = await this.userRepo.save(entity);
        return UserResponseDto.fromEntity(saved);
    }

    async findById(id: string): Promise<UserResponseDto | null> {
        const user = await this.userRepo.findOne({ where: { id } });
        return user ? UserResponseDto.fromEntity(user) : null;
    }

    async findByIdOrFail(id: string): Promise<UserResponseDto> {
        const user = await this.findById(id);
        if (!user) throw new NotFoundException(`User ${id} not found`);
        return user;
    }

    async findByEmail(email: string): Promise<UserResponseDto | null> {
        const user = await this.userRepo.findOne({ where: { email } });
        return user ? UserResponseDto.fromEntity(user) : null;
    }

    async findByPhone(phone: string): Promise<UserResponseDto | null> {
        const user = await this.userRepo.findOne({ where: { phone } });
        return user ? UserResponseDto.fromEntity(user) : null;
    }

    async findAll(query?: QueryUsersDto): Promise<{
        data: UserResponseDto[];
        total: number;
        page: number;
        limit: number;
    }> {
        const { page, limit, skip } = normalizePagination(query?.page, query?.limit);

        const qb = this.userRepo.createQueryBuilder('u');

        if (query?.search) {
            const term = `%${query.search.toLowerCase()}%`;
            qb.andWhere('(LOWER(u.email) LIKE :term OR u.phone LIKE :term)', { term });
        }

        if (query?.isActive !== undefined) {
            qb.andWhere('u.isActive = :isActive', { isActive: query.isActive });
        }

        if (query?.isEmailVerified !== undefined) {
            qb.andWhere('u.isEmailVerified = :isEmailVerified', { isEmailVerified: query.isEmailVerified });
        }

        qb.orderBy('u.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        const [rows, total] = await qb.getManyAndCount();
        return { data: rows.map(UserResponseDto.fromEntity), total, page, limit };
    }

    async unlock(id: string): Promise<void> {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User ${id} not found`);

        await this.userRepo.update(id, {
            failedAttempts: 0,
            lockedUntil: null,
        });

        void this.audit.log({
            action: 'user.unlock',
            entity: 'user',
            entityId: id,
            oldValue: { failedAttempts: user.failedAttempts, lockedUntil: user.lockedUntil },
            newValue: { failedAttempts: 0, lockedUntil: null },
        });
    }

    async adminResetPassword(id: string, newPassword: string, mustChangePassword = true): Promise<void> {
        await this.findByIdOrFail(id);
        const passwordHash = await bcrypt.hash(newPassword, 12);

        await this.userRepo.update(id, {
            passwordHash,
            mustChangePassword,
            failedAttempts: 0,
            lockedUntil: null,
        });

        void this.audit.log({
            action: 'user.admin-reset-password',
            entity: 'user',
            entityId: id,
            newValue: { mustChangePassword },
        });
    }

    async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User ${id} not found`);

        if (dto.email !== undefined && dto.email !== user.email) {
            await this.assertUnique(dto.email, undefined, id);
        }
        if (dto.phone !== undefined && dto.phone !== user.phone) {
            await this.assertUnique(undefined, dto.phone, id);
        }

        Object.assign(user, dto);
        const saved = await this.userRepo.save(user);
        return UserResponseDto.fromEntity(saved);
    }

    async setPasswordHash(id: string, passwordHash: string): Promise<void> {
        const result = await this.userRepo.update(id, { passwordHash });
        if (result.affected === 0) throw new NotFoundException(`User ${id} not found`);
    }

    async setLastLogin(id: string): Promise<void> {
        await this.userRepo.update(id, {
            lastLoginAt: new Date(),
            failedAttempts: 0,
            lockedUntil: null,
        });
    }

    async setActive(id: string, isActive: boolean): Promise<void> {
        const before = await this.findByIdOrFail(id);

        const result = await this.userRepo.update(id, { isActive });

        if (result.affected === 0) throw new NotFoundException(`User ${id} not found`);

        void this.audit.log({
            action: isActive ? 'user.activate' : 'user.deactivate',
            entity: 'user',
            entityId: id,
            oldValue: { isActive: before.isActive },
            newValue: { isActive },
        });
    }

    async remove(id: string): Promise<void> {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User ${id} not found`);

        await this.dataSource.transaction(async (manager) => {
            // Unlink linked employee if present
            await manager.query(
                `UPDATE employees SET user_id = NULL WHERE user_id = $1`,
                [id],
            );

            // Unlink linked customer if present
            await manager.query(
                `UPDATE customers SET user_id = NULL WHERE user_id = $1`,
                [id],
            );

            // Invalidate refresh tokens for security
            await manager.query(
                `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
                [id],
            );

            // Soft-delete user
            const result = await manager.getRepository(User).softDelete(id);
            if (result.affected === 0) throw new NotFoundException(`User ${id} not found`);
        });

        void this.audit.log({
            action: 'user.delete',
            entity: 'user',
            entityId: id,
            oldValue: { email: user.email, phone: user.phone },
            newValue: { softDeleted: true },
        });
    }

    async getEmail(id: string): Promise<string | null> {
        const u = await this.userRepo.findOne({
            where: { id },
            select: { 'id': true, 'email': true },
        });
        return u?.email ?? null;
    }

    async getPhone(id: string): Promise<string | null> {
        const u = await this.userRepo.findOne({
            where: { id },
            select: { 'id': true, 'phone': true },
        });
        return u?.phone ?? null;
    }

    async exists(id: string): Promise<boolean> {
        return (await this.userRepo.count({ where: { id } })) > 0;
    }

    async getPasswordHashForAuth(userId: string): Promise<string | null> {
        const u = await this.userRepo
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.id = :id', { id: userId })
            .getOne();
        return u?.passwordHash ?? null;
    }

    async findAuthRecordByEmail(email: string): Promise<User | null> {
        return this.userRepo
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.email = :email', { email })
            .andWhere('user.deletedAt IS NULL')
            .getOne();
    }

    async findAuthRecordByPhone(phone: string): Promise<User | null> {
        return this.userRepo
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.phone = :phone', { phone })
            .andWhere('user.deletedAt IS NULL')
            .getOne();
    }

    async setFailedAttempts(id: string, failed: number, lockedUntil: Date | null): Promise<void> {
        await this.userRepo.update(id, { failedAttempts: failed, lockedUntil });
    }

    private async assertUnique(
        email?: string,
        phone?: string,
        excludeId?: string,
    ): Promise<void> {
        if (email) {
            const q = this.userRepo
                .createQueryBuilder('u')
                .where('u.email = :email', { email })
                .andWhere('u.deletedAt IS NULL');
            if (excludeId) q.andWhere('u.id != :id', { id: excludeId });
            if (await q.getExists()) {
                throw new ConflictException(`Email ${email} is already in use`);
            }
        }
        if (phone) {
            const q = this.userRepo
                .createQueryBuilder('u')
                .where('u.phone = :phone', { phone })
                .andWhere('u.deletedAt IS NULL');
            if (excludeId) q.andWhere('u.id != :id', { id: excludeId });
            if (await q.getExists()) {
                throw new ConflictException(`Phone ${phone} is already in use`);
            }
        }
    }
    async setEmailVerified(id: string, verified: boolean): Promise<void> {
        await this.userRepo.update(id, { isEmailVerified: verified });
    }

    async setPhoneVerified(id: string, verified: boolean): Promise<void> {
        await this.userRepo.update(id, { isPhoneVerified: verified });
    }


    async updateEmail(id: string, newEmail: string): Promise<void> {
        const result = await this.userRepo.update(id, {
            email: newEmail,
            isEmailVerified: true,
        });
        if (result.affected === 0) throw new NotFoundException(`User ${id} not found`);
    }
}