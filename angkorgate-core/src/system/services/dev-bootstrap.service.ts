import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../../rbac/entities/role.entity';
import { Permission } from '../../rbac/entities/permission.entity';
import { RolePermission } from '../../rbac/entities/role-permission.entity';
import { UserRole } from '../../rbac/entities/user-role.entity';
import { User } from '../../users/entities/user.entity';
import { Scope } from '../../scopes/entities/scope.entity';
import { AppSetting } from '../../apps/entities/app-setting.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { isSqlite } from '../../common/utils/db-types.util';

const DEFAULT_ROLES = [
    { code: 'ADMIN', name: 'Administrator', description: 'Full access', isSystem: true },
    { code: 'DOCTOR', name: 'Doctor', description: 'Clinical access', isSystem: true },
    { code: 'RECEPTIONIST', name: 'Receptionist', description: 'Front-desk access', isSystem: true },
    { code: 'ACCOUNTANT', name: 'Accountant', description: 'Billing access', isSystem: true },
    { code: 'ASSISTANT', name: 'Assistant', description: 'Assist doctors', isSystem: true },
    { code: 'DEVELOPER', name: 'Developer', description: 'API Key management, API access and third-party integrations', isSystem: true },
    { code: 'CUSTOMER', name: 'Customer', description: 'Self-service customer/patient/guest', isSystem: true },
];

const DEFAULT_PERMISSIONS = [
    { code: 'user:read', resource: 'user', action: 'read' },
    { code: 'user:write', resource: 'user', action: 'write' },
    { code: 'user:delete', resource: 'user', action: 'delete' },
    { code: 'role:read', resource: 'role', action: 'read' },
    { code: 'role:write', resource: 'role', action: 'write' },
    { code: 'permission:read', resource: 'permission', action: 'read' },
    { code: 'permission:write', resource: 'permission', action: 'write' },
    { code: 'employee:read', resource: 'employee', action: 'read' },
    { code: 'employee:write', resource: 'employee', action: 'write' },
    { code: 'customer:read', resource: 'customer', action: 'read' },
    { code: 'customer:write', resource: 'customer', action: 'write' },
    { code: 'audit:read', resource: 'audit', action: 'read' },
    { code: 'app:read', resource: 'app', action: 'read' },
    { code: 'app:write', resource: 'app', action: 'write' },
    { code: 'oauth:read', resource: 'oauth', action: 'read' },
    { code: 'oauth:write', resource: 'oauth', action: 'write' },
    { code: 'apikey:read', resource: 'apikey', action: 'read' },
    { code: 'apikey:write', resource: 'apikey', action: 'write' },
    { code: 'apikey:delete', resource: 'apikey', action: 'delete' },
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    ADMIN: DEFAULT_PERMISSIONS.map((p) => p.code),
    DOCTOR: ['customer:read', 'customer:write', 'employee:read'],
    RECEPTIONIST: ['customer:read', 'customer:write', 'employee:read'],
    ACCOUNTANT: ['customer:read'],
    ASSISTANT: ['customer:read'],
    DEVELOPER: [
        'apikey:read', 'apikey:write', 'apikey:delete',
        'customer:read', 'customer:write', 'employee:read', 'employee:write',
        'app:read',
    ],
    CUSTOMER: [],
};

const DEFAULT_SCOPES = [
    { name: 'openid', displayName: 'OpenID', description: 'OpenID Connect subject identifier', claims: ['sub'], isDefault: true },
    { name: 'profile', displayName: 'Profile', description: 'User basic profile data', claims: ['name', 'preferred_username', 'given_name', 'family_name'], isDefault: true },
    { name: 'email', displayName: 'Email', description: 'User email address and verification state', claims: ['email', 'email_verified'], isDefault: true },
    { name: 'phone', displayName: 'Phone', description: 'User phone number and verification state', claims: ['phone', 'phone_verified'], isDefault: false },
    { name: 'roles', displayName: 'Roles', description: 'Assigned application and realm roles', claims: ['roles', 'https://angkorgate.com/roles'], isDefault: true },
    { name: 'permissions', displayName: 'Permissions', description: 'Granular RBAC permission codes', claims: ['permissions', 'https://angkorgate.com/permissions'], isDefault: false },
    { name: 'offline_access', displayName: 'Offline Access', description: 'Refresh token for offline/background access', claims: [], isDefault: true },
];

