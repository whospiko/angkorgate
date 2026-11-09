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
    ApiTags
} from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService, LoginContext } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Authenticate user and return tokens' })
    @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    login(
        @Body() dto: LoginDto,
        @Req() req: Request,
    ): Promise<AuthResponseDto> {
        return this.auth.login(dto, this.ctxFrom(req));
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

    private ctxFrom(req: Request): LoginContext {
        return {
            ip: req.ip, // Ensure 'trust proxy' is enabled in Express if behind a proxy like Traefik/Nginx
            userAgent: req.headers['user-agent']?.toString(),
        };
    }
}