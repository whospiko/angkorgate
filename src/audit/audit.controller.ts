import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { PaginatedAuditLogsDto, AuditLogResponseDto } from './dto/audit-log-response.dto';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Permissions } from '../rbac/decorators/permissions.decorator';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
    constructor(private readonly audit: AuditService) { }

    @Get()
    @Permissions('audit:read')
    query(
        @Query('actorId') actorId?: string,
        @Query('entity') entity?: string,
        @Query('entityId') entityId?: string,
        @Query('action') action?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ): Promise<PaginatedAuditLogsDto> {
        return this.audit.query({
            actorId,
            entity,
            entityId,
            action,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Get('entity/:entity/:entityId')
    @Permissions('audit:read')
    byEntity(
        @Param('entity') entity: string,
        @Param('entityId', ParseUUIDPipe) entityId: string,
    ): Promise<AuditLogResponseDto[]> {
        return this.audit.findByEntity(entity, entityId);
    }
}