@Injectable()
export class DevBootstrapService {
    private readonly logger = new Logger(DevBootstrapService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly config: ConfigService,
    ) { }

    /**
     * Checks database initialization and seeds default IAM resources on first boot.
     */
    async bootstrap(): Promise<void> {
        const dbType = this.config.get<string>('database.type') || (isSqlite() ? 'sqlite' : 'postgres');
        const storage = this.config.get<string>('database.sqliteStorage') || './dev.sqlite';

        // PostgreSQL uses TypeORM migrations for schema, and initial admin onboarding is handled via frontend /setup
        if (dbType === 'postgres') {
            this.logger.log('[DevBootstrap] PostgreSQL active: skipping dev bootstrap (schema managed by migrations, admin setup handled via frontend /setup).');
            return;
        }

        // In dev mode, always ensure dev admin exists for smooth local testing
        let shouldCreateAdmin = true;
        if (process.env.NODE_ENV === 'production') {
            const createAdminEnv = process.env.CREATE_DEV_ADMIN;
            shouldCreateAdmin = createAdminEnv === 'true' || createAdminEnv === '1';
        }

        // Check if RBAC roles exist
        const roleRepo = this.dataSource.getRepository(Role);
        const rolesCount = await roleRepo.count();

        if (rolesCount === 0) {
            this.logger.log(`[DevBootstrap] Initializing SQLite IAM schema & baseline data (Storage: ${storage}, CreateAdmin: ${shouldCreateAdmin})...`);
            await this.seedRolesAndPermissions();
            await this.seedScopes();
            await this.seedClientApps();
            await this.seedSystemConfig(shouldCreateAdmin);
            if (shouldCreateAdmin) {
                await this.seedAdminUser();
            }
            this.printBanner(storage, shouldCreateAdmin);
        } else {
            // Ensure system config exists
            await this.ensureSystemConfig(shouldCreateAdmin);
            if (shouldCreateAdmin) {
                await this.ensureAdminUser();
            }
        }
    }

    private async seedRolesAndPermissions(): Promise<void> {
        const roleRepo = this.dataSource.getRepository(Role);
        const permRepo = this.dataSource.getRepository(Permission);
        const rpRepo = this.dataSource.getRepository(RolePermission);

        // 1. Roles
        const roleMap = new Map<string, Role>();
        for (const r of DEFAULT_ROLES) {
            let role = await roleRepo.findOne({ where: { code: r.code } });
            if (!role) {
                role = await roleRepo.save(roleRepo.create(r));
            }
            roleMap.set(r.code, role);
        }

        // 2. Permissions
        const permMap = new Map<string, Permission>();
        for (const p of DEFAULT_PERMISSIONS) {
            let perm = await permRepo.findOne({ where: { code: p.code } });
            if (!perm) {
                perm = await permRepo.save(permRepo.create({
                    ...p,
                    description: `${p.action} ${p.resource}`,
                }));
            }
            permMap.set(p.code, perm);
        }

        // 3. Role-Permission mappings
        for (const [roleCode, permCodes] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
            const role = roleMap.get(roleCode);
            if (!role) continue;

            for (const permCode of permCodes) {
                const perm = permMap.get(permCode);
                if (!perm) continue;

                const exists = await rpRepo.findOne({
                    where: { roleId: role.id, permissionId: perm.id },
                });
                if (!exists) {
                    await rpRepo.save(rpRepo.create({
                        roleId: role.id,
                        permissionId: perm.id,
                    }));
                }
            }
        }
    }

    private async seedScopes(): Promise<Scope[]> {
        const scopeRepo = this.dataSource.getRepository(Scope);
        const seededScopes: Scope[] = [];

        for (const s of DEFAULT_SCOPES) {
            let scope = await scopeRepo.findOne({ where: { name: s.name } });
            if (!scope) {
                scope = await scopeRepo.save(scopeRepo.create(s));
            }
            seededScopes.push(scope);
        }
        return seededScopes;
    }

