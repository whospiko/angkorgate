import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UsersService } from "../services/users.service";
import { CreateUserDto } from "../dto/create-user.dto";
import { UserResponseDto } from "../dto/user-response.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { PermissionsGuard } from "../../rbac/guards/permissions.guard";
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Audit } from "../../audit/decorators/audit.decorator";
import { ApiOkEnvelope } from "../../common/dto/api-ok-response.decorator";

@ApiTags('Users')
@ApiBearerAuth('bearerAuth') // <-- Add this to tell Swagger to use the token
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("users")
export class UsersController {

    @Inject()
    private readonly userService: UsersService

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permissions('user:write')
    @Audit('user.create')
    create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
        return this.userService.create(dto);
    }

    @Get()
    @Permissions('user:read')
    findAll(
        @Query('page') page: '1',
        @Query('limit') limit: '20'
    ) {
        return this.userService.findAll(
            Math.max(1, parseInt(page, 10) || 1),
            Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
        )
    }

    @Get(':id')
    @Permissions('user:read')
    @ApiOkEnvelope(UserResponseDto) // Swagger 
    findOne(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<UserResponseDto> {
        return this.userService.findByIdOrFail(id);
    }

    @Patch(':id')
    @Permissions('user:write')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        return this.userService.update(id, dto);
    }

    @Patch(':id/activate')
    @Permissions('user:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    activate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.userService.setActive(id, true);
    }

    @Patch(':id/deactivate')
    @Permissions('user:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.userService.setActive(id, false);
    }

    @Delete(':id')
    @Permissions('user:delete')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.userService.remove(id);
    }
}