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
import { RbacService } from './rbac.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { OverridePermissionDto } from './dto/override-permission.dto';

@Controller('rbac')
export class PermissionsController {
    constructor(private readonly rbac: RbacService) { }

    @Post('permissions')
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreatePermissionDto) {
        return this.rbac.createPermission(dto);
    }

    @Get('permissions')
    findAll() {
        return this.rbac.findAllPermissions();
    }

    @Get('users/:userId/permissions')
    userPermissions(@Param('userId') userId: string) {
        return this.rbac.getUserPermissions(userId);
    }

    @Get('users/:userId/roles')
    userRoles(@Param('userId') userId: string) {
        return this.rbac.getUserRoleCodes(userId);
    }

    @Post('overrides')
    @HttpCode(HttpStatus.NO_CONTENT)
    setOverride(@Body() dto: OverridePermissionDto) {
        return this.rbac.setUserPermissionOverride(
            dto.userId,
            dto.permissionCode,
            dto.effect,
        );
    }

    @Delete('overrides')
    @HttpCode(HttpStatus.NO_CONTENT)
    clearOverride(
        @Query('userId') userId: string,
        @Query('permissionCode') permissionCode: string,
    ) {
        return this.rbac.clearUserPermissionOverride(userId, permissionCode);
    }
}