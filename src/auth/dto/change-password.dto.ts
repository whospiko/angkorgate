import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({
        description: 'The user\'s current password',
        example: 'currentPassword123',
        minLength: 1,
    })
    @IsString()
    @MinLength(1)
    oldPassword: string;

    @ApiProperty({
        description: 'The new password to set for the account',
        example: 'newStrongPassword123!',
        minLength: 8,
    })
    @IsString()
    @MinLength(8)
    newPassword: string;
}