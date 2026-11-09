import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

import { UsersService } from '../users/users.service';
import { RbacService } from '../rbac/rbac.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
    constructor(
        private readonly users: UsersService,
        private readonly rbac: RbacService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        @InjectRepository(RefreshToken)
        private readonly refreshRepo: Repository<RefreshToken>,
        @InjectRepository(LoginAttempt)
        private readonly attemptRepo: Repository<LoginAttempt>,
    ) { }

    // ══════════════════════════════════════════════════════════════════
    //  PASSWORD HASHING — the ONLY place bcrypt lives
    // ══════════════════════════════════════════════════════════════════

    async hashPassword(plain: string): Promise<string> {
        return bcrypt.hash(plain, BCRYPT_ROUNDS);
    }

    async verifyPassword(plain: string, hash: string): Promise<boolean> {
        return bcrypt.compare(plain, hash);
    }

    // ══════════════════════════════════════════════════════════════════
    //  LOGIN
    // ══════════════════════════════════════════════════════════════════

    async login(dto: LoginDto, ctx: LoginContext): Promise<AuthResponseDto> {
        const identifier = dto.email ?? dto.phone ?? '';
        const audit = (success: boolean, userId: string | null = null) =>
            this.attemptRepo.save(
                this.attemptRepo.create({
                    userId,
                    emailPhone: identifier,
                    success,
                    ipAddress: ctx.ip,
                    userAgent: ctx.userAgent,
                }),
            );

        // 1. Look up the user (raw, with password hash)
        const record = dto.email
            ? await this.users.findAuthRecordByEmail(dto.email)
            : await this.users.findAuthRecordByPhone(dto.phone!);

        if (!record) {
            await audit(false);
            // Same message for "no user" and "wrong password" — avoid enumeration
            throw new UnauthorizedException('Invalid credentials');
        }

        // 2. Check active + lock
        if (!record.isActive) {
            await audit(false, record.id);
            throw new ForbiddenException('Account disabled');
        }
        if (record.lockedUntil && record.lockedUntil > new Date()) {
            await audit(false, record.id);
            throw new ForbiddenException(
                `Account locked until ${record.lockedUntil.toISOString()}`,
            );
        }

        // 3. Verify password
        const ok = await this.verifyPassword(dto.password, record.passwordHash);
        if (!ok) {
            const failed = record.failedAttempts + 1;
            const lockedUntil =
                failed >= MAX_FAILED_ATTEMPTS
                    ? new Date(Date.now() + LOCK_MINUTES * 60_000)
                    : null;

            await this.users.setFailedAttempts(record.id, failed, lockedUntil);

            await audit(false, record.id);
            throw new UnauthorizedException('Invalid credentials');
        }

        // 4. Success — reset counters + last_login
        await this.users.setLastLogin(record.id);
        await audit(true, record.id);

        // 5. Build tokens
        const roles = await this.rbac.getUserRoleCodes(record.id);
        return this.issueTokens(record.id, record.email, record.phone, roles, ctx);
    }

    // ══════════════════════════════════════════════════════════════════
    //  REFRESH
    // ══════════════════════════════════════════════════════════════════

    async refresh(refreshToken: string, ctx: LoginContext): Promise<AuthResponseDto> {
        const tokenHash = this.hashToken(refreshToken);
        const stored = await this.refreshRepo.findOne({
            where: { tokenHash },
        });

        if (!stored) throw new UnauthorizedException('Invalid refresh token');
        if (stored.revokedAt) {
            // Token reuse — revoke all tokens for that user (token theft signal)
            await this.refreshRepo.update(
                { userId: stored.userId },
                { revokedAt: new Date() },
            );
            throw new UnauthorizedException('Refresh token has been revoked');
        }
        if (stored.expiresAt < new Date()) {
            throw new UnauthorizedException('Refresh token expired');
        }

        const user = await this.users.findByIdOrFail(stored.userId);
        if (!user.isActive) throw new ForbiddenException('Account disabled');

        // Rotate: revoke the old, issue a new pair
        await this.refreshRepo.update(stored.id, { revokedAt: new Date() });
        const roles = await this.rbac.getUserRoleCodes(user.id);

        return this.issueTokens(user.id, user.email, user.phone, roles, {
            ip: ctx.ip,
            userAgent: ctx.userAgent,
        });
    }

    // ══════════════════════════════════════════════════════════════════
    //  LOGOUT
    // ══════════════════════════════════════════════════════════════════

    async logout(refreshToken: string): Promise<void> {
        const tokenHash = this.hashToken(refreshToken);
        await this.refreshRepo.update({ tokenHash }, { revokedAt: new Date() });
    }

    async logoutAll(userId: string): Promise<void> {
        await this.refreshRepo.update(
            { userId, revokedAt: undefined },
            { revokedAt: new Date() },
        );
    }

    // ══════════════════════════════════════════════════════════════════
    //  CHANGE PASSWORD
    // ══════════════════════════════════════════════════════════════════

    async changePassword(
        userId: string,
        oldPassword: string,
        newPassword: string,
    ): Promise<void> {
        const currentHash = await this.users.getPasswordHashForAuth(userId);
        if (!currentHash) throw new UnauthorizedException('User not found');

        const ok = await this.verifyPassword(oldPassword, currentHash);
        if (!ok) throw new BadRequestException('Old password is incorrect');

        const newHash = await this.hashPassword(newPassword);
        await this.users.setPasswordHash(userId, newHash);

        // Revoke all refresh tokens so stolen sessions die
        await this.logoutAll(userId);
    }

    // ══════════════════════════════════════════════════════════════════
    //  INTERNAL HELPERS
    // ══════════════════════════════════════════════════════════════════

    private async issueTokens(
        userId: string,
        email: string | null,
        phone: string | null,
        roles: string[],
        ctx: LoginContext,
    ): Promise<AuthResponseDto> {
        // Parse TTLs as integers so jsonwebtoken treats them as seconds, not milliseconds
        const accessTtl = parseInt(this.config.get<string>('JWT_ACCESS_TTL') ?? '900', 10);
        const refreshTtl = parseInt(this.config.get<string>('JWT_REFRESH_TTL') ?? '604800', 10);
        const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET')!;

        const payload: JwtPayload = { sub: userId, email, phone, roles };

        const accessToken = await this.jwt.signAsync(payload, {
            secret: this.config.get<string>('JWT_ACCESS_SECRET')!,
            expiresIn: accessTtl, // Now properly passed as a Number
        });

        // Refresh token = random opaque string (NOT a JWT). We store its hash.
        const refreshToken = randomBytes(48).toString('base64url');
        const tokenHash = this.hashToken(refreshToken);

        await this.refreshRepo.save(
            this.refreshRepo.create({
                userId,
                tokenHash,
                userAgent: ctx.userAgent ?? null,
                ipAddress: ctx.ip ?? null,
                expiresAt: new Date(Date.now() + refreshTtl * 1000),
            }),
        );

        // Touch the refresh secret so TypeScript doesn't complain — not used for JWT
        void refreshSecret;

        const user = await this.users.findByIdOrFail(userId);

        return {
            accessToken,
            refreshToken,
            accessTokenExpiresIn: accessTtl,
            refreshTokenExpiresIn: refreshTtl,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                roles,
                mustChangePassword: user.mustChangePassword,
            },
        };
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }
}

export interface LoginContext {
    ip?: string;
    userAgent?: string;
}