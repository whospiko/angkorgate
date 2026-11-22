import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
    @ApiProperty({
        description: 'Array of permission codes to assign to the role',
        example: ['user:read', 'user:write'],
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    permissionCodes: string[];
}
