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
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Permissions } from '../rbac/decorators/permissions.decorator';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

@ApiTags('Apps')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/apps')
export class AppsController {
    constructor(private readonly apps: AppsService) { }

    @Get()
    @Permissions('app:read')
    @ApiOperation({ summary: 'List all registered client applications' })
    @ApiResponse({ status: 200, description: 'List of registered applications' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires app:read permission' })
    list() {
        return this.apps.findAll();
    }

    @Get(':code')
    @Permissions('app:read')
    @ApiOperation({ summary: 'Get application details by app code' })
    @ApiParam({ name: 'code', description: 'Application code', example: 'clinic-prod' })
    @ApiResponse({ status: 200, description: 'Application settings retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    findOne(@Param('code') code: string) {
        return this.apps.findByCodeOrFail(code);
    }

    @Post()
    @Permissions('app:write')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new client application' })
    @ApiResponse({ status: 201, description: 'Application registered successfully' })
    @ApiResponse({ status: 400, description: 'Validation failed or invalid format' })
    create(@Body() dto: CreateAppDto) {
        return this.apps.create({
            appCode: dto.appCode,
            name: dto.name,
            clientSecret: dto.clientSecret ?? null,
            oauthEnabled: dto.oauthEnabled ?? false,
            enabledProviders: dto.enabledProviders ?? [],
            passwordLoginEnabled: dto.passwordLoginEnabled ?? true,
            registrationEnabled: dto.registrationEnabled ?? true,
            emailVerificationRequired: dto.emailVerificationRequired ?? true,
            allowedRedirectUrls: dto.allowedRedirectUrls ?? [],
        });
    }

    @Patch(':code')
    @Permissions('app:write')
    @ApiOperation({ summary: 'Update an existing application settings' })
    @ApiParam({ name: 'code', description: 'Application code', example: 'clinic-prod' })
    @ApiResponse({ status: 200, description: 'Application updated successfully' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    update(
        @Param('code') code: string,
        @Body() dto: UpdateAppSettingsDto,
    ) {
        return this.apps.update(code, dto);
    }

    @Delete(':code')
    @Permissions('app:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a registered application' })
    @ApiParam({ name: 'code', description: 'Application code', example: 'clinic-prod' })
    @ApiResponse({ status: 204, description: 'Application deleted successfully' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    remove(@Param('code') code: string) {
        return this.apps.remove(code);
    }

    @Post(':code/regenerate-secret')
    @HttpCode(HttpStatus.OK)
    @Permissions('app:write')
    @ApiOperation({ summary: 'Regenerate client secret for an application' })
    @ApiParam({ name: 'code', description: 'Application code', example: 'clinic-prod' })
    @ApiResponse({ status: 200, description: 'Client secret regenerated successfully' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    regenerateSecret(@Param('code') code: string) {
        return this.apps.regenerateSecret(code);
    }

    @Patch(':code/toggle')
    @Permissions('app:write')
    @ApiOperation({ summary: 'Toggle application feature state (passwordLogin, oauth, registration)' })
    @ApiParam({ name: 'code', description: 'Application code', example: 'clinic-prod' })
    @ApiQuery({ name: 'feature', required: false, enum: ['passwordLogin', 'oauth', 'registration'] })
    @ApiResponse({ status: 200, description: 'Application state toggled successfully' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    toggle(
        @Param('code') code: string,
        @Query('feature') feature?: 'passwordLogin' | 'oauth' | 'registration',
    ) {
        return this.apps.toggleActive(code, feature);
    }
}
