import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
    Query,
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
import { RuntimeConfigService, RuntimeSettingView } from '../services/runtime-config.service';
import { MailService } from '../../notifications/services/mail.service';
import { SmsService } from '../../notifications/services/sms.service';
import {
    DevOutboxChannel,
    DevOutboxMessage,
    DevOutboxService,
} from '../../notifications/services/dev-outbox.service';
import { AuditService } from '../../audit/services/audit.service';
import {
    TestMailConfigDto,
    TestSmsConfigDto,
    UpdateRuntimeConfigDto,
} from '../dto/runtime-config.dto';
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
    constructor(
        private readonly systemService: SystemService,
        private readonly runtimeConfig: RuntimeConfigService,
        private readonly mailService: MailService,
        private readonly smsService: SmsService,
        private readonly devOutbox: DevOutboxService,
        private readonly auditService: AuditService,
    ) { }

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

    @Get('auth-methods')
    @ApiOperation({ summary: 'Retrieve public enabled/disabled status for Passkey and Passwordless auth methods' })
    async getPublicAuthMethods(): Promise<{
        passkeyEnabled: boolean;
        magicLinkEnabled: boolean;
        emailOtpEnabled: boolean;
        smsOtpEnabled: boolean;
    }> {
        return {
            passkeyEnabled: this.runtimeConfig.getBoolean('WEBAUTHN_ENABLED', true),
            magicLinkEnabled: this.runtimeConfig.getBoolean('PASSWORDLESS_MAGIC_LINK_ENABLED', true),
            emailOtpEnabled: this.runtimeConfig.getBoolean('PASSWORDLESS_EMAIL_OTP_ENABLED', true),
            smsOtpEnabled: this.runtimeConfig.getBoolean('PASSWORDLESS_SMS_OTP_ENABLED', true),
        };
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

    @Get('runtime-config')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('app:read')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Retrieve live runtime environment settings (secrets masked)' })
    @ApiResponse({ status: 200, description: 'Runtime settings returned' })
    async getRuntimeConfig(): Promise<RuntimeSettingView[]> {
        return this.runtimeConfig.getAllMasked();
    }

    @Patch('runtime-config')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('app:write')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update live runtime environment settings without restarting' })
    @ApiResponse({ status: 200, description: 'Runtime settings updated and applied immediately' })
    async updateRuntimeConfig(
        @Body() dto: UpdateRuntimeConfigDto,
        @CurrentUser() user: JwtPayload,
        @Req() req: Request,
    ): Promise<RuntimeSettingView[]> {
        const updated = await this.runtimeConfig.updateSettings(dto.settings, user.sub);
        const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
        void this.auditService.log({
            actorId: user.sub,
            action: 'system.runtime_config.updated',
            entity: 'runtime_settings',
            entityId: 'default',
            newValue: { keys: Object.keys(dto.settings) },
            ipAddress: ip ?? null,
        });
        return updated;
    }

    @Post('runtime-config/test-mail')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('app:write')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Send a test email using the active live Mail/SMTP configuration' })
    async testMailConfig(@Body() dto: TestMailConfigDto): Promise<{ message: string }> {
        await this.mailService.send({
            to: dto.to,
            subject: 'AngkorGate Test Email',
            html: '<p>Your AngkorGate email / SMTP configuration is working!</p>',
            text: 'Your AngkorGate email / SMTP configuration is working!',
        });
        return { message: `Test email dispatched to ${dto.to}` };
    }

    @Post('runtime-config/test-sms')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('app:write')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Send a test SMS using the active live SMS configuration' })
    async testSmsConfig(@Body() dto: TestSmsConfigDto): Promise<{ message: string }> {
        await this.smsService.send(
            dto.to,
            'AngkorGate test SMS: your SMS gateway configuration is working!',
        );
        return { message: `Test SMS dispatched to ${dto.to}` };
    }

    @Get('dev-outbox')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('app:read')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List captured console Email and SMS messages (Magic Links & OTPs)' })
    async getDevOutbox(
        @Query('channel') channel?: string,
    ): Promise<DevOutboxMessage[]> {
        const filter: DevOutboxChannel | undefined =
            channel === 'email' || channel === 'sms' ? channel : undefined;
        return this.devOutbox.list(filter);
    }

    @Delete('dev-outbox')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('app:write')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Clear captured console Email and SMS messages' })
    async clearDevOutbox(): Promise<{ cleared: true }> {
        this.devOutbox.clear();
        return { cleared: true };
    }
}
