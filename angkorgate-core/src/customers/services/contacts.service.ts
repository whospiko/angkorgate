import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerContact } from '../entities/customer-contact.entity';
import { ContactAttribute } from '../entities/contact-attribute.entity';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { CustomersService } from './customers.service';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class ContactsService {
    constructor(
        @InjectRepository(CustomerContact)
        private readonly repo: Repository<CustomerContact>,
        @InjectRepository(ContactAttribute)
        private readonly attrRepo: Repository<ContactAttribute>,
        private readonly customers: CustomersService,
        private readonly audit: AuditService,
    ) { }

    async add(
        customerId: string,
        dto: CreateContactDto,
        actorId?: string,
    ): Promise<CustomerContact> {
        const customer = await this.customers.findByIdOrFail(customerId);

        if (dto.phone) {
            const dup = await this.repo.findOne({
                where: { customerId, phone: dto.phone },
            });
            if (dup) {
                throw new ConflictException(
                    `Contact with phone ${dto.phone} already exists for this customer`,
                );
            }
        }

        // If this is the first contact OR isPrimary requested, demote others
        const count = await this.repo.count({ where: { customerId } });
        const isPrimary = dto.isPrimary ?? count === 0;

        if (isPrimary && count > 0) {
            await this.repo.update({ customerId, isPrimary: true }, { isPrimary: false });
        }

        const saved = await this.repo.save(
            this.repo.create({
                customerId: customer.id,
                fullName: dto.fullName,
                relationship: dto.relationship ?? null,
                phone: dto.phone ?? null,
                email: dto.email ?? null,
                address: dto.address ?? null,
                isPrimary,
            }),
        );

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'customer.contact.add',
            entity: 'customer_contact',
            entityId: saved.id,
            newValue: {
                customerId,
                fullName: saved.fullName,
                relationship: saved.relationship,
                isPrimary: saved.isPrimary,
            },
        });

        return saved;
    }

    async list(customerId: string): Promise<CustomerContact[]> {
        await this.customers.findByIdOrFail(customerId);
        return this.repo.find({
            where: { customerId },
            order: { isPrimary: 'DESC', createdAt: 'ASC' },
        });
    }

    async findById(customerId: string, contactId: string): Promise<CustomerContact> {
        await this.customers.findByIdOrFail(customerId);
        const c = await this.repo.findOne({ where: { id: contactId, customerId } });
        if (!c) throw new NotFoundException(`Contact ${contactId} not found`);
        return c;
    }

    async update(
        customerId: string,
        contactId: string,
        dto: UpdateContactDto,
        actorId?: string,
    ): Promise<CustomerContact> {
        const c = await this.findById(customerId, contactId);

        if (dto.phone && dto.phone !== c.phone) {
            const dup = await this.repo.findOne({
                where: { customerId, phone: dto.phone },
            });
            if (dup && dup.id !== contactId) {
                throw new ConflictException(
                    `Contact with phone ${dto.phone} already exists for this customer`,
                );
            }
        }

        if (dto.isPrimary === true && !c.isPrimary) {
            await this.repo.update(
                { customerId, isPrimary: true },
                { isPrimary: false },
            );
        }

        const oldValue = {
            fullName: c.fullName,
            relationship: c.relationship,
            phone: c.phone,
            isPrimary: c.isPrimary,
        };
        Object.assign(c, dto);
        const saved = await this.repo.save(c);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'customer.contact.update',
            entity: 'customer_contact',
            entityId: contactId,
            oldValue,
            newValue: dto as Record<string, unknown>,
        });

        return saved;
    }

    async remove(
        customerId: string,
        contactId: string,
        actorId?: string,
    ): Promise<void> {
        const customer = await this.customers.findByIdOrFail(customerId);
        const c = await this.repo.findOne({ where: { id: contactId, customerId } });
        if (!c) throw new NotFoundException(`Contact ${contactId} not found`);

        // Business rule: minors must retain at least one guardian/contact
        if (customer.isMinor) {
            const count = await this.repo.count({ where: { customerId } });
            if (count <= 1) {
                throw new BadRequestException(
                    'Cannot remove the last guardian contact for a minor customer',
                );
            }
        }

        await this.repo.delete({ id: contactId, customerId });

        // If the primary contact was removed, promote the oldest remaining contact
        if (c.isPrimary) {
            const nextPrimary = await this.repo.findOne({
                where: { customerId },
                order: { createdAt: 'ASC' },
            });
            if (nextPrimary) {
                await this.repo.update(nextPrimary.id, { isPrimary: true });
            }
        }

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'customer.contact.remove',
            entity: 'customer_contact',
            entityId: contactId,
            oldValue: { customerId, fullName: c.fullName },
        });
    }

    async setAttribute(
        customerId: string,
        contactId: string,
        key: string,
        value: unknown,
        actorId?: string,
    ): Promise<ContactAttribute> {
        await this.findById(customerId, contactId);

        let attr = await this.attrRepo.findOne({ where: { contactId, key } });
        const oldValue = attr ? attr.value : undefined;
        if (attr) attr.value = value;
        else attr = this.attrRepo.create({ contactId, key, value });
        const saved = await this.attrRepo.save(attr);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'customer.contact.attribute.set',
            entity: 'customer_contact',
            entityId: contactId,
            oldValue: oldValue !== undefined ? { [key]: oldValue } : undefined,
            newValue: { [key]: value },
        });

        return saved;
    }

    async getAttributes(
        customerId: string,
        contactId: string,
    ): Promise<Record<string, unknown>> {
        await this.findById(customerId, contactId);
        const attrs = await this.attrRepo.find({ where: { contactId } });
        const out: Record<string, unknown> = {};
        for (const a of attrs) out[a.key] = a.value;
        return out;
    }

    async deleteAttribute(
        customerId: string,
        contactId: string,
        key: string,
        actorId?: string,
    ): Promise<void> {
        await this.findById(customerId, contactId);
        const result = await this.attrRepo.delete({ contactId, key });
        if (result.affected && result.affected > 0) {
            void this.audit.log({
                actorId: actorId ?? null,
                action: 'customer.contact.attribute.delete',
                entity: 'customer_contact',
                entityId: contactId,
                oldValue: { key },
            });
        }
    }
}
