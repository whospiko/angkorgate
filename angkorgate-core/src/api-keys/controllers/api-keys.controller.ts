import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiKeysService, ResourceSchemaMeta } from '../services/api-keys.service';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { UpdateApiKeyDto } from '../dto/update-api-key.dto';
import {
    ApiKeyCreatedResponseDto,
    ApiKeyResponseDto,
} from '../dto/api-key-response.dto';

@ApiTags('API Keys & Developer Portal')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/api-keys')
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) { }

    @Get('resources')
    @Permissions('apikey:read')
    @ApiOperation({ summary: 'Get catalog of exposed API resources and available schema fields' })
    @ApiResponse({ status: 200, description: 'List of resources and field metadata' })
    getResources(): ResourceSchemaMeta[] {
        return this.apiKeysService.getSchemaResources();
    }

    @Get()
    @Permissions('apikey:read')
    @ApiOperation({ summary: 'List all generated API keys' })
    @ApiResponse({ status: 200, type: [ApiKeyResponseDto] })
    findAll(@CurrentUser('roles') roles: string[], @CurrentUser('id') userId: string) {
        // If user is not full ADMIN, filter by their own userId
        const isFullAdmin = roles && roles.includes('ADMIN');
        return this.apiKeysService.findAll(isFullAdmin ? undefined : userId);
    }

    @Get(':id')
    @Permissions('apikey:read')
    @ApiOperation({ summary: 'Get API key details by ID' })
    @ApiParam({ name: 'id', description: 'API Key UUID' })
    @ApiResponse({ status: 200, type: ApiKeyResponseDto })
    @ApiResponse({ status: 404, description: 'API Key not found' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.apiKeysService.findByIdOrFail(id);
    }

    @Post()
    @Permissions('apikey:write')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Generate a new API key with method and projection policies' })
    @ApiResponse({ status: 201, type: ApiKeyCreatedResponseDto })
    @ApiResponse({ status: 400, description: 'Validation failed' })
    create(
        @Body() dto: CreateApiKeyDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.apiKeysService.create(dto, userId);
    }

    @Patch(':id')
    @Permissions('apikey:write')
    @ApiOperation({ summary: 'Update API key policies (methods, field projections, expiry)' })
    @ApiParam({ name: 'id', description: 'API Key UUID' })
    @ApiResponse({ status: 200, type: ApiKeyResponseDto })
    @ApiResponse({ status: 404, description: 'API Key not found' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateApiKeyDto,
    ) {
        return this.apiKeysService.update(id, dto);
    }

    @Post(':id/revoke')
    @Permissions('apikey:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Revoke an API key immediately' })
    @ApiParam({ name: 'id', description: 'API Key UUID' })
    @ApiResponse({ status: 200, type: ApiKeyResponseDto })
    revoke(@Param('id', ParseUUIDPipe) id: string) {
        return this.apiKeysService.revoke(id);
    }

    @Delete(':id')
    @Permissions('apikey:delete')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an API key permanently' })
    @ApiParam({ name: 'id', description: 'API Key UUID' })
    @ApiResponse({ status: 204, description: 'API Key deleted' })
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.apiKeysService.remove(id);
    }
}
