import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Optional,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Req,
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
import type { Request } from 'express';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Permissions } from '../rbac/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StepUpService } from '../auth/services/step-up.service';
import { AuditService } from '../audit/services/audit.service';
import { extractClientContext } from '../auth/utils/client-context.util';
import { AppsService } from './apps.service';
import { AppSetting } from './entities/app-setting.entity';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

const SECRET_MASK = '••••••••';

@ApiTags('Apps')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/apps')
export class AppsController {
    constructor(
        private readonly apps: AppsService,
        @Optional() private readonly stepUp?: StepUpService,
        @Optional() private readonly audit?: AuditService,
    ) { }

    private maskApp(app: AppSetting) {
        return {
            ...app,
            clientSecret: app.clientSecret ? SECRET_MASK : null,
            secondaryClientSecret: app.secondaryClientSecret ? SECRET_MASK : null,
            hasClientSecret: Boolean(app.clientSecret),
            hasSecondaryClientSecret: Boolean(app.secondaryClientSecret),
        };
    }

    @Get()
    @Permissions('app:read')
    @ApiOperation({ summary: 'List all registered client applications (secrets masked)' })
    @ApiResponse({ status: 200, description: 'List of registered applications' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires app:read permission' })
    async list() {
        const list = await this.apps.findAll();
        return list.map((app) => this.maskApp(app));
    }

    @Get(':code')
    @Permissions('app:read')
    @ApiOperation({ summary: 'Get application details by app code (secrets masked)' })
    @ApiParam({ name: 'code', description: 'Application code', example: 'clinic-prod' })
    @ApiResponse({ status: 200, description: 'Application settings retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    async findOne(@Param('code') code: string) {
        const app = await this.apps.findByCodeOrFail(code);
        return this.maskApp(app);
    }

    @Get(':code/reveal-secret')
    @Permissions('app:read')
    @ApiOperation({ summary: 'Reveal client secret and secondary secret for an application (requires step-up verification)' })
    @ApiParam({ name: 'code', description: 'Application code', example: 'clinic-prod' })
    @ApiResponse({ status: 200, description: 'Client secrets returned' })
    @ApiResponse({ status: 403, description: 'Step-up verification required' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    async revealSecret(
        @Param('code') code: string,
        @CurrentUser('id') userId: string,
        @Req() req: Request,
    ) {
        await this.stepUp?.assertVerified(userId);
        const app = await this.apps.findByCodeOrFail(code);
        const ctx = extractClientContext(req);
        void this.audit?.log({
            actorId: userId,
            action: 'app.secret.revealed',
            entity: 'app_setting',
            entityId: app.appCode,
            ipAddress: ctx.ip ?? null,
        });
        return {
            clientSecret: app.clientSecret ?? null,
            secondaryClientSecret: app.secondaryClientSecret ?? null,
            secondarySecretExpiresAt: app.secondarySecretExpiresAt ?? null,
        };
    }

    @Post()
    @Permissions('app:write')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new client application' })
    @ApiResponse({ status: 201, description: 'Application registered successfully' })
    @ApiResponse({ status: 400, description: 'Validation failed or invalid format' })
    create(@Body() dto: CreateAppDto) {
        return this.apps.create(dto);
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
    @ApiOperation({ summary: 'Regenerate client secret for an application with zero-downtime grace period' })
    @ApiParam({ name: 'code', description: 'Application code', example: 'clinic-prod' })
    @ApiQuery({ name: 'gracePeriodHours', required: false, description: 'Hours before secondary secret expires', example: 24 })
    @ApiResponse({ status: 200, description: 'Client secret regenerated successfully' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    regenerateSecret(
        @Param('code') code: string,
        @Query('gracePeriodHours') gracePeriodHours?: number,
    ) {
        return this.apps.regenerateSecret(code, gracePeriodHours ? Number(gracePeriodHours) : 24);
    }

    @Put(':code/scopes')
    @Permissions('app:write')
    @ApiOperation({ summary: 'Update scopes assigned to an application' })
    @ApiParam({ name: 'code', description: 'Application code', example: 'clinic-prod' })
    @ApiResponse({ status: 200, description: 'Scopes assigned successfully' })
    setScopes(
        @Param('code') code: string,
        @Body('scopeIds') scopeIds: string[],
    ) {
        return this.apps.setScopes(code, scopeIds || []);
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
