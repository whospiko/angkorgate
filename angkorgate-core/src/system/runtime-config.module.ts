import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuntimeSetting } from './entities/runtime-setting.entity';
import { RuntimeConfigService } from './services/runtime-config.service';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([RuntimeSetting])],
    providers: [RuntimeConfigService],
    exports: [RuntimeConfigService],
})
export class RuntimeConfigModule { }
