import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'rbac:roles';
export const Roles = (...roleCodes: string[]) => SetMetadata(ROLES_KEY, roleCodes);