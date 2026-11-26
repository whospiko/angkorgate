import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OidcService } from './oidc.service';
import { OidcAdapterService } from '../adapters/oidc.adapter';
import { UsersService } from '../../users/services/users.service';
import { RbacService } from '../../rbac/services/rbac.service';

describe('OidcService', () => {
    let service: OidcService;
    let config: { get: jest.Mock };
    let adapterService: { createAdapter: jest.Mock };
    let usersService: { findById: jest.Mock };
    let rbacService: { getUserRoleCodes: jest.Mock; getUserPermissions: jest.Mock };

    beforeEach(async () => {
        config = {
            get: jest.fn((key: string) => {
                if (key === 'OIDC_ISSUER') return 'http://localhost:8080/oidc';
                if (key === 'JWT_ACCESS_SECRET') return 'test-jwt-secret-with-at-least-32-chars';
                if (key === 'OIDC_CLIENT_ID') return 'test-client';
                if (key === 'OIDC_CLIENT_SECRET') return 'test-secret';
                return null;
            }),
        };

        adapterService = {
            createAdapter: jest.fn(),
        };

        usersService = {
            findById: jest.fn(),
        };

        rbacService = {
            getUserRoleCodes: jest.fn(),
            getUserPermissions: jest.fn(),
        };

        const module = await Test.createTestingModule({
            providers: [
                OidcService,
                { provide: ConfigService, useValue: config },
                { provide: OidcAdapterService, useValue: adapterService },
                { provide: UsersService, useValue: usersService },
                { provide: RbacService, useValue: rbacService },
            ],
        }).compile();

        service = module.get(OidcService);
    });

    it('initializes OidcService and provider on module init', async () => {
        await service.onModuleInit();
        expect(service.oidc).toBeDefined();
        expect(service.oidc.issuer).toBe('http://localhost:8080/oidc');
    });

    it('returns callback handler from provider', async () => {
        await service.onModuleInit();
        const callback = service.callback();
        expect(typeof callback).toBe('function');
    });

    it('resolves and clamps OIDC token TTLs safely', () => {
        expect(service.getOidcTtl('OIDC_ACCESS_TOKEN_TTL', 3600, 60, 86400)).toBe(3600);
        expect(service.getOidcTtl('OIDC_REFRESH_TOKEN_TTL', 15552000, 300, 31536000)).toBe(15552000);

        config.get.mockImplementation((key: string) => {
            if (key === 'OIDC_ACCESS_TOKEN_TTL') return '10'; // below min 60
            if (key === 'OIDC_REFRESH_TOKEN_TTL') return '99999999'; // above max 31536000
            if (key === 'OIDC_ID_TOKEN_TTL') return '1800';
            return null;
        });

        expect(service.getOidcTtl('OIDC_ACCESS_TOKEN_TTL', 3600, 60, 86400)).toBe(60);
        expect(service.getOidcTtl('OIDC_REFRESH_TOKEN_TTL', 1209600, 300, 31536000)).toBe(31536000);
        expect(service.getOidcTtl('OIDC_ID_TOKEN_TTL', 3600, 60, 86400)).toBe(1800);
    });
});
