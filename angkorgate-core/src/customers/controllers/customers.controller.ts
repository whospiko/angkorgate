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
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CustomersService } from '../services/customers.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { SetAttributeDto } from '../dto/set-attribute.dto';
import { CustomerResponseDto } from '../dto/customer-response.dto';

@ApiTags('Customers')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('customers')
export class CustomersController {
    constructor(private readonly customers: CustomersService) { }

    @Post()
    @Permissions('customer:write')
    @ApiOperation({ summary: 'Create a new customer profile' })
    @ApiResponse({ status: 201, description: 'Customer created successfully', type: CustomerResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks customer:write permission)' })
    create(
        @Body() dto: CreateCustomerDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.customers.create(dto, actorId);
    }

    @Get()
    @Permissions('customer:read')
    @ApiOperation({ summary: 'List customer profiles with filtering and pagination' })
    @ApiQuery({ name: 'type', required: false, enum: ['PATIENT', 'GUEST', 'CUSTOMER'], description: 'Filter by customer type' })
    @ApiQuery({ name: 'status', required: false, description: 'Filter by customer status' })
    @ApiQuery({ name: 'search', required: false, description: 'Search name, phone, or email' })
    @ApiQuery({ name: 'page', required: false, example: '1', description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, example: '20', description: 'Items per page' })
    @ApiResponse({ status: 200, description: 'Paginated customer list' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks customer:read permission)' })
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
    @ApiOperation({ summary: 'Get customer profile by UUID' })
    @ApiParam({ name: 'id', description: 'Customer UUID' })
    @ApiResponse({ status: 200, description: 'Customer details', type: CustomerResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks customer:read permission)' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.customers.findByIdOrFail(id);
    }

    @Patch(':id')
    @Permissions('customer:write')
    @ApiOperation({ summary: 'Update customer profile' })
    @ApiParam({ name: 'id', description: 'Customer UUID' })
    @ApiResponse({ status: 200, description: 'Customer updated successfully', type: CustomerResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks customer:write permission)' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
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
    @ApiOperation({ summary: 'Update customer lifecycle status' })
    @ApiParam({ name: 'id', description: 'Customer UUID' })
    @ApiParam({ name: 'status', enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'], description: 'New status' })
    @ApiResponse({ status: 204, description: 'Customer status updated' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks customer:write permission)' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
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
    @ApiOperation({ summary: 'Soft delete customer profile' })
    @ApiParam({ name: 'id', description: 'Customer UUID' })
    @ApiResponse({ status: 204, description: 'Customer deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden (lacks customer:write permission)' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.customers.remove(id, actorId);
    }

    /** Dynamic attributes endpoints */
    @Get(':id/attributes')
    @Permissions('customer:read')
    @ApiOperation({ summary: 'Get all dynamic attributes of customer' })
    @ApiParam({ name: 'id', description: 'Customer UUID' })
    @ApiResponse({ status: 200, description: 'Customer attributes map' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    getAttributes(@Param('id', ParseUUIDPipe) id: string) {
        return this.customers.getAttributes(id);
    }

    @Put(':id/attributes/:key')
    @Permissions('customer:write')
    @ApiOperation({ summary: 'Set or update dynamic attribute on customer' })
    @ApiParam({ name: 'id', description: 'Customer UUID' })
    @ApiParam({ name: 'key', description: 'Attribute key' })
    @ApiResponse({ status: 200, description: 'Attribute set successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
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
    @ApiOperation({ summary: 'Delete dynamic attribute from customer' })
    @ApiParam({ name: 'id', description: 'Customer UUID' })
    @ApiParam({ name: 'key', description: 'Attribute key' })
    @ApiResponse({ status: 204, description: 'Attribute deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    deleteAttribute(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('key') key: string,
    ) {
        return this.customers.deleteAttribute(id, key);
    }
}
