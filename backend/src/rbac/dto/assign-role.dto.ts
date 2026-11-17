import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignRoleDto {
    @ApiProperty({
        description: 'The UUID of the user to whom the role will be assigned',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    userId: string;

    @ApiProperty({
        description: 'The code of the role to assign',
        example: 'ADMIN',
    })
    @IsString()
    roleCode: string;

    @ApiPropertyOptional({
        description: 'The UUID of the admin or system user assigning the role',
        example: '987fcdeb-51a2-43d7-9012-345678901234',
    })
    @IsOptional()
    @IsUUID()
    assignedBy?: string;
}

export class BulkAssignRolesDto {
    @ApiProperty({
        description: 'The UUID of the user to whom the roles will be assigned',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    userId: string;

    @ApiProperty({
        description: 'An array of role codes to assign to the user',
        example: ['ADMIN', 'CONTENT_CREATOR'],
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    roleCodes: string[];

    @ApiPropertyOptional({
        description: 'The UUID of the admin or system user assigning the roles',
        example: '987fcdeb-51a2-43d7-9012-345678901234',
    })
    @IsOptional()
    @IsUUID()
    assignedBy?: string;
}