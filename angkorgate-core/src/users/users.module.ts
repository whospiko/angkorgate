import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        RbacModule
    ],
    controllers: [
        UsersController
    ],
    providers: [
        UsersService
    ],
    exports: [
        UsersService
    ]
})
export class UsersModule { }