import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePermissionDto {
    @ApiProperty({
        description: 'Unique permission code in the format resource:action',
        example: 'patient:read',
        pattern: '^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$',
    })
    @IsString()
    @Matches(/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/, {
        message: 'code must be resource:action, e.g. patient:read',
    })
    code: string;

    @ApiProperty({
        description: 'The resource this permission applies to',
        example: 'patient',
        maxLength: 50,
    })
    @IsString()
    @MaxLength(50)
    resource: string;

    @ApiProperty({
        description: 'The action allowed on the resource',
        example: 'read',
        maxLength: 50,
    })
    @IsString()
    @MaxLength(50)
    action: string;

    @ApiPropertyOptional({
        description: 'A human-readable description of the permission',
        example: 'Allows reading patient records',
    })
    @IsOptional()
    @IsString()
    description?: string;
}