// src/auth/dto/auth-response.dto.ts
export class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
    user: {
        id: string;
        email: string | null;
        phone: string | null;
        roles: string[];
        mustChangePassword: boolean;
    };
}

export class MfaChallengeDto {
    mfaRequired: true;
    mfaToken: string;
    backupCodesRemaining: number;
}

export type LoginResponseDto = AuthResponseDto | MfaChallengeDto;