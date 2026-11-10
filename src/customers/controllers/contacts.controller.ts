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
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';
import { ContactsService } from '../contacts.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { SetAttributeDto } from '../dto/set-attribute.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('customers/:customerId/contacts')
export class ContactsController {
    constructor(private readonly contacts: ContactsService) { }

    @Post()
    @Permissions('customer:write')
    add(
        @Param('customerId', ParseUUIDPipe) customerId: string,
        @Body() dto: CreateContactDto,
    ) {
        return this.contacts.add(customerId, dto);
    }

    @Get()
    @Permissions('customer:read')
    list(@Param('customerId', ParseUUIDPipe) customerId: string) {
        return this.contacts.list(customerId);
    }

    @Patch(':contactId')
    @Permissions('customer:write')
    update(
        @Param('contactId', ParseUUIDPipe) contactId: string,
        @Body() dto: Partial<CreateContactDto>,
    ) {
        return this.contacts.update(contactId, dto);
    }

    @Delete(':contactId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('customer:write')
    remove(@Param('contactId', ParseUUIDPipe) contactId: string) {
        return this.contacts.remove(contactId);
    }

    @Get(':contactId/attributes')
    @Permissions('customer:read')
    getAttrs(@Param('contactId', ParseUUIDPipe) contactId: string) {
        return this.contacts.getAttributes(contactId);
    }

    @Put(':contactId/attributes/:key')
    @Permissions('customer:write')
    setAttr(
        @Param('contactId', ParseUUIDPipe) contactId: string,
        @Param('key') key: string,
        @Body() dto: SetAttributeDto,
    ) {
        return this.contacts.setAttribute(contactId, key, dto.value);
    }
}