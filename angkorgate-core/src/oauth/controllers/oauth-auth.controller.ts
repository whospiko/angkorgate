import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { AppSetting } from '../../apps/entities/app-setting.entity';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { OidcService } from '../../oidc/services/oidc.service';
import {
    ListProvidersResponseDto,
    OauthLinkStartDto,
    OauthLinkStartResponseDto,
    OauthTicketResponseDto,
} from '../dto/oauth-response.dto';
import { RedeemTicketDto } from '../dto/redeem-ticket.dto';
import { DynamicOauthGuard } from '../guards/dynamic-oauth.guard';
import { OauthProfile } from '../interfaces/oauth-profile.interface';
import {
    isSupportedProviderCode,
    SUPPORTED_PROVIDER_CODES,
} from '../oauth-providers.constants';
import { OauthAccountsService } from '../services/oauth-accounts.service';
import { OauthConfigService } from '../services/oauth-config.service';
import { OauthLoginService } from '../services/oauth-login.service';
import { OauthRedirectService } from '../services/oauth-redirect.service';
import { OauthTicketService } from '../services/oauth-ticket.service';

type RequestWithApp = Request & { appContext?: AppSetting | null };

@ApiTags('OAuth Providers - Auth')
@Controller('auth/oauth')
export class OauthAuthController {
    constructor(
        private readonly config: OauthConfigService,
        private readonly login: OauthLoginService,
        private readonly accounts: OauthAccountsService,
        private readonly redirects: OauthRedirectService,
        private readonly tickets: OauthTicketService,
        private readonly oidcService: OidcService,
    ) { }

