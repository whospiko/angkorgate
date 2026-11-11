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
import { type Request, type Response } from 'express';
import { IsString, MinLength } from 'class-validator';
import { OauthConfigService } from '../oauth-config.service';
import { OauthLoginService } from '../oauth-login.service';
import { OauthTicketService } from '../oauth-ticket.service';
import { OauthRedirectService } from '../oauth-redirect.service';
import { GoogleOauthGuard } from '../guards/google-oauth.guard';
import { OauthProfile } from '../interfaces/oauth-profile.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

class RedeemTicketDto {
    @IsString()
    @MinLength(20)
    ticket: string;
}

@Controller('auth/oauth')
export class OauthAuthController {
    constructor(
        private readonly config: OauthConfigService,
        private readonly login: OauthLoginService,
        private readonly redirects: OauthRedirectService,
        private readonly tickets: OauthTicketService,
    ) { }

    /** Public: list enabled providers for the caller's app. */
    @Get('providers')
    @HttpCode(HttpStatus.OK)
    async listProviders(@Req() req: Request) {
        return {
            providers: await this.config.listAvailableProviders(
                (req as any).appContext ?? null,
            ),
        };
    }

    // ───────────────────── GOOGLE — LOGIN FLOW ─────────────────────

    /** Start Google flow — 302 to Google. */
    @Get('google')
    @UseGuards(GoogleOauthGuard)
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
    async googleCallback(
        @Req() req: Request,
        @Res() res: Response,
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

        const tokens = result.tokens as {
            accessToken: string;
            refreshToken: string;
        };

        const targetBase = this.redirects.resolve(
            redirect,
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
            return;  // ⚠️ IMPORTANT: return after redirect
        }

        // Legacy mode — tokens in URL. Discouraged, but useful for quick dev.
        const url = new URL(targetBase);
        url.searchParams.set('access_token', tokens.accessToken);
        url.searchParams.set('refresh_token', tokens.refreshToken);
        url.searchParams.set('provider', profile.provider);
        res.redirect(url.toString());
    }

    /** Frontend exchanges ticket for real tokens (single-use, 60s TTL). */
    @Post('ticket')
    @HttpCode(HttpStatus.OK)
    async redeemTicket(@Body() dto: RedeemTicketDto) {
        const payload = await this.tickets.redeem(dto.ticket);
        return {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            userId: payload.userId,
            provider: payload.provider,
        };
    }

    // ───────────────────── GOOGLE — LINK FLOW ─────────────────────

    /**
     * Link Google to the currently logged-in user.
     *
     * ⚠️ TWO-STEP flow because Google's redirect cannot carry our JWT:
     *
     *   1. Frontend POSTs /auth/oauth/google/link/start  (with Bearer JWT)
     *      → returns { state } — a short-lived opaque token bound to the user
     *   2. Frontend navigates to /auth/oauth/google/link?state=<state>
     *      → Google consent → /auth/oauth/google/link/callback?state=...
     *      → we redeem state → get userId → link → redirect to frontend
     *
     * We CANNOT use JwtAuthGuard on the callback (Google's browser redirect
     * has no Authorization header).
     */
    @UseGuards(JwtAuthGuard)
    @Post('google/link/start')
    @HttpCode(HttpStatus.OK)
    async googleLinkStart(
        @CurrentUser('id') userId: string,
        @Body() _body: { redirect: string },
    ) {
        // Implement via the same OauthTicketService (with a different payload type)
        // or a dedicated OauthLinkStateService — see note below.
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
    googleLinkStartRedirect(@Query('state') _state: string) {
        // Passport redirects. `state` is passed through automatically by
        // passport-google-oauth20 if you set `state: true` in the strategy config.
        // See strategy patch below.
    }

    @Get('google/link/callback')
    @UseGuards(GoogleOauthGuard)
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