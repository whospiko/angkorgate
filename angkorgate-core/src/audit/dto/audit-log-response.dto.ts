import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditLog } from '../entities/audit-log.entity';

export class AuditLogResponseDto {
    @ApiProperty({ description: 'Audit log UUID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    id: string;

    @ApiPropertyOptional({ description: 'UUID of user or actor performing the action', example: '123e4567-e89b-12d3-a456-426614174000', nullable: true })
    actorId: string | null;

    @ApiProperty({ description: 'Action performed', example: 'user.create' })
    action: string;

    @ApiProperty({ description: 'Entity affected by the action', example: 'user' })
    entity: string;

    @ApiPropertyOptional({ description: 'UUID of affected entity', example: '123e4567-e89b-12d3-a456-426614174000', nullable: true })
    entityId: string | null;

    @ApiPropertyOptional({ description: 'Previous state before change', nullable: true })
    oldValue: Record<string, unknown> | null;

    @ApiPropertyOptional({ description: 'New state after change', nullable: true })
    newValue: Record<string, unknown> | null;

    @ApiPropertyOptional({ description: 'Client IP address where request originated', example: '127.0.0.1', nullable: true })
    ipAddress: string | null;

    @ApiProperty({ description: 'Timestamp when audit log was recorded', example: '2026-11-21T10:00:00.000Z' })
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
    @ApiProperty({ description: 'Array of audit log records', type: [AuditLogResponseDto] })
    data: AuditLogResponseDto[];

    @ApiProperty({ description: 'Total number of matching audit logs', example: 100 })
    total: number;

    @ApiProperty({ description: 'Current page number', example: 1 })
    page: number;

    @ApiProperty({ description: 'Page limit size', example: 20 })
    limit: number;
}
