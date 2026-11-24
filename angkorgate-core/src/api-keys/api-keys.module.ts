import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeysService } from './services/api-keys.service';
import { ApiKeysController } from './controllers/api-keys.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ApiKey]),
        RbacModule,
    ],
    controllers: [ApiKeysController],
    providers: [ApiKeysService],
    exports: [ApiKeysService, TypeOrmModule],
})
export class ApiKeysModule { }
