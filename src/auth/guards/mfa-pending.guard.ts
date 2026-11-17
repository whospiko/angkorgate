import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { MfaPendingPayload } from '../interfaces/jwt-payload.interface';

/**
 * Guards /auth/login/mfa — only accepts the short-lived MFA-pending token,
 * NOT a full access token. This prevents an attacker with a stolen access
 * token from skipping the MFA step.
 */
@Injectable()
export class MfaPendingGuard implements CanActivate {
    constructor(
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing MFA token');
        }
        const token = auth.slice(7);

        let payload: MfaPendingPayload;
        try {
            payload = await this.jwt.verifyAsync<MfaPendingPayload>(token, {
                secret: this.config.get<string>('JWT_ACCESS_SECRET')!,
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired MFA token');
        }

        if (payload.mfaPending !== true) {
            throw new UnauthorizedException('Token is not an MFA-pending token');
        }

        // Attach the pending user id for the handler
        (req as Request & { mfaUserId?: string }).mfaUserId = payload.sub;
        return true;
    }
}