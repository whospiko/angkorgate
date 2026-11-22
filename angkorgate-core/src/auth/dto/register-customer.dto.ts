import { IsEmail, IsOptional, IsString, MaxLength, Matches, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../validators/is-strong-password.validator';

export class RegisterCustomerDto {
    @ApiPropertyOptional({
        description: 'Customer email address (required if phone is omitted)',
        example: 'john.doe@example.com',
    })
    @ValidateIf((o) => !o.phone)
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({
        description: 'Customer phone number in international format (required if email is omitted)',
        example: '+85512345678',
    })
    @ValidateIf((o) => !o.email)
    @IsString()
    @Matches(/^\+?[0-9]{8,20}$/)
    phone?: string;

    @ApiProperty({
        description: 'Account password (minimum 8 characters, uppercase, lowercase, digit, special character)',
        example: 'Str0ngPass!2026',
    })
    @IsString()
    @IsStrongPassword()
    password: string;

    @ApiProperty({
        description: 'Full name of the customer',
        example: 'John Doe',
        maxLength: 150,
    })
    @IsString()
    @MaxLength(150)
    fullName: string;

    @ApiProperty({
        description: 'Date of birth in YYYY-MM-DD format',
        example: '1995-05-15',
    })
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' })
    dateOfBirth: string;

    @ApiPropertyOptional({
        description: 'Gender of the customer',
        enum: ['MALE', 'FEMALE', 'OTHER'],
        example: 'MALE',
    })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    gender?: string;
}
