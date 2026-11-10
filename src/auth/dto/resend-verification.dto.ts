import { ValidateIf, IsEmail, IsString } from 'class-validator';

export class ResendVerificationDto {
    @ValidateIf((o) => !o.phone)
    @IsEmail()
    email?: string;

    @ValidateIf((o) => !o.email)
    @IsString()
    phone?: string;
}