import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Disabling MFA requires BOTH password and a current TOTP/backup code */
export class DisableMfaDto {
    @ApiProperty({
        description: 'Account password to authorize disabling MFA',
        example: 'myStrongPassword123!',
        minLength: 1,
    })
    @IsString()
    @MinLength(1)
    password: string;

    @ApiProperty({
        description: 'Current 6-digit TOTP code or 10-character backup code',
        example: '123456',
        minLength: 6,
    })
    @IsString()
    @MinLength(6)
    code: string; // TOTP (6 digits) OR backup code (10 chars)
}
