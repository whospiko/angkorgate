import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { RbacService } from '../services/rbac.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignRoleDto, BulkAssignRolesDto, UnassignRoleDto } from '../dto/assign-role.dto';
import { SetRolePermissionsDto } from '../dto/set-role-permissions.dto';

@ApiTags('RBAC - Roles')
@ApiBearerAuth('bearerAuth')
@Controller('rbac/roles')
export class RolesController {
    constructor(private readonly rbac: RbacService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new role' })
    @ApiResponse({ status: 201, description: 'Role created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 409, description: 'Role code already exists' })
    create(@Body() dto: CreateRoleDto) {
        return this.rbac.createRole(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all roles' })
    @ApiResponse({ status: 200, description: 'List of all roles' })
    findAll() {
        return this.rbac.findAllRoles();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get role details by ID' })
    @ApiParam({ name: 'id', description: 'Role UUID' })
    @ApiResponse({ status: 200, description: 'Role details' })
    @ApiResponse({ status: 404, description: 'Role not found' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.rbac.findRoleByIdOrFail(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update role details' })
    @ApiParam({ name: 'id', description: 'Role UUID' })
    @ApiResponse({ status: 200, description: 'Role updated successfully' })
    @ApiResponse({ status: 404, description: 'Role not found' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRoleDto,
    ) {
        return this.rbac.updateRole(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a role' })
    @ApiParam({ name: 'id', description: 'Role UUID' })
    @ApiResponse({ status: 204, description: 'Role deleted successfully' })
    @ApiResponse({ status: 404, description: 'Role not found' })
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.rbac.deleteRole(id);
    }

    @Get(':id/permissions')
    @ApiOperation({ summary: 'Get all permission codes assigned to a role' })
    @ApiParam({ name: 'id', description: 'Role UUID' })
    @ApiResponse({ status: 200, description: 'List of permission codes assigned to the role' })
    @ApiResponse({ status: 404, description: 'Role not found' })
    getPermissions(@Param('id', ParseUUIDPipe) id: string) {
        return this.rbac.getRolePermissions(id);
    }

    @Put(':id/permissions')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Set permissions assigned to a role' })
    @ApiParam({ name: 'id', description: 'Role UUID' })
    @ApiResponse({ status: 204, description: 'Role permissions updated successfully' })
    @ApiResponse({ status: 404, description: 'Role not found' })
    setPermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: SetRolePermissionsDto,
    ) {
        return this.rbac.setRolePermissions(id, body.permissionCodes);
    }

    @Post('assign')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Assign a single role to a user' })
    @ApiResponse({ status: 204, description: 'Role assigned successfully' })
    @ApiResponse({ status: 404, description: 'User or role not found' })
    assign(@Body() dto: AssignRoleDto) {
        return this.rbac.assignRoleToUser(dto.userId, dto.roleCode, dto.assignedBy);
    }

    @Post('unassign')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Unassign a role from a user' })
    @ApiResponse({ status: 204, description: 'Role unassigned successfully' })
    @ApiResponse({ status: 404, description: 'User or role not found' })
    unassign(@Body() dto: UnassignRoleDto) {
        return this.rbac.revokeRoleFromUser(dto.userId, dto.roleCode);
    }

    @Put('assign-bulk')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Replace all roles assigned to a user' })
    @ApiResponse({ status: 204, description: 'User roles replaced successfully' })
    @ApiResponse({ status: 404, description: 'User or role not found' })
    assignBulk(@Body() dto: BulkAssignRolesDto) {
        return this.rbac.replaceUserRoles(dto.userId, dto.roleCodes, dto.assignedBy);
    }
}
