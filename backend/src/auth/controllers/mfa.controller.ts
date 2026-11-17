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
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { type Request } from 'express';

import { MfaService } from '../services/mfa.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGuard as JwtAuthGuardForType } from '@nestjs/passport'; // for typing only

import { SetupMfaDto } from '../dto/setup-mfa.dto';
import { VerifyMfaSetupDto } from '../dto/verify-mfa-setup.dto';
import { DisableMfaDto } from '../dto/disable-mfa.dto';
import {
    MfaSetupResponseDto,
    MfaStatusDto,
    RegenerateBackupCodesResponseDto,
} from '../dto/mfa-response.dto';

@Controller('auth/mfa')
@UseGuards(AuthGuard('jwt'))
export class MfaController {
    constructor(private readonly mfa: MfaService) { }

    // ─── Status ─────────────────────────────────────────────────────

    @Get('status')
    getStatus(@CurrentUser('id') userId: string): Promise<MfaStatusDto> {
        return this.mfa.getStatus(userId);
    }

    // ─── Setup ──────────────────────────────────────────────────────

    /**
     * Step 1: verify password → get QR + backup codes.
     * MFA is NOT yet enabled — user must call /verify after scanning.
     */
    @Post('setup')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
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
    verifySetup(
        @CurrentUser('id') userId: string,
        @Body() dto: VerifyMfaSetupDto,
        @Req() req: Request,
    ): Promise<{ message: string }> {
        return this.mfa.verifySetup(userId, dto.code, req.ip);
    }

    // ─── Disable ────────────────────────────────────────────────────

    @Post('disable')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.NO_CONTENT)
    disable(
        @CurrentUser('id') userId: string,
        @Body() dto: DisableMfaDto,
        @Req() req: Request,
    ): Promise<void> {
        return this.mfa.disable(userId, dto.password, dto.code, req.ip);
    }

    // ─── Regenerate backup codes ────────────────────────────────────

    @Post('backup-codes/regenerate')
    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
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