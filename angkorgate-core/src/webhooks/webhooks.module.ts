import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { RbacModule } from '../rbac/rbac.module';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([WebhookEndpoint, WebhookDelivery]),
        RbacModule,
        ApiKeysModule,
    ],
    controllers: [WebhooksController],
    providers: [WebhooksService],
    exports: [WebhooksService],
})
export class WebhooksModule {}
