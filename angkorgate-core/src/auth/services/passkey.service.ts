import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { UserPasskey } from '../entities/user-passkey.entity';
import { UsersService } from '../../users/services/users.service';
import { AuthService, LoginContext } from './auth.service';
import { CacheService } from '../../cache/cache.service';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class PasskeyService {
    private readonly logger = new Logger(PasskeyService.name);

    constructor(
        @InjectRepository(UserPasskey)
        private readonly passkeyRepo: Repository<UserPasskey>,
        private readonly usersService: UsersService,
        private readonly authService: AuthService,
        private readonly cacheService: CacheService,
        private readonly configService: ConfigService,
        private readonly auditService: AuditService,
    ) { }

    private getRpID(reqHost?: string): string {
        const configuredRpId = this.configService.get<string>('webauthn.rpId', 'localhost');
        if (reqHost) {
            const hostWithoutPort = reqHost.split(':')[0];
            if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
                return 'localhost';
            }
        }
        return configuredRpId;
    }

    private getAllowedOrigins(reqOrigin?: string): string[] {
        const configured = this.configService.get<string[]>('webauthn.origins') || [
            'http://localhost:4000',
            'http://localhost:3000',
            'http://localhost:8080',
            'http://127.0.0.1:4000',
            'http://127.0.0.1:3000',
        ];

        const origins = new Set<string>(configured.map((o) => o.trim()));
        if (reqOrigin) {
            try {
                const url = new URL(reqOrigin);
                if (
                    process.env.NODE_ENV !== 'production' ||
                    url.hostname === 'localhost' ||
                    url.hostname === '127.0.0.1'
                ) {
                    origins.add(url.origin);
                }
            } catch {
                // Ignore URL parsing failure
            }
        }
        return Array.from(origins);
    }

    /**
     * Generate registration options for a logged-in user to register a new Passkey.
     */
    async generateRegistrationOptions(
        userId: string,
        reqOrigin?: string,
        reqHost?: string,
        userDisplayName?: string,
    ) {
        const user = await this.usersService.findByIdOrFail(userId);
        const existingPasskeys = await this.passkeyRepo.find({ where: { userId } });

        const rpID = this.getRpID(reqHost);
        const rpName = this.configService.get<string>('webauthn.rpName', 'AngkorGate');

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: new Uint8Array(Buffer.from(user.id)),
            userName: user.email || user.phone || user.id,
            userDisplayName: userDisplayName || user.email || 'AngkorGate User',
            attestationType: 'none',
            excludeCredentials: existingPasskeys.map((p) => ({
                id: p.credentialId,
                transports: p.transports ? (p.transports.split(',') as any) : undefined,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });

        // Cache registration challenge with 5 min TTL
        await this.cacheService.set(`passkey:reg-challenge:${userId}`, options.challenge, 300);

        return options;
    }

    /**
     * Verify registration assertion and persist user passkey.
     */
    async verifyRegistration(
        userId: string,
        response: any,
        friendlyName?: string,
        reqOrigin?: string,
        reqHost?: string,
        ctx?: LoginContext,
    ) {
        const expectedChallenge = await this.cacheService.get<string>(`passkey:reg-challenge:${userId}`);
        if (!expectedChallenge) {
            throw new BadRequestException('Passkey registration challenge expired or not found. Please try again.');
        }

        const rpID = this.getRpID(reqHost);
        const expectedOrigins = this.getAllowedOrigins(reqOrigin);

        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response,
                expectedChallenge,
                expectedOrigin: expectedOrigins,
                expectedRPID: rpID,
                requireUserVerification: false,
            });
        } catch (err: any) {
            this.logger.warn(`Passkey registration verification failed for user ${userId}: ${err.message}`);
            throw new BadRequestException(`Passkey verification failed: ${err.message}`);
        }

        if (!verification.verified || !verification.registrationInfo) {
            throw new BadRequestException('Passkey verification could not be completed.');
        }

        const { credential, credentialDeviceType, credentialBackedUp, aaguid } = verification.registrationInfo;

        const passkey = this.passkeyRepo.create({
            userId,
            credentialId: credential.id,
            publicKey: Buffer.from(credential.publicKey).toString('base64url'),
            counter: credential.counter,
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
            transports: credential.transports ? credential.transports.join(',') : null,
            friendlyName: friendlyName?.trim() || 'Biometric Passkey',
            aaguid: aaguid || null,
        });

        const saved = await this.passkeyRepo.save(passkey);
        await this.cacheService.del(`passkey:reg-challenge:${userId}`);

        void this.auditService.log({
            actorId: userId,
            action: 'auth.passkey.registered',
            entity: 'user_passkey',
            entityId: saved.id,
            ipAddress: ctx?.ip ?? null,
            newValue: {
                friendlyName: saved.friendlyName,
                deviceType: saved.deviceType,
                credentialId: saved.credentialId,
            },
        });

        return {
            id: saved.id,
            credentialId: saved.credentialId,
            friendlyName: saved.friendlyName,
            deviceType: saved.deviceType,
            backedUp: saved.backedUp,
            createdAt: saved.createdAt,
        };
    }

    /**
     * Generate authentication options for passkey sign-in (supports discoverable credentials / resident keys).
     */
    async generateAuthenticationOptions(email?: string, reqHost?: string) {
        const challengeId = randomUUID();
        const rpID = this.getRpID(reqHost);

        let allowCredentials: any[] | undefined = undefined;
        let targetUserId: string | null = null;

        if (email) {
            const user = await this.usersService.findAuthRecordByEmail(email);
            if (user) {
                targetUserId = user.id;
                const userPasskeys = await this.passkeyRepo.find({ where: { userId: user.id } });
                if (userPasskeys.length > 0) {
                    allowCredentials = userPasskeys.map((p) => ({
                        id: p.credentialId,
                        transports: p.transports ? (p.transports.split(',') as any) : undefined,
                    }));
                }
            }
        }

        const options = await generateAuthenticationOptions({
            rpID,
            userVerification: 'preferred',
            allowCredentials,
        });

        await this.cacheService.set(
            `passkey:auth-challenge:${challengeId}`,
            JSON.stringify({ challenge: options.challenge, targetUserId }),
            300,
        );

        return {
            ...options,
            challengeId,
        };
    }

    /**
     * Verify passkey authentication assertion and issue authentication tokens.
     */
    async verifyAuthentication(
        challengeId: string,
        response: any,
        reqOrigin?: string,
        reqHost?: string,
        ctx?: LoginContext,
    ) {
        const cachedRaw = await this.cacheService.get<string>(`passkey:auth-challenge:${challengeId}`);
        if (!cachedRaw) {
            throw new BadRequestException('Passkey authentication challenge expired or invalid. Please try again.');
        }

        let cachedChallenge: string;
        try {
            const parsed = typeof cachedRaw === 'string' ? JSON.parse(cachedRaw) : cachedRaw;
            cachedChallenge = parsed.challenge;
        } catch {
            cachedChallenge = cachedRaw;
        }

        const credentialId = response.id;
        const passkey = await this.passkeyRepo.findOne({
            where: { credentialId },
            relations: { user: true },
        });

        if (!passkey || !passkey.user) {
            throw new UnauthorizedException('Unrecognized passkey credential. Please sign in with password or register this passkey.');
        }

        if (!passkey.user.isActive) {
            throw new ForbiddenException('Account disabled');
        }
        if (passkey.user.lockedUntil && passkey.user.lockedUntil > new Date()) {
            throw new ForbiddenException(`Account locked until ${passkey.user.lockedUntil.toISOString()}`);
        }

        const rpID = this.getRpID(reqHost);
        const expectedOrigins = this.getAllowedOrigins(reqOrigin);

        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response,
                expectedChallenge: cachedChallenge,
                expectedOrigin: expectedOrigins,
                expectedRPID: rpID,
                credential: {
                    id: passkey.credentialId,
                    publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')),
                    counter: Number(passkey.counter),
                    transports: passkey.transports ? (passkey.transports.split(',') as any) : undefined,
                },
                requireUserVerification: false,
            });
        } catch (err: any) {
            this.logger.warn(`Passkey auth failed for user ${passkey.userId}: ${err.message}`);
            throw new UnauthorizedException(`Passkey authentication failed: ${err.message}`);
        }

        if (!verification.verified) {
            throw new UnauthorizedException('Passkey verification failed.');
        }

        // Update counter and lastUsedAt
        passkey.counter = verification.authenticationInfo.newCounter;
        passkey.lastUsedAt = new Date();
        await this.passkeyRepo.save(passkey);

        // Reset user failed attempts & update last login
        await this.usersService.setFailedAttempts(passkey.userId, 0, null);
        await this.usersService.setLastLogin(passkey.userId);
        await this.cacheService.del(`passkey:auth-challenge:${challengeId}`);

        void this.auditService.log({
            actorId: passkey.userId,
            action: 'auth.login.passkey',
            entity: 'user',
            entityId: passkey.userId,
            ipAddress: ctx?.ip ?? null,
            newValue: {
                credentialId: passkey.credentialId,
                friendlyName: passkey.friendlyName,
            },
        });

        // Issue tokens
        return this.authService.issueTokensForUser(
            passkey.userId,
            passkey.user.email,
            passkey.user.phone,
            ctx || {},
        );
    }

    /**
     * List registered passkeys for a user.
     */
    async listUserPasskeys(userId: string) {
        const passkeys = await this.passkeyRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });

        return passkeys.map((p) => ({
            id: p.id,
            credentialId: p.credentialId,
            friendlyName: p.friendlyName,
            deviceType: p.deviceType,
            backedUp: p.backedUp,
            lastUsedAt: p.lastUsedAt,
            createdAt: p.createdAt,
        }));
    }

    /**
     * Delete a passkey belonging to the user.
     */
    async deleteUserPasskey(userId: string, passkeyId: string) {
        const passkey = await this.passkeyRepo.findOne({
            where: { id: passkeyId, userId },
        });

        if (!passkey) {
            throw new NotFoundException('Passkey not found');
        }

        await this.passkeyRepo.remove(passkey);

        void this.auditService.log({
            actorId: userId,
            action: 'auth.passkey.deleted',
            entity: 'user_passkey',
            entityId: passkeyId,
            oldValue: {
                friendlyName: passkey.friendlyName,
                credentialId: passkey.credentialId,
            },
        });

        return { success: true, message: 'Passkey deleted successfully' };
    }

    /**
     * Rename a passkey.
     */
    async renameUserPasskey(userId: string, passkeyId: string, friendlyName: string) {
        const passkey = await this.passkeyRepo.findOne({
            where: { id: passkeyId, userId },
        });

        if (!passkey) {
            throw new NotFoundException('Passkey not found');
        }

        const oldName = passkey.friendlyName;
        passkey.friendlyName = friendlyName.trim();
        const updated = await this.passkeyRepo.save(passkey);

        void this.auditService.log({
            actorId: userId,
            action: 'auth.passkey.renamed',
            entity: 'user_passkey',
            entityId: passkeyId,
            oldValue: { friendlyName: oldName },
            newValue: { friendlyName: updated.friendlyName },
        });

        return {
            id: updated.id,
            friendlyName: updated.friendlyName,
            updatedAt: updated.updatedAt,
        };
    }

    /**
     * Admin: list passkeys for any user ID.
     */
    async adminListUserPasskeys(targetUserId: string) {
        return this.listUserPasskeys(targetUserId);
    }

    /**
     * Admin: revoke/delete a user's passkey.
     */
    async adminDeleteUserPasskey(targetUserId: string, passkeyId: string, adminId: string) {
        const passkey = await this.passkeyRepo.findOne({
            where: { id: passkeyId, userId: targetUserId },
        });

        if (!passkey) {
            throw new NotFoundException('Passkey not found');
        }

        await this.passkeyRepo.remove(passkey);

        void this.auditService.log({
            actorId: adminId,
            action: 'auth.passkey.admin_revoked',
            entity: 'user_passkey',
            entityId: passkeyId,
            oldValue: {
                userId: targetUserId,
                friendlyName: passkey.friendlyName,
                credentialId: passkey.credentialId,
            },
        });

        return { success: true, message: 'Passkey revoked by administrator' };
    }
}
