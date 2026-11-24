import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditLogResponseDto, PaginatedAuditLogsDto } from '../dto/audit-log-response.dto';
import { normalizePagination } from '../../common/utils/pagination.util';

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
    private static readonly pendingWrites = new Set<Promise<unknown>>();

    constructor(
        @InjectRepository(AuditLog)
        private readonly logRepo: Repository<AuditLog>,
    ) { }

    /**
     * Flush all pending in-flight audit writes.
     */
    static async flush(): Promise<void> {
        if (AuditService.pendingWrites.size > 0) {
            await Promise.allSettled(Array.from(AuditService.pendingWrites));
        }
    }

    async flush(): Promise<void> {
        return AuditService.flush();
    }

    /**
     * Write an audit row. Fire-and-forget — never blocks business logic.
     * Errors are logged but never thrown — auditing must not break the app.
     */
    async log(event: AuditEvent): Promise<void> {
        const writePromise = (async () => {
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
            } catch (err: any) {
                // 1. If invalid input syntax for type uuid (e.g. non-UUID entityId like 'default'),
                // retry with entityId: null and preserve raw identifier in newValue
                if (err?.code === '22P02' && event.entityId) {
                    try {
                        const fallbackNewValue = {
                            ...(event.newValue || {}),
                            _entityIdentifier: event.entityId,
                        };
                        await this.logRepo.save(
                            this.logRepo.create({
                                actorId: event.actorId ?? null,
                                action: event.action,
                                entity: event.entity,
                                entityId: null,
                                oldValue: event.oldValue ?? null,
                                newValue: fallbackNewValue,
                                ipAddress: event.ipAddress ?? null,
                            }),
                        );
                        return;
                    } catch {
                        // ignore secondary error
                    }
                }

                // 2. If actorId violates foreign key constraint (e.g. user deleted or truncated),
                // fall back to saving without actorId to preserve audit record.
                if (err?.code === '23503' && event.actorId) {
                    try {
                        await this.logRepo.save(
                            this.logRepo.create({
                                actorId: null,
                                action: event.action,
                                entity: event.entity,
                                entityId: event.entityId ?? null,
                                oldValue: event.oldValue ?? null,
                                newValue: event.newValue ?? null,
                                ipAddress: event.ipAddress ?? null,
                            }),
                        );
                        return;
                    } catch {
                        // ignore secondary error
                    }
                }
                // Never propagate — audit failures must not break business flows
                this.logger.error(
                    `Failed to write audit log: ${event.action} on ${event.entity}`,
                    err instanceof Error ? err.stack : String(err),
                );
            }
        })();

        AuditService.pendingWrites.add(writePromise);
        void writePromise.finally(() => AuditService.pendingWrites.delete(writePromise));

        if (process.env.NODE_ENV === 'test') {
            await writePromise;
        }
    }

    /** Convenience alias with clearer intent in business code. */
    async record(event: AuditEvent): Promise<void> {
        return this.log(event);
    }

    /** Audit log query and retrieval API */
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
        const { page, limit, skip } = normalizePagination(params.page, params.limit);

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
            skip,
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

    async getDistinctActions(): Promise<string[]> {
        const rows = await this.logRepo
            .createQueryBuilder('a')
            .select('DISTINCT a.action', 'action')
            .orderBy('action', 'ASC')
            .getRawMany<{ action: string }>();
        return rows.map((r) => r.action);
    }

    async findById(id: string): Promise<AuditLogResponseDto> {
        const log = await this.logRepo.findOne({ where: { id } });
        if (!log) throw new NotFoundException(`Audit log ${id} not found`);
        return AuditLogResponseDto.fromEntity(log);
    }
}