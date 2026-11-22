import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { UsersService } from "../services/users.service";
import { CreateUserDto } from "../dto/create-user.dto";
import { UserResponseDto } from "../dto/user-response.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { QueryUsersDto } from "../dto/query-users.dto";
import { AdminResetPasswordDto } from "../dto/admin-reset-password.dto";
import { PermissionsGuard } from "../../rbac/guards/permissions.guard";
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { Audit } from "../../audit/decorators/audit.decorator";
import { ApiOkEnvelope } from "../../common/dto/api-ok-response.decorator";
import { RbacService } from "../../rbac/services/rbac.service";

@ApiTags('Users')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("users")
export class UsersController {

    @Inject()
    private readonly userService: UsersService;

    @Inject()
    private readonly rbacService: RbacService;

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permissions('user:write')
    @Audit('user.create')
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:write permission)' })
    create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
        return this.userService.create(dto);
    }

    @Get()
    @Permissions('user:read')
    @ApiOperation({ summary: 'List users with filtering and pagination' })
    @ApiResponse({ status: 200, description: 'Paginated user list retrieved' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:read permission)' })
    findAll(@Query() query: QueryUsersDto) {
        return this.userService.findAll(query);
    }

    @Get(':id')
    @Permissions('user:read')
    @ApiOkEnvelope(UserResponseDto)
    @ApiOperation({ summary: 'Get user details by ID' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully', type: UserResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:read permission)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<UserResponseDto> {
        return this.userService.findByIdOrFail(id);
    }

    @Get(':id/roles')
    @Permissions('user:read')
    @ApiOperation({ summary: 'Get assigned role codes for a user' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 200, description: 'List of role codes assigned to user' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:read permission)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getRoles(@Param('id', ParseUUIDPipe) id: string): Promise<string[]> {
        await this.userService.findByIdOrFail(id);
        return this.rbacService.getUserRoleCodes(id);
    }

    @Patch(':id')
    @Permissions('user:write')
    @ApiOperation({ summary: 'Update user properties' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:write permission)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        return this.userService.update(id, dto);
    }

    @Patch(':id/unlock')
    @Permissions('user:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Unlock a locked user account and reset failed attempts' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 204, description: 'User account unlocked successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:write permission)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    unlock(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.userService.unlock(id);
    }

    @Post(':id/reset-password')
    @Permissions('user:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Administratively reset user password and optionally enforce change on login' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 204, description: 'Password reset successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:write permission)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    resetPassword(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AdminResetPasswordDto,
    ): Promise<void> {
        return this.userService.adminResetPassword(id, dto.newPassword, dto.mustChangePassword);
    }

    @Patch(':id/activate')
    @Permissions('user:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Activate a user account' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 204, description: 'User activated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:write permission)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    activate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.userService.setActive(id, true);
    }

    @Patch(':id/deactivate')
    @Permissions('user:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Deactivate a user account' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 204, description: 'User deactivated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:write permission)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.userService.setActive(id, false);
    }

    @Delete(':id')
    @Permissions('user:delete')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a user account' })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 204, description: 'User deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks user:delete permission)' })
    @ApiResponse({ status: 404, description: 'User not found' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.userService.remove(id);
    }
}
