import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Customer, CustomerStatus, CustomerType } from '../entities/customer.entity';
import { CustomerAttribute } from '../entities/customer-attribute.entity';
import { CustomerContact } from '../entities/customer-contact.entity';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { CustomerResponseDto } from '../dto/customer-response.dto';
import { UsersService } from '../../users/services/users.service';
import { AuditService } from '../../audit/services/audit.service';
import { AttributeSchemasService } from './attribute-schemas.service';
import { WebhooksService } from '../../webhooks/webhooks.service';
import {
    CUSTOMER_TYPE_PREFIX,
    formatCustomerCode,
    parseCustomerSequence,
} from '../utils/customer-code.util';
import { normalizePagination } from '../../common/utils/pagination.util';
import { isSqlite } from '../../common/utils/db-types.util';
import { buildCsv } from '../../common/utils/csv.util';

const ALLOWED_CUSTOMER_STATUSES: ReadonlyArray<CustomerStatus> = [
    'ACTIVE',
    'INACTIVE',
    'ARCHIVED',
];

@Injectable()
export class CustomersService {
    constructor(
        @InjectRepository(Customer)
        private readonly repo: Repository<Customer>,
        @InjectRepository(CustomerAttribute)
        private readonly attrRepo: Repository<CustomerAttribute>,
        private readonly users: UsersService,
        private readonly audit: AuditService,
        @Optional() private readonly attributeSchemas?: AttributeSchemasService,
        @Optional() private readonly webhooks?: WebhooksService,
    ) { }

    async create(
        dto: CreateCustomerDto,
        actorId?: string,
    ): Promise<CustomerResponseDto> {
        if (dto.userId) {
            await this.assertUserLinkAvailable(dto.userId);
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

        void this.webhooks?.emitEvent('customer.created', {
            id: saved.id,
            customerCode: saved.customerCode,
            type: saved.type,
            fullName: saved.fullName,
            email: saved.email,
            phone: saved.phone,
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

    async linkUser(
        id: string,
        userId: string | null,
        actorId?: string,
    ): Promise<CustomerResponseDto> {
        const c = await this.repo.findOne({ where: { id } });
        if (!c) throw new NotFoundException(`Customer ${id} not found`);

        const previousUserId = c.userId;
        if (userId && userId !== c.userId) {
            await this.assertUserLinkAvailable(userId, id);
        }

        c.userId = userId;
        const saved = await this.repo.save(c);

        void this.audit.log({
            actorId: actorId ?? null,
            action: userId ? 'customer.user.link' : 'customer.user.unlink',
            entity: 'customer',
            entityId: id,
            oldValue: { userId: previousUserId },
            newValue: { userId },
        });

        return CustomerResponseDto.fromEntity(saved);
    }

    async setStatus(
        id: string,
        status: string,
        actorId?: string,
    ): Promise<void> {
        const normalized = status.toUpperCase() as CustomerStatus;
        if (!ALLOWED_CUSTOMER_STATUSES.includes(normalized)) {
            throw new BadRequestException(
                `Invalid customer status '${status}'. Allowed: ${ALLOWED_CUSTOMER_STATUSES.join(', ')}`,
            );
        }

        const existing = await this.repo.findOne({ where: { id } });
        if (!existing) throw new NotFoundException(`Customer ${id} not found`);

        const prevStatus = existing.status;
        await this.repo.update(id, { status: normalized });

        void this.audit.log({
            actorId: actorId ?? null,
            action: `customer.status.${normalized.toLowerCase()}`,
            entity: 'customer',
            entityId: id,
            oldValue: { status: prevStatus },
            newValue: { status: normalized },
        });
    }

    async remove(id: string, actorId?: string): Promise<void> {
        const existing = await this.repo.findOne({ where: { id } });
        if (!existing) throw new NotFoundException(`Customer ${id} not found`);

        // Clear user link before soft-deleting so the user account can be re-linked cleanly
        if (existing.userId) {
            await this.repo.update(id, { userId: null });
        }

        const r = await this.repo.softDelete(id);
        if (r.affected === 0) throw new NotFoundException(`Customer ${id} not found`);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'customer.delete',
            entity: 'customer',
            entityId: id,
            oldValue: { customerCode: existing.customerCode, fullName: existing.fullName },
            newValue: { softDeleted: true },
        });
    }

    async findByIdOrFail(id: string): Promise<CustomerResponseDto> {
        const c = await this.repo.findOne({
            where: { id },
            relations: { contacts: true, attributes: true },
        });
        if (!c) throw new NotFoundException(`Customer ${id} not found`);
        return CustomerResponseDto.fromEntity(c);
    }

    async findByUserId(userId: string): Promise<CustomerResponseDto | null> {
        const c = await this.repo.findOne({ where: { userId } });
        return c ? CustomerResponseDto.fromEntity(c) : null;
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
        const { page, limit, skip } = normalizePagination(params.page, params.limit);

        const qb = this.repo.createQueryBuilder('c');

        if (params.type) qb.andWhere('c.type = :type', { type: params.type });
        if (params.status) qb.andWhere('c.status = :status', { status: params.status.toUpperCase() });
        if (params.search && params.search.trim().length > 0) {
            const term = `%${params.search.trim().toLowerCase()}%`;
            qb.andWhere(
                '(LOWER(c.fullName) LIKE :q OR LOWER(COALESCE(c.phone, \'\')) LIKE :q OR LOWER(COALESCE(c.email, \'\')) LIKE :q OR LOWER(c.customerCode) LIKE :q)',
                { q: term },
            );
        }

        qb.orderBy('c.fullName', 'ASC')
            .skip(skip)
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
        actorId?: string,
    ): Promise<CustomerAttribute> {
        const customer = await this.findByIdOrFail(customerId);
        if (this.attributeSchemas) {
            await this.attributeSchemas.validateValue('CUSTOMER', customer.type, key, value);
        }

        let attr = await this.attrRepo.findOne({ where: { customerId, key } });
        const oldValue = attr ? attr.value : undefined;
        if (attr) {
            attr.value = value;
        } else {
            attr = this.attrRepo.create({ customerId, key, value });
        }
        const saved = await this.attrRepo.save(attr);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'customer.attribute.set',
            entity: 'customer',
            entityId: customerId,
            oldValue: oldValue !== undefined ? { [key]: oldValue } : undefined,
            newValue: { [key]: value },
        });

        return saved;
    }

