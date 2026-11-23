import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OidcController } from './oidc.controller';
import { OidcService } from '../services/oidc.service';
import { AuthService } from '../../auth/services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { MfaService } from '../../auth/services/mfa.service';

describe('OidcController', () => {
    let controller: OidcController;
    let oidcService: any;
    let authService: { verifyPassword: jest.Mock };
    let usersService: { findAuthRecordByEmail: jest.Mock };
    let mfaService: { isEnabled: jest.Mock; verifyCodeOrBackup: jest.Mock };
    let config: { get: jest.Mock };

    let mockReq: any;
    let mockRes: any;

    beforeEach(async () => {
        const callbackFn = jest.fn();
        oidcService = {
            callback: jest.fn(() => callbackFn),
            oidc: {
                interactionDetails: jest.fn(),
                interactionFinished: jest.fn(),
                interactionResult: jest.fn(),
                Grant: class {
                    addOIDCScope = jest.fn();
                    addOIDCClaims = jest.fn();
                    addResourceScope = jest.fn();
                    save = jest.fn().mockResolvedValue('grant-id-123');
                    static find = jest.fn();
                },
            },
        };

        authService = {
            verifyPassword: jest.fn(),
        };

        usersService = {
            findAuthRecordByEmail: jest.fn(),
        };

        mfaService = {
            isEnabled: jest.fn(),
            verifyCodeOrBackup: jest.fn(),
        };

        config = {
            get: jest.fn((key: string) => {
                if (key === 'CONSOLE_URL') return 'http://localhost:5173';
                return null;
            }),
        };

        mockReq = {
            accepts: jest.fn().mockReturnValue(false),
            headers: {},
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            redirect: jest.fn().mockReturnThis(),
        };

        const module = await Test.createTestingModule({
            controllers: [OidcController],
            providers: [
                { provide: OidcService, useValue: oidcService },
                { provide: AuthService, useValue: authService },
                { provide: UsersService, useValue: usersService },
                { provide: MfaService, useValue: mfaService },
                { provide: ConfigService, useValue: config },
            ],
        }).compile();

        controller = module.get(OidcController);
    });

    describe('discovery & jwks endpoints', () => {
        it('calls provider callback for discovery', async () => {
            await controller.discovery(mockReq, mockRes);
            expect(oidcService.callback).toHaveBeenCalled();
        });

        it('calls provider callback for jwks', async () => {
            await controller.jwks(mockReq, mockRes);
            expect(oidcService.callback).toHaveBeenCalled();
        });
    });

    describe('GET interaction/:uid', () => {
        it('redirects to console login on login prompt', async () => {
            oidcService.oidc.interactionDetails.mockResolvedValue({
                uid: 'interaction-123',
                prompt: { name: 'login' },
                params: { client_id: 'clinic-prod' },
            });

            await controller.interaction('interaction-123', mockReq, mockRes);
            expect(mockRes.redirect).toHaveBeenCalledWith(
                'http://localhost:5173/login?interaction=interaction-123',
            );
        });

        it('returns json interaction details when requested as json', async () => {
            mockReq.accepts.mockImplementation((type: string) => type === 'json');
            oidcService.oidc.interactionDetails.mockResolvedValue({
                uid: 'interaction-123',
                prompt: { name: 'login' },
                params: { client_id: 'clinic-prod' },
            });

            await controller.interaction('interaction-123', mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ uid: 'interaction-123' }),
            );
        });

        it('automatically resolves consent when prompt is consent', async () => {
            oidcService.oidc.interactionDetails.mockResolvedValue({
                uid: 'interaction-123',
                prompt: {
                    name: 'consent',
                    details: {
                        missingOIDCScope: ['openid', 'email'],
                    },
                },
                params: { client_id: 'clinic-prod' },
                session: { accountId: 'user-1' },
            });

            await controller.interaction('interaction-123', mockReq, mockRes);
            expect(oidcService.oidc.interactionFinished).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                { consent: { grantId: 'grant-id-123' } },
                { mergeWithLastSubmission: true },
            );
        });
    });

    describe('POST interaction/:uid/login', () => {
        beforeEach(() => {
            oidcService.oidc.interactionDetails.mockResolvedValue({
                uid: 'interaction-123',
                prompt: { name: 'login' },
            });
        });

        it('rejects if email or password missing', async () => {
            await controller.login('interaction-123', { email: '', password: '' }, mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Email and password are required' });
        });

        it('rejects if user not found', async () => {
            usersService.findAuthRecordByEmail.mockResolvedValue(null);
            await controller.login('interaction-123', { email: 'wrong@test.com', password: 'password' }, mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('rejects if user is inactive', async () => {
            usersService.findAuthRecordByEmail.mockResolvedValue({
                id: 'user-1',
                isActive: false,
                passwordHash: 'hash',
            });
            await controller.login('interaction-123', { email: 'inactive@test.com', password: 'password' }, mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Account disabled' });
        });

        it('rejects if password does not match', async () => {
            usersService.findAuthRecordByEmail.mockResolvedValue({
                id: 'user-1',
                isActive: true,
                passwordHash: 'hash',
            });
            authService.verifyPassword.mockResolvedValue(false);
            await controller.login('interaction-123', { email: 'user@test.com', password: 'wrong' }, mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('requires MFA if MFA is enabled on user', async () => {
            usersService.findAuthRecordByEmail.mockResolvedValue({
                id: 'user-1',
                isActive: true,
                passwordHash: 'hash',
            });
            authService.verifyPassword.mockResolvedValue(true);
            mfaService.isEnabled.mockResolvedValue(true);

            await controller.login('interaction-123', { email: 'user@test.com', password: 'password' }, mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'MFA_REQUIRED' }));
        });

        it('rejects invalid MFA code', async () => {
            usersService.findAuthRecordByEmail.mockResolvedValue({
                id: 'user-1',
                isActive: true,
                passwordHash: 'hash',
            });
            authService.verifyPassword.mockResolvedValue(true);
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.verifyCodeOrBackup.mockResolvedValue({ valid: false });

            await controller.login(
                'interaction-123',
                { email: 'user@test.com', password: 'password', mfaCode: '000000' },
                mockReq,
                mockRes,
            );
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_MFA_CODE' }));
        });

        it('completes login interaction on valid credentials', async () => {
            usersService.findAuthRecordByEmail.mockResolvedValue({
                id: 'user-1',
                isActive: true,
                passwordHash: 'hash',
            });
            authService.verifyPassword.mockResolvedValue(true);
            mfaService.isEnabled.mockResolvedValue(false);

            await controller.login(
                'interaction-123',
                { email: 'user@test.com', password: 'correct-password' },
                mockReq,
                mockRes,
            );

            expect(oidcService.oidc.interactionFinished).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                { login: { accountId: 'user-1', remember: true } },
                { mergeWithLastSubmission: false },
            );
        });
    });

    describe('POST interaction/:uid/abort', () => {
        it('aborts interaction with access_denied', async () => {
            await controller.abort('interaction-123', mockReq, mockRes);
            expect(oidcService.oidc.interactionFinished).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                { error: 'access_denied', error_description: 'End-user aborted interaction' },
                { mergeWithLastSubmission: false },
            );
        });
    });
});
