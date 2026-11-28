import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/services/audit.service';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { CreateWebhookEndpointDto, UpdateWebhookEndpointDto } from './dto/webhooks.dto';

@Injectable()
export class WebhooksService {
    constructor(
        @InjectRepository(WebhookEndpoint)
        private readonly endpointRepo: Repository<WebhookEndpoint>,
        @InjectRepository(WebhookDelivery)
        private readonly deliveryRepo: Repository<WebhookDelivery>,
        private readonly audit: AuditService,
    ) {}

    signPayload(secret: string, body: string): string {
        return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
    }

    async listEndpoints(): Promise<WebhookEndpoint[]> {
        return this.endpointRepo.find({ order: { createdAt: 'DESC' } });
    }

    async createEndpoint(
        dto: CreateWebhookEndpointDto,
        actorId?: string,
    ): Promise<WebhookEndpoint> {
        const secret = dto.secret?.trim() || `whsec_${randomBytes(24).toString('hex')}`;
        const saved = await this.endpointRepo.save(
            this.endpointRepo.create({
                name: dto.name.trim(),
                url: dto.url.trim(),
                secret,
                events: dto.events,
                isActive: dto.isActive ?? true,
            }),
        );

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'webhook.endpoint.create',
            entity: 'webhook_endpoint',
            entityId: saved.id,
            newValue: { name: saved.name, url: saved.url, events: saved.events },
        });

        return saved;
    }

    async updateEndpoint(
        id: string,
        dto: UpdateWebhookEndpointDto,
        actorId?: string,
    ): Promise<WebhookEndpoint> {
        const endpoint = await this.endpointRepo.findOne({ where: { id } });
        if (!endpoint) throw new NotFoundException(`Webhook endpoint ${id} not found`);

        if (dto.name !== undefined) endpoint.name = dto.name.trim();
        if (dto.url !== undefined) endpoint.url = dto.url.trim();
        if (dto.events !== undefined) endpoint.events = dto.events;
        if (dto.isActive !== undefined) endpoint.isActive = dto.isActive;

        const saved = await this.endpointRepo.save(endpoint);
        void this.audit.log({
            actorId: actorId ?? null,
            action: 'webhook.endpoint.update',
            entity: 'webhook_endpoint',
            entityId: saved.id,
            newValue: { name: saved.name, url: saved.url, events: saved.events, isActive: saved.isActive },
        });
        return saved;
    }

    async deleteEndpoint(id: string, actorId?: string): Promise<void> {
        const endpoint = await this.endpointRepo.findOne({ where: { id } });
        if (!endpoint) throw new NotFoundException(`Webhook endpoint ${id} not found`);
        await this.endpointRepo.delete(id);
        void this.audit.log({
            actorId: actorId ?? null,
            action: 'webhook.endpoint.delete',
            entity: 'webhook_endpoint',
            entityId: id,
        });
    }

    async listDeliveries(endpointId: string, limit = 30): Promise<WebhookDelivery[]> {
        return this.deliveryRepo.find({
            where: { endpointId },
            order: { createdAt: 'DESC' },
            take: Math.min(Math.max(limit, 1), 100),
        });
    }

    async emitEvent(event: string, data: Record<string, unknown>): Promise<WebhookDelivery[]> {
        const endpoints = await this.endpointRepo.find({ where: { isActive: true } });
        const matched = endpoints.filter(
            (ep) => Array.isArray(ep.events) && ep.events.includes(event),
        );
        if (matched.length === 0) return [];

        const deliveries: WebhookDelivery[] = [];
        for (const ep of matched) {
            const payload = {
                event,
                timestamp: new Date().toISOString(),
                data,
            };
            const signature = this.signPayload(ep.secret, JSON.stringify(payload));
            const delivery = await this.deliveryRepo.save(
                this.deliveryRepo.create({
                    endpointId: ep.id,
                    event,
                    payload,
                    signature,
                    status: 'PENDING',
                    attempts: 0,
                }),
            );
            deliveries.push(await this.dispatchDelivery(delivery, ep));
        }

        return deliveries;
    }

    async testEndpoint(id: string): Promise<WebhookDelivery> {
        const ep = await this.endpointRepo.findOne({ where: { id } });
        if (!ep) throw new NotFoundException(`Webhook endpoint ${id} not found`);

        const payload = {
            event: 'webhook.test',
            timestamp: new Date().toISOString(),
            data: { message: 'AngkorGate webhook connectivity test' },
        };
        const signature = this.signPayload(ep.secret, JSON.stringify(payload));
        const delivery = await this.deliveryRepo.save(
            this.deliveryRepo.create({
                endpointId: ep.id,
                event: 'webhook.test',
                payload,
                signature,
                status: 'PENDING',
                attempts: 0,
            }),
        );
        return this.dispatchDelivery(delivery, ep);
    }

    async retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
        const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
        if (!delivery) throw new NotFoundException(`Webhook delivery ${deliveryId} not found`);
        const ep = await this.endpointRepo.findOne({ where: { id: delivery.endpointId } });
        if (!ep) throw new NotFoundException(`Webhook endpoint ${delivery.endpointId} not found`);
        return this.dispatchDelivery(delivery, ep);
    }

    private async dispatchDelivery(
        delivery: WebhookDelivery,
        endpoint: WebhookEndpoint,
    ): Promise<WebhookDelivery> {
        delivery.attempts += 1;
        const body = JSON.stringify(delivery.payload);
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(endpoint.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AngkorGate-Event': delivery.event,
                    'X-AngkorGate-Delivery': delivery.id,
                    'X-AngkorGate-Signature': delivery.signature,
                },
                body,
                signal: controller.signal,
            });
            clearTimeout(timer);

            const text = await res.text().catch(() => '');
            delivery.statusCode = res.status;
            delivery.responseBody = text.slice(0, 500);
            delivery.status = res.ok ? 'DELIVERED' : 'FAILED';
            delivery.deliveredAt = res.ok ? new Date() : null;
        } catch (err) {
            delivery.status = 'FAILED';
            delivery.statusCode = null;
            delivery.responseBody = err instanceof Error ? err.message : 'Network error';
        }

        return this.deliveryRepo.save(delivery);
    }
}
