import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { OauthProvidersService } from '../services/oauth-providers.service';
import { CreateProviderDto } from '../dto/create-provider.dto';
import { UpdateProviderDto } from '../dto/update-provider.dto';

@ApiTags('OAuth Providers - Admin')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/oauth/providers')
export class OauthAdminController {
    constructor(private readonly providers: OauthProvidersService) { }

    @Get()
    @Permissions('oauth:read')
    @ApiOperation({ summary: 'List all configured OAuth providers' })
    @ApiResponse({ status: 200, description: 'List of all OAuth providers' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    list() {
        return this.providers.list();
    }

    @Get(':code')
    @Permissions('oauth:read')
    @ApiOperation({ summary: 'Get details of a single OAuth identity provider' })
    @ApiParam({ name: 'code', description: 'Provider code (e.g. google, apple)' })
    @ApiResponse({ status: 200, description: 'OAuth provider details' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Provider not found' })
    findOne(@Param('code') code: string) {
        return this.providers.findByCodeOrFail(code);
    }

    @Post()
    @Permissions('oauth:write')
    @ApiOperation({ summary: 'Register a new OAuth identity provider' })
    @ApiResponse({ status: 201, description: 'Provider registered successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    create(@Body() dto: CreateProviderDto) {
        return this.providers.create(dto);
    }

    @Patch(':code')
    @Permissions('oauth:write')
    @ApiOperation({ summary: 'Update an existing OAuth provider configuration' })
    @ApiParam({ name: 'code', description: 'Provider code (e.g. google, apple)' })
    @ApiResponse({ status: 200, description: 'Provider updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Provider not found' })
    update(@Param('code') code: string, @Body() dto: UpdateProviderDto) {
        return this.providers.update(code, dto);
    }

    @Patch(':code/toggle')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('oauth:write')
    @ApiOperation({ summary: 'Toggle an OAuth provider active state' })
    @ApiParam({ name: 'code', description: 'Provider code (e.g. google, apple)' })
    @ApiResponse({ status: 204, description: 'Provider active state toggled' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Provider not found' })
    async toggle(@Param('code') code: string) {
        await this.providers.toggleActive(code);
    }

    @Delete(':code')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('oauth:write')
    @ApiOperation({ summary: 'Remove an OAuth provider configuration' })
    @ApiParam({ name: 'code', description: 'Provider code (e.g. google, apple)' })
    @ApiResponse({ status: 204, description: 'Provider removed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Provider not found' })
    remove(@Param('code') code: string) {
        return this.providers.remove(code);
    }
}
