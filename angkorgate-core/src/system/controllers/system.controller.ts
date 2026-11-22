import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { SystemService } from '../services/system.service';
import { SetupStatusResponseDto } from '../dto/setup-status-response.dto';
import { InitialSetupDto } from '../dto/initial-setup.dto';
import { UpdateBrandingDto } from '../dto/update-branding.dto';
import { BrandingResponseDto } from '../dto/branding-response.dto';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { type JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('System Setup & Content Management')
@Controller('system')
export class SystemController {
    constructor(private readonly systemService: SystemService) { }

    @Get('setup-status')
    @ApiOperation({ summary: 'Check if the instance has been initialized and configured' })
    @ApiResponse({ status: 200, type: SetupStatusResponseDto })
    async getSetupStatus(): Promise<SetupStatusResponseDto> {
        return this.systemService.getSetupStatus();
    }

    @Post('setup')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Execute first-time setup: create super-admin and configure branding' })
    @ApiResponse({ status: 200, description: 'Setup completed successfully and session initialized' })
    @ApiResponse({ status: 403, description: 'Setup has already been completed' })
    async executeSetup(
        @Body() dto: InitialSetupDto,
        @Req() req: Request,
    ) {
        const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
        const userAgent = req.headers['user-agent'] as string | undefined;

        return this.systemService.executeInitialSetup(dto, { ip, userAgent });
    }

    @Get('branding')
    @ApiOperation({ summary: 'Retrieve public application branding & content settings' })
    @ApiResponse({ status: 200, type: BrandingResponseDto })
    async getBranding(): Promise<BrandingResponseDto> {
        return this.systemService.getBranding();
    }

    @Patch('branding')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('app:write')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update application branding and content management settings' })
    @ApiResponse({ status: 200, type: BrandingResponseDto })
    async updateBranding(
        @Body() dto: UpdateBrandingDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<BrandingResponseDto> {
        return this.systemService.updateBranding(dto, user.sub);
    }
}
