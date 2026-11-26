import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { RbacModule } from '../rbac/rbac.module';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { CustomersModule } from '../customers/customers.module';
import { EmployeesModule } from '../employees/employees.module';
import { AuthController } from './controllers/auth.controller';
import { UserSessionsController } from './controllers/user-sessions.controller';
import { StepUpController } from './controllers/step-up.controller';
import { StepUpService } from './services/step-up.service';
import { MfaController } from './controllers/mfa.controller';
import { MfaBackupCode } from './entities/mfa-backup-code.entity';
import { UserMfa } from './entities/user-mfa.entity';
import { EncryptionService } from './services/encryption.service';
import { MfaService } from './services/mfa.service';
import { MfaPendingGuard } from './guards/mfa-pending.guard';
import { EmailChangeService } from './services/email-change.service';
import { EmailChangeToken } from './entities/email-change-token.entity';
import { EmailChangeController } from './controllers/email-change.controller';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { UnifiedAuthGuard } from './guards/unified-auth.guard';
import { UserPasskey } from './entities/user-passkey.entity';
import { PasskeyService } from './services/passkey.service';
import { PasskeyController } from './controllers/passkey.controller';
import { PasswordlessToken } from './entities/passwordless-token.entity';
import { PasswordlessService } from './services/passwordless.service';
import { PasswordlessController } from './controllers/passwordless.controller';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }), // Recommended explicitly
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_ACCESS_SECRET'),
                signOptions: {
                    algorithm: 'HS256',
                    issuer: 'angkorgate-core',
                    audience: 'angkorgate-api',
                    expiresIn: parseInt(config.get<string>('JWT_ACCESS_TTL') ?? '3600', 10),
                }
            }),
        }),
        TypeOrmModule.forFeature([
            RefreshToken,
            LoginAttempt,
            EmailVerificationToken,
            PasswordResetToken,
            UserMfa,
            MfaBackupCode,
            EmailChangeToken,
            UserPasskey,
            PasswordlessToken,
        ]),
        UsersModule,
        RbacModule,
        CustomersModule,
        EmployeesModule,
        ApiKeysModule,
    ],
    controllers: [AuthController, UserSessionsController, StepUpController, MfaController, EmailChangeController, PasskeyController, PasswordlessController],
    providers: [
        AuthService,
        StepUpService,
        EmailChangeService,
        PasskeyService,
        PasswordlessService,
        JwtStrategy,
        JwtAuthGuard,
        UnifiedAuthGuard,
        EncryptionService,
        MfaService,
        MfaPendingGuard,
    ],
    exports: [
        AuthService,
        StepUpService,
        PasskeyService,
        PasswordlessService,
        JwtAuthGuard,
        UnifiedAuthGuard,
        MfaService,
    ],
})
export class AuthModule { }