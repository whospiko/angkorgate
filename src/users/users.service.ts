import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    async create(dto: CreateUserDto): Promise<UserResponseDto> {
        await this.assertUnique(dto.email, dto.phone);

        const entity = this.userRepo.create({
            email: dto.email ?? null,
            phone: dto.phone ?? null,
            passwordHash: dto.password,
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

    async findAll(page = 1, limit = 20): Promise<{
        data: UserResponseDto[];
        total: number;
        page: number;
        limit: number;
    }> {
        const [rows, total] = await this.userRepo.findAndCount({
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data: rows.map(UserResponseDto.fromEntity), total, page, limit };
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
        const result = await this.userRepo.update(id, { isActive });
        if (result.affected === 0) throw new NotFoundException(`User ${id} not found`);
    }

    async remove(id: string): Promise<void> {
        const result = await this.userRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException(`User ${id} not found`);
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
            .getOne();
    }

    async findAuthRecordByPhone(phone: string): Promise<User | null> {
        return this.userRepo
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.phone = :phone', { phone })
            .getOne();
    }

    private async assertUnique(
        email?: string,
        phone?: string,
        excludeId?: string,
    ): Promise<void> {
        if (email) {
            const q = this.userRepo
                .createQueryBuilder('u')
                .where('u.email = :email', { email });
            if (excludeId) q.andWhere('u.id != :id', { id: excludeId });
            if (await q.getExists()) {
                throw new ConflictException(`Email ${email} is already in use`);
            }
        }
        if (phone) {
            const q = this.userRepo
                .createQueryBuilder('u')
                .where('u.phone = :phone', { phone });
            if (excludeId) q.andWhere('u.id != :id', { id: excludeId });
            if (await q.getExists()) {
                throw new ConflictException(`Phone ${phone} is already in use`);
            }
        }
    }
}