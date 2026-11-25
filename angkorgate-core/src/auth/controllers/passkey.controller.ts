import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request } from 'express';
import { PasskeyService } from '../services/passkey.service';
import {
    PasskeyAuthOptionsDto,
    PasskeyRegisterOptionsDto,
    PasskeyRenameDto,
    PasskeyVerifyAuthDto,
    PasskeyVerifyRegistrationDto,
} from '../dto/passkey.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Permissions } from '../../rbac/decorators/permissions.decorator';

@ApiTags('Passkeys & WebAuthn (FIDO2 / Biometrics)')
@Controller('auth/passkey')
export class PasskeyController {
    constructor(private readonly passkeyService: PasskeyService) { }

    /**
     * 1. Register Passkey: Generate Registration Options
     */
    @Post('register/options')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('bearerAuth')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Generate WebAuthn registration options to register a new biometric passkey' })
    @ApiResponse({ status: 200, description: 'Registration options including cryptographic challenge' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getRegisterOptions(
        @CurrentUser('id') userId: string,
        @Body() dto: PasskeyRegisterOptionsDto,
        @Req() req: Request,
    ) {
        const effectiveUserId = dto.targetUserId || userId;
        const origin = (req.headers.origin as string) || (req.headers.referer as string);
        const host = req.headers.host;
        return this.passkeyService.generateRegistrationOptions(effectiveUserId, origin, host, dto.userDisplayName);
    }

    /**
     * 2. Register Passkey: Verify and Persist Passkey Assertion
     */
    @Post('register/verify')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('bearerAuth')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify WebAuthn registration response and save passkey credential' })
    @ApiResponse({ status: 200, description: 'Passkey registered successfully' })
    @ApiResponse({ status: 400, description: 'Invalid challenge or verification failure' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async verifyRegister(
        @CurrentUser('id') userId: string,
        @Body() dto: PasskeyVerifyRegistrationDto,
        @Req() req: Request,
    ) {
        const effectiveUserId = dto.targetUserId || userId;
        const origin = (req.headers.origin as string) || (req.headers.referer as string);
        const host = req.headers.host;
        const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
        const userAgent = req.headers['user-agent'] as string | undefined;

        return this.passkeyService.verifyRegistration(
            effectiveUserId,
            dto.response,
            dto.friendlyName,
            origin,
            host,
            { ip, userAgent },
        );
    }

    /**
     * 3. List Passkeys for Current User
     */
    @Get('list')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('bearerAuth')
    @ApiOperation({ summary: 'List all active passkeys registered to the authenticated user' })
    @ApiResponse({ status: 200, description: 'List of registered passkeys' })
    async listMyPasskeys(@CurrentUser('id') userId: string) {
        return this.passkeyService.listUserPasskeys(userId);
    }

    /**
     * 4. Rename Passkey
     */
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('bearerAuth')
    @ApiOperation({ summary: 'Rename an existing passkey' })
    @ApiParam({ name: 'id', description: 'Passkey UUID' })
    @ApiResponse({ status: 200, description: 'Passkey renamed successfully' })
    @ApiResponse({ status: 404, description: 'Passkey not found' })
    async renamePasskey(
        @CurrentUser('id') userId: string,
        @Param('id') passkeyId: string,
        @Body() dto: PasskeyRenameDto,
    ) {
        return this.passkeyService.renameUserPasskey(userId, passkeyId, dto.friendlyName);
    }

    /**
     * 5. Delete Passkey
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('bearerAuth')
    @ApiOperation({ summary: 'Delete/revoke a passkey credential' })
    @ApiParam({ name: 'id', description: 'Passkey UUID' })
    @ApiResponse({ status: 200, description: 'Passkey deleted successfully' })
    @ApiResponse({ status: 404, description: 'Passkey not found' })
    async deletePasskey(
        @CurrentUser('id') userId: string,
        @Param('id') passkeyId: string,
    ) {
        return this.passkeyService.deleteUserPasskey(userId, passkeyId);
    }

    /**
     * 6. Authenticate with Passkey: Generate Authentication Options (Public)
     */
    @Post('authenticate/options')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Generate WebAuthn authentication options for passkey sign-in' })
    @ApiResponse({ status: 200, description: 'Authentication options with challengeId' })
    async getAuthOptions(
        @Body() dto: PasskeyAuthOptionsDto,
        @Req() req: Request,
    ) {
        const host = req.headers.host;
        return this.passkeyService.generateAuthenticationOptions(dto.email, host);
    }

    /**
     * 7. Authenticate with Passkey: Verify Assertion and Issue Tokens (Public)
     */
    @Post('authenticate/verify')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify WebAuthn authentication assertion and issue authentication tokens' })
    @ApiResponse({ status: 200, description: 'Tokens issued successfully' })
    @ApiResponse({ status: 400, description: 'Expired or invalid challenge' })
    @ApiResponse({ status: 401, description: 'Unrecognized or invalid passkey assertion' })
    async verifyAuth(
        @Body() dto: PasskeyVerifyAuthDto,
        @Req() req: Request,
    ) {
        const origin = (req.headers.origin as string) || (req.headers.referer as string);
        const host = req.headers.host;
        const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
        const userAgent = req.headers['user-agent'] as string | undefined;

        return this.passkeyService.verifyAuthentication(
            dto.challengeId,
            dto.response,
            origin,
            host,
            { ip, userAgent },
        );
    }

    /**
     * 8. Admin: List Passkeys for any User
     */
    @Get('admin/users/:userId')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('user:read')
    @ApiBearerAuth('bearerAuth')
    @ApiOperation({ summary: 'Admin: List registered passkeys for a given user ID' })
    @ApiParam({ name: 'userId', description: 'Target user UUID' })
    @ApiResponse({ status: 200, description: 'List of user passkeys' })
    async adminListPasskeys(@Param('userId') targetUserId: string) {
        return this.passkeyService.adminListUserPasskeys(targetUserId);
    }

    /**
     * 9. Admin: Revoke Passkey for any User
     */
    @Delete('admin/users/:userId/:passkeyId')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('user:write')
    @ApiBearerAuth('bearerAuth')
    @ApiOperation({ summary: 'Admin: Revoke a specific passkey for a user' })
    @ApiParam({ name: 'userId', description: 'Target user UUID' })
    @ApiParam({ name: 'passkeyId', description: 'Passkey UUID to delete' })
    @ApiResponse({ status: 200, description: 'Passkey revoked successfully' })
    async adminDeletePasskey(
        @CurrentUser('id') adminId: string,
        @Param('userId') targetUserId: string,
        @Param('passkeyId') passkeyId: string,
    ) {
        return this.passkeyService.adminDeleteUserPasskey(targetUserId, passkeyId, adminId);
    }
}
