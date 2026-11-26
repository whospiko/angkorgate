import { DevOutboxService } from './dev-outbox.service';

describe('DevOutboxService', () => {
    let service: DevOutboxService;

    beforeEach(() => {
        service = new DevOutboxService();
    });

    it('extracts 6-digit OTP codes from SMS messages', () => {
        const item = service.record({
            channel: 'sms',
            to: '+85512345678',
            body: 'Your AngkorGate sign-in code is 482910. It expires in 10 minutes.',
        });

        expect(item.extractedCode).toBe('482910');
        expect(item.extractedLinks).toEqual([]);
        expect(service.list('sms')).toHaveLength(1);
        expect(service.list('email')).toHaveLength(0);
    });

    it('extracts Magic Link URLs from email messages and supports clear()', () => {
        const item = service.record({
            channel: 'email',
            to: 'alice@example.com',
            subject: 'Your one-click sign-in link',
            body: 'Sign in: http://localhost:4000/auth/magic-link?token=abc.def.ghi',
        });

        expect(item.extractedCode).toBeNull();
        expect(item.extractedLinks).toEqual([
            'http://localhost:4000/auth/magic-link?token=abc.def.ghi',
        ]);
        expect(service.list()).toHaveLength(1);

        service.clear();
        expect(service.list()).toHaveLength(0);
    });
});
