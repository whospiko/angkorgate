import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Customer, CustomerType } from './entities/customer.entity';
import { CustomerAttribute } from './entities/customer-attribute.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';

/** Prefixes per type — makes IDs human-scannable: PAT-0001, GST-0001, CUS-0001 */
const TYPE_PREFIX: Record<CustomerType, string> = {
    PATIENT: 'PAT',
    GUEST: 'GST',
    CUSTOMER: 'CUS',
};

@Injectable()
export class CustomersService {
    constructor(
        @InjectRepository(Customer)
        private readonly repo: Repository<Customer>,
        @InjectRepository(CustomerAttribute)
        private readonly attrRepo: Repository<CustomerAttribute>,
        private readonly users: UsersService,
        private readonly audit: AuditService,
    ) { }

    async create(
        dto: CreateCustomerDto,
        actorId?: string,
    ): Promise<CustomerResponseDto> {
        if (dto.userId) {
            if (!(await this.users.exists(dto.userId))) {
                throw new NotFoundException(`User ${dto.userId} not found`);
            }
            const linked = await this.repo.findOne({ where: { userId: dto.userId } });
            if (linked) {
                throw new ConflictException(`User ${dto.userId} already has a customer record`);
            }
        }

        const type: CustomerType = dto.type ?? 'CUSTOMER';
        const customerCode = await this.nextCode(type);

        const entity = this.repo.create({
            ...dto,
            type,
            customerCode,
            userId: dto.userId ?? null,
        });
        const saved = await this.repo.save(entity);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'customer.create',
            entity: 'customer',
            entityId: saved.id,
            newValue: {
                customerCode: saved.customerCode,
                fullName: saved.fullName,
                type: saved.type,
            },
        });

        return CustomerResponseDto.fromEntity(saved);
    }

    async update(
        id: string,
        dto: UpdateCustomerDto,
        actorId?: string,
    ): Promise<CustomerResponseDto> {
        const c = await this.repo.findOne({ where: { id } });
        if (!c) throw new NotFoundException(`Customer ${id} not found`);

        const before = { fullName: c.fullName, phone: c.phone, email: c.email };
        Object.assign(c, dto);
        const saved = await this.repo.save(c);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'customer.update',
            entity: 'customer',
            entityId: id,
            oldValue: before,
            newValue: dto as Record<string, unknown>,
        });

        return CustomerResponseDto.fromEntity(saved);
    }

    async setStatus(
        id: string,
        status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
        actorId?: string,
    ): Promise<void> {
        const r = await this.repo.update(id, { status });
        if (r.affected === 0) throw new NotFoundException(`Customer ${id} not found`);

        void this.audit.log({
            actorId: actorId ?? null,
            action: `customer.status.${status.toLowerCase()}`,
            entity: 'customer',
            entityId: id,
        });
    }

    async remove(id: string, actorId?: string): Promise<void> {
        const r = await this.repo.delete(id);
        if (r.affected === 0) throw new NotFoundException(`Customer ${id} not found`);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'customer.delete',
            entity: 'customer',
            entityId: id,
        });
    }

    async findByIdOrFail(id: string): Promise<CustomerResponseDto> {
        const c = await this.repo.findOne({ where: { id } });
        if (!c) throw new NotFoundException(`Customer ${id} not found`);
        return CustomerResponseDto.fromEntity(c);
    }

    async findByCodeOrFail(code: string): Promise<CustomerResponseDto> {
        const c = await this.repo.findOne({ where: { customerCode: code } });
        if (!c) throw new NotFoundException(`Customer ${code} not found`);
        return CustomerResponseDto.fromEntity(c);
    }

    async findAll(params: {
        type?: CustomerType;
        status?: string;
        search?: string; // matches name / phone / email / code
        page?: number;
        limit?: number;
    }): Promise<{
        data: CustomerResponseDto[];
        total: number;
        page: number;
        limit: number;
    }> {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(100, Math.max(1, params.limit ?? 20));

        const qb = this.repo.createQueryBuilder('c');

        if (params.type) qb.andWhere('c.type = :type', { type: params.type });
        if (params.status) qb.andWhere('c.status = :status', { status: params.status });
        if (params.search) {
            qb.andWhere(
                '(c.fullName ILIKE :q OR c.phone ILIKE :q OR c.email ILIKE :q OR c.customerCode ILIKE :q)',
                { q: `%${params.search}%` },
            );
        }

        qb.orderBy('c.fullName', 'ASC')
            .skip((page - 1) * limit)
            .take(limit);

        const [rows, total] = await qb.getManyAndCount();
        return {
            data: rows.map(CustomerResponseDto.fromEntity),
            total,
            page,
            limit,
        };
    }

    async setAttribute(
        customerId: string,
        key: string,
        value: unknown,
    ): Promise<CustomerAttribute> {
        await this.findByIdOrFail(customerId);

        let attr = await this.attrRepo.findOne({ where: { customerId, key } });
        if (attr) {
            attr.value = value;
        } else {
            attr = this.attrRepo.create({ customerId, key, value });
        }
        return this.attrRepo.save(attr);
    }

    async getAttributes(customerId: string): Promise<Record<string, unknown>> {
        await this.findByIdOrFail(customerId);
        const attrs = await this.attrRepo.find({ where: { customerId } });
        const out: Record<string, unknown> = {};
        for (const a of attrs) out[a.key] = a.value;
        return out;
    }

    async deleteAttribute(customerId: string, key: string): Promise<void> {
        await this.attrRepo.delete({ customerId, key });
    }

    async exists(id: string): Promise<boolean> {
        return (await this.repo.count({ where: { id } })) > 0;
    }

    async getFullName(id: string): Promise<string | null> {
        const c = await this.repo.findOne({ where: { id }, select: { 'id': true, 'fullName': true } });
        return c?.fullName ?? null;
    }

    async getPhone(id: string): Promise<string | null> {
        const c = await this.repo.findOne({ where: { id }, select: { 'id': true, 'phone': true } });
        return c?.phone ?? null;
    }

    /** Generates PAT-0001 / GST-0001 / CUS-0001 atomically using a transaction. */
    private async nextCode(type: CustomerType): Promise<string> {
        return this.repo.manager.transaction(async (em: EntityManager) => {
            const prefix = TYPE_PREFIX[type];

            const lastCustomer = await em
                .createQueryBuilder(Customer, 'c')
                .where('c.customerCode LIKE :p', { p: `${prefix}-%` })
                .orderBy('CAST(SUBSTRING(c.customerCode FROM 5) AS INT)', 'DESC')
                .setLock('pessimistic_write') // serialize concurrent creations of same type
                .getOne();

            const currentMax = lastCustomer ? parseInt(lastCustomer.customerCode.substring(4), 10) : 0;
            const next = currentMax + 1;

            return `${prefix}-${String(next).padStart(4, '0')}`;
        });
    }
}