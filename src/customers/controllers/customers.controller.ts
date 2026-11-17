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
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CustomersService } from '../services/customers.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { SetAttributeDto } from '../dto/set-attribute.dto';

/**
 * ⚠️ Permission code choice matters for reuse:
 *    'customer:read' / 'customer:write' — generic
 *    NOT 'patient:read' — clinic-specific, would break hotel/POS
 */
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('customers')
export class CustomersController {
    constructor(private readonly customers: CustomersService) { }

    @Post()
    @Permissions('customer:write')
    create(
        @Body() dto: CreateCustomerDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.customers.create(dto, actorId);
    }

    @Get()
    @Permissions('customer:read')
    findAll(
        @Query('type') type?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.customers.findAll({
            type: type as 'PATIENT' | 'GUEST' | 'CUSTOMER' | undefined,
            status,
            search,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Get(':id')
    @Permissions('customer:read')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.customers.findByIdOrFail(id);
    }

    @Patch(':id')
    @Permissions('customer:write')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCustomerDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.customers.update(id, dto, actorId);
    }

    @Patch(':id/status/:status')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('customer:write')
    setStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('status') status: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.customers.setStatus(
            id,
            status.toUpperCase() as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
            actorId,
        );
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('customer:write')
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.customers.remove(id, actorId);
    }

    // ─── ATTRIBUTES ─────────────────────────────────────────────────

    @Get(':id/attributes')
    @Permissions('customer:read')
    getAttributes(@Param('id', ParseUUIDPipe) id: string) {
        return this.customers.getAttributes(id);
    }

    @Put(':id/attributes/:key')
    @Permissions('customer:write')
    setAttribute(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('key') key: string,
        @Body() dto: SetAttributeDto,
    ) {
        return this.customers.setAttribute(id, key, dto.value);
    }

    @Delete(':id/attributes/:key')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('customer:write')
    deleteAttribute(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('key') key: string,
    ) {
        return this.customers.deleteAttribute(id, key);
    }
}