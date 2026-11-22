import { ValidateIf, IsEmail, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResendVerificationDto {
    @ApiPropertyOptional({
        description: 'Email address to resend verification link',
        example: 'user@example.com',
    })
    @ValidateIf((o) => !o.phone)
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({
        description: 'Phone number to resend verification SMS',
        example: '+85512345678',
    })
    @ValidateIf((o) => !o.email)
    @IsString()
    phone?: string;
}
