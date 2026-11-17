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
import { RbacService } from '../services/rbac.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignRoleDto, BulkAssignRolesDto } from '../dto/assign-role.dto';

@Controller('rbac/roles')
export class RolesController {
    constructor(private readonly rbac: RbacService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateRoleDto) {
        return this.rbac.createRole(dto);
    }

    @Get()
    findAll() {
        return this.rbac.findAllRoles();
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.rbac.findRoleByIdOrFail(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRoleDto,
    ) {
        return this.rbac.updateRole(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.rbac.deleteRole(id);
    }

    @Put(':id/permissions')
    @HttpCode(HttpStatus.NO_CONTENT)
    setPermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { permissionCodes: string[] },
    ) {
        return this.rbac.setRolePermissions(id, body.permissionCodes);
    }

    @Post('assign')
    @HttpCode(HttpStatus.NO_CONTENT)
    assign(@Body() dto: AssignRoleDto) {
        return this.rbac.assignRoleToUser(dto.userId, dto.roleCode, dto.assignedBy);
    }

    @Put('assign-bulk')
    @HttpCode(HttpStatus.NO_CONTENT)
    assignBulk(@Body() dto: BulkAssignRolesDto) {
        return this.rbac.replaceUserRoles(dto.userId, dto.roleCodes, dto.assignedBy);
    }
}