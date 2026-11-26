import {
    Body,
    Controller,
    Delete,
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
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { StepUpPasskeyVerifyDto, StepUpVerifyDto } from '../dto/step-up.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { StepUpService } from '../services/step-up.service';
import { extractClientContext } from '../utils/client-context.util';

@ApiTags('Auth - Step-Up')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('auth/step-up')
export class StepUpController {
    constructor(private readonly stepUp: StepUpService) { }

    @Get('status')
    @ApiOperation({ summary: 'Get current step-up verification status and available verification methods' })
    @ApiResponse({ status: 200, description: 'Step-up status returned' })
    getStatus(@CurrentUser('id') userId: string) {
        return this.stepUp.getStatus(userId);
    }

    @Post('verify')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify identity with password, TOTP MFA, or email OTP to unlock sensitive reveals' })
    @ApiResponse({ status: 200, description: 'Step-up verification succeeded' })
    @ApiResponse({ status: 401, description: 'Invalid credentials or code' })
    verify(
        @CurrentUser('id') userId: string,
        @Body() dto: StepUpVerifyDto,
        @Req() req: Request,
    ) {
        const ctx = extractClientContext(req);
        return this.stepUp.verify(userId, dto, ctx.ip);
    }

    @Post('email-otp/request')
    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send a 6-digit email verification code for step-up verification (ideal for OAuth-only accounts)' })
    @ApiResponse({ status: 200, description: 'Verification code dispatched' })
    requestEmailOtp(
        @CurrentUser('id') userId: string,
        @Req() req: Request,
    ) {
        const ctx = extractClientContext(req);
        return this.stepUp.requestEmailOtp(userId, ctx.ip);
    }

    @Post('passkey/options')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Generate WebAuthn passkey challenge for step-up verification' })
    getPasskeyOptions(
        @CurrentUser('id') userId: string,
        @Req() req: Request,
    ) {
        return this.stepUp.getPasskeyOptions(userId, req.headers.host);
    }

    @Post('passkey/verify')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify passkey assertion for step-up verification' })
    verifyPasskey(
        @CurrentUser('id') userId: string,
        @Body() dto: StepUpPasskeyVerifyDto,
        @Req() req: Request,
    ) {
        const origin = (req.headers.origin as string) || (req.headers.referer as string);
        const ctx = extractClientContext(req);
        return this.stepUp.verifyPasskey(userId, dto, origin, req.headers.host, ctx.ip);
    }

    @Delete()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Lock step-up verification session immediately' })
    async lock(@CurrentUser('id') userId: string): Promise<void> {
        await this.stepUp.clearVerification(userId);
    }
}
