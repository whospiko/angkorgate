import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AttributeSchemasService } from '../services/attribute-schemas.service';
import { UpsertAttributeSchemaDto } from '../dto/upsert-attribute-schema.dto';
import type { AttributeTargetType } from '../entities/attribute-schema.entity';

@ApiTags('Customers')
@ApiBearerAuth('bearerAuth')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
@Controller('attribute-schemas')
export class AttributeSchemasController {
    constructor(private readonly schemas: AttributeSchemasService) { }

    @Get()
    @Permissions('customer:read')
    @ApiOperation({ summary: 'List registered attribute schemas' })
    @ApiQuery({ name: 'targetType', required: false, enum: ['CUSTOMER', 'EMPLOYEE_POSITION'] })
    @ApiQuery({ name: 'domain', required: false })
    list(
        @Query('targetType') targetType?: AttributeTargetType,
        @Query('domain') domain?: string,
    ) {
        return this.schemas.list(targetType, domain);
    }

    @Post()
    @Permissions('customer:write')
    @ApiOperation({ summary: 'Create or update an attribute schema rule' })
    upsert(
        @Body() dto: UpsertAttributeSchemaDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.schemas.upsert(dto, actorId);
    }

    @Post('seed')
    @Permissions('customer:write')
    @ApiOperation({ summary: 'Seed default attribute schemas for CRM & HR domains' })
    seed(@CurrentUser('id') actorId: string) {
        return this.schemas.seedDefaults(actorId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('customer:write')
    @ApiOperation({ summary: 'Delete an attribute schema rule' })
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.schemas.remove(id, actorId);
    }
}
