import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OidcController } from './controllers/oidc.controller';
import { OidcAdminController } from './controllers/oidc-admin.controller';
import { OidcService } from './services/oidc.service';
import { OidcAdapterService } from './adapters/oidc.adapter';
import { OidcSession } from './entities/oidc-session.entity';
import { UsersModule } from '../users/users.module';
import { AppsModule } from '../apps/apps.module';
import { RbacModule } from '../rbac/rbac.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([OidcSession]),
        UsersModule,
        AppsModule,
        RbacModule,
        AuthModule,
    ],
    controllers: [OidcController, OidcAdminController],
    providers: [OidcService, OidcAdapterService],
    exports: [OidcService, OidcAdapterService],
})
export class OidcModule { }
