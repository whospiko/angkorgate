import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, ValidateIf } from 'class-validator';

export class LoginDto {
    @ApiPropertyOptional({
        description: 'User email address for authentication. Required if phone is not provided.',
        example: 'user@example.com',
    })
    @ValidateIf((o) => !o.phone)
    @IsString()
    email?: string;

    @ApiPropertyOptional({
        description: 'User phone number for authentication. Required if email is not provided.',
        example: '+1234567890',
    })
    @ValidateIf((o) => !o.email)
    @IsString()
    phone?: string;

    @ApiProperty({
        description: 'The user password',
        example: 'myStrongPassword123!',
        minLength: 1,
    })
    @IsString()
    @MinLength(1)
    password: string;
}