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
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UnifiedAuthGuard } from '../auth/guards/unified-auth.guard';
import { Permissions } from '../rbac/decorators/permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CreateWebhookEndpointDto, UpdateWebhookEndpointDto } from './dto/webhooks.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@ApiBearerAuth('bearerAuth')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
@Controller('webhooks')
export class WebhooksController {
    constructor(private readonly webhooks: WebhooksService) {}

    @Get()
    @Permissions('app:read')
    @ApiOperation({ summary: 'List configured HR & ERP webhook endpoints' })
    listEndpoints() {
        return this.webhooks.listEndpoints();
    }

    @Post()
    @Permissions('app:write')
    @ApiOperation({ summary: 'Create a signed HR/ERP webhook endpoint' })
    createEndpoint(
        @Body() dto: CreateWebhookEndpointDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.webhooks.createEndpoint(dto, actorId);
    }

    @Patch(':id')
    @Permissions('app:write')
    @ApiOperation({ summary: 'Update a webhook endpoint' })
    updateEndpoint(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateWebhookEndpointDto,
        @CurrentUser('id') actorId: string,
    ) {
        return this.webhooks.updateEndpoint(id, dto, actorId);
    }

    @Delete(':id')
    @Permissions('app:write')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a webhook endpoint' })
    deleteEndpoint(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') actorId: string,
    ) {
        return this.webhooks.deleteEndpoint(id, actorId);
    }

    @Get(':id/deliveries')
    @Permissions('app:read')
    @ApiOperation({ summary: 'List recent webhook delivery outbox records' })
    listDeliveries(@Param('id', ParseUUIDPipe) id: string) {
        return this.webhooks.listDeliveries(id);
    }

    @Post(':id/test')
    @Permissions('app:write')
    @ApiOperation({ summary: 'Send a signed test webhook event' })
    testEndpoint(@Param('id', ParseUUIDPipe) id: string) {
        return this.webhooks.testEndpoint(id);
    }

    @Post('deliveries/:deliveryId/retry')
    @Permissions('app:write')
    @ApiOperation({ summary: 'Retry a failed webhook delivery' })
    retryDelivery(@Param('deliveryId', ParseUUIDPipe) deliveryId: string) {
        return this.webhooks.retryDelivery(deliveryId);
    }
}
