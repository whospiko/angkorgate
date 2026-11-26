import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Req,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { PasswordlessService } from '../services/passwordless.service';
import {
    PasswordlessRequestResponseDto,
    RequestMagicLinkDto,
    RequestOtpDto,
    VerifyMagicLinkDto,
    VerifyOtpDto,
} from '../dto/passwordless.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { extractClientContext } from '../utils/client-context.util';

@ApiTags('Passwordless (Magic Link & Email/SMS OTP)')
@Controller('auth/passwordless')
export class PasswordlessController {
    constructor(private readonly passwordless: PasswordlessService) { }

    @Post('magic-link/request')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send a one-click signed Magic Link to an email address' })
    @ApiResponse({
        status: 200,
        description: 'Magic link request processed',
        type: PasswordlessRequestResponseDto,
    })
    @ApiResponse({ status: 429, description: 'Too many requests or cooldown active' })
    requestMagicLink(
        @Body() dto: RequestMagicLinkDto,
        @Req() req: Request,
    ): Promise<PasswordlessRequestResponseDto> {
        return this.passwordless.requestMagicLink(dto, extractClientContext(req));
    }

    @Post('magic-link/verify')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify a signed Magic Link token and issue session tokens' })
    @ApiResponse({
        status: 200,
        description: 'Magic link verified and session tokens issued',
        type: AuthResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Invalid, used, or expired magic link' })
    verifyMagicLink(
        @Body() dto: VerifyMagicLinkDto,
        @Req() req: Request,
    ): Promise<AuthResponseDto & { redirectUrl?: string | null }> {
        return this.passwordless.verifyMagicLink(dto.token, extractClientContext(req));
    }

    @Post('otp/request')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send a 6-digit numeric OTP via Email (SMTP) or SMS' })
    @ApiResponse({
        status: 200,
        description: 'OTP request processed',
        type: PasswordlessRequestResponseDto,
    })
    @ApiResponse({ status: 429, description: 'Too many requests or cooldown active' })
    requestOtp(
        @Body() dto: RequestOtpDto,
        @Req() req: Request,
    ): Promise<PasswordlessRequestResponseDto> {
        return this.passwordless.requestOtp(dto, extractClientContext(req));
    }

    @Post('otp/verify')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify a 6-digit Email or SMS OTP and issue session tokens' })
    @ApiResponse({
        status: 200,
        description: 'OTP verified and session tokens issued',
        type: AuthResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Invalid, expired, or locked OTP code' })
    verifyOtp(
        @Body() dto: VerifyOtpDto,
        @Req() req: Request,
    ): Promise<AuthResponseDto> {
        return this.passwordless.verifyOtp(dto, extractClientContext(req));
    }
}
