import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { UpdateOidcSettingsDto } from '../dto/update-oidc-settings.dto';
import { OidcService } from '../services/oidc.service';

@ApiTags('OIDC')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/oidc')
export class OidcAdminController {
    constructor(private readonly oidcService: OidcService) { }

    @Get('settings')
    @Permissions('oauth:read')
    @ApiOperation({ summary: 'Get OIDC Issuer and Console URL settings' })
    @ApiResponse({ status: 200, description: 'Current OIDC settings' })
    getSettings() {
        return this.oidcService.getSettings();
    }

    @Patch('settings')
    @Permissions('oauth:write')
    @ApiOperation({ summary: 'Update OIDC Issuer and Console URL dynamically without restart' })
    @ApiResponse({ status: 200, description: 'Updated OIDC settings' })
    updateSettings(@Body() dto: UpdateOidcSettingsDto) {
        return this.oidcService.updateSettings(dto);
    }
}