    async getAttributes(customerId: string): Promise<Record<string, unknown>> {
        await this.findByIdOrFail(customerId);
        const attrs = await this.attrRepo.find({ where: { customerId } });
        const out: Record<string, unknown> = {};
        for (const a of attrs) out[a.key] = a.value;
        return out;
    }

    async deleteAttribute(
        customerId: string,
        key: string,
        actorId?: string,
    ): Promise<void> {
        await this.findByIdOrFail(customerId);
        const result = await this.attrRepo.delete({ customerId, key });
        if (result.affected && result.affected > 0) {
            void this.audit.log({
                actorId: actorId ?? null,
                action: 'customer.attribute.delete',
                entity: 'customer',
                entityId: customerId,
                oldValue: { key },
            });
        }
    }

    async exists(id: string): Promise<boolean> {
        return (await this.repo.count({ where: { id } })) > 0;
    }

    async getFullName(id: string): Promise<string | null> {
        const c = await this.repo.findOne({ where: { id }, select: { id: true, fullName: true } });
        return c?.fullName ?? null;
    }

    async getPhone(id: string): Promise<string | null> {
        const c = await this.repo.findOne({ where: { id }, select: { id: true, phone: true } });
        return c?.phone ?? null;
    }

    private async assertUserLinkAvailable(userId: string, excludeCustomerId?: string): Promise<void> {
        if (!(await this.users.exists(userId))) {
            throw new NotFoundException(`User ${userId} not found`);
        }
        const linked = await this.repo.findOne({ where: { userId } });
        if (linked && linked.id !== excludeCustomerId) {
            throw new ConflictException(`User ${userId} already has a customer record`);
        }
    }

    /** Finds potential duplicate customers matching phone, email, or nationalId. */
    async findPotentialDuplicates(params: {
        phone?: string;
        email?: string;
        nationalId?: string;
    }): Promise<Customer[]> {
        const phone = params.phone?.trim();
        const email = params.email?.trim();
        const nationalId = params.nationalId?.trim();

        const clauses: string[] = [];
        const bindings: Record<string, string> = {};

        if (phone) {
            clauses.push('c.phone = :phone');
            bindings.phone = phone;
        }
        if (email) {
            clauses.push('LOWER(c.email) = LOWER(:email)');
            bindings.email = email;
        }
        if (nationalId) {
            clauses.push('c.nationalId = :nationalId');
            bindings.nationalId = nationalId;
        }

        if (clauses.length === 0) {
            return [];
        }

        return this.repo
            .createQueryBuilder('c')
            .where(`(${clauses.join(' OR ')})`, bindings)
            .orderBy('c.createdAt', 'DESC')
            .take(10)
            .getMany();
    }

