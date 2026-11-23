import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { ScopesService } from '../services/scopes.service';
import { CreateScopeDto } from '../dto/create-scope.dto';

@ApiTags('Scopes')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('admin/scopes')
export class ScopesController {
    constructor(private readonly scopesService: ScopesService) { }

    @Get()
    @Permissions('app:read')
    @ApiOperation({ summary: 'List all registered OIDC client scopes' })
    @ApiResponse({ status: 200, description: 'List of available scopes' })
    list() {
        return this.scopesService.findAll();
    }

    @Post()
    @Permissions('app:write')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new OIDC client scope' })
    @ApiResponse({ status: 201, description: 'Scope created successfully' })
    create(@Body() dto: CreateScopeDto) {
        return this.scopesService.create(dto);
    }

    @Delete(':id')
    @Permissions('app:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a client scope' })
    @ApiParam({ name: 'id', description: 'Scope UUID' })
    @ApiResponse({ status: 204, description: 'Scope deleted successfully' })
    remove(@Param('id') id: string) {
        return this.scopesService.remove(id);
    }
}