    /** Public: list enabled providers and public callback base URL for the caller's app. */
    @Get('providers')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'List available OAuth providers configured for client application' })
    @ApiResponse({ status: 200, description: 'List of enabled OAuth providers', type: ListProvidersResponseDto })
    async listProviders(@Req() req: RequestWithApp) {
        return {
            providers: await this.config.listAvailableProviders(
                req.appContext ?? null,
            ),
            callbackBaseUrl: this.config.getCallbackBaseUrl(req),
            webUrl: this.config.getWebUrl(),
        };
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
            webUrl: this.config.getWebUrl(),
        };
    }

    /** Authenticated user: list linked social identity accounts. */
    @ApiBearerAuth('bearerAuth')
    @UseGuards(JwtAuthGuard)
    @Get('me/accounts')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'List social identity accounts linked to current user' })
    @ApiResponse({ status: 200, description: 'Linked social accounts' })
    async listMyLinkedAccounts(@CurrentUser('id') userId: string) {
        return { accounts: await this.accounts.listForUser(userId) };
    }

    /** Authenticated user: unlink a social identity provider. */
    @ApiBearerAuth('bearerAuth')
    @UseGuards(JwtAuthGuard)
    @Delete('me/accounts/:provider')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Unlink a social identity provider from current user' })
    @ApiParam({ name: 'provider', enum: SUPPORTED_PROVIDER_CODES })
    @ApiResponse({ status: 204, description: 'Social account unlinked' })
    async unlinkMyAccount(
        @CurrentUser('id') userId: string,
        @Param('provider') provider: string,
    ) {
        await this.accounts.unlink(userId, provider.toLowerCase());
    }

    /** Start federated OAuth login flow for any enabled provider. */
    @Get(':provider')
    @UseGuards(DynamicOauthGuard)
    @SkipTransform()
    @ApiOperation({ summary: 'Initiate federated OAuth flow for a provider (redirects or renders widget)' })
    @ApiParam({ name: 'provider', enum: SUPPORTED_PROVIDER_CODES })
    @ApiQuery({ name: 'interaction', required: false, description: 'OIDC interaction UID' })
    @ApiQuery({ name: 'redirect', required: false, description: 'Whitelisted frontend redirect URL' })
    @ApiResponse({ status: 302, description: 'Redirect to identity provider consent screen' })
    providerStart(@Param('provider') _provider: string) {
        // Passport / Telegram widget renders or redirects in DynamicOauthGuard.
    }

    /**
     * Generic OAuth callback for all providers.
     *
     * Modes:
     *   - OIDC Interaction (embedded in state): finishes OIDC login interaction
     *   - Default (ticket mode): 302 to <frontend>/auth/callback?ticket=xxx
     *   - Legacy mode (mode=tokens, non-production only): tokens in URL
     */
    @Get(':provider/callback')
    @UseGuards(DynamicOauthGuard)
    @SkipTransform()
    @ApiOperation({ summary: 'Handle OAuth callback from a provider and redirect with ticket' })
    @ApiParam({ name: 'provider', enum: SUPPORTED_PROVIDER_CODES })
    @ApiQuery({ name: 'state', required: false, description: 'OAuth state token' })
    @ApiQuery({ name: 'redirect', required: false, description: 'Frontend redirect URL' })
    @ApiQuery({ name: 'mode', required: false, enum: ['ticket', 'tokens'], description: 'Auth token dispatch mode' })
    @ApiResponse({ status: 302, description: 'Redirect to application frontend with ticket or tokens' })
    async providerCallback(
        @Param('provider') _provider: string,
        @Req() req: RequestWithApp,
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
            req.appContext ?? null,
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

        if (process.env.NODE_ENV === 'production') {
            throw new Error('Legacy token transmission via URL query parameters is disabled in production.');
        }

        const url = new URL(targetBase);
        url.searchParams.set('access_token', tokens.accessToken);
        url.searchParams.set('refresh_token', tokens.refreshToken);
        url.searchParams.set('provider', profile.provider);
        res.redirect(url.toString());
    }

    /** Start account linking with a provider for the currently logged-in user. */
    @ApiBearerAuth('bearerAuth')
    @UseGuards(JwtAuthGuard)
    @Post(':provider/link/start')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Start account linking with a social provider for current user' })
    @ApiParam({ name: 'provider', enum: SUPPORTED_PROVIDER_CODES })
    @ApiResponse({ status: 200, description: 'Linking state token generated', type: OauthLinkStartResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async linkStart(
        @Param('provider') rawProvider: string,
        @CurrentUser('id') userId: string,
        @Req() req: RequestWithApp,
        @Body() body: OauthLinkStartDto,
    ) {
        const provider = rawProvider.toLowerCase();
        if (!isSupportedProviderCode(provider)) {
            throw new NotFoundException(`OAuth provider '${provider}' is not supported`);
        }

        const enabled = await this.config.isProviderEnabled(
            provider,
            req.appContext ?? null,
        );
        if (!enabled) {
            throw new NotFoundException(`${provider} login is not enabled`);
        }

        const redirectUrl = body?.redirect
            ? this.redirects.resolve(body.redirect, req.appContext ?? null)
            : '';

        const state = await this.tickets.issue({
            accessToken: redirectUrl, // carry validated post-link redirect
            refreshToken: '',
            userId,
            provider: `${provider}-link`,
        });
        return { state, authorizeUrl: `/auth/oauth/${provider}/link?state=${state}` };
    }

    @Get(':provider/link')
    @UseGuards(DynamicOauthGuard)
    @SkipTransform()
    @ApiOperation({ summary: 'Redirect to provider authorization for account linking' })
    @ApiParam({ name: 'provider', enum: SUPPORTED_PROVIDER_CODES })
    @ApiQuery({ name: 'state', description: 'State token generated from link/start' })
    @ApiResponse({ status: 302, description: 'Redirect to provider' })
    linkStartRedirect(
        @Param('provider') _provider: string,
        @Query('state') _state: string,
    ) {
        // Passport / Telegram widget handles initiation.
    }

    @Get(':provider/link/callback')
    @UseGuards(DynamicOauthGuard)
    @SkipTransform()
    @ApiOperation({ summary: 'Handle provider callback to finalize account link' })
    @ApiParam({ name: 'provider', enum: SUPPORTED_PROVIDER_CODES })
    @ApiQuery({ name: 'state', description: 'State token' })
    @ApiResponse({ status: 302, description: 'Redirect to frontend after linking' })
    async linkCallback(
        @Param('provider') rawProvider: string,
        @Req() req: RequestWithApp,
        @Res() res: Response,
        @Query('state') state: string,
    ) {
        const provider = rawProvider.toLowerCase();
        const profile = req.user as OauthProfile | undefined;
        if (!profile) throw new Error('No OAuth profile');
        if (!state) throw new BadRequestException('Missing link state token');

        const ticket = await this.tickets.redeem(state);
        if (ticket.provider !== `${provider}-link`) {
            throw new BadRequestException('Link state token does not match provider');
        }

        await this.login.linkToCurrentUser(ticket.userId, profile);

        const web = this.redirects.resolve(
            ticket.accessToken || undefined,
            req.appContext ?? null,
        );
        const url = new URL(web);
        url.searchParams.set('linked', provider);
        res.redirect(url.toString());
    }
}
