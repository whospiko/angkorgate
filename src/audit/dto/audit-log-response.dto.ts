import { AuditLog } from '../entities/audit-log.entity';

export class AuditLogResponseDto {
    id: string;
    actorId: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    oldValue: Record<string, unknown> | null;
    newValue: Record<string, unknown> | null;
    ipAddress: string | null;
    createdAt: Date;

    static fromEntity(log: AuditLog): AuditLogResponseDto {
        const dto = new AuditLogResponseDto();
        dto.id = log.id;
        dto.actorId = log.actorId;
        dto.action = log.action;
        dto.entity = log.entity;
        dto.entityId = log.entityId;
        dto.oldValue = log.oldValue;
        dto.newValue = log.newValue;
        dto.ipAddress = log.ipAddress;
        dto.createdAt = log.createdAt;
        return dto;
    }
}

export class PaginatedAuditLogsDto {
    data: AuditLogResponseDto[];
    total: number;
    page: number;
    limit: number;
}