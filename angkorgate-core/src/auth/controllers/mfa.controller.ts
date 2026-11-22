import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
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
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { type Request } from 'express';

import { MfaService } from '../services/mfa.service';
import { CurrentUser } from '../decorators/current-user.decorator';

import { SetupMfaDto } from '../dto/setup-mfa.dto';
import { VerifyMfaSetupDto } from '../dto/verify-mfa-setup.dto';
import { DisableMfaDto } from '../dto/disable-mfa.dto';
import {
    MfaSetupResponseDto,
    MfaStatusDto,
    RegenerateBackupCodesResponseDto,
} from '../dto/mfa-response.dto';

@ApiTags('Auth - MFA')
@ApiBearerAuth('bearerAuth')
@Controller('auth/mfa')
@UseGuards(AuthGuard('jwt'))
export class MfaController {
    constructor(private readonly mfa: MfaService) { }

    /** MFA status */
    @Get('status')
    @ApiOperation({ summary: 'Get current MFA status and backup codes count' })
    @ApiResponse({ status: 200, description: 'MFA status retrieved successfully', type: MfaStatusDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    getStatus(@CurrentUser('id') userId: string): Promise<MfaStatusDto> {
        return this.mfa.getStatus(userId);
    }

    /** MFA setup */
    /**
     * Step 1: verify password → get QR + backup codes.
     * MFA is NOT yet enabled — user must call /verify after scanning.
     */
    @Post('setup')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Initialize MFA setup and generate QR code / backup codes' })
    @ApiResponse({ status: 200, description: 'MFA setup secret, QR code, and backup codes generated', type: MfaSetupResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid password or MFA already enabled' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    setup(
        @CurrentUser('id') userId: string,
        @Body() dto: SetupMfaDto,
        @Req() req: Request,
    ): Promise<MfaSetupResponseDto> {
        return this.mfa.setup(userId, dto.password, req.ip);
    }

    /**
     * Step 2: user scans QR, enters 6-digit code from authenticator.
     * This ENABLES MFA.
     */
    @Post('verify')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify initial TOTP code to finalize and enable MFA' })
    @ApiResponse({ status: 200, description: 'MFA verified and enabled successfully' })
    @ApiResponse({ status: 400, description: 'Invalid TOTP verification code' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    verifySetup(
        @CurrentUser('id') userId: string,
        @Body() dto: VerifyMfaSetupDto,
        @Req() req: Request,
    ): Promise<{ message: string }> {
        return this.mfa.verifySetup(userId, dto.code, req.ip);
    }

    /** Disable MFA */
    @Post('disable')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Disable MFA protection on account' })
    @ApiResponse({ status: 204, description: 'MFA successfully disabled' })
    @ApiResponse({ status: 400, description: 'Invalid password or TOTP/backup code' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    disable(
        @CurrentUser('id') userId: string,
        @Body() dto: DisableMfaDto,
        @Req() req: Request,
    ): Promise<void> {
        return this.mfa.disable(userId, dto.password, dto.code, req.ip);
    }

    /** Regenerate backup codes */
    @Post('backup-codes/regenerate')
    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Regenerate emergency one-time backup codes' })
    @ApiResponse({ status: 200, description: 'New backup codes generated', type: RegenerateBackupCodesResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid password or MFA code' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    regenerateBackupCodes(
        @CurrentUser('id') userId: string,
        @Body() dto: DisableMfaDto, // same shape: password + code
        @Req() req: Request,
    ): Promise<RegenerateBackupCodesResponseDto> {
        return this.mfa.regenerateBackupCodes(
            userId,
            dto.password,
            dto.code,
            req.ip,
        );
    }
}
