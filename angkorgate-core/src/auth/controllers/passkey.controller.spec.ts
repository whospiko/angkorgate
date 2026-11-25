import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PasskeyController } from './passkey.controller';
import { PasskeyService } from '../services/passkey.service';
import { RbacService } from '../../rbac/services/rbac.service';

describe('PasskeyController', () => {
    let controller: PasskeyController;
    let passkeyService: any;
    let rbacService: any;

    const mockRequest: any = {
        headers: {
            origin: 'http://localhost:3000',
            host: 'localhost:8080',
            'user-agent': 'Mozilla/5.0 Chrome',
            'x-forwarded-for': '127.0.0.1',
        },
        socket: { remoteAddress: '127.0.0.1' },
    };

    beforeEach(async () => {
        passkeyService = {
            generateRegistrationOptions: jest.fn().mockResolvedValue({ challenge: 'reg-chal-123' }),
            verifyRegistration: jest.fn().mockResolvedValue({ id: 'pk-1', friendlyName: 'Key 1' }),
            listUserPasskeys: jest.fn().mockResolvedValue([{ id: 'pk-1', friendlyName: 'Key 1' }]),
            renameUserPasskey: jest.fn().mockResolvedValue({ id: 'pk-1', friendlyName: 'New Key' }),
            deleteUserPasskey: jest.fn().mockResolvedValue({ success: true }),
            generateAuthenticationOptions: jest.fn().mockResolvedValue({ challenge: 'auth-chal-456', challengeId: 'cid-1' }),
            verifyAuthentication: jest.fn().mockResolvedValue({ accessToken: 'jwt-passkey-token' }),
            adminListUserPasskeys: jest.fn().mockResolvedValue([{ id: 'pk-1' }]),
            adminDeleteUserPasskey: jest.fn().mockResolvedValue({ success: true }),
        };

        rbacService = {
            hasPermission: jest.fn().mockResolvedValue(true),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PasskeyController],
            providers: [
                { provide: PasskeyService, useValue: passkeyService },
                { provide: RbacService, useValue: rbacService },
                Reflector,
            ],
        }).compile();

        controller = module.get<PasskeyController>(PasskeyController);
    });

    it('should delegate getRegisterOptions to passkeyService', async () => {
        const res = await controller.getRegisterOptions('u-1', { userDisplayName: 'Piko' }, mockRequest);
        expect(passkeyService.generateRegistrationOptions).toHaveBeenCalledWith(
            'u-1',
            'http://localhost:3000',
            'localhost:8080',
            'Piko',
        );
        expect(res.challenge).toBe('reg-chal-123');
    });

    it('should delegate verifyRegister to passkeyService', async () => {
        const res = await controller.verifyRegister('u-1', { response: { id: 'c1' }, friendlyName: 'My Key' }, mockRequest);
        expect(passkeyService.verifyRegistration).toHaveBeenCalledWith(
            'u-1',
            { id: 'c1' },
            'My Key',
            'http://localhost:3000',
            'localhost:8080',
            expect.objectContaining({ ip: '127.0.0.1' }),
        );
        expect(res.id).toBe('pk-1');
    });

    it('should delegate listMyPasskeys', async () => {
        const res = await controller.listMyPasskeys('u-1');
        expect(passkeyService.listUserPasskeys).toHaveBeenCalledWith('u-1');
        expect(res).toHaveLength(1);
    });

    it('should delegate renamePasskey', async () => {
        const res = await controller.renamePasskey('u-1', 'pk-1', { friendlyName: 'New Key' });
        expect(passkeyService.renameUserPasskey).toHaveBeenCalledWith('u-1', 'pk-1', 'New Key');
        expect(res.friendlyName).toBe('New Key');
    });

    it('should delegate deletePasskey', async () => {
        const res = await controller.deletePasskey('u-1', 'pk-1');
        expect(passkeyService.deleteUserPasskey).toHaveBeenCalledWith('u-1', 'pk-1');
        expect(res.success).toBe(true);
    });

    it('should delegate getAuthOptions', async () => {
        const res = await controller.getAuthOptions({ email: 'user@example.com' }, mockRequest);
        expect(passkeyService.generateAuthenticationOptions).toHaveBeenCalledWith('user@example.com', 'localhost:8080');
        expect(res.challengeId).toBe('cid-1');
    });

    it('should delegate verifyAuth', async () => {
        const res = await controller.verifyAuth({ challengeId: 'cid-1', response: { id: 'c1' } }, mockRequest);
        expect(passkeyService.verifyAuthentication).toHaveBeenCalledWith(
            'cid-1',
            { id: 'c1' },
            'http://localhost:3000',
            'localhost:8080',
            expect.objectContaining({ ip: '127.0.0.1' }),
        );
        expect(res.accessToken).toBe('jwt-passkey-token');
    });

    it('should delegate adminListPasskeys and adminDeletePasskey', async () => {
        await controller.adminListPasskeys('u-target');
        expect(passkeyService.adminListUserPasskeys).toHaveBeenCalledWith('u-target');

        await controller.adminDeletePasskey('admin-1', 'u-target', 'pk-1');
        expect(passkeyService.adminDeleteUserPasskey).toHaveBeenCalledWith('u-target', 'pk-1', 'admin-1');
    });
});
