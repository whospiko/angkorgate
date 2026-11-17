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
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { CustomersModule } from '../customers/customers.module';

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
        ]),
        UsersModule,
        RbacModule,
        CustomersModule
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, JwtAuthGuard],
    exports: [
        AuthService,
        JwtAuthGuard,
    ],
})
export class AuthModule { }