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
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { ContactsService } from '../services/contacts.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { SetAttributeDto } from '../dto/set-attribute.dto';

@ApiTags('Customer Contacts')
@ApiBearerAuth('bearerAuth')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
@Controller('customers/:customerId/contacts')
export class ContactsController {
    constructor(private readonly contacts: ContactsService) { }

    @Post()
    @Permissions('customer:write')
    @ApiOperation({ summary: 'Add a new contact to a customer' })
    @ApiParam({ name: 'customerId', description: 'Customer UUID' })
    @ApiResponse({ status: 201, description: 'Contact created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    add(
        @Param('customerId', ParseUUIDPipe) customerId: string,
        @Body() dto: CreateContactDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.contacts.add(customerId, dto, actorId);
    }

    @Get()
    @Permissions('customer:read')
    @ApiOperation({ summary: 'List all contacts associated with a customer' })
    @ApiParam({ name: 'customerId', description: 'Customer UUID' })
    @ApiResponse({ status: 200, description: 'List of customer contacts' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    list(@Param('customerId', ParseUUIDPipe) customerId: string) {
        return this.contacts.list(customerId);
    }

    @Get(':contactId')
    @Permissions('customer:read')
    @ApiOperation({ summary: 'Get details of a single contact person' })
    @ApiParam({ name: 'customerId', description: 'Customer UUID' })
    @ApiParam({ name: 'contactId', description: 'Contact UUID' })
    @ApiResponse({ status: 200, description: 'Contact details' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    findOne(
        @Param('customerId', ParseUUIDPipe) customerId: string,
        @Param('contactId', ParseUUIDPipe) contactId: string,
    ) {
        return this.contacts.findById(customerId, contactId);
    }

    @Patch(':contactId')
    @Permissions('customer:write')
    @ApiOperation({ summary: 'Update an existing contact person details' })
    @ApiParam({ name: 'customerId', description: 'Customer UUID' })
    @ApiParam({ name: 'contactId', description: 'Contact UUID' })
    @ApiResponse({ status: 200, description: 'Contact updated successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    update(
        @Param('customerId', ParseUUIDPipe) customerId: string,
        @Param('contactId', ParseUUIDPipe) contactId: string,
        @Body() dto: UpdateContactDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.contacts.update(customerId, contactId, dto, actorId);
    }

    @Delete(':contactId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('customer:write')
    @ApiOperation({ summary: 'Remove a contact person' })
    @ApiParam({ name: 'customerId', description: 'Customer UUID' })
    @ApiParam({ name: 'contactId', description: 'Contact UUID' })
    @ApiResponse({ status: 204, description: 'Contact removed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    remove(
        @Param('customerId', ParseUUIDPipe) customerId: string,
        @Param('contactId', ParseUUIDPipe) contactId: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.contacts.remove(customerId, contactId, actorId);
    }

    @Get(':contactId/attributes')
    @Permissions('customer:read')
    @ApiOperation({ summary: 'Get dynamic attributes of contact person' })
    @ApiParam({ name: 'customerId', description: 'Customer UUID' })
    @ApiParam({ name: 'contactId', description: 'Contact UUID' })
    @ApiResponse({ status: 200, description: 'Contact attributes map' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    getAttrs(
        @Param('customerId', ParseUUIDPipe) customerId: string,
        @Param('contactId', ParseUUIDPipe) contactId: string,
    ) {
        return this.contacts.getAttributes(customerId, contactId);
    }

    @Put(':contactId/attributes/:key')
    @Permissions('customer:write')
    @ApiOperation({ summary: 'Set or update dynamic attribute on contact person' })
    @ApiParam({ name: 'customerId', description: 'Customer UUID' })
    @ApiParam({ name: 'contactId', description: 'Contact UUID' })
    @ApiParam({ name: 'key', description: 'Attribute key' })
    @ApiResponse({ status: 200, description: 'Attribute set successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    setAttr(
        @Param('customerId', ParseUUIDPipe) customerId: string,
        @Param('contactId', ParseUUIDPipe) contactId: string,
        @Param('key') key: string,
        @Body() dto: SetAttributeDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.contacts.setAttribute(customerId, contactId, key, dto.value, actorId);
    }

    @Delete(':contactId/attributes/:key')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('customer:write')
    @ApiOperation({ summary: 'Delete dynamic attribute from contact person' })
    @ApiParam({ name: 'customerId', description: 'Customer UUID' })
    @ApiParam({ name: 'contactId', description: 'Contact UUID' })
    @ApiParam({ name: 'key', description: 'Attribute key' })
    @ApiResponse({ status: 204, description: 'Attribute deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    deleteAttr(
        @Param('customerId', ParseUUIDPipe) customerId: string,
        @Param('contactId', ParseUUIDPipe) contactId: string,
        @Param('key') key: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.contacts.deleteAttribute(customerId, contactId, key, actorId);
    }
}
