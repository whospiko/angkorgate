import {
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OauthConfigService } from '../oauth-config.service';

/**
 * Wraps Passport's google guard:
 *  1. Checks OAuth is enabled for the caller's app
 *  2. Checks the provider is active
 *  3. Delegates to passport-google-oauth20
 */
@Injectable()
export class GoogleOauthGuard extends AuthGuard('google') implements CanActivate {
    constructor(private readonly config: OauthConfigService) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const enabled = await this.config.isProviderEnabled('google', req.appContext);
        if (!enabled) {
            throw new NotFoundException('Google login is not enabled');
        }
        return (await super.canActivate(context)) as boolean;
    }
}