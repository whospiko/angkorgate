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
import { AuthController } from './controllers/auth.controller';
import { MfaController } from './controllers/mfa.controller';
import { MfaBackupCode } from './entities/mfa-backup-code.entity';
import { UserMfa } from './entities/user-mfa.entity';
import { EncryptionService } from './services/encryption.service';
import { MfaService } from './services/mfa.service';
import { MfaPendingGuard } from './guards/mfa-pending.guard';
import { EmailChangeService } from './services/email-change.service';
import { EmailChangeToken } from './entities/email-change-token.entity';
import { EmailChangeController } from './controllers/email-change.controller';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }), // Recommended explicitly
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_ACCESS_SECRET'),
                signOptions: {
                    expiresIn: parseInt(config.get<string>('JWT_ACCESS_TTL') ?? '900', 10),
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
        ]),
        UsersModule,
        RbacModule,
        CustomersModule
    ],
    controllers: [AuthController, MfaController, EmailChangeController],
    providers: [AuthService, EmailChangeService, JwtStrategy, JwtAuthGuard, EncryptionService, MfaService, MfaPendingGuard, EmailChangeService],
    exports: [
        AuthService,
        JwtAuthGuard,
        MfaService
    ],
})
export class AuthModule { }