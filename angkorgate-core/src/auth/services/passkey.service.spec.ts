import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PasskeyService } from './passkey.service';
import { UserPasskey } from '../entities/user-passkey.entity';
import { UsersService } from '../../users/services/users.service';
import { AuthService } from './auth.service';
import { CacheService } from '../../cache/cache.service';
import { AuditService } from '../../audit/services/audit.service';
import * as simplewebauthn from '@simplewebauthn/server';

jest.mock('@simplewebauthn/server', () => ({
    generateRegistrationOptions: jest.fn(),
    verifyRegistrationResponse: jest.fn(),
    generateAuthenticationOptions: jest.fn(),
    verifyAuthenticationResponse: jest.fn(),
}));

describe('PasskeyService', () => {
    let service: PasskeyService;
    let passkeyRepo: any;
    let usersService: any;
    let authService: any;
    let cacheService: any;
    let auditService: any;

    const mockUser = {
        id: 'u-1234',
        email: 'user@example.com',
        phone: null,
        isActive: true,
        lockedUntil: null,
    };

    const mockPasskey = {
        id: 'pk-999',
        userId: 'u-1234',
        credentialId: 'cred-abc',
        publicKey: 'pubkey-base64',
        counter: 10,
        deviceType: 'singleDevice',
        backedUp: false,
        transports: 'internal,hybrid',
        friendlyName: 'MacBook Touch ID',
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
    };

    beforeEach(async () => {
        passkeyRepo = {
            find: jest.fn().mockResolvedValue([mockPasskey]),
            findOne: jest.fn().mockResolvedValue(mockPasskey),
            create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'pk-new' })),
            save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: entity.id || 'pk-new' })),
            remove: jest.fn().mockResolvedValue(undefined),
        };

        usersService = {
            findByIdOrFail: jest.fn().mockResolvedValue(mockUser),
            findAuthRecordByEmail: jest.fn().mockResolvedValue(mockUser),
            setFailedAttempts: jest.fn().mockResolvedValue(undefined),
            setLastLogin: jest.fn().mockResolvedValue(undefined),
        };

        authService = {
            issueTokensForUser: jest.fn().mockResolvedValue({
                accessToken: 'access-jwt',
                refreshToken: 'refresh-jwt',
                expiresIn: 900,
            }),
        };

        cacheService = {
            get: jest.fn(),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
        };

        auditService = {
            log: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PasskeyService,
                { provide: getRepositoryToken(UserPasskey), useValue: passkeyRepo },
                { provide: UsersService, useValue: usersService },
                { provide: AuthService, useValue: authService },
                { provide: CacheService, useValue: cacheService },
                { provide: AuditService, useValue: auditService },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultValue?: any) => {
                            if (key === 'webauthn.rpId') return 'localhost';
                            if (key === 'webauthn.rpName') return 'AngkorGate';
                            if (key === 'webauthn.origins') return ['http://localhost:3000', 'http://localhost:8080'];
                            return defaultValue;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<PasskeyService>(PasskeyService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateRegistrationOptions', () => {
        it('should generate registration options and cache the challenge', async () => {
            (simplewebauthn.generateRegistrationOptions as jest.Mock).mockResolvedValue({
                challenge: 'challenge-xyz-123',
                rp: { name: 'AngkorGate', id: 'localhost' },
                user: { id: 'u-1234', name: 'user@example.com' },
            });

            const options = await service.generateRegistrationOptions('u-1234');

            expect(usersService.findByIdOrFail).toHaveBeenCalledWith('u-1234');
            expect(passkeyRepo.find).toHaveBeenCalledWith({ where: { userId: 'u-1234' } });
            expect(cacheService.set).toHaveBeenCalledWith(
                'passkey:reg-challenge:u-1234',
                'challenge-xyz-123',
                300,
            );
            expect(options.challenge).toBe('challenge-xyz-123');
        });
    });

    describe('verifyRegistration', () => {
        it('should throw BadRequestException if registration challenge is missing or expired', async () => {
            cacheService.get.mockResolvedValue(null);

            await expect(
                service.verifyRegistration('u-1234', { id: 'cred-1' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should verify registration and save the new user passkey', async () => {
            cacheService.get.mockResolvedValue('challenge-xyz-123');

            (simplewebauthn.verifyRegistrationResponse as jest.Mock).mockResolvedValue({
                verified: true,
                registrationInfo: {
                    credential: {
                        id: 'cred-new',
                        publicKey: Buffer.from('test-pubkey'),
                        counter: 0,
                        transports: ['internal'],
                    },
                    credentialDeviceType: 'singleDevice',
                    credentialBackedUp: false,
                    aaguid: 'aaguid-123',
                },
            });

            const result = await service.verifyRegistration('u-1234', { id: 'cred-new' }, 'My YubiKey');

            expect(passkeyRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'u-1234',
                    credentialId: 'cred-new',
                    friendlyName: 'My YubiKey',
                }),
            );
            expect(passkeyRepo.save).toHaveBeenCalled();
            expect(cacheService.del).toHaveBeenCalledWith('passkey:reg-challenge:u-1234');
            expect(result.credentialId).toBe('cred-new');
        });
    });

    describe('generateAuthenticationOptions', () => {
        it('should generate discoverable authentication options with a random challengeId', async () => {
            (simplewebauthn.generateAuthenticationOptions as jest.Mock).mockResolvedValue({
                challenge: 'auth-challenge-abc',
                rpId: 'localhost',
            });

            const result = await service.generateAuthenticationOptions();

            expect(result.challenge).toBe('auth-challenge-abc');
            expect(result.challengeId).toBeDefined();
            expect(cacheService.set).toHaveBeenCalledWith(
                expect.stringContaining('passkey:auth-challenge:'),
                expect.any(String),
                300,
            );
        });

        it('should target credentials if an email is provided and matches user passkeys', async () => {
            (simplewebauthn.generateAuthenticationOptions as jest.Mock).mockResolvedValue({
                challenge: 'auth-challenge-abc',
                rpId: 'localhost',
            });

            const result = await service.generateAuthenticationOptions('user@example.com');

            expect(usersService.findAuthRecordByEmail).toHaveBeenCalledWith('user@example.com');
            expect(passkeyRepo.find).toHaveBeenCalledWith({ where: { userId: 'u-1234' } });
            expect(result.challengeId).toBeDefined();
        });
    });

    describe('verifyAuthentication', () => {
        it('should throw BadRequestException if challenge is expired', async () => {
            cacheService.get.mockResolvedValue(null);

            await expect(
                service.verifyAuthentication('invalid-chal', { id: 'cred-abc' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw UnauthorizedException if passkey credential is not found in database', async () => {
            cacheService.get.mockResolvedValue(JSON.stringify({ challenge: 'auth-chal-1' }));
            passkeyRepo.findOne.mockResolvedValue(null);

            await expect(
                service.verifyAuthentication('chal-1', { id: 'cred-unknown' }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should verify authentication, update counter, reset failed attempts, and issue tokens', async () => {
            cacheService.get.mockResolvedValue(JSON.stringify({ challenge: 'auth-chal-1' }));
            passkeyRepo.findOne.mockResolvedValue(mockPasskey);

            (simplewebauthn.verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
                verified: true,
                authenticationInfo: {
                    newCounter: 11,
                },
            });

            const tokens = await service.verifyAuthentication('chal-1', { id: 'cred-abc' });

            expect(passkeyRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    counter: 11,
                }),
            );
            expect(usersService.setFailedAttempts).toHaveBeenCalledWith('u-1234', 0, null);
            expect(usersService.setLastLogin).toHaveBeenCalledWith('u-1234');
            expect(authService.issueTokensForUser).toHaveBeenCalledWith('u-1234', 'user@example.com', null, expect.any(Object));
            expect(tokens.accessToken).toBe('access-jwt');
        });
    });

    describe('listUserPasskeys, renameUserPasskey, and deleteUserPasskey', () => {
        it('should list all passkeys for the user', async () => {
            const list = await service.listUserPasskeys('u-1234');
            expect(list).toHaveLength(1);
            expect(list[0].friendlyName).toBe('MacBook Touch ID');
        });

        it('should rename an existing passkey', async () => {
            const result = await service.renameUserPasskey('u-1234', 'pk-999', 'Renamed Key');
            expect(result.friendlyName).toBe('Renamed Key');
            expect(passkeyRepo.save).toHaveBeenCalled();
        });

        it('should delete a passkey and log audit', async () => {
            const result = await service.deleteUserPasskey('u-1234', 'pk-999');
            expect(passkeyRepo.remove).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should throw NotFoundException when deleting non-existent passkey', async () => {
            passkeyRepo.findOne.mockResolvedValue(null);
            await expect(service.deleteUserPasskey('u-1234', 'pk-bad')).rejects.toThrow(NotFoundException);
        });
    });
});
