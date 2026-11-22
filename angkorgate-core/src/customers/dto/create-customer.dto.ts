import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsEmail,
    IsIn,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Matches,
} from 'class-validator';

export class CreateCustomerDto {
    @ApiPropertyOptional({
        description: 'Customer classification type',
        enum: ['PATIENT', 'GUEST', 'CUSTOMER'],
        default: 'CUSTOMER',
        example: 'CUSTOMER',
    })
    @IsOptional()
    @IsIn(['PATIENT', 'GUEST', 'CUSTOMER'])
    type?: 'PATIENT' | 'GUEST' | 'CUSTOMER';

    @ApiPropertyOptional({
        description: 'Optional link to a login user account UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @IsUUID()
    userId?: string;

    @ApiProperty({
        description: 'Customer full legal or display name',
        example: 'John Doe',
        maxLength: 150,
    })
    @IsString()
    @MaxLength(150)
    fullName: string;

    @ApiPropertyOptional({
        description: 'Gender identity',
        enum: ['MALE', 'FEMALE', 'OTHER'],
        example: 'MALE',
    })
    @IsOptional()
    @IsIn(['MALE', 'FEMALE', 'OTHER'])
    gender?: 'MALE' | 'FEMALE' | 'OTHER';

    @ApiProperty({
        description: 'Date of birth in YYYY-MM-DD format',
        example: '1990-01-15',
    })
    @IsDateString()
    dateOfBirth: string;

    @ApiPropertyOptional({
        description: 'Primary contact phone number',
        example: '+85512345678',
    })
    @IsOptional()
    @IsString()
    @Matches(/^\+?[0-9]{8,20}$/)
    phone?: string;

    @ApiPropertyOptional({
        description: 'Contact email address',
        example: 'customer@example.com',
    })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({
        description: 'Physical or residential address',
        example: 'Street 271, Phnom Penh, Cambodia',
    })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({
        description: 'National ID, Passport, or Citizen identifier',
        example: 'ID123456789',
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    nationalId?: string;

    @ApiPropertyOptional({
        description: 'Profile avatar image URL',
        example: 'https://cdn.example.com/avatars/user.jpg',
    })
    @IsOptional()
    @IsString()
    avatarUrl?: string;
}
