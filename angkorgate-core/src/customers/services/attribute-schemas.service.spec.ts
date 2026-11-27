import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AttributeSchemasService } from './attribute-schemas.service';
import { AttributeSchema } from '../entities/attribute-schema.entity';
import { AuditService } from '../../audit/services/audit.service';
import { createMockRepository } from '../../../test/mocks/repository.mock';

describe('AttributeSchemasService', () => {
    let service: AttributeSchemasService;
    let repo: ReturnType<typeof createMockRepository>;
    let audit: { log: jest.Mock };

    beforeEach(async () => {
        repo = createMockRepository<AttributeSchema>();
        audit = { log: jest.fn().mockResolvedValue(undefined) };

        const module = await Test.createTestingModule({
            providers: [
                AttributeSchemasService,
                { provide: getRepositoryToken(AttributeSchema), useValue: repo },
                { provide: AuditService, useValue: audit },
            ],
        }).compile();

        service = module.get(AttributeSchemasService);
    });

    it('validates matching schema types and rejects mismatches', async () => {
        repo.findOne.mockResolvedValue({
            id: 's1',
            targetType: 'CUSTOMER',
            domain: 'CUSTOMER',
            key: 'loyalty_points',
            valueType: 'number',
        } as never);

        await expect(
            service.validateValue('CUSTOMER', 'CUSTOMER', 'loyalty_points', 250),
        ).resolves.toBeUndefined();

        await expect(
            service.validateValue('CUSTOMER', 'CUSTOMER', 'loyalty_points', 'not-a-number'),
        ).rejects.toThrow(BadRequestException);
    });

    it('allows unregistered custom keys without blocking', async () => {
        repo.findOne.mockResolvedValue(null);
        await expect(
            service.validateValue('CUSTOMER', 'PATIENT', 'custom_note', 'anything'),
        ).resolves.toBeUndefined();
    });

    it('seeds default customer and employee position schemas idempotently', async () => {
        repo.findOne.mockResolvedValue(null);
        repo.create.mockImplementation((d) => d);
        repo.save.mockImplementation(async (d) => d);

        const res = await service.seedDefaults('admin1');
        expect(res.created).toBeGreaterThan(10);
    });
});
