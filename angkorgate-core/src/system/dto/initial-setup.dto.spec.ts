import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InitialSetupDto } from './initial-setup.dto';

describe('InitialSetupDto Validation', () => {
    it('passes with valid admin credentials, app name, and confirmPassword present', async () => {
        const dto = plainToInstance(InitialSetupDto, {
            adminEmail: 'piko@angkorgate.com',
            adminPassword: 'SuperPassword123!',
            confirmPassword: 'SuperPassword123!',
            adminName: 'Piko',
            appName: 'AngkorGate Customize',
            logoUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
            organizationName: 'AngkorGate Company',
            supportEmail: '',
            footerText: '',
        });

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('fails when email is invalid', async () => {
        const dto = plainToInstance(InitialSetupDto, {
            adminEmail: 'invalid-email',
            adminPassword: 'SuperPassword123!',
            appName: 'AngkorGate',
        });

        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'adminEmail')).toBe(true);
    });

    it('fails when password is too short', async () => {
        const dto = plainToInstance(InitialSetupDto, {
            adminEmail: 'piko@angkorgate.com',
            adminPassword: 'short',
            appName: 'AngkorGate',
        });

        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'adminPassword')).toBe(true);
    });
});
