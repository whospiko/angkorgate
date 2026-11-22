import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class OidcLoginDto {
    @ApiPropertyOptional({
        description: 'User email address',
        example: 'user@example.com',
    })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({
        description: 'Username or account identifier (alternative to email)',
        example: 'john_doe',
    })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({
        description: 'User password',
        example: 'myStrongPassword123!',
    })
    @IsString()
    password: string;

    @ApiPropertyOptional({
        description: 'TOTP or backup code if user has two-factor authentication enabled',
        example: '123456',
    })
    @IsOptional()
    @IsString()
    mfaCode?: string;
}
