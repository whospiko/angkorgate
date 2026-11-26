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
    Req,
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
import type { Request } from 'express';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { StepUpService } from '../../auth/services/step-up.service';
import { AuditService } from '../../audit/services/audit.service';
import { extractClientContext } from '../../auth/utils/client-context.util';
import { OauthConfigService } from '../services/oauth-config.service';
import { OauthProvidersService } from '../services/oauth-providers.service';
import { OauthAccountsService } from '../services/oauth-accounts.service';
import { OauthStrategyRegistry } from '../services/oauth-strategy.registry';
import { OauthProvider } from '../entities/oauth-provider.entity';
import { CreateProviderDto } from '../dto/create-provider.dto';
import { UpdateProviderDto } from '../dto/update-provider.dto';
import { UpdateOauthSettingsDto } from '../dto/update-oauth-settings.dto';

const SECRET_MASK = '••••••••';

@ApiTags('OAuth Providers - Admin')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/oauth/providers')
export class OauthAdminController {
    constructor(
        private readonly providers: OauthProvidersService,
        @Optional() private readonly config?: OauthConfigService,
        @Optional() private readonly registry?: OauthStrategyRegistry,
        @Optional() private readonly accounts?: OauthAccountsService,
        @Optional() private readonly stepUp?: StepUpService,
        @Optional() private readonly audit?: AuditService,
    ) { }

    private maskProvider(p: OauthProvider) {
        const extraConfig = p.extraConfig ? { ...p.extraConfig } : null;
        const hasPrivateKey = Boolean(extraConfig && typeof extraConfig.privateKey === 'string' && extraConfig.privateKey);
        if (extraConfig && hasPrivateKey) {
            extraConfig.privateKey = SECRET_MASK;
        }
        return {
            ...p,
            clientSecret: p.clientSecret ? SECRET_MASK : null,
            hasClientSecret: Boolean(p.clientSecret),
            hasPrivateKey,
            extraConfig,
        };
    }

    @Get('users/:userId/accounts')
    @Permissions('oauth:read')
    @ApiOperation({ summary: 'List social identity accounts linked to a user' })
    @ApiResponse({ status: 200, description: 'Linked social accounts for the user' })
    listUserAccounts(@Param('userId') userId: string) {
        return this.accounts?.listByUser(userId) ?? [];
    }

    @Delete('users/:userId/accounts/:provider')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('oauth:write')
    @ApiOperation({ summary: 'Force-unlink a social identity provider from a user' })
    @ApiResponse({ status: 204, description: 'Social account unlinked' })
    async unlinkUserAccount(
        @Param('userId') userId: string,
        @Param('provider') provider: string,
    ) {
        await this.accounts?.unlink(userId, provider.toLowerCase());
    }

    @Get('settings')
    @Permissions('oauth:read')
    @ApiOperation({ summary: 'Get global OAuth federation settings (DB-managed)' })
    @ApiResponse({ status: 200, description: 'Global OAuth settings' })
    async getSettings() {
        return this.config?.getGlobalSettings() ?? {
            oauthEnabled: true,
            callbackBaseUrl: null,
            webUrl: 'http://localhost:4000',
        };
    }

    @Patch('settings')
    @Permissions('oauth:write')
    @ApiOperation({ summary: 'Update global OAuth federation settings without editing .env or restarting' })
    @ApiResponse({ status: 200, description: 'Global OAuth settings updated' })
    async updateSettings(@Body() dto: UpdateOauthSettingsDto) {
        const updated = await this.config?.updateGlobalSettings(dto);
        this.registry?.invalidateAll();
        return updated;
    }

    @Get()
    @Permissions('oauth:read')
    @ApiOperation({ summary: 'List all configured OAuth providers (secrets masked)' })
    @ApiResponse({ status: 200, description: 'List of all OAuth providers' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async list() {
        const rows = await this.providers.list();
        return rows.map((p) => this.maskProvider(p));
    }

    @Get(':code')
    @Permissions('oauth:read')
    @ApiOperation({ summary: 'Get details of a single OAuth identity provider (secrets masked)' })
    @ApiParam({ name: 'code', description: 'Provider code (e.g. google, github, discord, microsoft, telegram)' })
    @ApiResponse({ status: 200, description: 'OAuth provider details' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Provider not found' })
    async findOne(@Param('code') code: string) {
        const provider = await this.providers.findByCodeOrFail(code);
        return this.maskProvider(provider);
    }

    @Get(':code/reveal-secret')
    @Permissions('oauth:read')
    @ApiOperation({ summary: 'Reveal client secret or bot token for an OAuth provider (requires step-up verification)' })
    @ApiParam({ name: 'code', description: 'Provider code (e.g. google, github, discord, microsoft, telegram)' })
    @ApiResponse({ status: 200, description: 'OAuth provider secrets returned' })
    @ApiResponse({ status: 403, description: 'Step-up verification required' })
    @ApiResponse({ status: 404, description: 'Provider not found' })
    async revealSecret(
        @Param('code') code: string,
        @CurrentUser('id') userId: string,
        @Req() req: Request,
    ) {
        await this.stepUp?.assertVerified(userId);
        const provider = await this.providers.findByCodeOrFail(code);
        const ctx = extractClientContext(req);
        void this.audit?.log({
            actorId: userId,
            action: 'oauth.provider.secret_revealed',
            entity: 'oauth_provider',
            entityId: provider.code,
            ipAddress: ctx.ip ?? null,
        });
        return {
            clientSecret: provider.clientSecret ?? null,
            privateKey:
                typeof provider.extraConfig?.privateKey === 'string'
                    ? provider.extraConfig.privateKey
                    : null,
        };
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
    @ApiParam({ name: 'code', description: 'Provider code (e.g. google, github, discord, microsoft, telegram)' })
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
    @ApiParam({ name: 'code', description: 'Provider code (e.g. google, github, discord, microsoft, telegram)' })
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
    @ApiParam({ name: 'code', description: 'Provider code (e.g. google, github, discord, microsoft, telegram)' })
    @ApiResponse({ status: 204, description: 'Provider removed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Provider not found' })
    remove(@Param('code') code: string) {
        return this.providers.remove(code);
    }
}