    /** Exports filtered customers (up to 1000 rows) as a CSV payload. */
    async exportCsv(params: {
        search?: string;
        status?: string;
        type?: string;
    }): Promise<{ filename: string; contentType: string; total: number; csv: string }> {
        const { data } = await this.findAll({
            search: params.search,
            status: params.status,
            type: params.type as CustomerType | undefined,
            page: 1,
            limit: 1000,
        });
        const headers = [
            'customerCode',
            'type',
            'fullName',
            'gender',
            'dateOfBirth',
            'phone',
            'email',
            'nationalId',
            'address',
            'status',
            'createdAt',
        ];
        const rows = data.map((c) => [
            c.customerCode,
            c.type,
            c.fullName,
            c.gender ?? '',
            c.dateOfBirth,
            c.phone ?? '',
            c.email ?? '',
            c.nationalId ?? '',
            c.address ?? '',
            c.status,
            c.createdAt,
        ]);

        return {
            filename: 'customers-export.csv',
            contentType: 'text/csv',
            total: data.length,
            csv: buildCsv(headers, rows),
        };
    }

    /** Bulk-imports customer rows with optional duplicate detection. */
    async importBulk(
        rows: CreateCustomerDto[],
        skipDuplicates = true,
        actorId?: string,
    ): Promise<{
        createdCount: number;
        skippedCount: number;
        errorCount: number;
        createdCodes: string[];
        skipped: { rowIndex: number; fullName: string; reason: string; existingCode: string }[];
        errors: { rowIndex: number; fullName: string; message: string }[];
    }> {
        const createdCodes: string[] = [];
        const skipped: {
            rowIndex: number;
            fullName: string;
            reason: string;
            existingCode: string;
        }[] = [];
        const errors: { rowIndex: number; fullName: string; message: string }[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (skipDuplicates) {
                const duplicates = await this.findPotentialDuplicates({
                    phone: row.phone,
                    email: row.email,
                    nationalId: row.nationalId,
                });
                if (duplicates.length > 0) {
                    skipped.push({
                        rowIndex: i,
                        fullName: row.fullName,
                        reason: 'Duplicate phone, email, or nationalId',
                        existingCode: duplicates[0].customerCode,
                    });
                    continue;
                }
            }

            try {
                const created = await this.create(row, actorId);
                createdCodes.push(created.customerCode);
            } catch (err) {
                errors.push({
                    rowIndex: i,
                    fullName: row.fullName,
                    message: err instanceof Error ? err.message : 'Failed to import row',
                });
            }
        }

        return {
            createdCount: createdCodes.length,
            skippedCount: skipped.length,
            errorCount: errors.length,
            createdCodes,
            skipped,
            errors,
        };
    }

