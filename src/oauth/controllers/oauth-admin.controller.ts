import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { OauthProvidersService } from '../oauth-providers.service';
import { CreateProviderDto } from '../dto/create-provider.dto';
import { UpdateProviderDto } from '../dto/update-provider.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/oauth/providers')
export class OauthAdminController {
    constructor(private readonly providers: OauthProvidersService) { }

    @Get()
    @Permissions('oauth:read')
    list() {
        return this.providers.list();
    }

    @Post()
    @Permissions('oauth:write')
    create(@Body() dto: CreateProviderDto) {
        return this.providers.create(dto);
    }

    @Patch(':code')
    @Permissions('oauth:write')
    update(@Param('code') code: string, @Body() dto: UpdateProviderDto) {
        return this.providers.update(code, dto);
    }

    @Patch(':code/toggle')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('oauth:write')
    async toggle(@Param('code') code: string) {
        await this.providers.toggleActive(code);
    }

    @Delete(':code')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('oauth:write')
    remove(@Param('code') code: string) {
        return this.providers.remove(code);
    }
}