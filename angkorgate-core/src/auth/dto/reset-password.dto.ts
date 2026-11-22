import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../validators/is-strong-password.validator';

export class ResetPasswordDto {
    @ApiProperty({
        description: 'Password reset token received via email',
        example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    })
    @IsString()
    @MinLength(20)
    token: string;

    @ApiProperty({
        description: 'New password meeting strong password policy',
        example: 'NewStr0ngPass!2026',
    })
    @IsString()
    @IsStrongPassword()
    newPassword: string;
}
