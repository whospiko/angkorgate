import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { UserPermissionOverride } from './entities/user-permission-override.entity';
import { User } from '../users/entities/user.entity';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { RbacService } from './rbac.service';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Role,
            Permission,
            RolePermission,
            UserRole,
            UserPermissionOverride,
            User, // ← only so TypeORM can resolve the FK relation
        ]),
    ],
    controllers: [RolesController, PermissionsController],
    providers: [RbacService, RolesGuard, PermissionsGuard],
    exports: [
        RbacService,
        RolesGuard,
        PermissionsGuard,
    ],
})
export class RbacModule { }
