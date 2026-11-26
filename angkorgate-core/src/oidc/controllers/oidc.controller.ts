import {
    Controller,
    Get,
    Post,
    All,
    Req,
    Res,
    Body,
    Param,
    Logger,
    HttpStatus,
    HttpCode,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { OidcService } from '../services/oidc.service';
import { AuthService } from '../../auth/services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { MfaService } from '../../auth/services/mfa.service';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { OidcLoginDto } from '../dto/oidc-login.dto';
import { extractClientContext } from '../../auth/utils/client-context.util';

@ApiTags('OIDC')
@SkipTransform()
@Controller('oidc')
export class OidcController {
    private readonly logger = new Logger(OidcController.name);

    constructor(
        private readonly oidcService: OidcService,
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
        private readonly mfaService: MfaService,
        private readonly config: ConfigService,
    ) { }

    /** Standard OIDC Discovery & Keys */
    @Get('.well-known/openid-configuration')
    @ApiOperation({ summary: 'OpenID Connect Discovery Configuration Document' })
    @ApiResponse({ status: 200, description: 'OIDC Provider metadata' })
    async discovery(@Req() req: Request, @Res() res: Response) {
        return this.oidcService.callback()(req, res);
    }

    @Get('jwks')
    @ApiOperation({ summary: 'OpenID Connect JSON Web Key Set (JWKS)' })
    @ApiResponse({ status: 200, description: 'Public keys for verifying tokens' })
    async jwks(@Req() req: Request, @Res() res: Response) {
        return this.oidcService.callback()(req, res);
    }

    /** Authorization Endpoints */
    @All('auth')
    @ApiOperation({ summary: 'OpenID Connect Authorization Endpoint' })
    @ApiResponse({ status: 302, description: 'Redirect to login/consent or client redirect_uri' })
    async authorize(@Req() req: Request, @Res() res: Response) {
        return this.oidcService.callback()(req, res);
    }

    @All('auth/:uid')
    @ApiOperation({ summary: 'OpenID Connect Resume Authorization Endpoint' })
    @ApiParam({ name: 'uid', description: 'Interaction session UID' })
    @ApiResponse({ status: 302, description: 'Resume authorization flow' })
    async authorizeResume(@Req() req: Request, @Res() res: Response) {
        return this.oidcService.callback()(req, res);
    }

    /** Token & UserInfo Endpoints */
    @Post('token')
    @ApiOperation({ summary: 'OpenID Connect Token Endpoint' })
    @ApiResponse({ status: 200, description: 'OIDC tokens issued (access_token, id_token, refresh_token)' })
    @ApiResponse({ status: 400, description: 'Invalid grant or client credentials' })
    async token(@Req() req: Request, @Res() res: Response) {
        return this.oidcService.callback()(req, res);
    }

    @All('me')
    @ApiOperation({ summary: 'OpenID Connect UserInfo Endpoint' })
    @ApiResponse({ status: 200, description: 'Claims of the authenticated user' })
    @ApiResponse({ status: 401, description: 'Invalid or missing Bearer access token' })
    async userinfo(@Req() req: Request, @Res() res: Response) {
        return this.oidcService.callback()(req, res);
    }

    /** Session & Token Management */
    @All('session/end')
    @ApiOperation({ summary: 'OpenID Connect End Session / Logout Endpoint' })
    @ApiResponse({ status: 200, description: 'Session ended' })
    @ApiResponse({ status: 302, description: 'Redirect to post_logout_redirect_uri' })
    async endSession(@Req() req: Request, @Res() res: Response) {
        return this.oidcService.callback()(req, res);
    }

    @All('session/end/confirm')
    @ApiOperation({ summary: 'OpenID Connect End Session Confirmation Endpoint' })
    @ApiResponse({ status: 302, description: 'Redirect to post_logout_redirect_uri' })
    async endSessionConfirm(@Req() req: Request, @Res() res: Response) {
        return this.oidcService.callback()(req, res);
    }

    @Post(['introspect', 'token/introspection'])
    @ApiOperation({ summary: 'OAuth 2.0 Token Introspection Endpoint (RFC 7662)' })
    @ApiResponse({ status: 200, description: 'Active status and metadata of token' })
    async introspect(@Req() req: Request, @Res() res: Response) {
        return this.oidcService.callback()(req, res);
    }

    @Post(['revoke', 'token/revocation'])
    @ApiOperation({ summary: 'OAuth 2.0 Token Revocation Endpoint (RFC 7009)' })
    @ApiResponse({ status: 200, description: 'Token revoked' })
    async revoke(@Req() req: Request, @Res() res: Response) {
        return this.oidcService.callback()(req, res);
    }

    @Post('sso-session')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Exchange a valid OIDC access token for Core session tokens' })
    @ApiResponse({ status: 200, description: 'Core session tokens issued' })
    @ApiResponse({ status: 401, description: 'Invalid or expired OIDC access token' })
    async ssoSession(
        @Body() body: { accessToken?: string },
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const rawToken = body?.accessToken?.trim();
        if (!rawToken) {
            return res.status(HttpStatus.BAD_REQUEST).json({ message: 'accessToken is required' });
        }

        const oidcToken = await this.oidcService.oidc.AccessToken.find(rawToken);
        if (!oidcToken || oidcToken.isExpired || !oidcToken.accountId) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid or expired OIDC access token' });
        }

        const user = await this.usersService.findById(oidcToken.accountId);
        if (!user || !user.isActive) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'User account not found or inactive' });
        }

        const tokens = await this.authService.issueTokensForUser(
            user.id,
            user.email ?? null,
            user.phone ?? null,
            extractClientContext(req),
        );
        return res.status(HttpStatus.OK).json(tokens);
    }

    /** Interaction Endpoints */
    @Get('interaction/:uid')
    @ApiOperation({ summary: 'Retrieve details for pending OIDC login or consent interaction' })
    @ApiParam({ name: 'uid', description: 'Interaction session UID' })
    @ApiResponse({ status: 200, description: 'Interaction details' })
    @ApiResponse({ status: 302, description: 'Redirect to login page' })
    async interaction(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
        let details: any;
        try {
            details = await this.oidcService.oidc.interactionDetails(req, res);
        } catch (err) {
            this.logger.error(`Interaction lookup failed for ${uid}`, err);
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Interaction expired or invalid' });
        }

        const promptName = details.prompt?.name;

        // Auto-grant consent if prompt is consent
        if (promptName === 'consent') {
            try {
                let grant: any;
                if (details.grantId) {
                    grant = await this.oidcService.oidc.Grant.find(details.grantId);
                } else {
                    grant = new this.oidcService.oidc.Grant({
                        accountId: details.session?.accountId,
                        clientId: details.params?.client_id as string,
                    });
                }

                if (details.prompt.details?.missingOIDCScope) {
                    grant.addOIDCScope((details.prompt.details.missingOIDCScope as string[]).join(' '));
                }
                if (details.prompt.details?.missingOIDCClaims) {
                    grant.addOIDCClaims(details.prompt.details.missingOIDCClaims as string[]);
                }
                if (details.prompt.details?.missingResourceScopes) {
                    for (const [indicator, scopes] of Object.entries(details.prompt.details.missingResourceScopes)) {
                        grant.addResourceScope(indicator, (scopes as string[]).join(' '));
                    }
                }

                const grantId = await grant.save();
                const result = { consent: { grantId } };
                return await this.oidcService.oidc.interactionFinished(req, res, result, {
                    mergeWithLastSubmission: true,
                });
            } catch (err) {
                this.logger.error('Consent interaction failed', err);
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Consent resolution failed' });
            }
        }

        // Login prompt
        if (promptName === 'login') {
            const consoleUrl =
                this.oidcService.getConsoleUrl?.() ||
                this.config.get<string>('CONSOLE_URL') ||
                this.config.get<string>('APP_WEB_URL') ||
                'http://localhost:4000';

            // Support JSON clients requesting interaction details
            if (req.accepts('json') && !req.accepts('html')) {
                return res.json({
                    uid: details.uid,
                    prompt: details.prompt,
                    params: details.params,
                });
            }

            return res.redirect(`${consoleUrl}/login?interaction=${details.uid}`);
        }

        return res.status(HttpStatus.BAD_REQUEST).json({
            error: `Unsupported interaction prompt: ${promptName}`,
        });
    }

    @Post('interaction/:uid/login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Submit user credentials to satisfy OIDC login prompt' })
    @ApiParam({ name: 'uid', description: 'Interaction session UID' })
    @ApiResponse({ status: 200, description: 'Interaction finished, returns redirect target' })
    @ApiResponse({ status: 400, description: 'Missing credentials or MFA required' })
    @ApiResponse({ status: 401, description: 'Invalid credentials or MFA code' })
    @ApiResponse({ status: 403, description: 'Account locked or disabled' })
    async login(
        @Param('uid') uid: string,
        @Body() body: OidcLoginDto,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        try {
            await this.oidcService.oidc.interactionDetails(req, res);
        } catch (err) {
            this.logger.error(`Login interaction verification failed for ${uid}`, err);
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Interaction expired or invalid' });
        }

        const identifier = body.email || body.username;
        if (!identifier || !body.password) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email and password are required' });
        }

        const user = await this.usersService.findAuthRecordByEmail(identifier);
        if (!user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(HttpStatus.FORBIDDEN).json({ error: 'Account disabled' });
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            return res.status(HttpStatus.FORBIDDEN).json({
                error: `Account locked until ${user.lockedUntil.toISOString()}`,
            });
        }

        const isPasswordValid = await this.authService.verifyPassword(body.password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid credentials' });
        }

        const mfaEnabled = await this.mfaService.isEnabled(user.id);
        if (mfaEnabled) {
            if (!body.mfaCode) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    error: 'MFA_REQUIRED',
                    message: 'MFA code is required',
                });
            }
            const mfaResult = await this.mfaService.verifyCodeOrBackup(user.id, body.mfaCode);
            if (!mfaResult.valid) {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    error: 'INVALID_MFA_CODE',
                    message: 'Invalid MFA code',
                });
            }
        }

        const result = {
            login: {
                accountId: user.id,
                remember: true,
            },
        };

        if (req.accepts('json') && !req.accepts('html')) {
            const redirectTo = await this.oidcService.oidc.interactionResult(req, res, result, {
                mergeWithLastSubmission: false,
            });
            return res.json({ success: true, redirectTo });
        }

        await this.oidcService.oidc.interactionFinished(req, res, result, {
            mergeWithLastSubmission: false,
        });
    }

    @Post('interaction/:uid/confirm')
    @ApiOperation({ summary: 'Confirm consent for requested OIDC scopes and claims' })
    @ApiParam({ name: 'uid', description: 'Interaction session UID' })
    @ApiResponse({ status: 200, description: 'Consent granted and interaction finalized' })
    async confirm(
        @Param('uid') uid: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const details = await this.oidcService.oidc.interactionDetails(req, res);
        let grant: any;
        if (details.grantId) {
            grant = await this.oidcService.oidc.Grant.find(details.grantId);
        } else {
            grant = new this.oidcService.oidc.Grant({
                accountId: details.session?.accountId,
                clientId: details.params?.client_id as string,
            });
        }

        if (details.prompt.details?.missingOIDCScope) {
            grant.addOIDCScope((details.prompt.details.missingOIDCScope as string[]).join(' '));
        }
        if (details.prompt.details?.missingOIDCClaims) {
            grant.addOIDCClaims(details.prompt.details.missingOIDCClaims as string[]);
        }
        if (details.prompt.details?.missingResourceScopes) {
            for (const [indicator, scopes] of Object.entries(details.prompt.details.missingResourceScopes)) {
                grant.addResourceScope(indicator, (scopes as string[]).join(' '));
            }
        }

        const grantId = await grant.save();
        const result = { consent: { grantId } };

        if (req.accepts('json') && !req.accepts('html')) {
            const redirectTo = await this.oidcService.oidc.interactionResult(req, res, result, {
                mergeWithLastSubmission: true,
            });
            return res.json({ success: true, redirectTo });
        }

        await this.oidcService.oidc.interactionFinished(req, res, result, {
            mergeWithLastSubmission: true,
        });
    }

    @Post('interaction/:uid/abort')
    @ApiOperation({ summary: 'Abort active OIDC interaction session' })
    @ApiParam({ name: 'uid', description: 'Interaction session UID' })
    @ApiResponse({ status: 200, description: 'Interaction aborted' })
    async abort(
        @Param('uid') uid: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const result = {
            error: 'access_denied',
            error_description: 'End-user aborted interaction',
        };

        if (req.accepts('json') && !req.accepts('html')) {
            const redirectTo = await this.oidcService.oidc.interactionResult(req, res, result, {
                mergeWithLastSubmission: false,
            });
            return res.json({ success: false, redirectTo });
        }

        await this.oidcService.oidc.interactionFinished(req, res, result, {
            mergeWithLastSubmission: false,
        });
    }
}
