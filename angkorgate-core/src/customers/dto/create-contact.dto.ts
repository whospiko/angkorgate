import {
    IsBoolean,
    IsEmail,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from 'class-validator';

export class CreateContactDto {
    @IsString()
    @MaxLength(150)
    fullName: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    relationship?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\+?[0-9]{8,20}$/)
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;
}