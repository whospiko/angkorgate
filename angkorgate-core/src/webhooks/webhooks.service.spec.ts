import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHmac } from 'node:crypto';
import { AuditService } from '../audit/services/audit.service';
import { createMockRepository } from '../../test/mocks/repository.mock';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
    let service: WebhooksService;
    let endpointRepo: ReturnType<typeof createMockRepository>;
    let deliveryRepo: ReturnType<typeof createMockRepository>;

    beforeEach(async () => {
        endpointRepo = createMockRepository<WebhookEndpoint>();
        deliveryRepo = createMockRepository<WebhookDelivery>();

        const module = await Test.createTestingModule({
            providers: [
                WebhooksService,
                { provide: getRepositoryToken(WebhookEndpoint), useValue: endpointRepo },
                { provide: getRepositoryToken(WebhookDelivery), useValue: deliveryRepo },
                { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
            ],
        }).compile();

        service = module.get(WebhooksService);
    });

    it('signs payloads with sha256 HMAC', () => {
        const body = JSON.stringify({ event: 'customer.created' });
        const expected = `sha256=${createHmac('sha256', 'whsec_test').update(body).digest('hex')}`;
        expect(service.signPayload('whsec_test', body)).toBe(expected);
    });

    it('creates outbox delivery rows only for subscribed active endpoints', async () => {
        endpointRepo.find.mockResolvedValue([
            {
                id: 'ep1',
                url: 'http://127.0.0.1:9/hook',
                secret: 'sec1',
                events: ['customer.created'],
                isActive: true,
            },
            {
                id: 'ep2',
                url: 'http://127.0.0.1:9/other',
                secret: 'sec2',
                events: ['leave.approved'],
                isActive: true,
            },
        ] as never);
        deliveryRepo.create.mockImplementation((d) => d);
        deliveryRepo.save.mockImplementation(async (d) => ({ id: 'del1', ...d }));

        const deliveries = await service.emitEvent('customer.created', { customerCode: 'PAT-0001' });
        expect(deliveries).toHaveLength(1);
        expect(deliveries[0].endpointId).toBe('ep1');
        expect(deliveries[0].signature).toMatch(/^sha256=[0-9a-f]{64}$/);
    });
});
