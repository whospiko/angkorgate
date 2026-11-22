import { IsOptional, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Second login step — user submits TOTP code along with the mfaToken
 * returned from the first login step (either as Bearer token in Authorization header
 * or in the request body).
 */
export class LoginMfaDto {
    @ApiPropertyOptional({
        description: 'MFA session token returned from first login step (optional if sent via Authorization Bearer)',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsOptional()
    @IsString()
    @MinLength(10)
    mfaToken?: string;

    @ApiProperty({
        description: '6-digit TOTP code or 8-12 char backup code',
        example: '123456',
    })
    @IsString()
    @Length(6, 12)
    code: string;
}