    private async seedClientApps(): Promise<void> {
        const appRepo = this.dataSource.getRepository(AppSetting);
        const scopeRepo = this.dataSource.getRepository(Scope);
        const defaultScopes = await scopeRepo.find({ where: { isDefault: true } });

        // 1. Clinic Demo App (Backend / Resource Server)
        const clinicAppCode = this.config.get<string>('OIDC_CLIENT_ID') || 'clinic-app';
        let clinicApp = await appRepo.findOne({ where: { appCode: clinicAppCode } });
        if (!clinicApp) {
            clinicApp = appRepo.create({
                appCode: clinicAppCode,
                name: 'Clinic Demo App',
                description: 'Default OIDC client application for testing and development',
                clientSecret: this.config.get<string>('OIDC_CLIENT_SECRET') || 'your-secret-key',
                isPublicClient: false,
                standardFlowEnabled: true,
                directAccessGrantsEnabled: true,
                serviceAccountsEnabled: true,
                requirePkce: true,
                validRedirectUris: ['http://localhost:4000/callback', 'http://localhost:3000/callback', 'http://localhost:5173/callback'],
                validPostLogoutRedirectUris: ['http://localhost:4000', 'http://localhost:3000', 'http://localhost:5173'],
                webOrigins: ['http://localhost:4000', 'http://localhost:3000', 'http://localhost:5173'],
                allowedScopes: defaultScopes,
            });
            await appRepo.save(clinicApp);
        }

        // 2. AngkorGate Admin Console (SPA / Frontend)
        let consoleApp = await appRepo.findOne({ where: { appCode: 'angkorgate-console' } });
        if (!consoleApp) {
            consoleApp = appRepo.create({
                appCode: 'angkorgate-console',
                name: 'AngkorGate Admin Console',
                description: 'Single Page Application (SPA) administration console',
                clientSecret: null,
                isPublicClient: true,
                standardFlowEnabled: true,
                directAccessGrantsEnabled: false,
                serviceAccountsEnabled: false,
                requirePkce: true,
                validRedirectUris: [
                    'http://localhost:4000/callback',
                    'http://localhost:4000/auth/callback',
                    'http://localhost:3000/callback',
                    'http://localhost:5173/callback',
                    'https://oidcdebugger.com/debug',
                ],
                validPostLogoutRedirectUris: ['http://localhost:4000', 'http://localhost:3000', 'http://localhost:5173'],
                webOrigins: ['http://localhost:4000', 'http://localhost:3000', 'http://localhost:5173', 'https://oidcdebugger.com'],
                allowedScopes: defaultScopes,
            });
            await appRepo.save(consoleApp);
        } else if (!consoleApp.validRedirectUris?.includes('https://oidcdebugger.com/debug')) {
            consoleApp.validRedirectUris = [...(consoleApp.validRedirectUris || []), 'https://oidcdebugger.com/debug'];
            await appRepo.save(consoleApp);
        }

        // 3. Demo App for OIDC Debugger & Testing
        let demoApp = await appRepo.findOne({ where: { appCode: 'demo-app' } });
        if (!demoApp) {
            demoApp = appRepo.create({
                appCode: 'demo-app',
                name: 'OIDC Debugger Demo App',
                description: 'Public OIDC client for OIDC Debugger verification and development',
                clientSecret: null,
                isPublicClient: true,
                standardFlowEnabled: true,
                directAccessGrantsEnabled: false,
                serviceAccountsEnabled: false,
                requirePkce: false,
                validRedirectUris: [
                    'https://oidcdebugger.com/debug',
                    'http://localhost:3000/callback',
                    'http://localhost:4000/callback',
                    'http://localhost:5173/callback',
                ],
                validPostLogoutRedirectUris: ['https://oidcdebugger.com', 'http://localhost:3000', 'http://localhost:4000'],
                webOrigins: ['https://oidcdebugger.com', 'http://localhost:3000', 'http://localhost:4000'],
                allowedScopes: defaultScopes,
            });
            await appRepo.save(demoApp);
        }
    }

    private async seedSystemConfig(isInitialized: boolean): Promise<void> {
        const configRepo = this.dataSource.getRepository(SystemConfig);
        let config = await configRepo.findOne({ where: { id: 'default' } });
        if (!config) {
            config = configRepo.create({
                id: 'default',
                appName: 'AngkorGate',
                appDescription: 'Open-Source Identity & Access Management',
                organizationName: 'AngkorGate IAM',
                isInitialized,
            });
            await configRepo.save(config);
        } else if (isInitialized && !config.isInitialized) {
            config.isInitialized = true;
            await configRepo.save(config);
        }
    }

    private async ensureSystemConfig(isInitialized: boolean): Promise<void> {
        const configRepo = this.dataSource.getRepository(SystemConfig);
        const config = await configRepo.findOne({ where: { id: 'default' } });
        if (!config) {
            await this.seedSystemConfig(isInitialized);
        }
    }

