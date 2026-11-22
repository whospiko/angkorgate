import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from '../services/audit.service';
import { PaginatedAuditLogsDto, AuditLogResponseDto } from '../dto/audit-log-response.dto';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';

@ApiTags('Audit')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
    constructor(private readonly audit: AuditService) { }

    @Get()
    @Permissions('audit:read')
    @ApiOperation({ summary: 'Query audit logs with optional filtering and pagination' })
    @ApiQuery({ name: 'actorId', required: false, description: 'Filter by actor UUID' })
    @ApiQuery({ name: 'entity', required: false, description: 'Filter by entity name' })
    @ApiQuery({ name: 'entityId', required: false, description: 'Filter by entity UUID' })
    @ApiQuery({ name: 'action', required: false, description: 'Filter by action code' })
    @ApiQuery({ name: 'from', required: false, description: 'Filter from timestamp ISO' })
    @ApiQuery({ name: 'to', required: false, description: 'Filter to timestamp ISO' })
    @ApiQuery({ name: 'page', required: false, example: '1', description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, example: '20', description: 'Page limit' })
    @ApiResponse({ status: 200, description: 'Paginated audit logs', type: PaginatedAuditLogsDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks audit:read permission)' })
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
    @ApiOperation({ summary: 'Get all audit logs associated with a specific entity' })
    @ApiParam({ name: 'entity', description: 'Entity name (e.g. user, customer)' })
    @ApiParam({ name: 'entityId', description: 'Entity UUID' })
    @ApiResponse({ status: 200, description: 'List of audit logs for the entity', type: [AuditLogResponseDto] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks audit:read permission)' })
    byEntity(
        @Param('entity') entity: string,
        @Param('entityId', ParseUUIDPipe) entityId: string,
    ): Promise<AuditLogResponseDto[]> {
        return this.audit.findByEntity(entity, entityId);
    }

    @Get('actions')
    @Permissions('audit:read')
    @ApiOperation({ summary: 'List all distinct recorded audit action types' })
    @ApiResponse({ status: 200, description: 'List of action types', type: [String] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    actions(): Promise<string[]> {
        return this.audit.getDistinctActions();
    }

    @Get(':id')
    @Permissions('audit:read')
    @ApiOperation({ summary: 'Get details of a single audit log entry by UUID' })
    @ApiParam({ name: 'id', description: 'Audit log UUID' })
    @ApiResponse({ status: 200, description: 'Audit log entry', type: AuditLogResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Audit log not found' })
    findById(@Param('id', ParseUUIDPipe) id: string): Promise<AuditLogResponseDto> {
        return this.audit.findById(id);
    }
}
