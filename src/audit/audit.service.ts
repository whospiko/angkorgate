import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import {
    AuditLogResponseDto,
    PaginatedAuditLogsDto,
} from './dto/audit-log-response.dto';

export interface AuditEvent {
    actorId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    ipAddress?: string | null;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(AuditLog)
        private readonly logRepo: Repository<AuditLog>,
    ) { }

    /**
     * Write an audit row. Fire-and-forget — never blocks business logic.
     * Errors are logged but never thrown — auditing must not break the app.
     */
    async log(event: AuditEvent): Promise<void> {
        try {
            await this.logRepo.save(
                this.logRepo.create({
                    actorId: event.actorId ?? null,
                    action: event.action,
                    entity: event.entity,
                    entityId: event.entityId ?? null,
                    oldValue: event.oldValue ?? null,
                    newValue: event.newValue ?? null,
                    ipAddress: event.ipAddress ?? null,
                }),
            );
        } catch (err) {
            // Never propagate — audit failures must not break business flows
            this.logger.error(
                `Failed to write audit log: ${event.action} on ${event.entity}`,
                err instanceof Error ? err.stack : String(err),
            );
        }
    }

    /** Convenience alias with clearer intent in business code. */
    async record(event: AuditEvent): Promise<void> {
        return this.log(event);
    }

    // ══════════════════════════════════════════════════════════════════
    //  READ API (admin-only via controller)
    // ══════════════════════════════════════════════════════════════════

    async query(params: {
        actorId?: string;
        entity?: string;
        entityId?: string;
        action?: string;
        from?: Date;
        to?: Date;
        page?: number;
        limit?: number;
    }): Promise<PaginatedAuditLogsDto> {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(100, Math.max(1, params.limit ?? 20));

        const where: FindOptionsWhere<AuditLog> = {};
        if (params.actorId) where.actorId = params.actorId;
        if (params.entity) where.entity = params.entity;
        if (params.entityId) where.entityId = params.entityId;
        if (params.action) where.action = params.action;
        if (params.from && params.to) where.createdAt = Between(params.from, params.to);
        else if (params.from) {
            where.createdAt = Between(params.from, new Date());
        }

        const [rows, total] = await this.logRepo.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            data: rows.map(AuditLogResponseDto.fromEntity),
            total,
            page,
            limit,
        };
    }

    async findByEntity(
        entity: string,
        entityId: string,
    ): Promise<AuditLogResponseDto[]> {
        const rows = await this.logRepo.find({
            where: { entity, entityId },
            order: { createdAt: 'DESC' },
        });
        return rows.map(AuditLogResponseDto.fromEntity);
    }
}