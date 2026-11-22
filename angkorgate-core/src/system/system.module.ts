import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from './entities/system-config.entity';
import { SystemService } from './services/system.service';
import { SystemController } from './controllers/system.controller';
import { UsersModule } from '../users/users.module';
import { RbacModule } from '../rbac/rbac.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([SystemConfig]),
        UsersModule,
        RbacModule,
        AuthModule,
        AuditModule,
    ],
    controllers: [SystemController],
    providers: [SystemService],
    exports: [SystemService],
})
export class SystemModule { }
