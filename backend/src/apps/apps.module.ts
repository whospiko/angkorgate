import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AppSetting]),
        RbacModule, // for PermissionsGuard
    ],
    controllers: [AppsController],
    providers: [AppsService],
    exports: [AppsService], // OAuth + Auth use it via middleware/context
})
export class AppsModule { }