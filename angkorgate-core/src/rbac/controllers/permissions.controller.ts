import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { RbacService } from '../services/rbac.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { OverridePermissionDto } from '../dto/override-permission.dto';

@ApiTags('RBAC - Permissions')
@ApiBearerAuth('bearerAuth')
@Controller('rbac')
export class PermissionsController {
    constructor(private readonly rbac: RbacService) { }

    @Post('permissions')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new permission' })
    @ApiResponse({ status: 201, description: 'Permission created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 409, description: 'Permission code already exists' })
    create(@Body() dto: CreatePermissionDto) {
        return this.rbac.createPermission(dto);
    }

    @Get('permissions')
    @ApiOperation({ summary: 'List all permissions' })
    @ApiResponse({ status: 200, description: 'List of all system permissions' })
    findAll() {
        return this.rbac.findAllPermissions();
    }

    @Get('permissions/:code')
    @ApiOperation({ summary: 'Get single permission details by code' })
    @ApiParam({ name: 'code', description: 'Permission code (e.g. user:read)' })
    @ApiResponse({ status: 200, description: 'Permission details' })
    @ApiResponse({ status: 404, description: 'Permission not found' })
    findByCode(@Param('code') code: string) {
        return this.rbac.findPermissionByCodeOrFail(code);
    }

    @Get('users/:userId/permissions')
    @ApiOperation({ summary: 'Get all effective permissions for a user' })
    @ApiParam({ name: 'userId', description: 'User UUID' })
    @ApiResponse({ status: 200, description: 'List of effective permissions for the user' })
    userPermissions(@Param('userId') userId: string) {
        return this.rbac.getUserPermissions(userId);
    }

    @Get('users/:userId/roles')
    @ApiOperation({ summary: 'Get all role codes assigned to a user' })
    @ApiParam({ name: 'userId', description: 'User UUID' })
    @ApiResponse({ status: 200, description: 'List of assigned role codes' })
    userRoles(@Param('userId') userId: string) {
        return this.rbac.getUserRoleCodes(userId);
    }

    @Get('overrides/:userId')
    @ApiOperation({ summary: 'Get all permission overrides for a user' })
    @ApiParam({ name: 'userId', description: 'User UUID' })
    @ApiResponse({ status: 200, description: 'List of user permission overrides' })
    getUserOverrides(@Param('userId') userId: string) {
        return this.rbac.getUserOverrides(userId);
    }

    @Post('overrides')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Set user-specific permission override (GRANT or REVOKE)' })
    @ApiResponse({ status: 204, description: 'Permission override set successfully' })
    @ApiResponse({ status: 404, description: 'User or permission not found' })
    setOverride(@Body() dto: OverridePermissionDto) {
        return this.rbac.setUserPermissionOverride(
            dto.userId,
            dto.permissionCode,
            dto.effect,
        );
    }

    @Delete('overrides')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Clear a user-specific permission override' })
    @ApiQuery({ name: 'userId', description: 'User UUID' })
    @ApiQuery({ name: 'permissionCode', description: 'Permission code' })
    @ApiResponse({ status: 204, description: 'Permission override cleared successfully' })
    clearOverride(
        @Query('userId') userId: string,
        @Query('permissionCode') permissionCode: string,
    ) {
        return this.rbac.clearUserPermissionOverride(userId, permissionCode);
    }
}
