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
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Permissions } from '../rbac/decorators/permissions.decorator';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/apps')
export class AppsController {
    constructor(private readonly apps: AppsService) { }

    @Get()
    @Permissions('app:read')
    list() {
        return this.apps.findAll();
    }

    @Get(':code')
    @Permissions('app:read')
    findOne(@Param('code') code: string) {
        return this.apps.findByCodeOrFail(code);
    }

    @Post()
    @Permissions('app:write')
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateAppDto) {
        return this.apps.create({
            appCode: dto.appCode,
            name: dto.name,
            oauthEnabled: dto.oauthEnabled ?? false,
            enabledProviders: dto.enabledProviders ?? [],
            passwordLoginEnabled: dto.passwordLoginEnabled ?? true,
            registrationEnabled: dto.registrationEnabled ?? true,
            emailVerificationRequired: dto.emailVerificationRequired ?? true,
            allowedRedirectUrls: dto.allowedRedirectUrls ?? [],
        });
    }

    @Patch(':code')
    @Permissions('app:write')
    update(
        @Param('code') code: string,
        @Body() dto: UpdateAppSettingsDto,
    ) {
        return this.apps.update(code, dto);
    }

    @Delete(':code')
    @Permissions('app:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('code') code: string) {
        return this.apps.remove(code);
    }
}