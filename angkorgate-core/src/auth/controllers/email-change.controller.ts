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
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { type Request } from 'express';

import { EmailChangeService } from '../services/email-change.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequestEmailChangeDto } from '../dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from '../dto/confirm-email-change.dto';

@Controller('auth/email')
export class EmailChangeController {
    constructor(private readonly emailChange: EmailChangeService) { }

    // ─── REQUEST (authenticated) ─────────────────────────────────────

    @Post('change-request')
    @UseGuards(AuthGuard('jwt'))
    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
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

    // ─── CONFIRM (public — user clicks link in email) ────────────────

    @Post('confirm')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
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
    confirmViaGet(
        @Query('token') token: string,
        @Req() req: Request,
    ): Promise<{ message: string }> {
        return this.emailChange.confirmChange(token, {
            ip: req.ip,
            userAgent: req.headers['user-agent']?.toString(),
        });
    }

    // ─── RESEND ─────────────────────────────────────────────────────

    @Post('resend')
    @UseGuards(AuthGuard('jwt'))
    @Throttle({ default: { limit: 2, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    resend(
        @CurrentUser('id') userId: string,
        @Req() req: Request,
    ): Promise<{ message: string }> {
        return this.emailChange.resend(userId, {
            ip: req.ip,
            userAgent: req.headers['user-agent']?.toString(),
        });
    }

    // ─── STATUS ─────────────────────────────────────────────────────

    @Get('change-status')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(HttpStatus.OK)
    status(@CurrentUser('id') userId: string) {
        return this.emailChange.getPendingStatus(userId);
    }
}