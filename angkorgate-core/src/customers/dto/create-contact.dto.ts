import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEmail,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from 'class-validator';

export class CreateContactDto {
    @ApiProperty({
        description: 'Full name of contact person',
        example: 'Jane Doe',
        maxLength: 150,
    })
    @IsString()
    @MaxLength(150)
    fullName: string;

    @ApiPropertyOptional({
        description: 'Relationship to customer (e.g. Spouse, Parent, Emergency)',
        example: 'Spouse',
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    relationship?: string;

    @ApiPropertyOptional({
        description: 'Contact phone number',
        example: '+85598765432',
    })
    @IsOptional()
    @IsString()
    @Matches(/^\+?[0-9]{8,20}$/)
    phone?: string;

    @ApiPropertyOptional({
        description: 'Contact email address',
        example: 'jane.doe@example.com',
    })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({
        description: 'Contact physical address',
        example: 'Street 271, Phnom Penh, Cambodia',
    })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({
        description: 'Indicates if this is the primary emergency contact',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;
}
