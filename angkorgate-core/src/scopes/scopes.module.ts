import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scope } from './entities/scope.entity';
import { ScopesService } from './services/scopes.service';
import { ScopesController } from './controllers/scopes.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Scope]),
        RbacModule,
    ],
    controllers: [ScopesController],
    providers: [ScopesService],
    exports: [ScopesService],
})
export class ScopesModule { }
