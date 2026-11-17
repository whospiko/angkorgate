import { IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from '../validators/is-strong-password.validator';

export class ResetPasswordDto {
    @IsString()
    @MinLength(20)
    token: string;

    @IsString()
    @IsStrongPassword()
    newPassword: string;
}