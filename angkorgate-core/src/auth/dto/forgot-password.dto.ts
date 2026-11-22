import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
    @ApiProperty({
        description: 'Registered account email address to send password reset instructions',
        example: 'user@example.com',
    })
    @IsEmail()
    email: string;
}
