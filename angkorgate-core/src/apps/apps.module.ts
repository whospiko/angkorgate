import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { Scope } from '../scopes/entities/scope.entity';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { RbacModule } from '../rbac/rbac.module';
import { ScopesModule } from '../scopes/scopes.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AppSetting, Scope]),
        RbacModule, // for PermissionsGuard
        ScopesModule,
    ],
    controllers: [AppsController],
    providers: [AppsService],
    exports: [AppsService], // OAuth + Auth + OIDC use it
})
export class AppsModule { }
