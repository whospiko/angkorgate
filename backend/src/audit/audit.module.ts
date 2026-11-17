import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { RbacModule } from '../rbac/rbac.module';
import { AuditController } from './controllers/audit.controller';
import { AuditService } from './services/audit.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([AuditLog]),
        RbacModule, // ← for PermissionsGuard in AuditController
    ],
    controllers: [AuditController],
    providers: [AuditService],
    exports: [AuditService], // available everywhere via @Global()
})
export class AuditModule { }
