import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("users")
export class UsersController {

    @Inject()
    private readonly userService: UsersService

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
        return this.userService.create(dto);
    }

    @Get()
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
    findOne(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<UserResponseDto> {
        return this.userService.findByIdOrFail(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        return this.userService.update(id, dto);
    }

    @Patch(':id/activate')
    @HttpCode(HttpStatus.NO_CONTENT)
    activate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.userService.setActive(id, true);
    }

    @Patch(':id/deactivate')
    @HttpCode(HttpStatus.NO_CONTENT)
    deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.userService.setActive(id, false);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.userService.remove(id);
    }
}