import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../services/rbac.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly rbac: RbacService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!required || required.length === 0) return true;

        const req = context.switchToHttp().getRequest();
        const userId = req.user?.id;
        if (!userId) throw new ForbiddenException('No authenticated user');

        const userRoles = await this.rbac.getUserRoleCodes(userId);
        const ok = required.some((r) => userRoles.includes(r));
        if (!ok) throw new ForbiddenException('Insufficient role');
        return true;
    }
}