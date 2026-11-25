import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class PasskeyRegisterOptionsDto {
    @ApiPropertyOptional({ description: 'Optional custom display name for user in passkey authenticator prompt' })
    @IsOptional()
    @IsString()
    userDisplayName?: string;

    @ApiPropertyOptional({ description: 'Optional target user ID if registering on behalf of a specific user' })
    @IsOptional()
    @IsString()
    targetUserId?: string;
}

export class PasskeyVerifyRegistrationDto {
    @ApiProperty({ description: 'WebAuthn RegistrationResponseJSON from @simplewebauthn/browser' })
    @IsNotEmpty()
    @IsObject()
    response: any;

    @ApiPropertyOptional({ description: 'Optional user-friendly label for this passkey', example: 'MacBook Touch ID' })
    @IsOptional()
    @IsString()
    @MaxLength(128)
    friendlyName?: string;

    @ApiPropertyOptional({ description: 'Optional target user ID if registering on behalf of a specific user' })
    @IsOptional()
    @IsString()
    targetUserId?: string;
}

export class PasskeyAuthOptionsDto {
    @ApiPropertyOptional({ description: 'Optional user email for targeted passkey authentication' })
    @IsOptional()
    @IsEmail()
    email?: string;
}

export class PasskeyVerifyAuthDto {
    @ApiProperty({ description: 'Unique challenge session ID issued by /auth/passkey/authenticate/options' })
    @IsNotEmpty()
    @IsString()
    challengeId: string;

    @ApiProperty({ description: 'WebAuthn AuthenticationResponseJSON from @simplewebauthn/browser' })
    @IsNotEmpty()
    @IsObject()
    response: any;
}

export class PasskeyRenameDto {
    @ApiProperty({ description: 'Updated friendly name for the passkey', example: 'Work YubiKey 5C' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(128)
    friendlyName: string;
}
