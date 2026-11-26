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
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { Audit } from '../../audit/decorators/audit.decorator';
import { UsersService } from '../../users/services/users.service';
import {
    RevokeOtherSessionsDto,
    RevokeSessionsResultDto,
    SessionResponseDto,
} from '../dto/session-response.dto';

@ApiTags('Users')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UserSessionsController {
    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
    ) { }

    @Get(':id/sessions')
    @Permissions('user:read')
    @ApiOperation({ summary: 'Admin: List active sessions for a specific user' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiQuery({ name: 'currentRefreshToken', required: false, description: 'Optional caller refresh token to flag isCurrent' })
    @ApiResponse({ status: 200, description: 'Active user sessions retrieved', type: [SessionResponseDto] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:read permission)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async listUserSessions(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('currentRefreshToken') currentRefreshToken?: string,
    ): Promise<SessionResponseDto[]> {
        await this.usersService.findByIdOrFail(id);
        return this.authService.listSessions(id, currentRefreshToken);
    }

    @Post(':id/sessions/revoke-others')
    @Permissions('user:write')
    @Audit('user.sessions.revoke_others')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Admin: Revoke all other active sessions for a user except one' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 200, description: 'Other sessions revoked successfully', type: RevokeSessionsResultDto })
    @ApiResponse({ status: 400, description: 'Missing currentRefreshToken or keepSessionId' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:write permission)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async revokeOtherUserSessions(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RevokeOtherSessionsDto,
    ): Promise<RevokeSessionsResultDto> {
        await this.usersService.findByIdOrFail(id);
        return this.authService.revokeOtherSessions(id, dto);
    }

    @Post(':id/sessions/revoke-all')
    @Permissions('user:write')
    @Audit('user.sessions.revoke_all')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Admin: Revoke all active sessions for a user' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 200, description: 'All sessions revoked successfully', type: RevokeSessionsResultDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:write permission)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async revokeAllUserSessions(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<RevokeSessionsResultDto> {
        await this.usersService.findByIdOrFail(id);
        return this.authService.logoutAll(id, 'admin_revoked_all');
    }

    @Delete(':id/sessions/:sessionId')
    @Permissions('user:write')
    @Audit('user.session.revoke')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Admin: Revoke a specific active session for a user' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiParam({ name: 'sessionId', description: 'Session UUID' })
    @ApiResponse({ status: 204, description: 'Session revoked successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:write permission)' })
    @ApiResponse({ status: 404, description: 'User or session not found' })
    async revokeUserSession(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
    ): Promise<void> {
        await this.usersService.findByIdOrFail(id);
        return this.authService.revokeSession(id, sessionId, 'admin_revoked');
    }
}
