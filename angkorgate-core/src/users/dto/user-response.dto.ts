import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { User } from "../entities/user.entity";

export class UserResponseDto {
    @ApiProperty({ description: 'User ID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    id: string;

    @ApiPropertyOptional({ description: 'User email address', example: 'user@example.com', nullable: true })
    email: string | null;

    @ApiPropertyOptional({ description: 'User phone number', example: '+85512345678', nullable: true })
    phone: string | null;

    @ApiProperty({ description: 'Indicates whether user account is active', example: true })
    isActive: boolean;

    @ApiProperty({ description: 'Indicates whether email is verified', example: true })
    isEmailVerified: boolean;

    @ApiProperty({ description: 'Indicates whether phone is verified', example: false })
    isPhoneVerified: boolean;

    @ApiPropertyOptional({ description: 'Timestamp of last login', example: '2026-11-21T12:00:00.000Z', nullable: true })
    lastLoginAt: Date | null;

    @ApiProperty({ description: 'Indicates whether user must change password on next login', example: false })
    mustChangePassword: boolean;

    @ApiProperty({ description: 'Number of failed consecutive login attempts', example: 0 })
    failedAttempts: number;

    @ApiPropertyOptional({ description: 'Timestamp until which account is locked', example: null, nullable: true })
    lockedUntil: Date | null;

    @ApiPropertyOptional({ description: 'Assigned role codes', example: ['ADMIN'], isArray: true })
    roles?: string[];

    @ApiProperty({ description: 'Account creation timestamp', example: '2026-11-21T10:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ description: 'Account last update timestamp', example: '2026-11-21T11:00:00.000Z' })
    updatedAt: Date;

    static fromEntity(user: User): UserResponseDto {
        const dto = new UserResponseDto();
        dto.id = user.id;
        dto.email = user.email;
        dto.phone = user.phone;
        dto.isActive = user.isActive;
        dto.isEmailVerified = user.isEmailVerified;
        dto.isPhoneVerified = user.isPhoneVerified;
        dto.lastLoginAt = user.lastLoginAt;
        dto.mustChangePassword = user.mustChangePassword;
        dto.failedAttempts = user.failedAttempts ?? 0;
        dto.lockedUntil = user.lockedUntil ?? null;
        dto.createdAt = user.createdAt;
        dto.updatedAt = user.updatedAt;
        return dto;
    }
}
