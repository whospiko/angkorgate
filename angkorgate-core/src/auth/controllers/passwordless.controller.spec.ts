import { Test } from '@nestjs/testing';
import { PasswordlessController } from './passwordless.controller';
import { PasswordlessService } from '../services/passwordless.service';

describe('PasswordlessController', () => {
    let controller: PasswordlessController;
    let service: Record<string, jest.Mock>;

    const mockReq = {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'jest-agent' },
        socket: { remoteAddress: '127.0.0.1' },
    } as any;

    beforeEach(async () => {
        service = {
            requestMagicLink: jest.fn().mockResolvedValue({
                message: 'Sent',
                channel: 'magic_link',
                expiresInSeconds: 900,
            }),
            verifyMagicLink: jest.fn().mockResolvedValue({
                accessToken: 'jwt',
                refreshToken: 'ref',
            }),
            requestOtp: jest.fn().mockResolvedValue({
                message: 'Sent',
                channel: 'email_otp',
                expiresInSeconds: 600,
            }),
            verifyOtp: jest.fn().mockResolvedValue({
                accessToken: 'jwt',
                refreshToken: 'ref',
            }),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [PasswordlessController],
            providers: [{ provide: PasswordlessService, useValue: service }],
        }).compile();

        controller = moduleRef.get(PasswordlessController);
    });

    it('delegates requestMagicLink with client context', async () => {
        const res = await controller.requestMagicLink({ email: 'a@b.com' }, mockReq);
        expect(res.channel).toBe('magic_link');
        expect(service.requestMagicLink).toHaveBeenCalledWith(
            { email: 'a@b.com' },
            expect.objectContaining({ ip: '10.0.0.1', userAgent: 'jest-agent' }),
        );
    });

    it('delegates verifyMagicLink', async () => {
        const res = await controller.verifyMagicLink({ token: 'tok' }, mockReq);
        expect(res.accessToken).toBe('jwt');
        expect(service.verifyMagicLink).toHaveBeenCalledWith(
            'tok',
            expect.objectContaining({ ip: '10.0.0.1' }),
        );
    });

    it('delegates requestOtp and verifyOtp', async () => {
        await controller.requestOtp({ channel: 'sms', phone: '+85512345678' }, mockReq);
        expect(service.requestOtp).toHaveBeenCalledWith(
            { channel: 'sms', phone: '+85512345678' },
            expect.any(Object),
        );

        await controller.verifyOtp(
            { channel: 'sms', phone: '+85512345678', code: '123456' },
            mockReq,
        );
        expect(service.verifyOtp).toHaveBeenCalledWith(
            { channel: 'sms', phone: '+85512345678', code: '123456' },
            expect.any(Object),
        );
    });
});
