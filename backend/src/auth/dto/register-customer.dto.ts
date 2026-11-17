import { IsEmail, IsOptional, IsString, MaxLength, Matches, ValidateIf } from 'class-validator';
import { IsStrongPassword } from '../validators/is-strong-password.validator';

export class RegisterCustomerDto {
    @ValidateIf((o) => !o.phone)
    @IsEmail()
    email?: string;

    @ValidateIf((o) => !o.email)
    @IsString()
    @Matches(/^\+?[0-9]{8,20}$/)
    phone?: string;

    @IsString()
    @IsStrongPassword()
    password: string;

    @IsString()
    @MaxLength(150)
    fullName: string;

    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' })
    dateOfBirth: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    gender?: string;
}