import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { type Request } from 'express';

import { EmailChangeService } from '../services/email-change.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequestEmailChangeDto } from '../dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from '../dto/confirm-email-change.dto';

@ApiTags('Auth - Email Change')
@Controller('auth/email')
export class EmailChangeController {
    constructor(private readonly emailChange: EmailChangeService) { }

    /** Request email change (authenticated) */
    @ApiBearerAuth('bearerAuth')
    @Post('change-request')
    @UseGuards(AuthGuard('jwt'))
    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request an email change (sends confirmation email to new address)' })
    @ApiResponse({ status: 200, description: 'Confirmation email dispatched successfully' })
    @ApiResponse({ status: 400, description: 'Invalid email address or MFA code required' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 409, description: 'Email address already in use' })
    requestChange(
        @CurrentUser('id') userId: string,
        @Body() dto: RequestEmailChangeDto,
        @Req() req: Request,
    ): Promise<{ message: string }> {
        return this.emailChange.requestChange(userId, dto, {
            ip: req.ip,
            userAgent: req.headers['user-agent']?.toString(),
        });
    }

    /** Confirm email change (public verification link) */
    @Post('confirm')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Confirm email change via POST token payload' })
    @ApiResponse({ status: 200, description: 'Email changed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired confirmation token' })
    confirm(
        @Body() dto: ConfirmEmailChangeDto,
        @Req() req: Request,
    ): Promise<{ message: string }> {
        return this.emailChange.confirmChange(dto.token, {
            ip: req.ip,
            userAgent: req.headers['user-agent']?.toString(),
        });
    }

    /**
     * GET variant — for the case where the email link opens a web page that
     * then POSTs the token. Or, if you want the link to be "click to confirm"
     * directly in the browser, this endpoint can accept the token via query.
     */
    @Get('confirm')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Confirm email change via browser URL query parameter' })
    @ApiQuery({ name: 'token', description: 'Email change confirmation token' })
    @ApiResponse({ status: 200, description: 'Email changed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired confirmation token' })
    confirmViaGet(
        @Query('token') token: string,
        @Req() req: Request,
    ): Promise<{ message: string }> {
        return this.emailChange.confirmChange(token, {
            ip: req.ip,
            userAgent: req.headers['user-agent']?.toString(),
        });
    }

    /** Resend email change confirmation */
    @ApiBearerAuth('bearerAuth')
    @Post('resend')
    @UseGuards(AuthGuard('jwt'))
    @Throttle({ default: { limit: 2, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Resend pending email change verification email' })
    @ApiResponse({ status: 200, description: 'Verification email resent successfully' })
    @ApiResponse({ status: 400, description: 'No pending email change request found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    resend(
        @CurrentUser('id') userId: string,
        @Req() req: Request,
    ): Promise<{ message: string }> {
        return this.emailChange.resend(userId, {
            ip: req.ip,
            userAgent: req.headers['user-agent']?.toString(),
        });
    }

    /** Get email change status */
    @ApiBearerAuth('bearerAuth')
    @Get('change-status')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Check status of pending email change request' })
    @ApiResponse({ status: 200, description: 'Pending email change details returned' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    status(@CurrentUser('id') userId: string) {
        return this.emailChange.getPendingStatus(userId);
    }
}
