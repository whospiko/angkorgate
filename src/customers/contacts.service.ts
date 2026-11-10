import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerContact } from './entities/customer-contact.entity';
import { ContactAttribute } from './entities/contact-attribute.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { CustomersService } from './customers.service';

@Injectable()
export class ContactsService {
    constructor(
        @InjectRepository(CustomerContact)
        private readonly repo: Repository<CustomerContact>,
        @InjectRepository(ContactAttribute)
        private readonly attrRepo: Repository<ContactAttribute>,
        private readonly customers: CustomersService,
    ) { }

    async add(
        customerId: string,
        dto: CreateContactDto,
    ): Promise<CustomerContact> {
        const customer = await this.customers.findByIdOrFail(customerId);

        // Business rule: minors must have at least one contact.
        // Enforced at the service layer (this is where domain rules live, not in DB).

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

        return this.repo.save(
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
    }

    async list(customerId: string): Promise<CustomerContact[]> {
        await this.customers.findByIdOrFail(customerId);
        return this.repo.find({
            where: { customerId },
            order: { isPrimary: 'DESC', createdAt: 'ASC' },
        });
    }

    async update(
        contactId: string,
        dto: Partial<CreateContactDto>,
    ): Promise<CustomerContact> {
        const c = await this.repo.findOne({ where: { id: contactId } });
        if (!c) throw new NotFoundException(`Contact ${contactId} not found`);

        if (dto.isPrimary === true && !c.isPrimary) {
            await this.repo.update(
                { customerId: c.customerId, isPrimary: true },
                { isPrimary: false },
            );
        }

        Object.assign(c, dto);
        return this.repo.save(c);
    }

    async remove(contactId: string): Promise<void> {
        const c = await this.repo.findOne({ where: { id: contactId } });
        if (!c) throw new NotFoundException(`Contact ${contactId} not found`);

        // Rule: a customer must keep at least one contact (clinic-specific; can be relaxed)
        // Comment this out for hotel/POS if not needed.
        const count = await this.repo.count({ where: { customerId: c.customerId } });
        if (count <= 1) {
            throw new BadRequestException(
                'Cannot remove the last contact for a customer',
            );
        }

        await this.repo.delete(contactId);
    }

    async setAttribute(
        contactId: string,
        key: string,
        value: unknown,
    ): Promise<ContactAttribute> {
        const exists = await this.repo.findOne({ where: { id: contactId } });
        if (!exists) throw new NotFoundException(`Contact ${contactId} not found`);

        let attr = await this.attrRepo.findOne({ where: { contactId, key } });
        if (attr) attr.value = value;
        else attr = this.attrRepo.create({ contactId, key, value });
        return this.attrRepo.save(attr);
    }

    async getAttributes(contactId: string): Promise<Record<string, unknown>> {
        const attrs = await this.attrRepo.find({ where: { contactId } });
        const out: Record<string, unknown> = {};
        for (const a of attrs) out[a.key] = a.value;
        return out;
    }
}