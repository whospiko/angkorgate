import { MiddlewareConsumer, Module, NestModule, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { RbacModule } from './rbac/rbac.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import configuration from './config/configuration';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit/interceptor/audit.interceptor';
import { EmployeesModule } from './employees/employees.module';
import { CustomersModule } from './customers/customers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { OauthModule } from './oauth/oauth.module';
import { AppsModule } from './apps/apps.module';
import { ScopesModule } from './scopes/scopes.module';
import { OidcModule } from './oidc/oidc.module';
import { CacheModule } from './cache/cache.module';
import { SystemModule } from './system/system.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AppContextMiddleware } from './apps/middleware/app-context.middleware';
import { OauthConfigService } from './oauth/services/oauth-config.service';
import { DevBootstrapService } from './system/services/dev-bootstrap.service';
import { isSqlite } from './common/utils/db-types.util';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = config.get<string>('database.type') || (isSqlite() ? 'sqlite' : 'postgres');
        if (dbType === 'sqlite') {
          return {
            type: 'better-sqlite3',
            database: config.get<string>('database.sqliteStorage') || './dev.sqlite',
            autoLoadEntities: true,
            synchronize: true, // auto create schema on dev boot
            logging: config.get<boolean>('database.logging') ?? false,
          };
        }
        return {
          type: 'postgres',
          host: config.get('database.host'),
          port: config.get<number>('database.port'),
          username: config.get('database.username'),
          password: config.get('database.password'),
          database: config.get('database.name'),
          autoLoadEntities: true,
          synchronize: false, // we use migrations for PostgreSQL
          logging: config.get<boolean>('database.logging') ?? false,
        };
      },
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 }, // global default: 60 req/min/IP
    ]),
    UsersModule,
    CommonModule,
    RbacModule,
    AuthModule,
    AuditModule,
    EmployeesModule,
    CustomersModule,
    NotificationsModule,
    OauthModule,
    AppsModule,
    ScopesModule,
    OidcModule,
    CacheModule,
    SystemModule,
    ApiKeysModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule, OnApplicationBootstrap {
  constructor(
    private readonly oauthConfig: OauthConfigService,
    private readonly devBootstrap: DevBootstrapService,
  ) { }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer.apply(AppContextMiddleware).forRoutes('*');
  }

  async onApplicationBootstrap() {
    await this.devBootstrap.bootstrap();
    await this.oauthConfig.seedFromEnv();
  }
}