    /** Atomically merges a duplicate customer into a primary customer and archives the duplicate. */
    async mergeCustomers(
        primaryCustomerId: string,
        duplicateCustomerId: string,
        actorId?: string,
    ): Promise<{
        primary: CustomerResponseDto;
        archivedDuplicateId: string;
        archivedDuplicateCode: string;
        movedContacts: number;
        movedAttributes: number;
        transferredUserId: string | null;
    }> {
        if (primaryCustomerId === duplicateCustomerId) {
            throw new BadRequestException('Cannot merge a customer into itself');
        }

        const result = await this.repo.manager.transaction(async (em: EntityManager) => {
            const custRepo = em.getRepository(Customer);
            const contactRepo = em.getRepository(CustomerContact);
            const attrRepo = em.getRepository(CustomerAttribute);

            const primary = await custRepo.findOne({ where: { id: primaryCustomerId } });
            if (!primary) {
                throw new NotFoundException(`Primary customer ${primaryCustomerId} not found`);
            }
            const duplicate = await custRepo.findOne({ where: { id: duplicateCustomerId } });
            if (!duplicate) {
                throw new NotFoundException(`Duplicate customer ${duplicateCustomerId} not found`);
            }
            if (duplicate.status === 'ARCHIVED') {
                throw new BadRequestException(
                    `Duplicate customer ${duplicate.customerCode} is already archived`,
                );
            }

            // Fill missing scalar fields on primary without overwriting existing values
            if (!primary.phone && duplicate.phone) primary.phone = duplicate.phone;
            if (!primary.email && duplicate.email) primary.email = duplicate.email;
            if (!primary.nationalId && duplicate.nationalId) primary.nationalId = duplicate.nationalId;
            if (!primary.address && duplicate.address) primary.address = duplicate.address;
            if (!primary.gender && duplicate.gender) primary.gender = duplicate.gender;
            if (!primary.avatarUrl && duplicate.avatarUrl) primary.avatarUrl = duplicate.avatarUrl;

            let transferredUserId: string | null = null;
            if (!primary.userId && duplicate.userId) {
                transferredUserId = duplicate.userId;
            }

            // Unlink & archive duplicate first so unique userId constraint is never violated
            duplicate.userId = null;
            duplicate.status = 'ARCHIVED';
            await custRepo.save(duplicate);

            if (transferredUserId) {
                primary.userId = transferredUserId;
            }
            await custRepo.save(primary);

            // Re-point non-colliding contacts
            const [primaryContacts, dupContacts] = await Promise.all([
                contactRepo.find({ where: { customerId: primary.id } }),
                contactRepo.find({ where: { customerId: duplicate.id } }),
            ]);
            const existingPhones = new Set(
                primaryContacts.map((c) => c.phone).filter((p): p is string => Boolean(p)),
            );
            const hasPrimaryContact = primaryContacts.some((c) => c.isPrimary);

            let movedContacts = 0;
            for (const contact of dupContacts) {
                if (contact.phone && existingPhones.has(contact.phone)) {
                    await contactRepo.delete(contact.id);
                    continue;
                }
                contact.customerId = primary.id;
                if (hasPrimaryContact && contact.isPrimary) {
                    contact.isPrimary = false;
                }
                await contactRepo.save(contact);
                if (contact.phone) existingPhones.add(contact.phone);
                movedContacts++;
            }

            // Re-point non-colliding attributes
            const [primaryAttrs, dupAttrs] = await Promise.all([
                attrRepo.find({ where: { customerId: primary.id } }),
                attrRepo.find({ where: { customerId: duplicate.id } }),
            ]);
            const existingKeys = new Set(primaryAttrs.map((a) => a.key));

            let movedAttributes = 0;
            for (const attr of dupAttrs) {
                if (existingKeys.has(attr.key)) {
                    await attrRepo.delete(attr.id);
                    continue;
                }
                attr.customerId = primary.id;
                await attrRepo.save(attr);
                existingKeys.add(attr.key);
                movedAttributes++;
            }

            const reloaded = await custRepo.findOne({
                where: { id: primary.id },
                relations: { contacts: true, attributes: true },
            });

            return {
                primary: CustomerResponseDto.fromEntity(reloaded ?? primary),
                archivedDuplicateId: duplicate.id,
                archivedDuplicateCode: duplicate.customerCode,
                movedContacts,
                movedAttributes,
                transferredUserId,
            };
        });

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'customer.merge',
            entity: 'customer',
            entityId: primaryCustomerId,
            oldValue: {
                duplicateCustomerId,
                duplicateCode: result.archivedDuplicateCode,
            },
            newValue: {
                primaryCode: result.primary.customerCode,
                movedContacts: result.movedContacts,
                movedAttributes: result.movedAttributes,
                transferredUserId: result.transferredUserId,
            },
        });

        return result;
    }

    /** Generates PAT-0001 / GST-0001 / CUS-0001 atomically using a transaction. */
    private async nextCode(type: CustomerType): Promise<string> {
        return this.repo.manager.transaction(async (em: EntityManager) => {
            const prefix = CUSTOMER_TYPE_PREFIX[type];

            const qb = em
                .createQueryBuilder(Customer, 'c')
                .where('c.customerCode LIKE :p', { p: `${prefix}-%` });

            // Include soft-deleted rows so customer codes are never reused
            if (typeof qb.withDeleted === 'function') {
                qb.withDeleted();
            }

            if (!isSqlite()) {
                qb.orderBy('CAST(SUBSTRING(c.customerCode FROM 5) AS INT)', 'DESC')
                    .setLock('pessimistic_write');
                const lastCustomer = await qb.getOne();
                const currentMax = lastCustomer ? parseCustomerSequence(lastCustomer.customerCode) : 0;
                return formatCustomerCode(prefix, currentMax + 1);
            }

            const existing = await qb.select(['c.customerCode']).getMany();
            const currentMax = existing.reduce(
                (max, row) => Math.max(max, parseCustomerSequence(row.customerCode)),
                0,
            );
            return formatCustomerCode(prefix, currentMax + 1);
        });
    }
}
