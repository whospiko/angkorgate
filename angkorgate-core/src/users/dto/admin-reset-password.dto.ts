import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
    @ApiProperty({
        description: 'The new temporary or permanent password to set for the user',
        example: 'AdminReset123!Secure',
        minLength: 8,
    })
    @IsString()
    @MinLength(8)
    newPassword: string;

    @ApiPropertyOptional({
        description: 'Whether the user must change password upon next login',
        default: true,
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    mustChangePassword?: boolean = true;
}
