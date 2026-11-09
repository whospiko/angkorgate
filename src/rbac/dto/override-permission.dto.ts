import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID } from 'class-validator';
import type { OverrideEffect } from '../entities/user-permission-override.entity';

export class OverridePermissionDto {
    @ApiProperty({
        description: 'The UUID of the user for whom the permission is being overridden',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    userId: string;

    @ApiProperty({
        description: 'The specific permission code to override',
        example: 'patient:read',
    })
    @IsString()
    permissionCode: string;

    @ApiProperty({
        description: 'The effect of the override: GRANT allows the permission regardless of roles, REVOKE denies it',
        enum: ['GRANT', 'REVOKE'],
        example: 'GRANT',
    })
    @IsIn(['GRANT', 'REVOKE'])
    effect: OverrideEffect;
}