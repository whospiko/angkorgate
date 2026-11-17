import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'rbac:permissions';
export const Permissions = (...permissionCodes: string[]) =>
    SetMetadata(PERMISSIONS_KEY, permissionCodes);