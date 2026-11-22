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
});
