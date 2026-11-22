import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from "../../users/services/users.service";
import { RbacService } from "../../rbac/services/rbac.service";
import { AuthenticatedUser, JwtPayload } from "../interfaces/jwt-payload.interface";


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        config: ConfigService,
        private readonly users: UsersService,
        private readonly rbac: RbacService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
            algorithms: ['HS256'],
            audience: 'angkorgate-api',
            issuer: 'angkorgate-core',
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        // Defense against MFA pending token confusion
        if (payload.mfaPending === true) {
            throw new UnauthorizedException('MFA verification pending; access token required');
        }

        // Validate subject format
        if (!payload.sub || typeof payload.sub !== 'string') {
            throw new UnauthorizedException('Invalid token subject');
        }

        // Cheap check: user still exists and is active.
        const user = await this.users.findById(payload.sub);
        if (!user || !user.isActive) {
            throw new UnauthorizedException('User no longer active');
        }

        // Authoritative DB role resolution (immune to client-side or in-transit claim injection)
        const roles = await this.rbac.getUserRoleCodes(user.id);

        return {
            id: user.id,
            email: user.email,
            phone: user.phone,
            roles,
        };
    }
}