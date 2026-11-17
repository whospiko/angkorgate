import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService, LoginContext } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { AuthResponseDto, LoginResponseDto } from '../dto/auth-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import { RegisterCustomerDto } from '../dto/register-customer.dto';
import { Throttle } from '@nestjs/throttler';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { MfaPendingGuard } from '../guards/mfa-pending.guard';
import { LoginMfaDto } from '../dto/login-mfa.dto';

interface MfaRequest extends Request {
    mfaUserId?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60_000 } }) // brute-force protection
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Authenticate user and return tokens' })
    @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    login(
        @Body() dto: LoginDto,
        @Req() req: Request,
    ): Promise<LoginResponseDto> {
        return this.auth.login(dto, this.ctxFrom(req));
    }

    @Post('login/mfa')
    @UseGuards(MfaPendingGuard)
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    loginMfa(@Req() req: MfaRequest, @Body() dto: LoginMfaDto) {
        return this.auth.completeMfaLogin(req.mfaUserId!, dto.code, this.ctxFrom(req));
    }

    @Post('register')
    @Throttle({ default: { limit: 3, ttl: 60_000 } }) // 3 attempts / min / IP
    @HttpCode(HttpStatus.CREATED)
    register(@Body() dto: RegisterCustomerDto, @Req() req: Request) {
        return this.auth.registerCustomer(dto, this.ctxFrom(req));
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Generate new access token using a refresh token' })
    @ApiResponse({ status: 200, description: 'Tokens refreshed successfully', type: AuthResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
    refresh(
        @Body() dto: RefreshDto,
        @Req() req: Request,
    ): Promise<AuthResponseDto> {
        return this.auth.refresh(dto.refreshToken, this.ctxFrom(req));
    }

    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Log out a specific session using its refresh token' })
    @ApiResponse({ status: 204, description: 'Logged out successfully' })
    logout(@Body() dto: RefreshDto): Promise<void> {
        return this.auth.logout(dto.refreshToken);
    }

    @ApiBearerAuth('bearerAuth')
    @UseGuards(JwtAuthGuard)
    @Post('logout-all')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Log out from all active devices and sessions' })
    @ApiResponse({ status: 204, description: 'Logged out from all sessions successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    logoutAll(@CurrentUser('id') userId: string): Promise<void> {
        return this.auth.logoutAll(userId);
    }

    @ApiBearerAuth('bearerAuth')
    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Change the password for the currently authenticated user' })
    @ApiResponse({ status: 204, description: 'Password changed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid current password or new password format' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    changePassword(
        @CurrentUser('id') userId: string,
        @Body() dto: ChangePasswordDto,
    ): Promise<void> {
        return this.auth.changePassword(userId, dto.oldPassword, dto.newPassword);
    }

    @ApiBearerAuth('bearerAuth')
    @UseGuards(JwtAuthGuard)
    @Get('me')
    @ApiOperation({ summary: 'Get the profile of the currently authenticated user' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
        return user;
    }

    @Post('verify-email')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
        return this.auth.verifyEmail(dto.token, this.ctxFrom(req));
    }

    @Post('resend-verification')
    @Throttle({ default: { limit: 2, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    resendVerification(@Body() dto: ResendVerificationDto, @Req() req: Request) {
        return this.auth.resendVerification(
            { email: dto.email, phone: dto.phone },
            this.ctxFrom(req),
        );
    }

    @Post('forgot-password')
    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
        return this.auth.forgotPassword(dto.email, this.ctxFrom(req));
    }

    @Post('reset-password')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
        return this.auth.resetPassword(dto.token, dto.newPassword, this.ctxFrom(req));
    }

    @UseGuards(JwtAuthGuard)
    @Get('sessions')
    listSessions(
        @CurrentUser('id') userId: string,
        @Body() body?: { currentRefreshToken?: string },
    ) {
        return this.auth.listSessions(userId, body?.currentRefreshToken);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('sessions/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    revokeSession(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.auth.revokeSession(userId, id);
    }

    private ctxFrom(req: Request): LoginContext {
        return {
            ip: req.ip, // Ensure 'trust proxy' is enabled in Express if behind a proxy like Traefik/Nginx
            userAgent: req.headers['user-agent']?.toString(),
        };
    }
}