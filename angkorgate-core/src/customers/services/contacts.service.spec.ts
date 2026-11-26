import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CustomerContact } from '../entities/customer-contact.entity';
import { ContactAttribute } from '../entities/contact-attribute.entity';
import { CustomersService } from './customers.service';
import { AuditService } from '../../audit/services/audit.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('ContactsService', () => {
    let service: ContactsService;
    let repo: ReturnType<typeof createMockRepository>;
    let attrRepo: ReturnType<typeof createMockRepository>;
    let customers: { findByIdOrFail: jest.Mock };
    let audit: { log: jest.Mock };

    beforeEach(async () => {
        repo = createMockRepository<CustomerContact>();
        attrRepo = createMockRepository<ContactAttribute>();
        customers = {
            findByIdOrFail: jest.fn().mockResolvedValue({ id: 'c1', isMinor: false }),
        };
        audit = { log: jest.fn().mockResolvedValue(undefined) };

        const module = await Test.createTestingModule({
            providers: [
                ContactsService,
                { provide: getRepositoryToken(CustomerContact), useValue: repo },
                { provide: getRepositoryToken(ContactAttribute), useValue: attrRepo },
                { provide: CustomersService, useValue: customers },
                { provide: AuditService, useValue: audit },
            ],
        }).compile();

        service = module.get(ContactsService);
    });

    it('rejects duplicate phone for same customer', async () => {
        repo.findOne.mockResolvedValue({ id: 'existing' } as never);

        await expect(
            service.add('c1', { fullName: 'Jane', phone: '+85512345678' }),
        ).rejects.toThrow(ConflictException);
    });

    it('enforces parent customerId ownership when updating a contact', async () => {
        repo.findOne.mockResolvedValue(null);

        await expect(
            service.update('c1', 'contact-from-c2', { fullName: 'Hack' }),
        ).rejects.toThrow(NotFoundException);
        expect(repo.findOne).toHaveBeenCalledWith({
            where: { id: 'contact-from-c2', customerId: 'c1' },
        });
    });

    it('blocks removing last contact for a minor customer', async () => {
        customers.findByIdOrFail.mockResolvedValue({ id: 'c1', isMinor: true });
        repo.findOne.mockResolvedValue({ id: 'ct1', customerId: 'c1', isPrimary: true } as never);
        repo.count.mockResolvedValue(1);

        await expect(service.remove('c1', 'ct1')).rejects.toThrow(BadRequestException);
    });

    it('allows removing last contact for an adult customer', async () => {
        customers.findByIdOrFail.mockResolvedValue({ id: 'c1', isMinor: false });
        repo.findOne
            .mockResolvedValueOnce({ id: 'ct1', customerId: 'c1', fullName: 'Ref', isPrimary: true } as never)
            .mockResolvedValueOnce(null);
        repo.delete.mockResolvedValue({ affected: 1 } as never);

        await service.remove('c1', 'ct1', 'admin1');
        expect(repo.delete).toHaveBeenCalledWith({ id: 'ct1', customerId: 'c1' });
    });

    it('enforces parent customerId ownership on contact attributes', async () => {
        repo.findOne.mockResolvedValue(null);

        await expect(
            service.setAttribute('c1', 'other-contact', 'can_pickup_minor', true),
        ).rejects.toThrow(NotFoundException);
    });
});
