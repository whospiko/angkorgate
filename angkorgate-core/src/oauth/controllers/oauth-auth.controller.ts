import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { OauthConfigService } from '../services/oauth-config.service';
import { OauthLoginService } from '../services/oauth-login.service';
import { OauthTicketService } from '../services/oauth-ticket.service';
import { OauthRedirectService } from '../services/oauth-redirect.service';
import { GoogleOauthGuard } from '../guards/google-oauth.guard';
import { OauthProfile } from '../interfaces/oauth-profile.interface';
import { OidcService } from '../../oidc/services/oidc.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { RedeemTicketDto } from '../dto/redeem-ticket.dto';
import {
    GoogleLinkStartDto,
    GoogleLinkStartResponseDto,
    ListProvidersResponseDto,
    OauthTicketResponseDto,
} from '../dto/oauth-response.dto';

@ApiTags('OAuth Providers - Auth')
@Controller('auth/oauth')
export class OauthAuthController {
    constructor(
        private readonly config: OauthConfigService,
        private readonly login: OauthLoginService,
        private readonly redirects: OauthRedirectService,
        private readonly tickets: OauthTicketService,
        private readonly oidcService: OidcService,
    ) { }

    /** Public: list enabled providers for the caller's app. */
    @Get('providers')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'List available OAuth providers configured for client application' })
    @ApiResponse({ status: 200, description: 'List of enabled OAuth providers', type: ListProvidersResponseDto })
    async listProviders(@Req() req: Request) {
        return {
            providers: await this.config.listAvailableProviders(
                (req as any).appContext ?? null,
            ),
        };
    }

    /**
     * Google OAuth - Login Flow
     */

    /** Start Google flow — 302 to Google. */
    @Get('google')
    @UseGuards(GoogleOauthGuard)
    @SkipTransform()
    @ApiOperation({ summary: 'Initiate Google OAuth authentication flow (redirects to Google)' })
    @ApiResponse({ status: 302, description: 'Redirect to Google authentication consent screen' })
    googleStart() {
        // Passport redirects; nothing to return.
    }

    /**
     * Google callback.
     *
     * Two modes:
     *   - Default (ticket mode, recommended): 302 to <frontend>/auth/callback?ticket=xxx
     *     Frontend then POSTs the ticket to /auth/oauth/ticket.
     *   - Legacy mode (allow_legacy_tokens=true, dev only): tokens in URL.
     *     Blocked in production unless explicitly enabled.
     */
    @Get('google/callback')
    @UseGuards(GoogleOauthGuard)
    @SkipTransform()
    @ApiOperation({ summary: 'Handle OAuth callback from Google and redirect with ticket' })
    @ApiQuery({ name: 'state', required: false, description: 'OAuth state token' })
    @ApiQuery({ name: 'redirect', required: false, description: 'Frontend redirect URL' })
    @ApiQuery({ name: 'mode', required: false, enum: ['ticket', 'tokens'], description: 'Auth token dispatch mode' })
    @ApiResponse({ status: 302, description: 'Redirect to application frontend with ticket or tokens' })
    async googleCallback(
        @Req() req: Request,
        @Res() res: Response,
        @Query('state') state?: string,
        @Query('redirect') redirect?: string,
        @Query('mode') mode?: 'ticket' | 'tokens',
    ) {
        const profile = req.user as OauthProfile | undefined;
        if (!profile) {
            throw new Error('No OAuth profile returned');
        }

        const result = await this.login.loginWithProfile(profile, {
            ip: req.ip,
            userAgent: req.headers['user-agent']?.toString(),
        });

        // 1. Check if an active OIDC interaction session is embedded in state
        let interactionUid: string | undefined;
        let stateRedirect: string | undefined;
        if (state) {
            try {
                const parsed = JSON.parse(
                    Buffer.from(state, 'base64url').toString('utf8'),
                );
                if (typeof parsed === 'object' && parsed !== null) {
                    interactionUid = parsed.interaction;
                    stateRedirect = parsed.redirect;
                }
            } catch {
                // Non-JSON or plain state token
            }
        }

        if (interactionUid) {
            const interactionResult = {
                login: {
                    accountId: result.userId,
                    remember: true,
                },
            };
            return await this.oidcService.oidc.interactionFinished(
                req,
                res,
                interactionResult,
                { mergeWithLastSubmission: false },
            );
        }

        // 2. Direct Console / App login flow
        const tokens = result.tokens as {
            accessToken: string;
            refreshToken: string;
        };

        const effectiveRedirect = redirect || stateRedirect;
        const targetBase = this.redirects.resolve(
            effectiveRedirect,
            (req as any).appContext ?? null,
        );

        const useTicketMode = mode !== 'tokens';

        if (useTicketMode) {
            const ticket = await this.tickets.issue({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                userId: result.userId,
                provider: profile.provider,
            });
            const url = new URL(targetBase);
            url.searchParams.set('ticket', ticket);
            url.searchParams.set('provider', profile.provider);
            res.redirect(url.toString());
            return;
        }

        // Direct token transmission in URL is forbidden in production
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Legacy token transmission via URL query parameters is disabled in production.');
        }

        // Legacy mode — tokens in URL (dev only)
        const url = new URL(targetBase);
        url.searchParams.set('access_token', tokens.accessToken);
        url.searchParams.set('refresh_token', tokens.refreshToken);
        url.searchParams.set('provider', profile.provider);
        res.redirect(url.toString());
    }

    /** Frontend exchanges ticket for real tokens (single-use, 60s TTL). */
    @Post('ticket')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Exchange single-use OAuth ticket for access and refresh tokens' })
    @ApiResponse({ status: 200, description: 'Tokens issued successfully', type: OauthTicketResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid or expired ticket' })
    async redeemTicket(@Body() dto: RedeemTicketDto) {
        const payload = await this.tickets.redeem(dto.ticket);
        return {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            userId: payload.userId,
            provider: payload.provider,
        };
    }

    /**
     * Google OAuth - Account Linking Flow
     */

    /**
     * Link Google to the currently logged-in user.
     */
    @ApiBearerAuth('bearerAuth')
    @UseGuards(JwtAuthGuard)
    @Post('google/link/start')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Start account linking with Google for current user' })
    @ApiResponse({ status: 200, description: 'Linking state token generated', type: GoogleLinkStartResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async googleLinkStart(
        @CurrentUser('id') userId: string,
        @Body() _body: GoogleLinkStartDto,
    ) {
        const state = await this.tickets.issue({
            accessToken: '',           // unused
            refreshToken: '',          // unused
            userId,
            provider: 'google-link',
        });
        return { state, authorizeUrl: `/auth/oauth/google/link?state=${state}` };
    }

    @Get('google/link')
    @UseGuards(GoogleOauthGuard)
    @ApiOperation({ summary: 'Redirect to Google authorization for account linking' })
    @ApiQuery({ name: 'state', description: 'State token generated from link/start' })
    @ApiResponse({ status: 302, description: 'Redirect to Google' })
    googleLinkStartRedirect(@Query('state') _state: string) {
        // Passport redirects.
    }

    @Get('google/link/callback')
    @UseGuards(GoogleOauthGuard)
    @ApiOperation({ summary: 'Handle Google callback to finalize account link' })
    @ApiQuery({ name: 'state', description: 'State token' })
    @ApiResponse({ status: 302, description: 'Redirect to frontend after linking' })
    async googleLinkCallback(
        @Req() req: Request,
        @Res() res: Response,
        @Query('state') state: string,
    ) {
        const profile = req.user as OauthProfile | undefined;
        if (!profile) throw new Error('No OAuth profile');

        // Redeem state → userId
        const ticket = await this.tickets.redeem(state);
        const userId = ticket.userId;

        await this.login.linkToCurrentUser(userId, profile);

        const web = this.redirects.resolve(undefined, (req as any).appContext ?? null);
        const url = new URL(web);
        url.searchParams.set('linked', 'google');
        res.redirect(url.toString());
    }
}