    private async seedAdminUser(): Promise<void> {
        const userRepo = this.dataSource.getRepository(User);
        const roleRepo = this.dataSource.getRepository(Role);
        const userRoleRepo = this.dataSource.getRepository(UserRole);

        const email = (process.env.ADMIN_EMAIL || 'admin@angkorgate.local').toLowerCase().trim();
        const rawPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';

        let adminUser = await userRepo.findOne({ where: { email } });
        if (!adminUser) {
            const passwordHash = await bcrypt.hash(rawPassword, 10);
            adminUser = await userRepo.save(userRepo.create({
                email,
                passwordHash,
                isActive: true,
                isEmailVerified: true,
            }));

            const adminRole = await roleRepo.findOne({ where: { code: 'ADMIN' } });
            if (adminRole) {
                await userRoleRepo.save(userRoleRepo.create({
                    userId: adminUser.id,
                    roleId: adminRole.id,
                }));
            }
            this.logger.log(`[DevBootstrap] Created default Admin user: ${email}`);
        }
    }

    private async ensureAdminUser(): Promise<void> {
        const userRepo = this.dataSource.getRepository(User);
        const roleRepo = this.dataSource.getRepository(Role);
        const userRoleRepo = this.dataSource.getRepository(UserRole);

        const email = (process.env.ADMIN_EMAIL || 'admin@angkorgate.local').toLowerCase().trim();
        const adminUser = await userRepo.findOne({ where: { email } });

        if (!adminUser) {
            await this.seedAdminUser();
        } else {
            // Verify ADMIN role is assigned
            const adminRole = await roleRepo.findOne({ where: { code: 'ADMIN' } });
            if (adminRole) {
                const assigned = await userRoleRepo.findOne({
                    where: { userId: adminUser.id, roleId: adminRole.id },
                });
                if (!assigned) {
                    await userRoleRepo.save(userRoleRepo.create({
                        userId: adminUser.id,
                        roleId: adminRole.id,
                    }));
                }
            }
        }
    }

    private printBanner(storage: string, shouldCreateAdmin: boolean): void {
        const port = this.config.get<number>('PORT') || 8080;
        const email = process.env.ADMIN_EMAIL || 'admin@angkorgate.local';
        const password = process.env.ADMIN_PASSWORD || 'AdminPass123!';

        const W = 69;
        const bar = '═'.repeat(W);
        const cyan = '\x1b[36m';
        const reset = '\x1b[0m';
        const bold = '\x1b[1m';
        const yellow = '\x1b[33m';
        const green = '\x1b[32m';
        const blue = '\x1b[34m';

        let adminLine: string;
        let setupLine = '';

        if (shouldCreateAdmin) {
            const credsText = `${email} (${password})`;
            const pad = Math.max(0, W - 15 - credsText.length);
            adminLine = `${cyan}║  👤 Dev Admin: ${green}${email}${cyan} (${yellow}${password}${cyan})${' '.repeat(pad)}║${reset}`;
        } else {
            const text = 'Pending Setup (Open Frontend to setup)';
            const pad = Math.max(0, W - 15 - text.length);
            adminLine = `${cyan}║  👤 Dev Admin: ${yellow}${text}${cyan}${' '.repeat(pad)}║${reset}`;

            const hint = 'http://localhost:4000/setup';
            const hintPad = Math.max(0, W - 23 - hint.length);
            setupLine = `\n${cyan}║  👉 ${bold}First-time Setup:${reset} ${green}${hint}${cyan}${' '.repeat(hintPad)}║${reset}`;
        }

        const storagePad = Math.max(0, W - 13 - storage.length);
        const oidc = `http://localhost:${port}/oidc`;
        const oidcPad = Math.max(0, W - 19 - oidc.length);
        const swagger = `http://localhost:${port}/api`;
        const swaggerPad = Math.max(0, W - 19 - swagger.length);

        console.log(`
${cyan}╔${bar}╗
║  🚀 ${bold}AngkorGate IAM Core (Dev Mode - SQLite)${reset}${cyan}${' '.repeat(W - 43)}║
║  📁 Storage: ${yellow}${storage}${cyan}${' '.repeat(storagePad)}║
${adminLine}${setupLine}
║  🔑 OIDC Provider: ${blue}${oidc}${cyan}${' '.repeat(oidcPad)}║
║  📖 Swagger API:   ${blue}${swagger}${cyan}${' '.repeat(swaggerPad)}║
╚${bar}╝${reset}
`);
    }
}
