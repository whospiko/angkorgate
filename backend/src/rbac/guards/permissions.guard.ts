import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../services/rbac.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly rbac: RbacService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (!required || required.length === 0) return true;

        const req = context.switchToHttp().getRequest();
        const userId = req.user?.id;
        if (!userId) throw new ForbiddenException('No authenticated user');

        const perms = await this.rbac.getUserPermissions(userId);
        const missing = required.filter((p) => !perms.includes(p));
        if (missing.length > 0) {
            throw new ForbiddenException(
                `Missing permissions: ${missing.join(', ')}`,
            );
        }
        return true;
    }
}