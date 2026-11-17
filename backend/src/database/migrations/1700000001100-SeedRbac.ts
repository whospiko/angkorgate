import { MigrationInterface, QueryRunner } from 'typeorm';

const ROLES: Array<{ code: string; name: string; description: string }> = [
    { code: 'ADMIN', name: 'Administrator', description: 'Full access' },
    { code: 'DOCTOR', name: 'Doctor', description: 'Clinical access' },
    { code: 'RECEPTIONIST', name: 'Receptionist', description: 'Front-desk access' },
    { code: 'ACCOUNTANT', name: 'Accountant', description: 'Billing access' },
    { code: 'ASSISTANT', name: 'Assistant', description: 'Assist doctors' },
    { code: 'CUSTOMER', name: 'Customer', description: 'Self-service customer/patient/guest' },
];

const PERMISSIONS: Array<{ code: string; resource: string; action: string }> = [
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
];

// Which permissions each role gets by default
const ROLE_PERMISSIONS: Record<string, string[]> = {
    ADMIN: PERMISSIONS.map((p) => p.code), // all
    DOCTOR: [
        'customer:read', 'customer:write',
        'employee:read',
    ],
    RECEPTIONIST: [
        'customer:read', 'customer:write',
        'appointment:read', 'appointment:write',
        'employee:read',
    ],
    ACCOUNTANT: [
        'customer:read',
    ],
    ASSISTANT: [
        'customer:read',
    ],
    CUSTOMER: [], // no admin permissions — gets access only to portal endpoints
};

export class SeedRbac1700000001100 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        // Roles
        for (const r of ROLES) {
            await q.query(
                `INSERT INTO roles (code, name, description, is_system)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (code) DO NOTHING`,
                [r.code, r.name, r.description],
            );
        }

        // Permissions
        for (const p of PERMISSIONS) {
            await q.query(
                `INSERT INTO permissions (code, resource, action, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO NOTHING`,
                [p.code, p.resource, p.action, `${p.action} ${p.resource}`],
            );
        }

        // Role → Permission mappings
        for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
            for (const permCode of permCodes) {
                await q.query(
                    `INSERT INTO role_permissions (role_id, permission_id)
           SELECT r.id, p.id
           FROM roles r, permissions p
           WHERE r.code = $1 AND p.code = $2
           ON CONFLICT DO NOTHING`,
                    [roleCode, permCode],
                );
            }
        }
    }

    public async down(q: QueryRunner): Promise<void> {
        // Deleting roles cascades role_permissions
        await q.query(
            `DELETE FROM roles WHERE code = ANY($1)`,
            [ROLES.map((r) => r.code)],
        );
        await q.query(
            `DELETE FROM permissions WHERE code = ANY($1)`,
            [PERMISSIONS.map((p) => p.code)],
        );
    }
}