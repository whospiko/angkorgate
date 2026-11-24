import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerContact } from './entities/customer-contact.entity';
import { CustomerAttribute } from './entities/customer-attribute.entity';
import { ContactAttribute } from './entities/contact-attribute.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { RbacModule } from '../rbac/rbac.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { CustomersService } from './services/customers.service';
import { ContactsService } from './services/contacts.service';
import { CustomersController } from './controllers/customers.controller';
import { ContactsController } from './controllers/contacts.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Customer,
            CustomerContact,
            CustomerAttribute,
            ContactAttribute,
            User, // for FK on customer.userId
        ]),
        UsersModule, // for UsersService.exists()
        RbacModule,  // for PermissionsGuard in controllers
        ApiKeysModule, // for UnifiedAuthGuard in controllers
    ],
    controllers: [CustomersController, ContactsController],
    providers: [CustomersService, ContactsService],
    exports: [
        CustomersService, // used by future appointments/invoices/orders modules
        ContactsService,
    ],
})
export class CustomersModule { }