import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateRoleDto {
    @ApiProperty({
        description: 'Unique role code in UPPER_SNAKE_CASE format',
        example: 'ADMIN',
        pattern: '^[A-Z][A-Z0-9_]{1,49}$',
    })
    @IsString()
    @Matches(/^[A-Z][A-Z0-9_]{1,49}$/, {
        message: 'code must be UPPER_SNAKE_CASE, e.g. ADMIN',
    })
    code: string;

    @ApiProperty({
        description: 'Human-readable name of the role',
        example: 'Administrator',
        maxLength: 100,
    })
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({
        description: 'Detailed description of the role and its purpose',
        example: 'Has full access to all system settings and users',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Indicates if this is a protected system role that cannot be deleted or modified',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isSystem?: boolean;

    @ApiPropertyOptional({
        description: 'An array of permission codes to attach to this role upon creation',
        example: ['patient:read', 'patient:write', 'user:manage'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissionCodes?: string[]; // attach permissions on create
}