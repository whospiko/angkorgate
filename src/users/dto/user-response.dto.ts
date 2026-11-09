import { User } from "../entities/user.entity";

export class UserResponseDto {
    id: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    lastLoginAt: Date | null;
    mustChangePassword: boolean;
    createdAt: Date;
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
        dto.createdAt = user.createdAt;
        dto.updatedAt = user.updatedAt;
        return dto;
    }
}