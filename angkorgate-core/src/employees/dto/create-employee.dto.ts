import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsIn,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';

export class CreateEmployeeDto {
    @ApiPropertyOptional({
        description: 'UUID of associated user account',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @IsUUID()
    userId?: string;

    @ApiProperty({
        description: 'Unique employee ID code',
        example: 'EMP-001',
        maxLength: 30,
    })
    @IsString()
    @MaxLength(30)
    employeeCode: string;

    @ApiProperty({
        description: 'Employee full legal or display name',
        example: 'Jane Smith',
        maxLength: 150,
    })
    @IsString()
    @MaxLength(150)
    fullName: string;

    @ApiPropertyOptional({
        description: 'Gender identity',
        enum: ['MALE', 'FEMALE', 'OTHER'],
        example: 'FEMALE',
    })
    @IsOptional()
    @IsIn(['MALE', 'FEMALE', 'OTHER'])
    gender?: 'MALE' | 'FEMALE' | 'OTHER';

    @ApiPropertyOptional({
        description: 'Date of birth in YYYY-MM-DD format',
        example: '1992-05-20',
    })
    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @ApiPropertyOptional({
        description: 'National identification or passport number',
        example: 'NID987654321',
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    nationalId?: string;

    @ApiPropertyOptional({
        description: 'Contact phone number',
        example: '+85512345678',
        maxLength: 20,
    })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @ApiPropertyOptional({
        description: 'Residential address',
        example: 'Phnom Penh, Cambodia',
    })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({
        description: 'Employee avatar image URL',
        example: 'https://cdn.example.com/avatars/emp1.jpg',
    })
    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @ApiPropertyOptional({
        description: 'Employment hire date in YYYY-MM-DD format',
        example: '2024-01-01',
    })
    @IsOptional()
    @IsDateString()
    hireDate?: string;
}
